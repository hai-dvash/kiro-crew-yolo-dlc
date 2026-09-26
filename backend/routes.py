"""DLC-YOLO authenticated app controls and secure webhook ingress lifecycle.

The gateway routes registered here remain under ordinary KiroCrew app
authentication. They expose webhook receiver status/configuration and a bounded
crew-route editor that invokes KiroCrew's public agent CLI without a shell.
Direct GitHub delivery still uses a separate aiohttp application bound
unconditionally to 127.0.0.1 and exposing exactly ``POST /github``; this module
never adds that route to the gateway or exposes the dashboard/general API.
"""

from __future__ import annotations

import asyncio
import contextlib
import hashlib
import json
import logging
import re
import shutil
import time
from collections import deque
from datetime import datetime, timezone
from functools import wraps

from aiohttp import web

from kiro_crew.apps.manager import is_app_enabled


def _load_webhook_module():
    """Load the sibling ``crons/dlc_yolo_webhook.py`` without a top-level import.

    The gateway app loader (``kiro_crew.apps.module_loader``) loads this file by
    path and registers it under a synthetic dotted key
    (``_kirocrew_app_dlc-yolo.backend.routes``) WITHOUT mutating ``sys.path`` — a
    property that module explicitly commits to. So a bare ``from crons import
    dlc_yolo_webhook`` raises ``ModuleNotFoundError: No module named 'crons'`` at
    import time, the backend registration is skipped, and every ``/webhook/*``
    route 404s. Anchor the load to this module's own location instead: the app
    root is the parent of ``backend/``. Fall back to the plain import for the
    dev/test context where the repo root IS on ``sys.path``.

    NOTE: the top-level name ``crons`` is AMBIGUOUS in the spawned backend — the
    sibling ``backend/crons.py`` (the cron-control module) can register under a
    ``crons`` key and shadow the ``crons/`` PACKAGE, so a bare
    ``from crons import dlc_yolo_webhook`` may resolve to ``backend/crons.py`` and
    raise ImportError (not ModuleNotFoundError). Load the webhook helper BY PATH
    first (unambiguous), and only fall back to the bare import for a pure
    dev/test tree, catching ImportError so shadowing can never crash the backend.
    """
    import importlib.util
    from pathlib import Path

    target = Path(__file__).resolve().parent.parent / "crons" / "dlc_yolo_webhook.py"
    if target.is_file():
        spec = importlib.util.spec_from_file_location(
            "_kirocrew_app_dlc_yolo_webhook", target
        )
        if spec is not None and spec.loader is not None:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return module
    # Dev/test fallback: repo root on sys.path and no shadowing package.
    from crons import dlc_yolo_webhook as _webhook  # noqa: PLC0415

    return _webhook


webhook = _load_webhook_module()

APP_NAME = "dlc-yolo"
# LEGACY: the in-process built-in mount prefix, used ONLY by register_routes()
# (test harness). The production spawned backend serves /api/webhook/* directly.
BASE = "/api/apps/dlc-yolo"
RATE_WINDOW_SECONDS = 60
RATE_LIMIT = 120
RETRY_AFTER_SECONDS = 120
MAX_CONFIG_REQUEST_BYTES = 16 * 1024
MAX_CREW_ROUTE_REQUEST_BYTES = 4 * 1024
# Uncapped-by-intent state WRITE. The whole point of this endpoint is to write a state body that
# EXCEEDS the host /api/file-write 512000-byte cap, so this ceiling is generous (8 MiB) — a sane
# upper bound that still refuses a pathological body rather than being truly unbounded.
MAX_STATE_WRITE_REQUEST_BYTES = 8 * 1024 * 1024
CREW_ROUTE_CLI_TIMEOUT_SECONDS = 15
_CREW_IDENTIFIER = re.compile(r"^[A-Za-z0-9._-]{1,128}$")

logger = logging.getLogger("kirocrew.app.dlc-yolo.webhook")
_LISTENER_STATE: web.AppKey[dict] = web.AppKey("dlc_yolo_webhook_listener", dict)
_RATE_TIMES: deque[float] = deque(maxlen=RATE_LIMIT)


def _require_enabled(handler):
    @wraps(handler)
    async def _wrapped(request: web.Request) -> web.StreamResponse:
        if not await asyncio.to_thread(is_app_enabled, APP_NAME):
            return web.json_response(
                {"code": "app_disabled", "error": "dlc-yolo is disabled"}, status=403,
            )
        return await handler(request)

    return _wrapped


def _rate_allowed(now: float | None = None) -> bool:
    stamp = time.monotonic() if now is None else now
    cutoff = stamp - RATE_WINDOW_SECONDS
    while _RATE_TIMES and _RATE_TIMES[0] <= cutoff:
        _RATE_TIMES.popleft()
    if len(_RATE_TIMES) >= RATE_LIMIT:
        return False
    _RATE_TIMES.append(stamp)
    return True


async def _read_bounded(request: web.Request, limit: int) -> bytes | None:
    declared = request.content_length
    if declared is not None and declared > limit:
        return None
    # Read via request.read(), NOT request.content.read(): aiohttp caches the
    # full body on request.read() (re-yielding it on later calls), whereas
    # request.content is the raw stream and is drained to empty once anything has
    # already read it. The spawned-backend proxy-auth middleware reads the body
    # once to verify the HMAC, so a second drain of request.content here would
    # return b"" and JSON parsing would fail with a spurious malformed_json/400.
    # request.read() returns the same cached bytes regardless of read order.
    body = await request.read()
    if len(body) > limit:
        return None
    return body


