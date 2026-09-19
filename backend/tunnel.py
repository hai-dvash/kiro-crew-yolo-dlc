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
* SELF-HEALING: after a successful ``start`` captures a URL, a background supervisor
  health-checks cloudflared and RESPAWNS it if it dies on its own (the overnight/idle
  death that leaves GitHub pointed at a dead URL). A respawn resets the URL so the stderr
  reader recaptures the new one and fires ``on_url_captured`` → autosync re-points GitHub.
  Bounded exponential backoff prevents a hot loop; a deliberate ``stop`` disarms the
  supervisor so a user teardown is never fought. The URL still ROTATES on respawn (a quick
  tunnel is anonymous) — autosync heals the change; a fixed URL needs a named/token tunnel
  with a domain, which this module does not run.
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
# Self-healing supervisor: after a tunnel is started, a background task health-checks the
# process and RESPAWNS it if cloudflared dies (the overnight/idle death that leaves GitHub
# pointed at a dead URL). A respawn resets state.url so the stderr reader recaptures the new
# URL and fires on_url_captured → autosync re-points GitHub. Bounded backoff prevents a hot
# loop when cloudflared is persistently failing; a deliberate stop() disarms the supervisor.
_SUPERVISE_POLL_SECS = 5.0        # how often to check the process is alive
_SUPERVISE_BACKOFF_MIN = 2.0      # first respawn delay after an unexpected death
_SUPERVISE_BACKOFF_MAX = 60.0     # cap the exponential backoff
_SUPERVISE_RESPAWN_URL_TIMEOUT = 20.0  # wait for the new URL after a respawn

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
        self.url_captured_at: float | None = None
        self.command: list[str] | None = None
        self.started_at: float | None = None
        self.last_error: str | None = None
        self._reader: asyncio.Task | None = None
        self._lock = asyncio.Lock()
        # Self-healing supervisor task + bookkeeping. ``_stopping`` is set by stop() so the
        # supervisor does NOT respawn a tunnel the user deliberately tore down; ``respawns``
        # counts unexpected-death recoveries for the status payload.
        self._supervisor: asyncio.Task | None = None
        self._stopping: bool = False
        self.respawns: int = 0
        self.last_respawn_at: float | None = None
        # Optional async callback invoked exactly once when the URL is captured
        # (including a LATE capture after start() returned) — lets the caller fire
        # auto-sync at the moment the URL is actually known, not only at start.
        self.on_url_captured = None  # type: ignore[assignment]

    def running(self) -> bool:
        return self.proc is not None and self.proc.returncode is None

    def url_state(self) -> str:
        """captured | pending | failed — so a running tunnel with no URL is never
        reported as a healthy state (both the panel and auto-sync depend on this)."""
        if self.url:
            return "captured"
        if self.running():
            return "pending"
        return "failed"


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
        "url_status": state.url_state() if running else "failed",
        "command": command,
        "started_at": state.started_at if running else None,
        "last_error": state.last_error,
        "install_hint": None if installed else INSTALL_HINT,
        # Self-healing supervisor observability.
        "supervised": state._supervisor is not None and not state._supervisor.done(),
        "respawns": state.respawns,
        "last_respawn_at": state.last_respawn_at,
    }


async def _drain_stderr(state: _TunnelState, proc: asyncio.subprocess.Process) -> None:
    """Read cloudflared stderr for the whole tunnel lifetime to catch the URL banner
    (it can arrive AFTER start()'s bounded wait), then keep draining so the pipe never
    blocks. On the first capture, record the time and fire on_url_captured exactly once
    so a late capture still triggers auto-sync / panel refresh."""
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
                    state.url_captured_at = time.time()
                    cb = state.on_url_captured
                    if cb is not None:
                        with contextlib.suppress(Exception):
                            await cb(state.url)
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
        state.url_captured_at = None
        state.command = command
        state.started_at = time.time()
        state.last_error = None
        state._stopping = False  # a fresh start re-arms self-healing
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
            # R4: a URL-less tunnel is useless AND a lingering relay to the loopback port.
            # Tear it down rather than leaving cloudflared running with no announced URL.
            # Kill INLINE (we already hold state._lock; calling stop() would re-acquire it and
            # deadlock, and _cleanup alone only drops the ref — it does not terminate the proc).
            state.last_error = "no-url-within-timeout"
            await _kill_proc(proc)
            await _cleanup(state)
            state.last_error = "no-url-within-timeout"  # preserve reason through _cleanup
            return status(state)

        # URL captured → the tunnel is healthy. Arm the self-healing supervisor so an
        # overnight/idle death respawns automatically (and re-fires autosync via the reader).
        _arm_supervisor(state)
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
    state.url_captured_at = None
    state.started_at = None


