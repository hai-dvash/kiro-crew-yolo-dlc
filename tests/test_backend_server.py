"""Third-party app backend entryPoint server tests (backend/server.py).

DLC-YOLO is a third-party (registry) app, so the gateway does NOT register its
routes in-process; it spawns ``backend/server.py`` and reverse-proxies to it with
a per-request ``X-KiroCrew-Proxy`` HMAC. These tests pin that contract: the four
control routes plus /health mount, the health probe is open, and the proxy
middleware accepts a fresh valid signature while rejecting unsigned, stale, and
secret-missing requests.

Style mirrors test_webhook_backend.py: no aiohttp test plugin — the handlers are
driven directly with ``asyncio.run`` and a minimal request stub, and the whole
module is skipped unless aiohttp (a KiroCrew-host dependency) is importable.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import importlib
import sys
import time
import types
from pathlib import Path

import pytest

web = pytest.importorskip("aiohttp.web", reason="aiohttp is supplied by the KiroCrew host")

_SECRET = "s3cr3t-proxy-key-for-tests-only"


@pytest.fixture()
def server_mod(monkeypatch, tmp_path):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("KIROCREW_PROXY_SECRET", _SECRET)
    manager = types.ModuleType("kiro_crew.apps.manager")
    manager.is_app_enabled = lambda _name: True
    apps = types.ModuleType("kiro_crew.apps")
    apps.__path__ = []
    apps.manager = manager
    monkeypatch.setitem(sys.modules, "kiro_crew.apps", apps)
    monkeypatch.setitem(sys.modules, "kiro_crew.apps.manager", manager)
    monkeypatch.syspath_prepend(str(Path(__file__).resolve().parent.parent))
    sys.modules.pop("backend.server", None)
    mod = importlib.import_module("backend.server")
    return importlib.reload(mod)


class _StubURL:
    def __init__(self, raw_path_qs: str) -> None:
        self.raw_path_qs = raw_path_qs


class _StubRequest:
    """Minimal aiohttp.web.Request stand-in for the proxy-auth middleware."""

    def __init__(self, method: str, path: str, body: bytes, header: str | None) -> None:
        self.method = method
        self.path = path
        self._body = body
        self.rel_url = _StubURL(path)
        self.headers = {"X-KiroCrew-Proxy": header} if header else {}

    async def read(self) -> bytes:
        return self._body


def _sign(method: str, wire_target: str, body: bytes, *, ts: int | None = None) -> str:
    ts = int(time.time()) if ts is None else ts
    body_hash = hashlib.sha256(body or b"").hexdigest()
    msg = f"{ts}:{method}:{wire_target}:{body_hash}"
    sig = hmac.new(_SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return f"{ts}:{sig}"


def _run_middleware(mod, app, request):
    """Invoke the proxy-auth middleware with a sentinel handler.

    Returns ("handler", None) when the request passed auth and reached the
    handler, or ("blocked", response) when the middleware short-circuited.
    """
    async def _sentinel(_req):
        return ("handler-reached", None)

    async def _drive():
        result = await mod._proxy_auth_middleware(request, _sentinel)
        if isinstance(result, tuple):
            return "handler", None
        return "blocked", result

    return asyncio.run(_drive())


def test_build_app_mounts_routes_and_health(server_mod):
    app = server_mod.build_app()
    paths = {r.resource.canonical for r in app.router.routes()}
    assert "/health" in paths
    assert "/api/webhook/status" in paths
    assert "/api/webhook/config" in paths
    assert "/api/agents/crew" in paths
    assert "/api/tunnel/status" in paths
    assert "/api/tunnel/start" in paths
    assert "/api/tunnel/stop" in paths


def test_verify_proxy_accepts_fresh_signature(server_mod):
    target = "/api/webhook/status"
    req = _StubRequest("GET", target, b"", _sign("GET", target, b""))
    assert server_mod._verify_proxy(_SECRET, req, b"") is True


def test_verify_proxy_rejects_missing_header(server_mod):
    req = _StubRequest("GET", "/api/webhook/status", b"", None)
    assert server_mod._verify_proxy(_SECRET, req, b"") is False


def test_verify_proxy_rejects_stale_timestamp(server_mod):
    target = "/api/webhook/status"
    stale = _sign("GET", target, b"", ts=int(time.time()) - 3600)
    req = _StubRequest("GET", target, b"", stale)
    assert server_mod._verify_proxy(_SECRET, req, b"") is False


def test_verify_proxy_rejects_tampered_body(server_mod):
    target = "/api/webhook/config"
    sig = _sign("POST", target, b"{}")  # signed for empty-object body
    req = _StubRequest("POST", target, b'{"enabled":true}', sig)  # different body
    assert server_mod._verify_proxy(_SECRET, req, b'{"enabled":true}') is False


def test_health_path_bypasses_auth(server_mod):
    app = server_mod.build_app()
    req = _StubRequest("GET", "/health", b"", None)
    outcome, _ = _run_middleware(server_mod, app, req)
    assert outcome == "handler"


def test_unsigned_control_request_blocked(server_mod):
    app = server_mod.build_app()
    req = _StubRequest("GET", "/api/webhook/status", b"", None)
    outcome, response = _run_middleware(server_mod, app, req)
    assert outcome == "blocked"
    assert response.status == 401


def test_signed_control_request_reaches_handler(server_mod):
    app = server_mod.build_app()
    target = "/api/webhook/status"
    req = _StubRequest("GET", target, b"", _sign("GET", target, b""))
    outcome, _ = _run_middleware(server_mod, app, req)
    assert outcome == "handler"


def test_missing_secret_fails_closed(server_mod):
    app = server_mod.build_app()
    app["_dlc_proxy_secret"] = ""
    target = "/api/webhook/status"
    req = _StubRequest("GET", target, b"", _sign("GET", target, b""))
    outcome, response = _run_middleware(server_mod, app, req)
    assert outcome == "blocked"
    assert response.status == 503


# --- tunnel readiness gate ----------------------------------------------------

def _readiness(server_mod, *, source="ui", enabled=True, secret="s", repos=("o/r",),
               port=8765, listener_status="listening", listener_port=8765):
    """Drive _receiver_readiness with a stubbed effective config + listener."""
    app = server_mod.build_app()
    routes = app["_dlc_routes_mod"]
    routes.webhook.effective_webhook_config = lambda: {
        "source": source, "enabled": enabled, "secret": secret,
        "repositories": list(repos), "port": port, "inbox_path_valid": True,
    }
    app[routes._LISTENER_STATE] = {"status": listener_status, "port": listener_port}
    return server_mod._receiver_readiness(app, 8765)


def test_tunnel_gate_allows_when_receiver_ready(server_mod):
    ready, reason = _readiness(server_mod)
    assert ready is True and reason is None


def test_tunnel_gate_blocks_when_disabled(server_mod):
    ready, reason = _readiness(server_mod, enabled=False)
    assert ready is False and reason == "receiver-disabled"


def test_tunnel_gate_blocks_without_secret(server_mod):
    ready, reason = _readiness(server_mod, secret="")
    assert ready is False and reason == "receiver-secret-missing"


def test_tunnel_gate_blocks_empty_allowlist(server_mod):
    ready, reason = _readiness(server_mod, repos=())
    assert ready is False and reason == "receiver-allowlist-empty"


def test_tunnel_gate_blocks_port_mismatch(server_mod):
    ready, reason = _readiness(server_mod, port=9999)
    assert ready is False and reason == "receiver-port-mismatch"


def test_tunnel_gate_blocks_when_not_listening(server_mod):
    ready, reason = _readiness(server_mod, listener_status="disabled")
    assert ready is False and reason == "receiver-not-listening"
