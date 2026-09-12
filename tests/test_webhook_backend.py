"""Priority 10 app-owned loopback receiver lifecycle and response tests."""

from __future__ import annotations

import asyncio
import importlib
import json
import sys
import types
from collections import deque
from pathlib import Path
from unittest import mock

import pytest

web = pytest.importorskip("aiohttp.web", reason="aiohttp is supplied by the KiroCrew host")


@pytest.fixture()
def routes_mod(monkeypatch, tmp_path):
    """Import the backend with the host app-manager boundary stubbed."""
    monkeypatch.setenv("HOME", str(tmp_path))
    manager = types.ModuleType("kiro_crew.apps.manager")
    manager.is_app_enabled = lambda _name: True
    apps = types.ModuleType("kiro_crew.apps")
    apps.__path__ = []
    apps.manager = manager
    monkeypatch.setitem(sys.modules, "kiro_crew.apps", apps)
    monkeypatch.setitem(sys.modules, "kiro_crew.apps.manager", manager)
    monkeypatch.syspath_prepend(str(Path(__file__).resolve().parent.parent))
    sys.modules.pop("backend.routes", None)
    module = importlib.import_module("backend.routes")
    module._RATE_TIMES.clear()
    return module


def _listener_state(module, app):
    return app[module._LISTENER_STATE]


def test_gateway_registers_authenticated_control_only(routes_mod):
    app = web.Application()
    routes_mod.register_routes(app)
    registered = {(route.method, route.resource.canonical) for route in app.router.routes()}
    assert ("GET", "/api/apps/dlc-yolo/webhook/status") in registered
    assert ("GET", "/api/apps/dlc-yolo/webhook/config") in registered
    assert ("POST", "/api/apps/dlc-yolo/webhook/config") in registered
    assert ("POST", "/api/apps/dlc-yolo/agents/crew") in registered
    assert not any(path == "/github" for _, path in registered)
    assert routes_mod._start_listener in app.on_startup
    assert routes_mod._stop_listener in app.on_cleanup


def test_listener_is_disabled_by_default(routes_mod, monkeypatch):
    monkeypatch.delenv(routes_mod.webhook.PORT_ENV, raising=False)
    monkeypatch.delenv(routes_mod.webhook.SECRET_ENV, raising=False)
    monkeypatch.delenv(routes_mod.webhook.REPOSITORIES_ENV, raising=False)
    app = web.Application()
    routes_mod.register_routes(app)

    asyncio.run(routes_mod._start_listener(app))

    assert _listener_state(routes_mod, app) == {
        "status": "disabled", "runner": None, "port": None, "last_error": None,
    }


@pytest.mark.parametrize(
    ("port", "secret", "repos", "error"),
    [
        ("80", "secret", "owner/repo", "invalid-port"),
        ("not-a-port", "secret", "owner/repo", "invalid-port"),
        ("9876", "", "owner/repo", "secret-missing"),
        ("9876", "secret", "not a repo", "repository-allowlist-empty"),
    ],
)
def test_misconfiguration_never_starts_listener(
        routes_mod, monkeypatch, port, secret, repos, error):
    monkeypatch.setenv(routes_mod.webhook.PORT_ENV, port)
    monkeypatch.setenv(routes_mod.webhook.SECRET_ENV, secret)
    monkeypatch.setenv(routes_mod.webhook.REPOSITORIES_ENV, repos)
    app = web.Application()
    routes_mod.register_routes(app)

    asyncio.run(routes_mod._start_listener(app))

    state = _listener_state(routes_mod, app)
    assert state["status"] == "misconfigured"
    assert state["runner"] is None
    assert state["last_error"] == error