async def _kill_proc(proc: asyncio.subprocess.Process) -> None:
    """Terminate one cloudflared process group, escalating SIGTERM→SIGKILL. Lock-free."""
    if proc.returncode is not None:
        return
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


def _arm_supervisor(state: _TunnelState) -> None:
    """Start the self-healing supervisor task if not already running (called under _lock)."""
    if state._supervisor is not None and not state._supervisor.done():
        return
    state._supervisor = asyncio.create_task(_supervise(state))


async def _respawn(state: _TunnelState) -> bool:
    """Spawn a fresh cloudflared for the SAME port and rewire the stderr reader.

    Resets state.url so _drain_stderr recaptures the new URL and fires on_url_captured
    (→ autosync re-points GitHub). Returns True if the new process announced a URL.
    Runs OUTSIDE the lock (the supervisor holds no lock); the single-writer supervisor
    is the only caller, so there is no concurrent spawn.
    """
    port = state.port
    if port is None:
        return False
    command = tunnel_command(port)
    try:
        proc = await asyncio.create_subprocess_exec(
            *command,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
            start_new_session=True,
        )
    except OSError as exc:
        state.last_error = f"respawn-failed:{type(exc).__name__}"
        return False
    # Cancel the stale reader bound to the dead process before rebinding.
    reader = state._reader
    if reader is not None:
        reader.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await reader
    state.proc = proc
    state.url = None
    state.url_captured_at = None
    state.command = command
    state.started_at = time.time()
    state._reader = asyncio.create_task(_drain_stderr(state, proc))
    deadline = time.monotonic() + _SUPERVISE_RESPAWN_URL_TIMEOUT
    while state.url is None and time.monotonic() < deadline:
        if proc.returncode is not None:
            state.last_error = f"cloudflared-exited:{proc.returncode}"
            return False
        await asyncio.sleep(0.2)
    if state.url is None:
        state.last_error = "respawn-no-url-within-timeout"
        await _kill_proc(proc)
        return False
    state.respawns += 1
    state.last_respawn_at = time.time()
    state.last_error = None
    return True


async def _supervise(state: _TunnelState) -> None:
    """Health-check the tunnel; respawn on unexpected death with bounded backoff.

    A deliberate stop() sets state._stopping and cancels this task, so a user teardown is
    never fought. Only an UNEXPECTED exit (cloudflared died on its own — the overnight/idle
    death) triggers a respawn. Backoff grows on consecutive failed respawns and resets on a
    healthy one, so a persistently-broken cloudflared cannot hot-loop.
    """
    backoff = _SUPERVISE_BACKOFF_MIN
    try:
        while not state._stopping:
            await asyncio.sleep(_SUPERVISE_POLL_SECS)
            if state._stopping:
                return
            proc = state.proc
            if proc is not None and proc.returncode is None:
                backoff = _SUPERVISE_BACKOFF_MIN  # healthy — reset backoff
                continue
            # Unexpected death: cloudflared exited without a stop(). Respawn.
            if state._stopping:
                return
            await asyncio.sleep(backoff)
            if state._stopping:
                return
            ok = await _respawn(state)
            if ok:
                backoff = _SUPERVISE_BACKOFF_MIN
            else:
                backoff = min(backoff * 2, _SUPERVISE_BACKOFF_MAX)
    except asyncio.CancelledError:  # pragma: no cover - teardown path
        raise
    except Exception:  # pragma: no cover - never let the supervisor crash silently kill healing
        state.last_error = "supervisor-error"


async def stop(state: _TunnelState) -> dict:
    """Terminate the supervised tunnel (whole process group) and disarm self-healing."""
    # Disarm the supervisor BEFORE taking the lock: set the deliberate-stop flag so an
    # in-flight supervisor cycle will not respawn, then cancel the task. The supervisor
    # holds no lock, so cancelling it here cannot deadlock against _lock below.
    state._stopping = True
    supervisor = state._supervisor
    state._supervisor = None
    if supervisor is not None:
        supervisor.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await supervisor
    async with state._lock:
        proc = state.proc
        if proc is None or proc.returncode is not None:
            await _cleanup(state)
            return status(state)
        await _kill_proc(proc)
        await _cleanup(state)
        return status(state)
