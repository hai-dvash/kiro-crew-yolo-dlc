"""DLC-YOLO state-file inotify watcher — a poll-free observer that wakes the advance bus.

Why this exists
---------------
The event-driven-liveness contract (docs/event-driven-liveness-spec.md, Part I) says an action
must fire the instant its preconditions are met, and the 120s poll is only the missed-wake safety
net. A LOCAL step completion lands as a durable ``event_outbox`` marker written into ``state.json``
by the step-agent in its own process — but the host exposes no "state changed" hook, and the app
must never make the PRODUCER (the step-agent) poke the scheduler (that couples the wrong lanes).

The clean resolution: a NEUTRAL observer notices the write and wakes the bus. The always-on spawned
backend is that observer. This module gives it a **poll-free** watch using the Linux kernel's
``inotify`` via ``ctypes`` — no third-party dependency, no interval, ~zero CPU while idle, and a
wake latency of milliseconds rather than up to 120s. When ``inotify`` is unavailable (non-Linux, or
a kernel/libc that lacks it) the watcher is a graceful no-op and the 120s poll remains the wake.

Boundaries
----------
* READ-ONLY observer. It reads NOTHING from the file and mutates NO state. It only debounces
  filesystem events and invokes an injected async ``on_change`` callback (which the backend wires
  to the existing best-effort ``cron trigger`` wake). It is not authoritative for anything.
* It watches the state file's PARENT DIRECTORY (atomic saves land as ``os.replace`` → a rename,
  surfaced as ``IN_MOVED_TO``; a plain in-place write surfaces as ``IN_CLOSE_WRITE``), filtering to
  the state file's own basename so unrelated sibling writes (``.statepath``, ``live_spawns.json``)
  do not wake the bus.
* Fail-open: any error tears the watch down quietly and leaves the poll safety net in place.
"""

from __future__ import annotations

import asyncio
import ctypes
import ctypes.util
import errno
import logging
import os
import struct
from pathlib import Path
from typing import Awaitable, Callable

logger = logging.getLogger("kirocrew.app.dlc-yolo.inotify")

# inotify(7) event-mask bits we care about. A completed write is either an in-place close-after-
# write or an atomic rename INTO the watched dir; both mean "the file just changed".
_IN_CLOSE_WRITE = 0x00000008
_IN_MOVED_TO = 0x00000080
_IN_ONLYDIR = 0x01000000
_IN_NONBLOCK = 0x00000800  # inotify_init1 flag
# The C struct inotify_event: int wd, uint32 mask, uint32 cookie, uint32 len, char name[len].
_EVENT_HEADER = struct.Struct("iIII")
_EVENT_HEADER_SIZE = _EVENT_HEADER.size
_READ_BUFFER = 64 * 1024
# Debounce: a single logical save can emit several events (temp write + rename); collapse a burst
# into one wake, and never wake more often than this floor regardless of write rate.
_DEBOUNCE_SECONDS = 0.15


def _load_libc() -> ctypes.CDLL | None:
    """Return libc with inotify symbols, or None when the platform cannot provide them."""
    if not hasattr(os, "O_NONBLOCK"):  # not POSIX
        return None
    name = ctypes.util.find_library("c")
    if not name:
        return None
    try:
        libc = ctypes.CDLL(name, use_errno=True)
    except OSError:
        return None
    if not all(hasattr(libc, sym) for sym in ("inotify_init1", "inotify_add_watch")):
        return None
    libc.inotify_init1.argtypes = [ctypes.c_int]
    libc.inotify_init1.restype = ctypes.c_int
    libc.inotify_add_watch.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_uint32]
    libc.inotify_add_watch.restype = ctypes.c_int
    return libc