def test_configured_listener_uses_only_fixed_loopback_and_post_github(
        routes_mod, monkeypatch):
    monkeypatch.setenv(routes_mod.webhook.PORT_ENV, "9876")
    monkeypatch.setenv(routes_mod.webhook.SECRET_ENV, "secret")
    monkeypatch.setenv(routes_mod.webhook.REPOSITORIES_ENV, "owner/repo")
    monkeypatch.setattr(routes_mod, "is_app_enabled", lambda _name: True)
    captured = {}

    class FakeRunner:
        def __init__(self, application, access_log=None):
            captured["receiver"] = application
            captured["access_log"] = access_log

        async def setup(self):
            captured["setup"] = True

        async def cleanup(self):
            captured["cleaned"] = True

    class FakeSite:
        def __init__(self, runner, host, port, reuse_address):
            captured.update(runner=runner, host=host, port=port,
                            reuse_address=reuse_address)

        async def start(self):
            captured["started"] = True

    monkeypatch.setattr(routes_mod.web, "AppRunner", FakeRunner)
    monkeypatch.setattr(routes_mod.web, "TCPSite", FakeSite)
    app = web.Application()
    routes_mod.register_routes(app)

    asyncio.run(routes_mod._start_listener(app))

    assert captured["host"] == "127.0.0.1" == routes_mod.webhook.LOOPBACK_HOST
    assert captured["port"] == 9876
    # SO_REUSEADDR: the receiver rebinds the SAME loopback port on every
    # Save/reload; without it a rebind races the closing socket and fails
    # EADDRINUSE, leaving the receiver 'failed'.
    assert captured["reuse_address"] is True
    receiver_routes = {
        (route.method, route.resource.canonical)
        for route in captured["receiver"].router.routes()
    }
    assert receiver_routes == {("POST", "/github")}
    assert _listener_state(routes_mod, app)["status"] == "listening"


def test_global_rate_limit_is_bounded_and_windowed(routes_mod, monkeypatch):
    monkeypatch.setattr(routes_mod, "RATE_LIMIT", 3)
    monkeypatch.setattr(routes_mod, "_RATE_TIMES", deque(maxlen=3))
    assert routes_mod._rate_allowed(100.0) is True
    assert routes_mod._rate_allowed(101.0) is True
    assert routes_mod._rate_allowed(102.0) is True
    assert routes_mod._rate_allowed(103.0) is False
    assert routes_mod._rate_allowed(161.0) is True


class _Content:
    def __init__(self, chunks):
        self._chunks = iter(chunks)

    async def read(self, _size):
        return next(self._chunks, b"")


class _Request:
    def __init__(self, body=b"{}", headers=None, content_length=None):
        self.headers = headers or {}
        self._body = body
        self.content_length = len(body) if content_length is None else content_length
        self.content = _Content([body])

    async def read(self):
        # Mirrors aiohttp: request.read() returns the full cached body.
        return self._body


def test_streaming_body_cap_checks_declared_and_actual_size(routes_mod):
    declared = _Request(b"", content_length=routes_mod.webhook.MAX_BODY_BYTES + 1)
    assert asyncio.run(routes_mod._read_capped(declared)) is None

    actual = _Request(
        b"x" * (routes_mod.webhook.MAX_BODY_BYTES + 1), content_length=None)
    actual.content_length = None
    assert asyncio.run(routes_mod._read_capped(actual)) is None


def _response_json(response):
    return json.loads(response.text)


def test_handler_maps_duplicate_to_202_without_wake(routes_mod, monkeypatch):
    record = {"event": "issues", "action": "opened"}
    monkeypatch.setattr(routes_mod, "is_app_enabled", lambda _name: True)
    monkeypatch.setattr(routes_mod, "_rate_allowed", lambda: True)
    monkeypatch.setattr(
        routes_mod.webhook, "admit_delivery",
        lambda *_a, **_k: (202, "accepted", record),
    )
    monkeypatch.setattr(
        routes_mod.webhook, "enqueue_delivery",
        lambda _record: {"status": "duplicate", "depth": 4},
    )
    wake = mock.AsyncMock()
    monkeypatch.setattr(routes_mod, "_wake_advance", wake)
    request = _Request(headers={routes_mod.webhook.DELIVERY_HEADER: "delivery-1"})

    response = asyncio.run(routes_mod._handle_github(request))

    assert response.status == 202
    assert _response_json(response) == {
        "status": "accepted", "duplicate": True,
        "delivery_id": "delivery-1", "queued": 4,
    }
    wake.assert_not_awaited()