async def _read_capped(request: web.Request) -> bytes | None:
    return await _read_bounded(request, webhook.MAX_BODY_BYTES)


def _advance_job_id() -> str:
    return hashlib.sha1(b"dlc-yolo-advance").hexdigest()[:12]


def _resolve_advance_job_id() -> str:
    """Return the advance cron's ACTUAL job id.

    The event-driven wake must trigger the job the scheduler actually holds — not a value we
    assume. setup-crons SHOULD converge the advance job to the deterministic ``_advance_job_id()``,
    but a fresh install / app reinstall can register it under a scheduler-assigned id instead
    (observed: e27ce8b8 while the hash was f838bdf3d496), so a wake at the hashed id gets
    "Job not found" and silently falls back to the 120s poll — breaking the flow. Resolve the real
    id from crons.json by name each wake; fall back to the deterministic hash if the store is
    unreadable or the job is absent.
    """
    import os as _os  # noqa: PLC0415
    default = _advance_job_id()
    try:
        store = _os.path.expanduser("~/.kiro/crew/crons.json")
        with open(store, "r", encoding="utf-8") as fh:
            doc = json.load(fh)
        jobs = doc.get("jobs") or doc.get("crons") or []
        if isinstance(jobs, dict):
            jobs = list(jobs.values())
        for job in jobs:
            if not isinstance(job, dict):
                continue
            name = str(job.get("name") or "")
            # Match the advance job by its stable name suffix, not its (possibly random) id.
            if name.endswith("dlc-yolo-advance") or name == "dlc-yolo-advance":
                jid = job.get("id")
                if isinstance(jid, str) and jid:
                    return jid
    except (OSError, ValueError, json.JSONDecodeError):
        pass
    return default


async def _wake_advance() -> None:
    """Event-driven immediate advance wake; the 120-second poll remains the safety net.

    Triggers the advance cron's RESOLVED id (see _resolve_advance_job_id) so a scheduler-assigned
    id still matches. Captures stderr and logs the reason on failure so a broken wake is diagnosable
    (job-not-found, owner-verification) rather than silently degrading to the poll.
    """
    executable = shutil.which("kirocrew")
    if not executable:
        logger.warning("DLC-YOLO advance wake unavailable: kirocrew not on PATH")
        return
    job_id = _resolve_advance_job_id()
    try:
        proc = await asyncio.create_subprocess_exec(
            executable, "cron", "trigger", job_id,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=10)
        if proc.returncode != 0:
            detail = (stderr or b"").decode("utf-8", "replace").strip()[:200]
            logger.warning("DLC-YOLO advance wake failed (id=%s rc=%s): %s", job_id, proc.returncode, detail)
    except (OSError, asyncio.TimeoutError) as exc:
        logger.warning("DLC-YOLO advance wake unavailable (id=%s): %s", job_id, exc)


async def _handle_github(request: web.Request) -> web.StreamResponse:
    if not await asyncio.to_thread(is_app_enabled, APP_NAME):
        return web.json_response(
            {"code": "app_disabled", "error": "receiver disabled"}, status=503,
        )
    if not _rate_allowed():
        return web.json_response(
            {"code": "rate_limited", "error": "receiver rate limit reached"},
            status=429, headers={"Retry-After": str(RATE_WINDOW_SECONDS)},
        )
    raw = await _read_capped(request)
    if raw is None:
        return web.json_response(
            {"code": "body_too_large", "error": "body exceeds receiver limit"}, status=413,
        )

    now = datetime.now(timezone.utc).isoformat(
        timespec="seconds").replace("+00:00", "Z")
    status, reason, record = webhook.admit_delivery(raw, request.headers, now)
    delivery = request.headers.get(webhook.DELIVERY_HEADER, "")[:100]
    if status != 202:
        level = logging.INFO if status in {200, 403} else logging.WARNING
        logger.log(level, "DLC-YOLO GitHub webhook %s: %s", delivery or "unknown", reason)
        return web.json_response(
            {"code": reason.replace("-", "_"), "status": reason}, status=status,
        )

    try:
        result = await asyncio.to_thread(webhook.enqueue_delivery, record)
    except webhook.InboxError as exc:
        logger.error("DLC-YOLO webhook inbox unavailable: %s", exc)
        return web.json_response(
            {"code": "inbox_unavailable", "error": "delivery was not queued"},
            status=503, headers={"Retry-After": str(RETRY_AFTER_SECONDS)},
        )
    if result["status"] == "full":
        return web.json_response(
            {"code": "inbox_full", "error": "delivery was not queued"},
            status=503, headers={"Retry-After": str(RETRY_AFTER_SECONDS)},
        )
    if result["status"] == "accepted":
        asyncio.create_task(_wake_advance(), name="dlc-yolo-webhook-wake")
    logger.info(
        "DLC-YOLO GitHub webhook %s: %s (%s/%s)", delivery,
        result["status"], record.get("event"), record.get("action"),
    )
    return web.json_response(
        {"status": "accepted", "duplicate": result["status"] == "duplicate",
         "delivery_id": delivery, "queued": result["depth"]},
        status=202,
    )


