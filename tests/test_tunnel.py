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


class _DeadProc:
    """A process that has already exited (returncode set) — simulates cloudflared dying."""
    returncode = 1
    pid = -1


class _LiveProc:
    returncode = None
    pid = -1


class _ZombieProc:
    """The ROOT-CAUSE case: exited but NOT reaped — returncode is still None while the pid is
    gone. The old supervisor read this as healthy forever (channel dies and stays dead). pid is
    set to a value _proc_alive's killpg(pid, 0) will report ESRCH for."""
    returncode = None

    def __init__(self, pid: int):
        self.pid = pid

    async def wait(self):
        self.returncode = 1
        return 1


def test_proc_alive_detects_exited_but_unreaped(monkeypatch):
    """signal-0 probe: a proc with returncode=None but a dead pid must read as NOT alive —
    the exact zombie the returncode-only check missed."""
    # A pid that does not exist as a process group → killpg raises ProcessLookupError.
    dead = _ZombieProc(pid=2_000_000_000)  # implausible pid; killpg → ESRCH
    assert tunnel._proc_alive(dead) is False
    # None / already-reaped are dead too.
    assert tunnel._proc_alive(None) is False
    assert tunnel._proc_alive(_DeadProc()) is False
    # A genuinely-live process group (our own) reads alive. killpg needs a PGID, and a
    # session-led cloudflared's pid IS its pgid; mirror that with our own process-group id.
    live = _LiveProc()
    live.pid = __import__("os").getpgrp()
    assert tunnel._proc_alive(live) is True


def test_supervisor_respawns_a_zombie(monkeypatch):
    """The regression: an exited-but-unreaped cloudflared (returncode None, pid gone) must be
    detected as dead by the probe and respawned — the old returncode-only check would not."""
    _fast_supervisor(monkeypatch)
    respawns: list[int] = []

    async def _fake_respawn(state):
        respawns.append(1)
        state.proc = _LiveProc()
        state.proc.pid = __import__("os").getpid()  # respawn → genuinely alive
        return True

    monkeypatch.setattr(tunnel, "_respawn", _fake_respawn)

    async def scenario():
        state = tunnel._TunnelState()
        state.port = 8765
        state.proc = _ZombieProc(pid=2_000_000_000)  # dead pid, returncode still None
        task = asyncio.create_task(tunnel._supervise(state))
        await asyncio.sleep(0.1)
        state._stopping = True
        task.cancel()
        with __import__("contextlib").suppress(asyncio.CancelledError):
            await task
        return respawns

    got = asyncio.run(scenario())
    assert len(got) >= 1  # the zombie was detected as dead and respawned


def _fast_supervisor(monkeypatch):
    """Shrink the supervisor's timers so a test cycle runs in milliseconds."""
    monkeypatch.setattr(tunnel, "_SUPERVISE_POLL_SECS", 0.01)
    monkeypatch.setattr(tunnel, "_SUPERVISE_BACKOFF_MIN", 0.01)
    monkeypatch.setattr(tunnel, "_SUPERVISE_BACKOFF_MAX", 0.05)


def test_supervisor_respawns_on_unexpected_death(monkeypatch):
    """When cloudflared dies on its own, the supervisor calls _respawn (the self-heal)."""
    _fast_supervisor(monkeypatch)
    respawns: list[int] = []

    async def _fake_respawn(state):
        respawns.append(1)
        state.proc = _LiveProc()  # respawn succeeds → healthy again
        return True

    monkeypatch.setattr(tunnel, "_respawn", _fake_respawn)

    async def scenario():
        state = tunnel._TunnelState()
        state.port = 8765
        state.proc = _DeadProc()  # already dead → supervisor should heal it
        task = asyncio.create_task(tunnel._supervise(state))
        # let a few poll cycles run, then disarm
        await asyncio.sleep(0.1)
        state._stopping = True
        task.cancel()
        with __import__("contextlib").suppress(asyncio.CancelledError):
            await task
        return respawns

    got = asyncio.run(scenario())
    assert len(got) >= 1  # at least one respawn happened


def test_supervisor_does_not_respawn_after_deliberate_stop(monkeypatch):
    """A deliberate stop() sets _stopping; the supervisor must NOT respawn a torn-down tunnel."""
    _fast_supervisor(monkeypatch)
    respawns: list[int] = []

    async def _fake_respawn(state):
        respawns.append(1)
        return True

    monkeypatch.setattr(tunnel, "_respawn", _fake_respawn)

    async def scenario():
        state = tunnel._TunnelState()
        state.port = 8765
        state.proc = _DeadProc()
        state._stopping = True  # user already stopped it
        task = asyncio.create_task(tunnel._supervise(state))
        await asyncio.sleep(0.1)
        task.cancel()
        with __import__("contextlib").suppress(asyncio.CancelledError):
            await task
        return respawns

    got = asyncio.run(scenario())
    assert got == []  # never respawned a deliberately-stopped tunnel


def test_stop_disarms_supervisor(monkeypatch):
    """stop() sets _stopping and cancels the supervisor task, leaving nothing running."""
    async def scenario():
        state = tunnel._TunnelState()
        state._supervisor = asyncio.create_task(asyncio.sleep(3600))  # a pretend long-lived loop
        result = await tunnel.stop(state)
        assert state._stopping is True
        assert state._supervisor is None
        return result

    result = asyncio.run(scenario())
    assert result["running"] is False


def test_status_reports_supervision_fields():
    state = tunnel._TunnelState()
    state.respawns = 3
    s = tunnel.status(state)
    assert s["respawns"] == 3
    assert "supervised" in s
    assert "last_respawn_at" in s
