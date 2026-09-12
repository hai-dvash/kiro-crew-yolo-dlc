"""DLC-YOLO third-party app backend — standalone aiohttp entryPoint server.

Why this file exists
--------------------
KiroCrew mounts app backends two different ways, and DLC-YOLO was using the
wrong one. A *built-in* app (living inside ``kiro_crew.apps.builtins.*``) is
registered IN-PROCESS at gateway startup — the dashboard calls its
``register_routes(app)`` against the shared dashboard ``aiohttp`` application
(``kiro_crew/dashboard/routes/system.py``). A *third-party* installed app (which
DLC-YOLO is — ``origin: registry``, source outside the package) is never given
that in-process hook. Instead the gateway SPAWNS its backend as a subprocess
declared by ``backend.entryPoint`` and reverse-proxies ``/api/apps/dlc-yolo/*``
to it (``kiro_crew/apps/backend.py``: ``start_enabled_app_backends`` skips any
manifest without ``backend.entryPoint``).

The manifest previously declared ``backend.routes`` (the built-in convention),
so the gateway registered nothing and spawned nothing — every
``/api/apps/dlc-yolo/webhook/*`` request 404'd, which the UI maps to the
"Webhook backend unavailable" banner. This module is the correct third-party
shape: a self-contained server the gateway launches with
``python backend/server.py`` and forwards authenticated requests to.

Runtime contract (from ``kiro_crew/apps/backend.py`` + ``apps/routes.py``)
--------------------------------------------------------------------------
* Launched as ``[sys.executable, "backend/server.py"]`` with env:
  ``PORT`` (loopback port to bind), ``KIROCREW_APP_NAME``, and
  ``KIROCREW_PROXY_SECRET`` (the app's ``.app_secret``).
* Must bind ``127.0.0.1:$PORT`` only.
* Every forwarded request carries ``X-KiroCrew-Proxy: <ts>:<hmac-sha256>`` where
  the HMAC is ``HMAC-SHA256(secret, "{ts}:{method}:{raw_path_qs}:{sha256(body)}")``
  and ``ts`` is within ±60s. We verify it and reject anything else, so the
  loopback port is not an unauthenticated control surface.
* The reverse proxy does NOT strip the ``/api/apps/dlc-yolo`` prefix, so the
  routes ``register_routes`` mounts at ``/api/apps/dlc-yolo/...`` match the path
  this server actually sees.
* ``healthCheck: "/health"`` — a fast unauthenticated liveness probe the gateway
  hits to adopt/supervise the process.
"""

from __future__ import annotations

import hashlib
import hmac
import importlib.util
import json
import logging
import os
import sys
import time
from pathlib import Path

import asyncio
import contextlib

from aiohttp import web

logger = logging.getLogger("kirocrew.app.dlc-yolo.backend")

_PROXY_HEADER = "X-KiroCrew-Proxy"
_PROXY_SKEW_SECONDS = 60
_HEALTH_PATH = "/health"


def _load_routes_module():
    """Import the sibling ``backend/routes.py`` without relying on ``sys.path``.

    When the gateway spawns ``python backend/server.py``, the app root is the
    working directory's parent of ``backend/`` but ``backend`` is not guaranteed
    to be an importable top-level package. Load ``routes.py`` by path anchored to
    this file, mirroring the guard already used inside ``routes.py`` for its
    ``crons`` sibling.
    """
    try:
        from backend import routes as _routes  # noqa: PLC0415

        return _routes
    except ModuleNotFoundError:
        target = Path(__file__).resolve().parent / "routes.py"
        spec = importlib.util.spec_from_file_location(
            "_kirocrew_app_dlc_yolo_routes", target
        )
        if spec is None or spec.loader is None:  # pragma: no cover - defensive
            raise
        module = importlib.util.module_from_spec(spec)
        # Register under its key BEFORE exec so the module's own relative helpers
        # resolve consistently if it re-imports itself.
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module


def _load_tunnel_module():
    """Import the sibling ``backend/tunnel.py`` (same path-anchored guard)."""
    try:
        from backend import tunnel as _tunnel  # noqa: PLC0415

        return _tunnel
    except ModuleNotFoundError:
        target = Path(__file__).resolve().parent / "tunnel.py"
        spec = importlib.util.spec_from_file_location(
            "_kirocrew_app_dlc_yolo_tunnel", target
        )
        if spec is None or spec.loader is None:  # pragma: no cover - defensive
            raise
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module