async def _inbox_summary() -> dict:
    try:
        return await asyncio.to_thread(webhook.inbox_status)
    except webhook.InboxError:
        return {"schema_version": webhook.SCHEMA_VERSION,
                "pending": None, "processed": None}


def _configuration_view(config: dict, *, include_values: bool) -> dict:
    configured = bool(
        config.get("enabled") and config.get("secret")
        and config.get("repositories") and config.get("port")
        and config.get("inbox_path_valid")
    )
    payload = {
        "configuration_source": config.get("source", "none"),
        "editable": bool(config.get("editable")),
        "enabled": bool(config.get("enabled")),
        "configured": configured,
        "secret_configured": bool(config.get("secret")),
        "port": config.get("port"),
        "allowed_repository_count": len(config.get("repositories") or []),
        "autosync": bool(config.get("autosync")),
        "configuration_error": config.get("error"),
    }
    if include_values:
        payload.update(
            repositories=list(config.get("repositories") or []),
            inbox_path=config.get("inbox_path"),
        )
    return payload


async def _status_payload(request: web.Request, *, include_values: bool) -> dict:
    state = request.app.get(_LISTENER_STATE, {})
    config = webhook.effective_webhook_config()
    return {
        "schema_version": webhook.SCHEMA_VERSION,
        "listener": state.get("status", "not-started"),
        "bind": webhook.LOOPBACK_HOST,
        "path": webhook.RECEIVER_PATH,
        "inbox": await _inbox_summary(),
        "last_error": state.get("last_error"),
        **_configuration_view(config, include_values=include_values),
    }


async def _handle_status(request: web.Request) -> web.StreamResponse:
    return web.json_response(await _status_payload(request, include_values=False))


async def _handle_config(request: web.Request) -> web.StreamResponse:
    """Return effective settings, but never return the secret or config-file path."""
    return web.json_response(await _status_payload(request, include_values=True))


async def _reload_listener(app: web.Application) -> None:
    await _stop_listener(app)
    await _start_listener(app)


async def _handle_config_update(request: web.Request) -> web.StreamResponse:
    effective = webhook.effective_webhook_config()
    if effective.get("source") == "environment":
        return web.json_response({
            "code": "environment_managed",
            "error": "gateway environment variables override UI-managed webhook settings",
        }, status=409)
    if effective.get("source") == "invalid":
        return web.json_response({
            "code": "stored_configuration_invalid",
            "error": "the stored webhook configuration must be repaired on disk",
        }, status=409)

    raw = await _read_bounded(request, MAX_CONFIG_REQUEST_BYTES)
    if raw is None:
        return web.json_response(
            {"code": "config_too_large", "error": "configuration body is too large"},
            status=413,
        )
    try:
        body = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return web.json_response(
            {"code": "malformed_json", "error": "configuration must be JSON"}, status=400,
        )
    if not isinstance(body, dict):
        return web.json_response(
            {"code": "config_not_object", "error": "configuration must be an object"},
            status=400,
        )
    permitted = {"enabled", "port", "repositories", "inbox_path", "secret", "clear_secret", "autosync"}
    if not set(body).issubset(permitted):
        return web.json_response(
            {"code": "config_fields_invalid", "error": "unknown configuration field"},
            status=400,
        )
    clear_secret = body.pop("clear_secret", False)
    if not isinstance(clear_secret, bool):
        return web.json_response(
            {"code": "clear_secret_invalid", "error": "clear_secret must be boolean"},
            status=400,
        )
    try:
        stored = await asyncio.to_thread(webhook.read_webhook_config)
        existing_secret = str((stored or {}).get("secret") or "")
        supplied = body.get("secret")
        if supplied == "":
            body.pop("secret")
        if clear_secret:
            if body.get("enabled") is not False:
                raise webhook.InboxError("config-cannot-clear-active-secret")
            body["secret"] = ""
        canonical = webhook.validate_webhook_config(
            body, existing_secret=existing_secret,
        )
        await asyncio.to_thread(webhook.write_webhook_config, canonical)
    except webhook.InboxError as exc:
        return web.json_response(
            {"code": str(exc).replace("-", "_"), "error": str(exc)}, status=400,
        )

    await _reload_listener(request.app)
    return web.json_response(await _status_payload(request, include_values=True))


def _crew_identifier(value: object, field: str) -> str:
    if not isinstance(value, str) or not _CREW_IDENTIFIER.fullmatch(value.strip()):
        raise ValueError(f"{field}_invalid")
    return value.strip()


def _crew_optional_value(value: object, field: str) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ValueError(f"{field}_invalid")
    text = value.strip()
    if len(text.encode("utf-8")) > 256 or text.startswith("-") or any(ord(char) < 32 for char in text):
        raise ValueError(f"{field}_invalid")
    return text