@pytest.mark.parametrize("outcome", ["full", "error"])
def test_handler_returns_retriable_503_when_delivery_is_not_durable(
        routes_mod, monkeypatch, outcome):
    record = {"event": "issues", "action": "opened"}
    monkeypatch.setattr(routes_mod, "is_app_enabled", lambda _name: True)
    monkeypatch.setattr(routes_mod, "_rate_allowed", lambda: True)
    monkeypatch.setattr(
        routes_mod.webhook, "admit_delivery",
        lambda *_a, **_k: (202, "accepted", record),
    )
    if outcome == "full":
        monkeypatch.setattr(
            routes_mod.webhook, "enqueue_delivery",
            lambda _record: {"status": "full", "depth": 256},
        )
    else:
        def _raise(_record):
            raise routes_mod.webhook.InboxError("inbox-corrupt")
        monkeypatch.setattr(routes_mod.webhook, "enqueue_delivery", _raise)
    request = _Request(headers={routes_mod.webhook.DELIVERY_HEADER: "delivery-1"})

    response = asyncio.run(routes_mod._handle_github(request))

    assert response.status == 503
    assert response.headers["Retry-After"] == str(routes_mod.RETRY_AFTER_SECONDS)
    assert _response_json(response)["code"] in {"inbox_full", "inbox_unavailable"}


def test_handler_rate_limits_before_read_or_admission(routes_mod, monkeypatch):
    monkeypatch.setattr(routes_mod, "is_app_enabled", lambda _name: True)
    monkeypatch.setattr(routes_mod, "_rate_allowed", lambda: False)
    admission = mock.Mock()
    monkeypatch.setattr(routes_mod.webhook, "admit_delivery", admission)

    response = asyncio.run(routes_mod._handle_github(_Request()))

    assert response.status == 429
    assert response.headers["Retry-After"] == str(routes_mod.RATE_WINDOW_SECONDS)
    admission.assert_not_called()


def test_configured_listener_stays_disabled_when_app_is_disabled(routes_mod, monkeypatch):
    monkeypatch.setenv(routes_mod.webhook.PORT_ENV, "9876")
    monkeypatch.setenv(routes_mod.webhook.SECRET_ENV, "secret")
    monkeypatch.setenv(routes_mod.webhook.REPOSITORIES_ENV, "owner/repo")
    monkeypatch.setattr(routes_mod, "is_app_enabled", lambda _name: False)
    app = web.Application()
    routes_mod.register_routes(app)

    asyncio.run(routes_mod._start_listener(app))

    state = _listener_state(routes_mod, app)
    assert state["status"] == "disabled"
    assert state["port"] == 9876
    assert state["runner"] is None


def test_status_exposes_counts_and_fixed_bind_but_no_secret_or_repo_names(
        routes_mod, monkeypatch):
    secret = "must-not-appear-in-status"
    monkeypatch.setenv(routes_mod.webhook.PORT_ENV, "9876")
    monkeypatch.setenv(routes_mod.webhook.SECRET_ENV, secret)
    monkeypatch.setenv(
        routes_mod.webhook.REPOSITORIES_ENV, "owner/private-one,owner/private-two")
    monkeypatch.setattr(
        routes_mod.webhook, "inbox_status",
        lambda: {"schema_version": 1, "pending": 2, "processed": 3},
    )
    app = web.Application()
    routes_mod.register_routes(app)
    request = mock.Mock(app=app)

    response = asyncio.run(routes_mod._handle_status(request))
    payload = _response_json(response)

    assert payload["configured"] is True
    assert payload["bind"] == "127.0.0.1"
    assert payload["path"] == "/github"
    assert payload["allowed_repository_count"] == 2
    serialized = json.dumps(payload)
    assert secret not in serialized
    assert "private-one" not in serialized and "private-two" not in serialized


