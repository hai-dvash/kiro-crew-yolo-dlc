"""DLC-YOLO cloudflared quick-tunnel supervisor (app-managed, optional).

The GitHub webhook receiver binds ``127.0.0.1`` only, so GitHub cannot reach it
without a public relay. This helper lets the app OPTIONALLY start and supervise a
Cloudflare *quick tunnel* (``cloudflared tunnel --url http://127.0.0.1:<port>``)
that forwards a random ``https://<id>.trycloudflare.com`` URL to the loopback
receiver. The user may instead run the exact same command themselves — the
status always reports the command that would run / did run so either path works.

Boundaries this module keeps:
* It NEVER installs cloudflared. If the binary is absent, status reports
  ``not_installed`` plus the documented install command; starting is refused.
* It only ever runs ``cloudflared tunnel --url http://127.0.0.1:<validated-int-port>``
  — no shell, no user-supplied argv, port is an int in range.
* Exactly one supervised tunnel at a time; ``start`` is idempotent (returns the
  running tunnel) and ``stop`` tears down the process group.
* The public URL is parsed from cloudflared's own stderr banner; nothing else is
  trusted from its output, and no tunnel token/credential is handled here (quick
  tunnels are anonymous).
"""

from __future__ import annotations

import asyncio
import contextlib
import os
import re
import shutil
import signal
import time

# cloudflared prints the assigned hostname on stderr, e.g.
#   |  https://foo-bar-baz.trycloudflare.com                                   |
_URL_RE = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")
_MIN_PORT = 1
_MAX_PORT = 65535
_START_URL_TIMEOUT = 20.0  # seconds to wait for cloudflared to announce a URL
_STOP_GRACE = 5.0

INSTALL_HINT = (
    "curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | "
    "sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null\n"
    "echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] "
    "https://pkg.cloudflare.com/cloudflared any main' | "
    "sudo tee /etc/apt/sources.list.d/cloudflared.list\n"
    "sudo apt-get update && sudo apt-get install -y cloudflared"
)


class _TunnelState:
    """One supervised quick tunnel. Module-level singleton lives on the app."""

    def __init__(self) -> None:
        self.proc: asyncio.subprocess.Process | None = None
        self.port: int | None = None
        self.url: str | None = None
        self.command: list[str] | None = None
        self.started_at: float | None = None
        self.last_error: str | None = None
        self._reader: asyncio.Task | None = None
        self._lock = asyncio.Lock()

    def running(self) -> bool:
        return self.proc is not None and self.proc.returncode is None


def cloudflared_path() -> str | None:
    return shutil.which("cloudflared")


def tunnel_command(port: int) -> list[str]:
    """The exact argv the app runs — also shown to the user to run themselves."""
    binary = cloudflared_path() or "cloudflared"
    return [binary, "tunnel", "--url", f"http://127.0.0.1:{port}"]


def _validate_port(port: object) -> int:
    if isinstance(port, bool) or not isinstance(port, int):
        raise ValueError("port_invalid")
    if not (_MIN_PORT <= port <= _MAX_PORT):
        raise ValueError("port_out_of_range")
    return port


def status(state: _TunnelState) -> dict:
    """Privacy-safe status. Reports the command as a string for display/copy."""
    installed = cloudflared_path() is not None
    running = state.running()
    payload_url = f"{state.url}/github" if (running and state.url) else None
    command = " ".join(state.command) if state.command else (
        " ".join(tunnel_command(state.port)) if state.port else None
    )
    return {
        "installed": installed,
        "running": running,
        "public_url": state.url if running else None,
        "payload_url": payload_url,
        "command": command,
        "started_at": state.started_at if running else None,
        "last_error": state.last_error,
        "install_hint": None if installed else INSTALL_HINT,
    }


async def _drain_stderr(state: _TunnelState, proc: asyncio.subprocess.Process) -> None:
    """Read cloudflared stderr to catch the URL banner; discard the rest."""
    assert proc.stderr is not None
    try:
        while True:
            line = await proc.stderr.readline()
            if not line:
                break
            if state.url is None:
                match = _URL_RE.search(line.decode("utf-8", "replace"))
                if match:
                    state.url = match.group(0)
    except asyncio.CancelledError:  # pragma: no cover - shutdown path
        pass


async def start(state: _TunnelState, port: int) -> dict:
    """Idempotently start the quick tunnel for ``port``; return status."""
    async with state._lock:
        port = _validate_port(port)
        if state.running():
            # Already running for the requested port → return as-is; a different
            # port requires an explicit stop first (avoid silent re-point).
            if state.port == port:
                return status(state)
            state.last_error = "tunnel-already-running-on-different-port"
            return status(state)
        if cloudflared_path() is None:
            state.last_error = "cloudflared-not-installed"
            return status(state)

        command = tunnel_command(port)
        try:
            proc = await asyncio.create_subprocess_exec(
                *command,
                stdin=asyncio.subprocess.DEVNULL,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
                start_new_session=True,  # own process group so stop() tree-kills
            )
        except OSError as exc:
            state.last_error = f"spawn-failed:{type(exc).__name__}"
            return status(state)

        state.proc = proc
        state.port = port
        state.url = None
        state.command = command
        state.started_at = time.time()
        state.last_error = None
        state._reader = asyncio.create_task(_drain_stderr(state, proc))

        # Wait (bounded) for cloudflared to announce the public URL.
        deadline = time.monotonic() + _START_URL_TIMEOUT
        while state.url is None and time.monotonic() < deadline:
            if proc.returncode is not None:
                state.last_error = f"cloudflared-exited:{proc.returncode}"
                await _cleanup(state)
                return status(state)
            await asyncio.sleep(0.2)
        if state.url is None:
            state.last_error = "no-url-within-timeout"
        return status(state)


async def _cleanup(state: _TunnelState) -> None:
    reader = state._reader
    if reader is not None:
        reader.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await reader
    state._reader = None
    state.proc = None
    state.url = None
    state.started_at = None


async def stop(state: _TunnelState) -> dict:
    """Terminate the supervised tunnel (whole process group)."""
    async with state._lock:
        proc = state.proc
        if proc is None or proc.returncode is not None:
            await _cleanup(state)
            return status(state)
        try:
            os.killpg(proc.pid, signal.SIGTERM)
        except (ProcessLookupError, PermissionError):
            proc.terminate()
        try:
            await asyncio.wait_for(proc.wait(), timeout=_STOP_GRACE)
        except asyncio.TimeoutError:
            with contextlib.suppress(ProcessLookupError, PermissionError):
                os.killpg(proc.pid, signal.SIGKILL)
            with contextlib.suppress(Exception):
                await proc.wait()
        await _cleanup(state)
        return status(state)