async def _run_agent_cli(arguments: list[str]) -> tuple[int, str]:
    """Run one sanctioned agent CLI mutation without a shell or inherited stdin."""
    executable = shutil.which("kirocrew")
    if not executable:
        raise FileNotFoundError("kirocrew")
    process = await asyncio.create_subprocess_exec(
        executable, "agent", *arguments,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=CREW_ROUTE_CLI_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        process.kill()
        await process.wait()
        raise
    detail = (stderr or stdout).decode("utf-8", errors="replace").strip()
    return process.returncode or 0, detail[-512:]


async def _handle_crew_route_update(request: web.Request) -> web.StreamResponse:
    """Create/update one global crew routing record through KiroCrew's public CLI."""
    raw = await _read_bounded(request, MAX_CREW_ROUTE_REQUEST_BYTES)
    if raw is None:
        return web.json_response(
            {"code": "crew_route_too_large", "error": "crew route body is too large"},
            status=413,
        )
    try:
        body = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return web.json_response(
            {"code": "malformed_json", "error": "crew route must be JSON"}, status=400,
        )
    permitted = {"mode", "name", "kiro_agent", "workspace", "memory_store"}
    if not isinstance(body, dict) or not set(body).issubset(permitted):
        return web.json_response(
            {"code": "crew_route_fields_invalid", "error": "unknown crew route field"},
            status=400,
        )
    try:
        mode = body.get("mode")
        if mode not in {"create", "update"}:
            raise ValueError("mode_invalid")
        name = _crew_identifier(body.get("name"), "name")
        kiro_agent = _crew_identifier(body.get("kiro_agent"), "kiro_agent")
        workspace = _crew_optional_value(body.get("workspace"), "workspace")
        memory_store = _crew_optional_value(body.get("memory_store"), "memory_store")
    except ValueError as exc:
        code = str(exc)
        return web.json_response(
            {"code": code, "error": code.replace("_", " ")}, status=400,
        )

    arguments = (["create", "--name", name] if mode == "create" else ["update", name])
    arguments.extend(["--kiro-agent", kiro_agent])
    if workspace:
        arguments.extend(["--workspace", workspace])
    if memory_store:
        arguments.extend(["--memory-store", memory_store])
    try:
        returncode, detail = await _run_agent_cli(arguments)
    except FileNotFoundError:
        return web.json_response({
            "code": "agent_cli_unavailable",
            "error": "the kirocrew agent CLI is unavailable",
        }, status=503)
    except (OSError, asyncio.TimeoutError):
        return web.json_response({
            "code": "agent_cli_failed",
            "error": "the kirocrew agent CLI did not complete",
        }, status=503)
    if returncode != 0:
        return web.json_response({
            "code": "crew_route_rejected",
            "error": detail or "KiroCrew rejected the crew route update",
        }, status=409)
    return web.json_response({
        "status": "updated" if mode == "update" else "created",
        "crew": {
            "name": name,
            "kiro_agent": kiro_agent,
            "workspace": workspace or None,
            "memory_store": memory_store or None,
        },
    }, status=200 if mode == "update" else 201)


async def _start_listener(app: web.Application) -> None:
    state = app.setdefault(_LISTENER_STATE, {
        "status": "disabled", "runner": None, "port": None, "last_error": None,
    })
    # Defensive: release any runner still bound before we drop the reference to
    # it. _reload_listener stops first, but the startup hook (or a double-fire)
    # could reach here with a live runner; overwriting state without cleanup
    # would leak the socket and cause EADDRINUSE on the rebind below.
    existing = state.get("runner") if isinstance(state, dict) else None
    if isinstance(existing, web.AppRunner):
        with contextlib.suppress(Exception):
            await existing.cleanup()
    state.update(status="disabled", runner=None, port=None, last_error=None)
    config = webhook.effective_webhook_config()
    if config.get("source") == "invalid":
        state.update(status="misconfigured", last_error="stored-config-invalid")
        return
    port = config.get("port")
    state["port"] = port
    if not config.get("enabled"):
        return
    if port is None:
        state.update(status="misconfigured", last_error="invalid-port")
        return
    if not config.get("secret"):
        state.update(status="misconfigured", last_error="secret-missing")
        return
    if not config.get("repositories"):
        state.update(status="misconfigured", last_error="repository-allowlist-empty")
        return
    if not config.get("inbox_path_valid"):
        state.update(status="misconfigured", last_error="inbox-path-not-absolute")
        return
    if not await asyncio.to_thread(is_app_enabled, APP_NAME):
        state.update(status="disabled")
        return

    receiver = web.Application(client_max_size=webhook.MAX_BODY_BYTES + webhook.READ_CHUNK_BYTES)
    receiver.router.add_post(webhook.RECEIVER_PATH, _handle_github)
    runner = web.AppRunner(receiver, access_log=None)
    # reuse_address=True (SO_REUSEADDR): a Save/reload re-binds the SAME loopback
    # port right after the previous receiver's socket closed. AppRunner.cleanup()
    # returns before the OS has fully released the socket (it may sit briefly in
    # TIME_WAIT), so a strict bind would race and fail EADDRINUSE — which is
    # exactly what a rapid reconfigure produced. SO_REUSEADDR lets the fresh
    # listener rebind immediately; a short bounded retry covers the residual gap.
    last_exc: OSError | None = None
    for attempt in range(3):
        try:
            await runner.setup()
            site = web.TCPSite(runner, webhook.LOOPBACK_HOST, port, reuse_address=True)
            await site.start()
            last_exc = None
            break
        except OSError as exc:
            last_exc = exc
            await runner.cleanup()
            runner = web.AppRunner(receiver, access_log=None)
            if attempt < 2:
                await asyncio.sleep(0.25)
    if last_exc is not None:
        state.update(status="failed", port=port,
                     last_error=f"bind-failed:{type(last_exc).__name__}")
        logger.error("DLC-YOLO webhook listener failed on loopback:%s: %s", port, last_exc)
        return
    state.update(status="listening", runner=runner, port=port, last_error=None)
    logger.info(
        "DLC-YOLO GitHub webhook receiver listening on http://%s:%s%s",
        webhook.LOOPBACK_HOST, port, webhook.RECEIVER_PATH,
    )


async def _stop_listener(app: web.Application) -> None:
    state = app.get(_LISTENER_STATE, {})
    runner = state.get("runner") if isinstance(state, dict) else None
    if isinstance(runner, web.AppRunner):
        await runner.cleanup()
    if isinstance(state, dict):
        state.update(status="stopped", runner=None)


# ── Poll-free local-completion wake (event-driven-liveness Part I) ──────────────────────────────
# The step-agent writes its terminal fact into state.json and STOPS — it no longer pokes the
# scheduler. This always-on backend is the neutral observer: an inotify watch on the state file
# fires _wake_advance() the instant the fact lands, so a local step completion advances at
# kernel-event latency instead of waiting up to 120s for the poll. inotify-unavailable falls back
# to the poll. This is independent of the webhook receiver — it runs whenever the backend is up.
_STATE_WATCH_KEY: web.AppKey[object] = web.AppKey("dlc_yolo_state_watch", object)
_STATE_POINTER_PATH = "~/.dlc-yolo/.statepath"


def _resolve_state_path():
    """Mirror the cron's resolution: DLC_YOLO_STATE (absolute) -> .statepath -> ~/.dlc-yolo."""
    from pathlib import Path  # noqa: PLC0415
    import os as _os  # noqa: PLC0415

    env = str(_os.environ.get("DLC_YOLO_STATE") or "").strip()
    if env:
        p = Path(_os.path.expanduser(env))
        if p.is_absolute():
            return p
    try:
        pointer = json.loads(Path(_os.path.expanduser(_STATE_POINTER_PATH)).read_text("utf-8"))
        cand = str(pointer.get("path") or "").strip()
        if cand:
            cp = Path(cand)
            if cp.is_absolute() and cp.exists():
                return cp
    except (OSError, ValueError):
        pass
    return Path(_os.path.expanduser("~/.dlc-yolo/state.json"))


# ── Uncapped state read (backend state endpoint) ────────────────────────────────────────────────
# The UI historically fetched state.json through the host ``/api/file-read`` endpoint, which
# TRUNCATES the body at 512000 bytes. Once ~/.dlc-yolo/state.json grew past ~500KB the UI received
# chopped JSON, JSON.parse failed, and the board rendered 0 cards despite a fully intact on-disk
# state (root-caused: project.kirocrew.sdlc_pipeline.ghosting_root_cause_512kb). This endpoint reads
# the SAME resolved state file (``_resolve_state_path`` — the cron's own resolution: DLC_YOLO_STATE
# -> ~/.dlc-yolo/.statepath -> ~/.dlc-yolo/state.json) with NO size cap and returns the parsed JSON.
# A missing/unreadable/malformed file yields the empty-but-valid shape at HTTP 200 so the UI renders
# an empty board rather than erroring.
_EMPTY_STATE = {"cards": [], "pipelines": [], "config": {}}


def _read_state_document() -> dict:
    """Read the resolved state file uncapped and return parsed JSON.

    Returns the empty-but-valid shape ``{"cards":[],"pipelines":[],"config":{}}`` for any
    failure (absent file, unreadable, or malformed JSON) so the caller can always return 200.
    """
    path = _resolve_state_path()
    try:
        raw = path.read_text("utf-8")
    except (OSError, UnicodeDecodeError):
        return dict(_EMPTY_STATE)
    try:
        data = json.loads(raw)
    except (ValueError, TypeError):
        return dict(_EMPTY_STATE)
    if not isinstance(data, dict):
        return dict(_EMPTY_STATE)
    return data


async def _handle_state(_request: web.Request) -> web.StreamResponse:
    """GET the full resolved DLC-YOLO state as JSON, uncapped.

    Reads off the event loop thread (the file can be hundreds of KB) and never raises to the
    caller: a missing/unreadable/malformed file returns the empty-but-valid shape at HTTP 200.
    """
    data = await asyncio.to_thread(_read_state_document)
    return web.json_response(data)


# ── Uncapped state WRITE (backend state mutation endpoint) ───────────────────────────────────────
# The WRITE-side mirror of _handle_state. The UI historically mutated state by POSTing the FULL
# state.json to the host ``/api/file-write``, whose ``content`` field is validated at max_len=512000
# (kiro_crew/validation.py). Once ~/.dlc-yolo/state.json grew past ~512KB EVERY mutation (gate
# Approve, reject, config, cancel) was rejected 400 {"error":"invalid input"}. This endpoint writes
# the SAME resolved state file (``_resolve_state_path``) with NO size cap, atomically and durably
# (temp file in the same dir → flush → os.fsync → os.replace, mirroring the cron's ``_save``), under
# the SAME cross-process advisory lock the cron/orchestrator hold so a UI write cannot interleave-
# and-lose against an advance-cron ``_save``. A clobber guard refuses an empty (neither cards nor
# pipelines) body over a populated on-disk file — mirroring the cron ``_save`` clobber guard.


def _write_state_document(data: dict) -> int:
    """Atomically write ``data`` to the resolved state path, uncapped, under the shared state lock.

    Returns the number of bytes written. Mirrors the cron ``_save`` durability (temp+fsync+replace)
    and the ``_fold_crew_tail`` locking (advisory flock on the sidecar ``<state>.json.lock``,
    fail-open). Runs on a worker thread (see ``_handle_state_write``); does NOT touch the event loop.
    """
    from pathlib import Path  # noqa: PLC0415
    import os as _os, tempfile, fcntl  # noqa: PLC0415

    path = _resolve_state_path()
    payload = json.dumps(data, indent=2)
    encoded = payload.encode("utf-8")

    lock_path = (str(path)[:-5] + ".json.lock") if str(path).endswith(".json") else (str(path) + ".lock")
    lock_fd = None
    try:
        lock_fd = _os.open(lock_path, _os.O_CREAT | _os.O_RDWR | getattr(_os, "O_CLOEXEC", 0), 0o600)
        deadline = time.monotonic() + 5.0
        while True:
            try:
                fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except OSError:
                if time.monotonic() >= deadline:
                    break  # fail-open: still write (atomic temp+replace remains torn-write safe)
                time.sleep(0.05)
    except OSError:
        lock_fd = None
    try:
        parent = _os.path.dirname(str(path)) or "."
        _os.makedirs(parent, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=parent, suffix=".tmp")
        try:
            with _os.fdopen(fd, "w") as fh:
                fh.write(payload)
                fh.flush()
                _os.fsync(fh.fileno())
            _os.replace(tmp, path)
        except OSError:
            with contextlib.suppress(OSError):
                _os.unlink(tmp)
            raise
        # fsync the parent dir so the rename is durable across a crash (mirrors the cron _save).
        with contextlib.suppress(OSError):
            dir_fd = _os.open(parent, _os.O_RDONLY)
            try:
                _os.fsync(dir_fd)
            finally:
                _os.close(dir_fd)
    finally:
        if lock_fd is not None:
            with contextlib.suppress(OSError):
                fcntl.flock(lock_fd, fcntl.LOCK_UN)
            with contextlib.suppress(OSError):
                _os.close(lock_fd)
    return len(encoded)


def _state_is_populated(doc: object) -> bool:
    """True when ``doc`` is a dict carrying at least one card or pipeline."""
    if not isinstance(doc, dict):
        return False
    cards = doc.get("cards")
    pipelines = doc.get("pipelines")
    return bool((isinstance(cards, list) and cards) or (isinstance(pipelines, list) and pipelines))


async def _handle_state_write(request: web.Request) -> web.StreamResponse:
    """POST the full DLC-YOLO state object as JSON and write it uncapped to the resolved path.

    Validates a card-shaped dict (has 'cards' and/or 'pipelines' lists; a non-dict or a dict with
    NEITHER list is 400 invalid shape). Clobber guard: an empty incoming state (no cards, no
    pipelines) over a populated on-disk file is 409. Writes atomically + durably off the event loop.
    """
    raw = await _read_bounded(request, MAX_STATE_WRITE_REQUEST_BYTES)
    if raw is None:
        return web.json_response(
            {"code": "state_too_large", "error": "state body is too large"}, status=413,
        )
    try:
        body = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return web.json_response(
            {"code": "malformed_json", "error": "state must be JSON"}, status=400,
        )
    # Shape: a dict with a 'cards' list and/or a 'pipelines' list. Reject a non-dict or a dict that
    # carries NEITHER a cards list nor a pipelines list — that is not a state document.
    if not isinstance(body, dict) or not (
        isinstance(body.get("cards"), list) or isinstance(body.get("pipelines"), list)
    ):
        return web.json_response(
            {"code": "invalid_state_shape", "error": "invalid state shape"}, status=400,
        )
    # Clobber guard (mirrors cron _save): refuse to write an empty state (no cards AND no pipelines)
    # over a currently-populated on-disk file. A genuinely-empty board is only writable when the
    # on-disk state is also empty/absent.
    if not _state_is_populated(body):
        existing = await asyncio.to_thread(_read_state_document)
        if _state_is_populated(existing):
            return web.json_response(
                {"code": "would_clobber", "error": "refusing to overwrite populated state with an empty body"},
                status=409,
            )
    try:
        written = await asyncio.to_thread(_write_state_document, body)
    except OSError as exc:
        logger.warning("DLC-YOLO state write failed: %s", exc)
        return web.json_response(
            {"code": "state_write_failed", "error": "could not persist state"}, status=500,
        )
    return web.json_response({"ok": True, "bytes": written})


def _load_inotify_watch_module():
    """Load the sibling ``backend/inotify_watch.py`` by path (proxy loader safe)."""
    try:
        from backend import inotify_watch as _mod  # noqa: PLC0415

        return _mod
    except ImportError:
        import importlib.util  # noqa: PLC0415
        from pathlib import Path  # noqa: PLC0415

        target = Path(__file__).resolve().parent / "inotify_watch.py"
        spec = importlib.util.spec_from_file_location(
            "_kirocrew_app_dlc_yolo_inotify", target)
        if spec is None or spec.loader is None:
            raise
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module


async def _start_state_watch(app: web.Application) -> None:
    """Arm the poll-free inotify wake. Fail-open: any error leaves the 120s poll as the wake."""
    try:
        mod = _load_inotify_watch_module()
        watcher = mod.StateFileWatcher(_resolve_state_path(), on_change=_wake_advance)
        await watcher.start()
        app[_STATE_WATCH_KEY] = watcher
    except Exception:  # noqa: BLE001 - never let watch setup crash the backend
        logger.warning("DLC-YOLO state inotify watch could not start; poll remains the wake",
                       exc_info=True)


async def _stop_state_watch(app: web.Application) -> None:
    watcher = app.get(_STATE_WATCH_KEY)
    if watcher is not None:
        with contextlib.suppress(Exception):
            await watcher.stop()


# ── Live crew-stream (docs/live-crew-stream-spec.md) ─────────────────────────────────────────
# A crew subagent's output is written live to ~/.kiro/crew/subagents/{agent_id}/result.txt. The
# CrewStreamWatcher tails those files and hands each delta here; this fold resolves which card+step
# spawned that agent_id (from pass_schedule / child_runs provenance the step-agent records), redacts
# + bounds the delta to ONE line, and appends it to card.step_progress[step] tagged phase="crew".
# Presentation-only: step_progress is never control-authoritative, is dropped at step-terminal, and
# is excluded from the parity-minimized projection. Atomic + mtime-guarded so it never clobbers a
# concurrent advance-cron write. Fail-open throughout.
_CREW_WATCH_KEY: web.AppKey[object] = web.AppKey("dlc_yolo_crew_watch", object)
_CREW_STREAM_ROOT = "~/.kiro/crew/subagents"
_CREW_NOTE_MAX = 120           # mirrors _STEP_PROGRESS_NOTE_MAX in the impl
_CREW_TRAIL_MAX_LINES = 12     # mirrors _STEP_PROGRESS_MAX_LINES

# Minimal redaction floor (defence-in-depth; the trail is presentation-only and projection-excluded).
_CREW_REDACT = re.compile(
    r"(?i)(sk-[A-Za-z0-9]{8,}|ghp_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_\-]{10,}\."
    r"[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}|AKIA[0-9A-Z]{12,}|"
    r"(?:token|secret|password|api[_-]?key)\s*[=:]\s*\S+)")


def _crew_bounded_note(text: str) -> str:
    """Collapse a raw crew-output delta to one short, redacted trail note."""
    one = " ".join(str(text or "").split())
    one = _CREW_REDACT.sub("[redacted]", one)
    if len(one) > _CREW_NOTE_MAX:
        one = one[: _CREW_NOTE_MAX - 1].rstrip() + "…"
    return one


def _crew_owner(state: dict, agent_id: str) -> tuple[dict, str] | None:
    """Find the (card, step_id) whose recorded provenance names this crew agent_id as a LIVE
    (non-terminal) pass. Reads pass_schedule[step] runs and child_runs[step]; returns None when the
    id is unknown or its step is already terminal (so a finished crew never re-folds)."""
    terminal = {"done", "advanced", "blocked", "error", "complete", "completed", "terminal"}
    for card in state.get("cards") or []:
        if not isinstance(card, dict):
            continue
        statuses = card.get("step_status") if isinstance(card.get("step_status"), dict) else {}
        # pass_schedule[step].nodes[].runs[] and child_runs[step] both carry observed ids.
        ps = card.get("pass_schedule") if isinstance(card.get("pass_schedule"), dict) else {}
        cr = card.get("child_runs") if isinstance(card.get("child_runs"), dict) else {}
        for step_id in set(ps) | set(cr):
            if str(statuses.get(step_id) or "") in terminal:
                continue
            blob = json.dumps([ps.get(step_id), cr.get(step_id)], default=str)
            if agent_id in blob:
                return card, step_id
    return None


async def _fold_crew_tail(agent_id: str, text: str) -> None:
    """Fold a bounded, redacted crew-output delta into the owning card's step_progress trail."""
    note = _crew_bounded_note(text)
    if not note:
        return
    path = _resolve_state_path()
    from pathlib import Path  # noqa: PLC0415
    import os as _os, tempfile, fcntl  # noqa: PLC0415
    # ROOT-2: take the SAME cross-process lock the advance cron holds over its RMW cycle, so this
    # fold's read→write cannot interleave-and-lose against a cron _save (or vice versa). The lock is
    # an advisory flock on the sidecar `<state>.json.lock`; fail-open (a failed acquire still folds,
    # the mtime guard below remains as a second line). Presentation-only write, so a dropped fold
    # is harmless — but taking the lock stops the fold from CLOBBERING a cron control-state write.
    lock_path = (str(path)[:-5] + ".json.lock") if str(path).endswith(".json") else (str(path) + ".lock")
    lock_fd = None
    try:
        lock_fd = _os.open(lock_path, _os.O_CREAT | _os.O_RDWR | getattr(_os, "O_CLOEXEC", 0), 0o600)
        deadline = __import__("time").monotonic() + 5.0
        while True:
            try:
                fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except OSError:
                if __import__("time").monotonic() >= deadline:
                    break  # fail-open
                await __import__("asyncio").sleep(0.05)
    except OSError:
        lock_fd = None
    try:
        _fold_crew_tail_locked(agent_id, note, path, _os, tempfile)
    finally:
        if lock_fd is not None:
            with contextlib.suppress(OSError):
                fcntl.flock(lock_fd, fcntl.LOCK_UN)
            with contextlib.suppress(OSError):
                _os.close(lock_fd)


def _fold_crew_tail_locked(agent_id, note, path, _os, tempfile):
    from pathlib import Path  # noqa: PLC0415
    try:
        m0 = _os.path.getmtime(path)
        state = json.loads(Path(path).read_text("utf-8"))
    except (OSError, ValueError):
        return
    if not isinstance(state, dict) or not state.get("cards"):
        return
    owner = _crew_owner(state, agent_id)
    if owner is None:
        return
    card, step_id = owner
    progress = card.setdefault("step_progress", {})
    if not isinstance(progress, dict):
        return
    entry = progress.setdefault(step_id, {"schema_version": 1, "step": step_id, "lines": []})
    lines = entry.setdefault("lines", [])
    if not isinstance(lines, list):
        return
    # Dedup an identical consecutive crew note (a re-read of the same tail).
    if lines and isinstance(lines[-1], dict) and lines[-1].get("note") == note \
            and lines[-1].get("phase") == "crew":
        return
    seq = (max((ln.get("seq") or 0 for ln in lines if isinstance(ln, dict)), default=0)) + 1
    now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    lines.append({"seq": seq, "at": now, "phase": "crew", "note": note})
    if len(lines) > _CREW_TRAIL_MAX_LINES:
        entry["lines"] = lines[-_CREW_TRAIL_MAX_LINES:]
    card["updated_at"] = now
    # mtime guard: bail (drop this fold) if a concurrent writer touched state while we worked. The
    # trail is presentation-only, so a dropped fold is harmless — the next append re-syncs.
    try:
        if _os.path.getmtime(path) != m0:
            return
        fd, tmp = tempfile.mkstemp(dir=_os.path.dirname(path), suffix=".tmp")
        with _os.fdopen(fd, "w") as fh:
            json.dump(state, fh, indent=2)
            fh.flush()
            _os.fsync(fh.fileno())
        _os.replace(tmp, path)
    except OSError:
        with contextlib.suppress(Exception):
            _os.unlink(tmp)  # type: ignore[name-defined]


async def _start_crew_watch(app: web.Application) -> None:
    """Arm the live crew-stream watcher. Fail-open: any error leaves no live crew tail."""
    try:
        import os as _os  # noqa: PLC0415
        from pathlib import Path  # noqa: PLC0415
        target = Path(__file__).resolve().parent / "crew_stream.py"
        import importlib.util  # noqa: PLC0415
        spec = importlib.util.spec_from_file_location(
            "_kirocrew_app_dlc_yolo_crewstream", target)
        if spec is None or spec.loader is None:
            return
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        root = Path(_os.path.expanduser(_CREW_STREAM_ROOT))
        watcher = mod.CrewStreamWatcher(root, on_fold=_fold_crew_tail)
        await watcher.start()
        app[_CREW_WATCH_KEY] = watcher
    except Exception:  # noqa: BLE001 - never let watch setup crash the backend
        logger.warning("DLC-YOLO crew-stream watch could not start; no live crew tail",
                       exc_info=True)


async def _stop_crew_watch(app: web.Application) -> None:
    watcher = app.get(_CREW_WATCH_KEY)
    if watcher is not None:
        with contextlib.suppress(Exception):
            await watcher.stop()


def register_routes(app: web.Application) -> None:
    """LEGACY in-process registration — NOT the production path.

    DLC-YOLO ships as a THIRD-PARTY app whose backend is the spawned
    ``entryPoint`` server (``backend/server.py`` → ``build_app()``), which mounts
    the handlers below directly at ``/api/webhook/*`` + ``/api/agents/crew`` and
    is reached via the gateway proxy at ``/apps/dlc-yolo/api/*``. This function
    is the OLD in-process built-in convention (``BASE`` = ``/api/apps/dlc-yolo``)
    that the gateway would only honour for ``kiro_crew.apps.builtins.*`` — it is
    never invoked in production. It is retained solely as a stable harness for
    the receiver-lifecycle unit tests in ``tests/test_webhook_backend.py``; the
    live control-route wiring lives in ``build_app()``. Do not add new callers.
    """
    if _LISTENER_STATE not in app:
        app[_LISTENER_STATE] = {
            "status": "disabled", "runner": None, "port": None, "last_error": None,
        }
    app.router.add_get(f"{BASE}/webhook/status", _require_enabled(_handle_status))
    app.router.add_get(f"{BASE}/webhook/config", _require_enabled(_handle_config))
    app.router.add_post(f"{BASE}/webhook/config", _require_enabled(_handle_config_update))
    app.router.add_post(f"{BASE}/agents/crew", _require_enabled(_handle_crew_route_update))
    app.router.add_get(f"{BASE}/state", _require_enabled(_handle_state))
    app.router.add_post(f"{BASE}/state", _require_enabled(_handle_state_write))
    app.on_startup.append(_start_listener)
    app.on_cleanup.append(_stop_listener)
    app.on_startup.append(_start_state_watch)
    app.on_cleanup.append(_stop_state_watch)
    app.on_startup.append(_start_crew_watch)
    app.on_cleanup.append(_stop_crew_watch)
    logger.info("DLC-YOLO webhook backend registered")