def _load_crons_module():
    """Import the sibling ``backend/crons.py`` (same path-anchored guard)."""
    try:
        from backend import crons as _crons  # noqa: PLC0415

        return _crons
    except ModuleNotFoundError:
        target = Path(__file__).resolve().parent / "crons.py"
        spec = importlib.util.spec_from_file_location(
            "_kirocrew_app_dlc_yolo_crons", target
        )
        if spec is None or spec.loader is None:  # pragma: no cover - defensive
            raise
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module


def _load_orchestrator_module():
    """Import the sibling ``backend/orchestrator.py`` (same path-anchored guard)."""
    try:
        from backend import orchestrator as _orch  # noqa: PLC0415

        return _orch
    except ModuleNotFoundError:
        target = Path(__file__).resolve().parent / "orchestrator.py"
        spec = importlib.util.spec_from_file_location(
            "_kirocrew_app_dlc_yolo_orchestrator", target
        )
        if spec is None or spec.loader is None:  # pragma: no cover - defensive
            raise
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module


def _load_autosync_module():
    """Import the sibling ``backend/autosync.py`` (same path-anchored guard)."""
    try:
        from backend import autosync as _autosync  # noqa: PLC0415

        return _autosync
    except ModuleNotFoundError:
        target = Path(__file__).resolve().parent / "autosync.py"
        spec = importlib.util.spec_from_file_location(
            "_kirocrew_app_dlc_yolo_autosync", target
        )
        if spec is None or spec.loader is None:  # pragma: no cover - defensive
            raise
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module


async def _run_gh(arguments: list[str]) -> tuple[int, str]:
    """Run one ``gh`` invocation without a shell or inherited stdin.

    Mirrors routes._run_agent_cli: exec-not-shell, DEVNULL stdin, captured
    output. Uses the ambient ``gh`` auth; never handles a token or secret.
    """
    import shutil  # noqa: PLC0415

    executable = shutil.which("gh")
    if not executable:
        raise FileNotFoundError("gh")
    process = await asyncio.create_subprocess_exec(
        executable, *arguments,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        out, _ = await asyncio.wait_for(process.communicate(), timeout=20)
    except asyncio.TimeoutError:  # pragma: no cover - defensive
        with contextlib.suppress(ProcessLookupError):
            process.kill()
        return 124, ""
    return (process.returncode or 0), out.decode("utf-8", "replace")


def _verify_proxy(secret: str, request: web.Request, body: bytes) -> bool:
    """Constant-time verify the gateway's per-request HMAC.

    Signature is over ``"{ts}:{method}:{raw_path_qs}:{sha256(body)}"``; the
    gateway signs the WIRE-encoded path+query (``rel_url.raw_path_qs``), so we
    verify against the same to avoid decode mismatches.
    """
    header = request.headers.get(_PROXY_HEADER, "")
    ts, _, sig = header.partition(":")
    if not ts or not sig:
        return False
    try:
        skew = abs(int(time.time()) - int(ts))
    except ValueError:
        return False
    if skew > _PROXY_SKEW_SECONDS:
        return False
    body_hash = hashlib.sha256(body or b"").hexdigest()
    wire_target = request.rel_url.raw_path_qs
    msg = f"{ts}:{request.method}:{wire_target}:{body_hash}"
    expected = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)


@web.middleware
async def _proxy_auth_middleware(request: web.Request, handler):
    """Reject any request that did not arrive signed by the gateway proxy.

    The health endpoint stays open (the gateway probes it before it can sign
    anything meaningful, and it discloses nothing). Everything else must carry a
    valid, fresh ``X-KiroCrew-Proxy`` HMAC. The body is read here once and cached
    on the request so the HMAC binds the exact bytes the handler will parse.
    """
    if request.path == _HEALTH_PATH:
        return await handler(request)

    secret = request.app["_dlc_proxy_secret"]
    if not secret:
        # No secret means the gateway cannot authenticate us and we cannot
        # authenticate it — fail closed rather than serve an open control plane.
        return web.json_response(
            {"code": "proxy_secret_missing", "error": "backend has no proxy secret"},
            status=503,
        )
    body = await request.read()
    if not _verify_proxy(secret, request, body):
        return web.json_response(
            {"code": "proxy_unauthenticated", "error": "invalid proxy signature"},
            status=401,
        )
    # aiohttp caches the read body on the request payload, so downstream
    # ``request.read()`` / ``request.json()`` / the bounded readers in routes.py
    # re-yield the same bytes without a second network read.
    return await handler(request)