class StateFileWatcher:
    """Watch one state file's directory and fire ``on_change`` (debounced) on a write to it.

    Usage (from the backend's on_startup/on_cleanup lifecycle)::

        watcher = StateFileWatcher(state_path, on_change=_wake_advance)
        await watcher.start()      # no-op + logs when inotify is unavailable
        ...
        await watcher.stop()
    """

    def __init__(self, state_path: Path,
                 on_change: Callable[[], Awaitable[None]],
                 *, debounce_seconds: float = _DEBOUNCE_SECONDS) -> None:
        self._state_path = Path(state_path)
        self._dir = self._state_path.parent
        self._target_name = self._state_path.name.encode("utf-8")
        self._on_change = on_change
        self._debounce = max(0.0, float(debounce_seconds))
        self._libc: ctypes.CDLL | None = None
        self._fd: int = -1
        self._wd: int = -1
        self._task: asyncio.Task | None = None
        self._active = False

    @property
    def active(self) -> bool:
        return self._active

    async def start(self) -> bool:
        """Arm the watch. Returns True if inotify is watching, False if it fell back to poll."""
        if self._active:
            return True
        libc = _load_libc()
        if libc is None:
            logger.info("DLC-YOLO inotify unavailable on this platform; relying on the 120s poll")
            return False
        try:
            self._dir.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass
        fd = libc.inotify_init1(_IN_NONBLOCK)
        if fd < 0:
            logger.info("DLC-YOLO inotify_init1 failed (errno %s); relying on the 120s poll",
                        ctypes.get_errno())
            return False
        wd = libc.inotify_add_watch(
            fd, str(self._dir).encode("utf-8"),
            _IN_CLOSE_WRITE | _IN_MOVED_TO | _IN_ONLYDIR)
        if wd < 0:
            eno = ctypes.get_errno()
            os.close(fd)
            logger.info("DLC-YOLO inotify_add_watch(%s) failed (errno %s); relying on the poll",
                        self._dir, eno)
            return False
        self._libc, self._fd, self._wd = libc, fd, wd
        self._active = True
        self._task = asyncio.create_task(self._run(), name="dlc-yolo-state-inotify")
        logger.info("DLC-YOLO inotify watch armed on %s (target %s)",
                    self._dir, self._target_name.decode("utf-8", "replace"))
        return True

    async def stop(self) -> None:
        self._active = False
        task, self._task = self._task, None
        if task is not None:
            task.cancel()
            with __import__("contextlib").suppress(asyncio.CancelledError, Exception):
                await task
        if self._fd >= 0:
            with __import__("contextlib").suppress(OSError):
                os.close(self._fd)
        self._fd = self._wd = -1
        self._libc = None

    def _relevant(self, data: bytes) -> bool:
        """True if the raw inotify buffer contains an event for OUR target file."""
        offset = 0
        n = len(data)
        while offset + _EVENT_HEADER_SIZE <= n:
            _wd, _mask, _cookie, length = _EVENT_HEADER.unpack_from(data, offset)
            offset += _EVENT_HEADER_SIZE
            name = data[offset:offset + length].split(b"\x00", 1)[0]
            offset += length
            if name == self._target_name:
                return True
        return False

    async def _run(self) -> None:
        """Read events off the inotify fd via the event loop and fire the debounced callback."""
        loop = asyncio.get_running_loop()
        ready = asyncio.Event()
        loop.add_reader(self._fd, ready.set)
        try:
            while self._active:
                await ready.wait()
                ready.clear()
                changed = False
                # Drain everything currently readable (a burst is one logical save).
                while True:
                    try:
                        data = os.read(self._fd, _READ_BUFFER)
                    except BlockingIOError:
                        break
                    except OSError as exc:
                        if exc.errno == errno.EINTR:
                            continue
                        raise
                    if not data:
                        break
                    if self._relevant(data):
                        changed = True
                if not changed:
                    continue
                if self._debounce:
                    # Coalesce a rapid follow-up burst (temp-write + rename) into one wake.
                    await asyncio.sleep(self._debounce)
                    with __import__("contextlib").suppress(BlockingIOError, OSError):
                        while True:
                            extra = os.read(self._fd, _READ_BUFFER)
                            if not extra:
                                break
                try:
                    await self._on_change()
                except Exception:  # noqa: BLE001 - a wake failure must never kill the watch
                    logger.warning("DLC-YOLO inotify on_change wake failed", exc_info=True)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 - fail-open: tear down, poll remains the safety net
            logger.warning("DLC-YOLO inotify watch loop ended unexpectedly", exc_info=True)
        finally:
            with __import__("contextlib").suppress(Exception):
                loop.remove_reader(self._fd)