def test_accepted_delivery_schedules_best_effort_wake(routes_mod, monkeypatch):
    record = {"event": "issues", "action": "opened"}
    monkeypatch.setattr(routes_mod, "is_app_enabled", lambda _name: True)
    monkeypatch.setattr(routes_mod, "_rate_allowed", lambda: True)
    monkeypatch.setattr(
        routes_mod.webhook, "admit_delivery",
        lambda *_a, **_k: (202, "accepted", record),
    )
    monkeypatch.setattr(
        routes_mod.webhook, "enqueue_delivery",
        lambda _record: {"status": "accepted", "depth": 1},
    )
    scheduled = []

    def _capture(coro, *, name):
        scheduled.append(name)
        coro.close()
        return mock.Mock()

    monkeypatch.setattr(routes_mod.asyncio, "create_task", _capture)
    request = _Request(headers={routes_mod.webhook.DELIVERY_HEADER: "delivery-accepted"})

    response = asyncio.run(routes_mod._handle_github(request))

    assert response.status == 202
    assert scheduled == ["dlc-yolo-webhook-wake"]
    assert _response_json(response)["duplicate"] is False


def test_disabled_app_rejects_receiver_before_admission(routes_mod, monkeypatch):
    monkeypatch.setattr(routes_mod, "is_app_enabled", lambda _name: False)
    admission = mock.Mock()
    monkeypatch.setattr(routes_mod.webhook, "admit_delivery", admission)

    response = asyncio.run(routes_mod._handle_github(_Request()))

    assert response.status == 503
    assert _response_json(response)["code"] == "app_disabled"
    admission.assert_not_called()


def test_relative_inbox_override_prevents_listener_start(routes_mod, monkeypatch):
    monkeypatch.setenv(routes_mod.webhook.PORT_ENV, "9876")
    monkeypatch.setenv(routes_mod.webhook.SECRET_ENV, "secret")
    monkeypatch.setenv(routes_mod.webhook.REPOSITORIES_ENV, "owner/repo")
    monkeypatch.setenv(routes_mod.webhook.INBOX_ENV, "relative/inbox.json")
    app = web.Application()
    routes_mod.register_routes(app)

    asyncio.run(routes_mod._start_listener(app))

    state = _listener_state(routes_mod, app)
    assert state["status"] == "misconfigured"
    assert state["last_error"] == "inbox-path-not-absolute"
    assert state["runner"] is None


def test_ui_config_write_is_secure_secret_blind_and_hot_reloaded(
        routes_mod, monkeypatch):
    monkeypatch.setattr(
        routes_mod.webhook, "inbox_status",
        lambda: {"schema_version": 1, "pending": 0, "processed": 0},
    )
    reload_listener = mock.AsyncMock()
    monkeypatch.setattr(routes_mod, "_reload_listener", reload_listener)
    app = web.Application()
    routes_mod.register_routes(app)
    body = json.dumps({
        "enabled": True,
        "port": 9876,
        "repositories": ["owner/repo", "OWNER/REPO"],
        "inbox_path": None,
        "secret": "s" * 32,
        "clear_secret": False,
    }).encode()
    request = _Request(body=body)
    request.app = app

    response = asyncio.run(routes_mod._handle_config_update(request))
    payload = _response_json(response)

    assert response.status == 200
    assert payload["configuration_source"] == "ui"
    assert payload["listener"] == "disabled"
    assert payload["repositories"] == ["owner/repo"]
    assert payload["secret_configured"] is True
    assert "s" * 32 not in json.dumps(payload)
    stored_path = routes_mod.webhook.resolve_config_path()
    assert stored_path.stat().st_mode & 0o777 == 0o600
    assert routes_mod.webhook.read_webhook_config()["secret"] == "s" * 32
    reload_listener.assert_awaited_once_with(app)