async def _handle_health(_request: web.Request) -> web.StreamResponse:
    return web.json_response({"status": "ok", "app": "dlc-yolo"})


# --- Cloudflare quick-tunnel controls (app-managed, optional) ------------------
# The receiver binds 127.0.0.1 only; GitHub needs a public relay. These routes
# let the user START/STOP a cloudflared quick tunnel from the UI — and the status
# always reports the exact command, so a user who prefers to run it themselves
# can copy it instead. cloudflared is never auto-installed.
_TUNNEL_STATE_KEY = "_dlc_tunnel_state"


def _tunnel_target_port(app: web.Application) -> int:
    """Port the tunnel should forward to = the configured receiver loopback port."""
    routes = app["_dlc_routes_mod"]
    config = routes.webhook.effective_webhook_config()
    port = config.get("port")
    return int(port) if isinstance(port, int) else 8765


def _receiver_readiness(app: web.Application, port: int) -> tuple[bool, str | None]:
    """Whether it is SAFE to expose ``port`` publicly via the tunnel.

    A quick tunnel forwards the WHOLE loopback origin, so we only start one when
    the DLC-YOLO GitHub receiver — a dedicated aiohttp app that registers exactly
    ``POST /github`` and rejects everything else — is the thing actually
    listening on ``port``, is enabled, and has a webhook secret set (so every
    forwarded delivery is HMAC-verified). This refuses to publish an empty port,
    a secretless (effectively open) receiver, or a port pointing at some other
    loopback service.
    """
    routes = app["_dlc_routes_mod"]
    config = routes.webhook.effective_webhook_config()
    if config.get("source") == "invalid":
        return False, "receiver-config-invalid"
    if not config.get("enabled"):
        return False, "receiver-disabled"
    if not config.get("secret"):
        return False, "receiver-secret-missing"
    if not config.get("repositories"):
        return False, "receiver-allowlist-empty"
    if config.get("port") != port:
        return False, "receiver-port-mismatch"
    # The receiver must actually be listening on this loopback port — not merely
    # configured — before we point a public URL at it.
    listener = app.get(routes._LISTENER_STATE, {})
    if not (isinstance(listener, dict) and listener.get("status") == "listening"
            and listener.get("port") == port):
        return False, "receiver-not-listening"
    return True, None


async def _handle_tunnel_status(request: web.Request) -> web.StreamResponse:
    tunnel = request.app["_dlc_tunnel_mod"]
    state = request.app[_TUNNEL_STATE_KEY]
    payload = tunnel.status(state)
    port = _tunnel_target_port(request.app)
    ready, reason = _receiver_readiness(request.app, port)
    payload["target_port"] = port
    payload["receiver_ready"] = ready
    payload["receiver_block_reason"] = reason
    return web.json_response(payload)


async def _handle_tunnel_start(request: web.Request) -> web.StreamResponse:
    tunnel = request.app["_dlc_tunnel_mod"]
    state = request.app[_TUNNEL_STATE_KEY]
    port = _tunnel_target_port(request.app)
    # SECURITY: never publish a loopback port unless the guarded GitHub receiver
    # is the verified, enabled, secret-protected listener on it.
    ready, reason = _receiver_readiness(request.app, port)
    if not ready:
        payload = tunnel.status(state)
        payload["target_port"] = port
        payload["receiver_ready"] = False
        payload["receiver_block_reason"] = reason
        return web.json_response(payload, status=409)

    # Register a late-capture hook BEFORE starting: if cloudflared announces the URL
    # after start()'s bounded wait, the reader fires this and auto-sync runs then —
    # so a slow banner never leaves GitHub pointed at a stale URL with no sync.
    already_running = state.running()
    async def _on_url(url: str) -> None:
        # url is the base https://<id>.trycloudflare.com; _maybe_autosync/autosync_hooks
        # append the /github path themselves.
        with contextlib.suppress(Exception):
            await _maybe_autosync(request.app, url)
    try:
        state.on_url_captured = _on_url
    except Exception:  # pragma: no cover - defensive
        pass

    payload = await tunnel.start(state, port)
    payload["target_port"] = port
    payload["receiver_ready"] = True
    payload["receiver_block_reason"] = None
    # Self-healing quick-tunnel (auto-sync). Fire it whenever the live URL is KNOWN —
    # both on a fresh capture AND on the already-running short-circuit (a re-Start is
    # exactly when the user wants a stale GitHub hook healed). A late capture is handled
    # by the on_url_captured callback above. Best-effort: never fails the start.
    live_url = payload.get("public_url")
    if live_url:
        payload["autosync"] = await _maybe_autosync(request.app, live_url)
    elif already_running:
        # start() short-circuited on an already-running tunnel; use its known url.
        payload["autosync"] = await _maybe_autosync(request.app, getattr(state, "url", None))
    else:
        # URL not captured yet — the late-capture callback will sync when it lands.
        payload["autosync"] = {"enabled": True, "status": "awaiting-url-capture"} \
            if _autosync_enabled(request.app) else None
    status_code = 200 if payload.get("running") else (
        409 if not payload.get("installed") else 502
    )
    return web.json_response(payload, status=status_code)


