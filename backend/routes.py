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


async def _wake_advance() -> None:
    """Best-effort public-CLI wake; the 120-second poll remains repair."""
    executable = shutil.which("kirocrew")
    if not executable:
        return
    try:
        proc = await asyncio.create_subprocess_exec(
            executable, "cron", "trigger", _advance_job_id(),
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.wait(), timeout=10)
        if proc.returncode != 0:
            logger.warning("DLC-YOLO webhook accepted; immediate advance wake failed")
    except (OSError, asyncio.TimeoutError):
        logger.warning("DLC-YOLO webhook accepted; immediate advance wake unavailable")


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
    app.on_startup.append(_start_listener)
    app.on_cleanup.append(_stop_listener)
    logger.info("DLC-YOLO webhook backend registered")