def test_environment_managed_config_is_read_only(routes_mod, monkeypatch):
    monkeypatch.setenv(routes_mod.webhook.PORT_ENV, "9876")
    monkeypatch.setenv(routes_mod.webhook.SECRET_ENV, "environment-secret")
    monkeypatch.setenv(routes_mod.webhook.REPOSITORIES_ENV, "owner/private")

    response = asyncio.run(routes_mod._handle_config_update(_Request(body=b"{}")))

    assert response.status == 409
    assert _response_json(response)["code"] == "environment_managed"
    assert not routes_mod.webhook.resolve_config_path().exists()


def test_config_get_exposes_values_but_never_secret(routes_mod, monkeypatch):
    secret = "environment-secret-never-returned"
    monkeypatch.setenv(routes_mod.webhook.PORT_ENV, "9876")
    monkeypatch.setenv(routes_mod.webhook.SECRET_ENV, secret)
    monkeypatch.setenv(routes_mod.webhook.REPOSITORIES_ENV, "owner/private")
    monkeypatch.setattr(
        routes_mod.webhook, "inbox_status",
        lambda: {"schema_version": 1, "pending": 0, "processed": 0},
    )
    app = web.Application()
    routes_mod.register_routes(app)
    request = mock.Mock(app=app)

    payload = _response_json(asyncio.run(routes_mod._handle_config(request)))

    assert payload["editable"] is False
    assert payload["repositories"] == ["owner/private"]
    assert payload["secret_configured"] is True
    assert secret not in json.dumps(payload)


def test_ui_crew_route_create_uses_sanctioned_cli_arguments(routes_mod, monkeypatch):
    run_cli = mock.AsyncMock(return_value=(0, "created"))
    monkeypatch.setattr(routes_mod, "_run_agent_cli", run_cli)
    request = _Request(body=json.dumps({
        "mode": "create",
        "name": "dlcyolo-secure-review",
        "kiro_agent": "dlcyolo-readonly",
        "workspace": "security",
        "memory_store": "secure-review-memory",
    }).encode())

    response = asyncio.run(routes_mod._handle_crew_route_update(request))

    assert response.status == 201
    assert _response_json(response) == {
        "status": "created",
        "crew": {
            "name": "dlcyolo-secure-review",
            "kiro_agent": "dlcyolo-readonly",
            "workspace": "security",
            "memory_store": "secure-review-memory",
        },
    }
    run_cli.assert_awaited_once_with([
        "create", "--name", "dlcyolo-secure-review",
        "--kiro-agent", "dlcyolo-readonly",
        "--workspace", "security",
        "--memory-store", "secure-review-memory",
    ])


def test_ui_crew_route_update_omits_blank_optional_fields(routes_mod, monkeypatch):
    run_cli = mock.AsyncMock(return_value=(0, "updated"))
    monkeypatch.setattr(routes_mod, "_run_agent_cli", run_cli)
    request = _Request(body=json.dumps({
        "mode": "update",
        "name": "dlcyolo-review",
        "kiro_agent": "dlcyolo-authoring",
        "workspace": "",
        "memory_store": None,
    }).encode())

    response = asyncio.run(routes_mod._handle_crew_route_update(request))

    assert response.status == 200
    assert _response_json(response)["status"] == "updated"
    run_cli.assert_awaited_once_with([
        "update", "dlcyolo-review", "--kiro-agent", "dlcyolo-authoring",
    ])


@pytest.mark.parametrize("patch", [
    {"mode": "delete"},
    {"name": "../escape"},
    {"kiro_agent": "bad/profile"},
    {"workspace": "-option"},
    {"unknown": "field"},
])
def test_ui_crew_route_rejects_invalid_input_before_cli(routes_mod, monkeypatch, patch):
    run_cli = mock.AsyncMock(return_value=(0, "should not run"))
    monkeypatch.setattr(routes_mod, "_run_agent_cli", run_cli)
    body = {
        "mode": "create",
        "name": "dlcyolo-review",
        "kiro_agent": "dlcyolo-readonly",
        "workspace": "security",
        "memory_store": "review-memory",
        **patch,
    }

    response = asyncio.run(routes_mod._handle_crew_route_update(
        _Request(body=json.dumps(body).encode()),
    ))

    assert response.status == 400
    run_cli.assert_not_awaited()