def _autosync_enabled(app: web.Application) -> bool:
    try:
        return bool(app["_dlc_routes_mod"].webhook.effective_webhook_config().get("autosync"))
    except Exception:  # pragma: no cover - defensive
        return False


async def _maybe_autosync(app: web.Application, public_url: object) -> dict | None:
    """Opt-in re-point of quick-tunnel GitHub hooks after a fresh URL capture.

    Returns a compact result dict, or None when auto-sync is off or no URL was
    captured. Never raises into the start path.
    """
    if not isinstance(public_url, str) or not public_url:
        return None
    routes = app["_dlc_routes_mod"]
    autosync = app["_dlc_autosync_mod"]
    try:
        config = routes.webhook.effective_webhook_config()
    except Exception:  # pragma: no cover - defensive
        return {"enabled": False, "error": "config-read-failed"}
    if not config.get("autosync"):
        return {"enabled": False}
    repos = list(config.get("repositories") or [])
    try:
        result = await autosync.autosync_hooks(public_url, repos, _run_gh)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("DLC-YOLO autosync failed: %s", type(exc).__name__)
        return {"enabled": True, "error": f"sync-failed:{type(exc).__name__}"}
    result["enabled"] = True
    updated = sum(1 for r in result.get("results", []) if r.get("action") == "updated")
    logger.info("DLC-YOLO autosync: %d hook(s) re-pointed to %s",
                updated, result.get("payload_url"))
    return result


async def _handle_tunnel_stop(request: web.Request) -> web.StreamResponse:
    tunnel = request.app["_dlc_tunnel_mod"]
    state = request.app[_TUNNEL_STATE_KEY]
    payload = await tunnel.stop(state)
    payload["target_port"] = _tunnel_target_port(request.app)
    return web.json_response(payload)


async def _stop_tunnel_on_cleanup(app: web.Application) -> None:
    tunnel = app.get("_dlc_tunnel_mod")
    state = app.get(_TUNNEL_STATE_KEY)
    if tunnel is not None and state is not None:
        await tunnel.stop(state)


# --- Cron control (pause/resume the app's own automation) ---------------------
async def _handle_crons_status(request: web.Request) -> web.StreamResponse:
    crons = request.app["_dlc_crons_mod"]
    return web.json_response(await crons.crons_status())


async def _handle_crons_pause(request: web.Request) -> web.StreamResponse:
    crons = request.app["_dlc_crons_mod"]
    return web.json_response(await crons.pause_crons())


async def _handle_crons_resume(request: web.Request) -> web.StreamResponse:
    crons = request.app["_dlc_crons_mod"]
    return web.json_response(await crons.resume_crons())


async def _handle_orchestrator_trigger(request: web.Request) -> web.StreamResponse:
    orch = request.app["_dlc_orchestrator_mod"]
    try:
        body = await request.read()
        data = json.loads(body.decode("utf-8")) if body else {}
    except (UnicodeDecodeError, json.JSONDecodeError):
        return web.json_response({"ok": False, "error": "malformed_json"}, status=400)
    if not isinstance(data, dict):
        return web.json_response({"ok": False, "error": "body-not-object"}, status=400)
    result = await orch.trigger_orchestrator(str(data.get("card_id") or ""))
    return web.json_response(result, status=200 if result.get("ok") else 400)


