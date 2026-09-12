"""cloudflared quick-tunnel supervisor tests (backend/tunnel.py).

Pure-logic paths that need no cloudflared binary: install detection, the exact
command formatting shown to the user, refusal-when-absent, port validation, and
a safe idle stop. Process-spawn paths require cloudflared and are exercised
manually / in the host environment.
"""

from __future__ import annotations

import asyncio
import importlib
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
tunnel = importlib.import_module("backend.tunnel")


def test_tunnel_command_is_fixed_and_shellless():
    cmd = tunnel.tunnel_command(8765)
    assert cmd[-3:] == ["tunnel", "--url", "http://127.0.0.1:8765"]
    # no shell string, no user argv — a list of literal args
    assert all(isinstance(part, str) for part in cmd)


def test_port_validation_rejects_bad_values():
    for bad in (0, 70000, True, "8765", None, 1.5):
        with pytest.raises(ValueError):
            tunnel._validate_port(bad)
    assert tunnel._validate_port(8765) == 8765


def test_status_reports_install_hint_when_absent(monkeypatch):
    monkeypatch.setattr(tunnel, "cloudflared_path", lambda: None)
    state = tunnel._TunnelState()
    s = tunnel.status(state)
    assert s["installed"] is False
    assert s["running"] is False
    assert s["install_hint"] and "cloudflared" in s["install_hint"]


def test_start_refused_when_not_installed(monkeypatch):
    monkeypatch.setattr(tunnel, "cloudflared_path", lambda: None)
    state = tunnel._TunnelState()
    result = asyncio.run(tunnel.start(state, 8765))
    assert result["running"] is False
    assert result["last_error"] == "cloudflared-not-installed"


def test_stop_is_safe_when_idle():
    state = tunnel._TunnelState()
    result = asyncio.run(tunnel.stop(state))
    assert result["running"] is False
