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


def test_url_state_transitions():
    """A running tunnel with no URL is 'pending' (never reported as healthy-with-null);
    once captured it is 'captured'; not running is 'failed'."""
    state = tunnel._TunnelState()
    assert state.url_state() == "failed"          # not running, no url
    # simulate running without a captured url yet
    class _P:
        returncode = None
    state.proc = _P()
    assert state.running() is True
    assert state.url_state() == "pending"         # running, url not captured
    state.url = "https://x.trycloudflare.com"
    assert state.url_state() == "captured"


def test_drain_stderr_captures_late_url_and_fires_callback():
    """The stderr reader must catch a URL banner that arrives AFTER a few other lines,
    and fire on_url_captured exactly once — this is what lets a LATE capture trigger
    auto-sync instead of silently leaving GitHub on a stale URL."""
    fired: list[str] = []

    class _Stderr:
        def __init__(self, lines):
            self._lines = list(lines)
        async def readline(self):
            return self._lines.pop(0) if self._lines else b""

    class _Proc:
        returncode = None
        def __init__(self):
            self.stderr = _Stderr([
                b"2026 INF Thank you for trying Cloudflare Tunnel.\n",
                b"2026 INF Requesting new quick Tunnel...\n",
                b"|  https://late-banner-xyz.trycloudflare.com   |\n",
                b"2026 INF Registered tunnel connection\n",
            ])

    state = tunnel._TunnelState()
    async def _cb(url):
        fired.append(url)
    state.on_url_captured = _cb
    proc = _Proc()
    asyncio.run(tunnel._drain_stderr(state, proc))
    assert state.url == "https://late-banner-xyz.trycloudflare.com"
    assert state.url_captured_at is not None
    assert fired == ["https://late-banner-xyz.trycloudflare.com"]  # fired exactly once
