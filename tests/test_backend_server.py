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
        # The proxy-auth middleware reads request.app["_dlc_proxy_secret"]. _run_middleware
        # attaches the built app before driving; default to an empty dict for direct-handler use.
        self.app: object = {}

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

    # The middleware reads request.app["_dlc_proxy_secret"]; bind the built app onto the stub.
    request.app = app

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


def _autostart_app(server_mod, *, ready=True):
    """Build an app with a stubbed tunnel mod + readiness for the auto-start hook."""
    app = server_mod.build_app()
    routes = app["_dlc_routes_mod"]
    routes.webhook.effective_webhook_config = lambda: {
        "source": "ui", "enabled": ready, "secret": "s" if ready else "",
        "repositories": ["o/r"], "port": 8765, "inbox_path_valid": True, "autosync": False,
    }
    app[routes._LISTENER_STATE] = {"status": "listening" if ready else "disabled", "port": 8765}
    started = {}

    class _StubTunnel:
        @staticmethod
        async def start(state, port):
            started["port"] = port
            state.url = "https://auto-xyz.trycloudflare.com"
            return {"public_url": state.url, "running": True}

    class _StubState:
        url = None
        on_url_captured = None
        def running(self):
            return False

    app["_dlc_tunnel_mod"] = _StubTunnel()
    app[server_mod._TUNNEL_STATE_KEY] = _StubState()
    return app, started


def test_autostart_tunnel_starts_when_receiver_ready(server_mod):
    # ROOT: a restart must bring the tunnel UP without a manual Start click. When the guarded
    # receiver is ready, the startup hook starts the tunnel on the receiver's port.
    app, started = _autostart_app(server_mod, ready=True)
    asyncio.run(server_mod._autostart_tunnel(app))
    assert started.get("port") == 8765  # tunnel started on the receiver's loopback port


def test_autostart_tunnel_skips_when_receiver_not_ready(server_mod):
    # SECURITY: never publish an unguarded loopback port on startup — skip when the receiver is
    # disabled/secretless/not-listening (same gate the manual Start uses).
    app, started = _autostart_app(server_mod, ready=False)
    asyncio.run(server_mod._autostart_tunnel(app))
    assert "port" not in started  # start() was never called


def test_autostart_tunnel_is_registered_on_startup(server_mod):
    # The hook must actually be wired into build_app's startup chain (regression: it existed but
    # was never registered), and AFTER the receiver listener so the readiness gate sees it up.
    app = server_mod.build_app()
    names = [getattr(h, "__name__", "") for h in app.on_startup]
    assert "_autostart_tunnel" in names
    assert names.index("_autostart_tunnel") > names.index("_start_listener")


# --- uncapped state endpoint (/api/state) -------------------------------------
# Regression guard for the 512KB board-ghosting root cause: the UI used to read
# state.json through the host /api/file-read, which truncates at 512000 bytes, so
# a large state produced chopped JSON -> 0 cards. This backend route reads the
# SAME resolved state file with no cap and returns the whole document.

def test_state_route_is_mounted(server_mod):
    app = server_mod.build_app()
    paths = {r.resource.canonical for r in app.router.routes()}
    assert "/api/state" in paths


def _run_state_handler(server_mod):
    routes = server_mod._load_routes_module()
    req = _StubRequest("GET", "/api/state", b"", None)

    async def _drive():
        return await routes._handle_state(req)

    return asyncio.run(_drive())


def test_state_route_returns_full_state_over_512kb(server_mod, monkeypatch, tmp_path):
    # Write a state file well past the host /api/file-read 512000-byte truncation cap and prove the
    # WHOLE document round-trips through the backend route (no truncation, no size cap).
    import json as _json  # local import: no product import (credential guard)

    # ~600KB of card payload — comfortably over the 512000-byte host cap.
    big_cards = [{"id": f"card-{i}", "title": "x" * 200} for i in range(3000)]
    doc = {"cards": big_cards, "pipelines": [{"id": "pl-1"}], "config": {"trust": "assisted"}}
    serialized = _json.dumps(doc)
    assert len(serialized) > 512000  # the exact condition that broke the file-read path

    state_file = tmp_path / "state.json"
    state_file.write_text(serialized, encoding="utf-8")
    # _resolve_state_path honors an absolute DLC_YOLO_STATE first — point it at our temp file.
    monkeypatch.setenv("DLC_YOLO_STATE", str(state_file))

    response = _run_state_handler(server_mod)
    assert response.status == 200
    returned = _json.loads(response.text)
    assert len(returned["cards"]) == 3000  # every card survived — no 512KB truncation
    assert returned["cards"][-1]["id"] == "card-2999"
    assert returned["pipelines"] == [{"id": "pl-1"}]
    assert returned["config"] == {"trust": "assisted"}


def test_state_route_empty_valid_shape_when_absent(server_mod, monkeypatch, tmp_path):
    # A missing state file must yield the empty-but-valid shape at 200 so the UI renders an empty
    # board (never errors / blanks).
    import json as _json

    missing = tmp_path / "does-not-exist" / "state.json"
    monkeypatch.setenv("DLC_YOLO_STATE", str(missing))

    response = _run_state_handler(server_mod)
    assert response.status == 200
    returned = _json.loads(response.text)
    assert returned == {"cards": [], "pipelines": [], "config": {}}