def test_ui_crew_route_reports_cli_rejection_without_claiming_success(routes_mod, monkeypatch):
    monkeypatch.setattr(
        routes_mod, "_run_agent_cli",
        mock.AsyncMock(return_value=(1, "Agent already exists")),
    )
    request = _Request(body=json.dumps({
        "mode": "create",
        "name": "existing-agent",
        "kiro_agent": "dlcyolo-readonly",
    }).encode())

    response = asyncio.run(routes_mod._handle_crew_route_update(request))

    assert response.status == 409
    assert _response_json(response) == {
        "code": "crew_route_rejected", "error": "Agent already exists",
    }


def test_invalid_stored_config_is_read_only_and_surfaces_reason(routes_mod, monkeypatch):
    invalid = {
        "source": "invalid", "editable": False, "enabled": False,
        "port": None, "repositories": [], "inbox_path": None,
        "inbox_path_valid": False, "secret": "", "error": "config-corrupt",
    }
    monkeypatch.setattr(routes_mod.webhook, "effective_webhook_config", lambda: invalid)
    monkeypatch.setattr(
        routes_mod.webhook, "inbox_status",
        lambda: {"schema_version": 1, "pending": 0, "processed": 0},
    )
    app = web.Application()
    routes_mod.register_routes(app)

    get_payload = _response_json(asyncio.run(
        routes_mod._handle_config(mock.Mock(app=app))))
    update_response = asyncio.run(routes_mod._handle_config_update(_Request()))

    assert get_payload["configuration_source"] == "invalid"
    assert get_payload["editable"] is False
    assert get_payload["configuration_error"] == "config-corrupt"
    assert update_response.status == 409
    assert _response_json(update_response)["code"] == "stored_configuration_invalid"


def test_config_update_rejects_short_active_secret(routes_mod):
    body = json.dumps({
        "enabled": True,
        "port": 9876,
        "repositories": ["owner/repo"],
        "inbox_path": None,
        "secret": "too-short",
        "clear_secret": False,
    }).encode()

    response = asyncio.run(routes_mod._handle_config_update(_Request(body=body)))

    assert response.status == 400
    assert _response_json(response)["code"] == "config_secret_invalid"
    assert not routes_mod.webhook.resolve_config_path().exists()


def test_config_update_can_clear_secret_only_while_disabled(routes_mod, monkeypatch):
    routes_mod.webhook.write_webhook_config({
        "enabled": False,
        "port": 9876,
        "repositories": [],
        "inbox_path": None,
        "secret": "s" * 32,
    })
    reload_listener = mock.AsyncMock()
    monkeypatch.setattr(routes_mod, "_reload_listener", reload_listener)
    app = web.Application()
    routes_mod.register_routes(app)
    body = json.dumps({
        "enabled": False,
        "port": 9876,
        "repositories": [],
        "inbox_path": None,
        "clear_secret": True,
    }).encode()
    request = _Request(body=body)
    request.app = app

    response = asyncio.run(routes_mod._handle_config_update(request))

    assert response.status == 200
    assert _response_json(response)["secret_configured"] is False
    assert routes_mod.webhook.read_webhook_config()["secret"] == ""
    reload_listener.assert_awaited_once_with(app)


def test_config_update_rejects_clearing_active_secret(routes_mod):
    routes_mod.webhook.write_webhook_config({
        "enabled": False,
        "port": 9876,
        "repositories": [],
        "inbox_path": None,
        "secret": "s" * 32,
    })
    body = json.dumps({
        "enabled": True,
        "port": 9876,
        "repositories": ["owner/repo"],
        "inbox_path": None,
        "clear_secret": True,
    }).encode()

    response = asyncio.run(routes_mod._handle_config_update(_Request(body=body)))

    assert response.status == 400
    assert _response_json(response)["code"] == "config_cannot_clear_active_secret"
    assert routes_mod.webhook.read_webhook_config()["secret"] == "s" * 32