def build_app() -> web.Application:
    routes = _load_routes_module()
    tunnel = _load_tunnel_module()
    crons = _load_crons_module()
    orchestrator = _load_orchestrator_module()
    autosync = _load_autosync_module()
    app = web.Application(
        middlewares=[_proxy_auth_middleware],
        client_max_size=routes.webhook.MAX_BODY_BYTES + routes.webhook.READ_CHUNK_BYTES,
    )
    app["_dlc_proxy_secret"] = os.environ.get("KIROCREW_PROXY_SECRET", "")
    app["_dlc_routes_mod"] = routes
    app["_dlc_tunnel_mod"] = tunnel
    app["_dlc_crons_mod"] = crons
    app["_dlc_orchestrator_mod"] = orchestrator
    app["_dlc_autosync_mod"] = autosync
    app[_TUNNEL_STATE_KEY] = tunnel._TunnelState()
    app.router.add_get(_HEALTH_PATH, _handle_health)

    # Path convention for a SPAWNED third-party backend (verified against the
    # dev-fleet builtin, which uses the identical entryPoint/port/healthCheck
    # manifest): the gateway proxies ``/apps/dlc-yolo/api/<path>`` to this server
    # and forwards it as ``/api/<path>`` (kiro_crew/apps/routes.py: the proxy
    # route is ``/apps/{name}/api/{path:.*}`` and target_path = f"/api/{path}").
    # So we must serve ``/api/webhook/...`` — NOT the ``/api/apps/dlc-yolo/...``
    # paths ``register_routes`` mounts, which are the IN-PROCESS builtin
    # convention and never reach a spawned backend. The dashboard UI calls
    # ``/apps/dlc-yolo/api/webhook/...`` to match.
    require_enabled = routes._require_enabled
    app.router.add_get("/api/webhook/status", require_enabled(routes._handle_status))
    app.router.add_get("/api/webhook/config", require_enabled(routes._handle_config))
    app.router.add_post("/api/webhook/config", require_enabled(routes._handle_config_update))
    app.router.add_post("/api/agents/crew", require_enabled(routes._handle_crew_route_update))

    # Cloudflare quick-tunnel controls (guarded by app-enabled like the rest).
    app.router.add_get("/api/tunnel/status", require_enabled(_handle_tunnel_status))
    app.router.add_post("/api/tunnel/start", require_enabled(_handle_tunnel_start))
    app.router.add_post("/api/tunnel/stop", require_enabled(_handle_tunnel_stop))

    # Cron control: pause/resume the app's own automation jobs.
    app.router.add_get("/api/crons/status", require_enabled(_handle_crons_status))
    app.router.add_post("/api/crons/pause", require_enabled(_handle_crons_pause))
    app.router.add_post("/api/crons/resume", require_enabled(_handle_crons_resume))

    # Orchestrator session trigger (first-class-sessions §4): request an openable
    # pipeline-level orchestrator session for a card; the advance cron mints it.
    app.router.add_post("/api/orchestrator/trigger", require_enabled(_handle_orchestrator_trigger))

    # The separate GitHub loopback receiver (POST /github on its own fixed port)
    # is started/stopped by these lifecycle hooks — identical to register_routes.
    if routes._LISTENER_STATE not in app:
        app[routes._LISTENER_STATE] = {
            "status": "disabled", "runner": None, "port": None, "last_error": None,
        }
    app.on_startup.append(routes._start_listener)
    app.on_cleanup.append(routes._stop_listener)
    app.on_cleanup.append(_stop_tunnel_on_cleanup)
    logger.info("DLC-YOLO app backend routes mounted at /api/webhook/*, /api/agents/crew, /api/tunnel/*")
    return app


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    try:
        port = int(os.environ.get("PORT", ""))
    except ValueError:
        logger.error("DLC-YOLO backend: PORT env var missing or invalid; refusing to start")
        raise SystemExit(2)
    if not (1 <= port <= 65535):
        logger.error("DLC-YOLO backend: PORT %d out of range", port)
        raise SystemExit(2)

    app = build_app()
    logger.info("DLC-YOLO app backend starting on 127.0.0.1:%d", port)
    # host pinned to loopback: the gateway reverse-proxies to it; it is never a
    # public listener (the GitHub receiver is a SEPARATE loopback app started by
    # register_routes' on_startup hook).
    web.run_app(app, host="127.0.0.1", port=port, access_log=None, print=None)


if __name__ == "__main__":
    main()