def test_state_route_empty_valid_shape_on_malformed_json(server_mod, monkeypatch, tmp_path):
    # Corrupt/partial JSON (e.g. a torn write) must also degrade to the empty-but-valid shape at
    # 200 rather than surfacing a parse error to the UI.
    import json as _json

    state_file = tmp_path / "state.json"
    state_file.write_text('{"cards": [', encoding="utf-8")  # truncated / invalid JSON
    monkeypatch.setenv("DLC_YOLO_STATE", str(state_file))

    response = _run_state_handler(server_mod)
    assert response.status == 200
    returned = _json.loads(response.text)
    assert returned == {"cards": [], "pipelines": [], "config": {}}


# --- uncapped state WRITE endpoint (POST /api/state) ---------------------------
# The WRITE-side mirror of the read regression above: the UI mutated state by POSTing the FULL
# state.json to the host /api/file-write, whose `content` is capped at 512000 bytes. Once state
# grew past that, every gate Approve/reject/config/cancel failed 400 "invalid input". POST
# /api/state writes the SAME resolved file uncapped + atomically.


class _StubWriteRequest(_StubRequest):
    """POST stand-in: adds the ``content_length`` attribute ``_read_bounded`` inspects."""

    def __init__(self, body: bytes) -> None:
        super().__init__("POST", "/api/state", body, None)
        self.content_length = len(body)


def _run_state_write(server_mod, body: bytes):
    routes = server_mod._load_routes_module()
    req = _StubWriteRequest(body)

    async def _drive():
        return await routes._handle_state_write(req)

    return asyncio.run(_drive())


def test_state_write_route_is_mounted(server_mod):
    app = server_mod.build_app()
    post_state = [
        r for r in app.router.routes()
        if r.resource.canonical == "/api/state" and r.method == "POST"
    ]
    assert post_state, "POST /api/state must be mounted for uncapped state writes"


def test_state_write_roundtrips_over_512kb(server_mod, monkeypatch, tmp_path):
    # Write a >512KB state through the POST route and prove it round-trips through GET with no cap.
    import json as _json

    big_cards = [{"id": f"card-{i}", "title": "y" * 200} for i in range(3000)]
    doc = {"cards": big_cards, "pipelines": [{"id": "pl-1"}], "config": {"trust": "assisted"}}
    serialized = _json.dumps(doc)
    assert len(serialized) > 512000  # exactly the size that broke the capped host file-write

    state_file = tmp_path / "state.json"
    monkeypatch.setenv("DLC_YOLO_STATE", str(state_file))

    write_resp = _run_state_write(server_mod, serialized.encode("utf-8"))
    assert write_resp.status == 200
    payload = _json.loads(write_resp.text)
    assert payload["ok"] is True
    assert payload["bytes"] > 512000

    # It landed on disk...
    assert state_file.exists()
    # ...and the WHOLE document reads back through the uncapped GET route.
    returned = _json.loads(_run_state_handler(server_mod).text)
    assert len(returned["cards"]) == 3000
    assert returned["cards"][-1]["id"] == "card-2999"
    assert returned["pipelines"] == [{"id": "pl-1"}]


def test_state_write_rejects_non_card_body(server_mod, monkeypatch, tmp_path):
    # A body that is neither a dict with a cards list nor a pipelines list is 400 invalid shape.
    import json as _json

    monkeypatch.setenv("DLC_YOLO_STATE", str(tmp_path / "state.json"))
    for bad in (b'"just a string"', b'42', b'{"unrelated": true}', b'[]'):
        resp = _run_state_write(server_mod, bad)
        assert resp.status == 400, f"expected 400 for body {bad!r}"
        assert _json.loads(resp.text)["error"] == "invalid state shape"


def test_state_write_rejects_malformed_json(server_mod, monkeypatch, tmp_path):
    import json as _json

    monkeypatch.setenv("DLC_YOLO_STATE", str(tmp_path / "state.json"))
    resp = _run_state_write(server_mod, b'{"cards": [')
    assert resp.status == 400
    assert _json.loads(resp.text)["code"] == "malformed_json"


def test_state_write_clobber_guard_empty_over_populated(server_mod, monkeypatch, tmp_path):
    # An empty (no cards, no pipelines) body over a POPULATED on-disk file is 409 — mirrors the
    # cron _save clobber guard so a stale/racing UI write can't wipe a live board.
    import json as _json

    state_file = tmp_path / "state.json"
    state_file.write_text(
        _json.dumps({"cards": [{"id": "card-live"}], "pipelines": [{"id": "pl-1"}]}),
        encoding="utf-8",
    )
    monkeypatch.setenv("DLC_YOLO_STATE", str(state_file))

    # Empty-but-shaped body (has the lists, but both empty) over populated state -> 409.
    resp = _run_state_write(server_mod, b'{"cards": [], "pipelines": []}')
    assert resp.status == 409
    assert _json.loads(resp.text)["code"] == "would_clobber"
    # The populated file is untouched.
    on_disk = _json.loads(state_file.read_text("utf-8"))
    assert on_disk["cards"] == [{"id": "card-live"}]


def test_state_write_empty_over_empty_is_allowed(server_mod, monkeypatch, tmp_path):
    # An empty body over an ABSENT/empty file is fine (first-run / genuine reset).
    import json as _json

    state_file = tmp_path / "state.json"
    monkeypatch.setenv("DLC_YOLO_STATE", str(state_file))

    resp = _run_state_write(server_mod, b'{"cards": [], "pipelines": []}')
    assert resp.status == 200
    assert _json.loads(resp.text)["ok"] is True
    assert _json.loads(state_file.read_text("utf-8")) == {"cards": [], "pipelines": []}
