"""DLC-YOLO live crew-stream watcher — tail a crew subagent's output into the progress trail.

Why this exists
---------------
A crew pass is a subagent the step-agent spawns from WITHIN itself; the step-agent's ``spawn_run``
blocks until it returns, so from the step-agent's vantage the crew's work is opaque until done. But
the host writes the subagent's output to disk LIVE, token-by-token, out of band:
``~/.kiro/crew/subagents/{agent_id}/result.txt`` (host ``subagent_persistence.py``). A DIFFERENT
reader can therefore watch the liveness the step-agent cannot see.

This module is that reader. It generalizes the state-file inotify pattern
(``backend/inotify_watch.py``) to the subagents ROOT directory, notices appends to any
``result.txt``, reads only the NEW delta (per-id byte offset), and hands the bounded delta to an
injected async ``on_fold(agent_id, text)`` callback. The backend wires that callback to fold the
redacted, bounded tail into ``card.step_progress[step]`` — the same presentation-only trail the
``LiveMiniPane`` already tails. See ``docs/live-crew-stream-spec.md``.

Boundaries
----------
* READ-ONLY observer of the filesystem. It reads ``result.txt`` deltas and invokes ``on_fold``;
  it mutates NO state itself (the backend's fold callback owns the presentation-only write).
* Watches the subagents ROOT dir (a directory watch), filtering events to the ``result.txt``
  basename, so only crew-output writes fire. Per-agent-id byte offsets mean each fold reads only
  what was appended since the last fold — never the whole file.
* Presentation-only downstream: the trail it feeds is never control-authoritative and is dropped at
  step-terminal (the durable ``step_results`` supersedes it).
* Fail-open: inotify unavailable, a missing dir, or a read error degrades silently to "no live crew
  tail". Nothing downstream depends on it; the step-agent's blocking return is unaffected.
* Bounded: each delta is truncated before it reaches the callback, so a fast/verbose crew cannot
  balloon a single fold. The rolling trail cap is enforced by the fold sink.
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

logger = logging.getLogger("kirocrew.app.dlc-yolo.crewstream")

_IN_MODIFY = 0x00000002
_IN_CLOSE_WRITE = 0x00000008
_IN_MOVED_TO = 0x00000080
_IN_CREATE = 0x00000100
_IN_ONLYDIR = 0x01000000
_IN_NONBLOCK = 0x00000800
_EVENT_HEADER = struct.Struct("iIII")
_EVENT_HEADER_SIZE = _EVENT_HEADER.size
_READ_BUFFER = 64 * 1024
_DEBOUNCE_SECONDS = 0.2
_RESULT_BASENAME = b"result.txt"
# Per-fold delta cap: a single fold hands at most this many bytes to the callback (the fold sink
# bounds again to one short line). A fast crew streaming megabytes never balloons one fold.
_MAX_DELTA_BYTES = 8192


def _load_libc() -> ctypes.CDLL | None:
    if not hasattr(os, "O_NONBLOCK"):
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


class CrewStreamWatcher:
    """Watch the subagents root for ``result.txt`` appends and fold per-id deltas.

    Usage::

        watcher = CrewStreamWatcher(subagents_root, on_fold=_fold_crew_tail)
        await watcher.start()   # no-op + logs when inotify is unavailable
        ...
        await watcher.stop()

    ``on_fold(agent_id: str, text: str)`` is awaited with the newly-appended (bounded) text for the
    subagent whose ``result.txt`` changed. The callback decides whether that agent_id is a live crew
    pass for a card+step and folds it; the watcher does not consult state.
    """

    def __init__(self, subagents_root: Path,
                 on_fold: Callable[[str, str], Awaitable[None]],
                 *, debounce_seconds: float = _DEBOUNCE_SECONDS,
                 max_delta_bytes: int = _MAX_DELTA_BYTES) -> None:
        self._root = Path(subagents_root)
        self._on_fold = on_fold
        self._debounce = max(0.0, float(debounce_seconds))
        self._max_delta = int(max_delta_bytes)
        self._libc: ctypes.CDLL | None = None
        self._fd: int = -1
        self._wd_to_dir: dict[int, str] = {}   # watch-descriptor → subagent dir name (agent_id)
        self._offsets: dict[str, int] = {}      # agent_id → bytes already folded
        self._task: asyncio.Task | None = None
        self._active = False

    @property
    def active(self) -> bool:
        return self._active

    def _add_watch(self, path: Path) -> int:
        wd = self._libc.inotify_add_watch(
            self._fd, str(path).encode("utf-8"),
            _IN_MODIFY | _IN_CLOSE_WRITE | _IN_MOVED_TO | _IN_CREATE | _IN_ONLYDIR)
        return wd

    async def start(self) -> bool:
        if self._active:
            return True
        libc = _load_libc()
        if libc is None:
            logger.info("DLC-YOLO crew-stream inotify unavailable; no live crew tail")
            return False
        try:
            self._root.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass
        fd = libc.inotify_init1(_IN_NONBLOCK)
        if fd < 0:
            logger.info("DLC-YOLO crew-stream inotify_init1 failed (errno %s); no live crew tail",
                        ctypes.get_errno())
            return False
        self._libc, self._fd = libc, fd
        # Watch the root (to catch new {agent_id}/ dirs) AND each existing subagent dir (where the
        # result.txt actually lives). A watch on the root alone would not see writes one level down.
        root_wd = self._add_watch(self._root)
        if root_wd < 0:
            eno = ctypes.get_errno()
            os.close(fd)
            self._libc = None
            self._fd = -1
            logger.info("DLC-YOLO crew-stream add_watch(%s) failed (errno %s); no live crew tail",
                        self._root, eno)
            return False
        self._wd_to_dir[root_wd] = ""   # "" marks the root watch
        try:
            for child in self._root.iterdir():
                if child.is_dir():
                    wd = self._add_watch(child)
                    if wd >= 0:
                        self._wd_to_dir[wd] = child.name
        except OSError:
            pass
        self._active = True
        self._task = asyncio.create_task(self._run(), name="dlc-yolo-crew-stream-inotify")
        logger.info("DLC-YOLO crew-stream watch armed on %s", self._root)
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
        self._fd = -1
        self._libc = None
        self._wd_to_dir.clear()
        self._offsets.clear()

    def _read_delta(self, agent_id: str) -> str:
        """Read the newly-appended bytes of {agent_id}/result.txt since the last fold."""
        path = self._root / agent_id / "result.txt"
        try:
            size = path.stat().st_size
        except OSError:
            return ""
        prev = self._offsets.get(agent_id, 0)
        if size <= prev:
            # truncated/rotated → reset the cursor, do not re-emit the whole file
            if size < prev:
                self._offsets[agent_id] = size
            return ""
        start = prev
        # Never hand more than the per-fold cap to the callback; advance the cursor to EOF anyway so
        # a burst is coalesced rather than replayed piecemeal.
        if size - start > self._max_delta:
            start = size - self._max_delta
        try:
            with path.open("rb") as fh:
                fh.seek(start)
                data = fh.read(size - start)
        except OSError:
            return ""
        self._offsets[agent_id] = size
        return data.decode("utf-8", "replace")

    def _dirs_from_events(self, data: bytes) -> set[str]:
        """Return the set of subagent dir names whose result.txt was touched; add watches for any
        newly-created subagent dir seen on the root watch."""
        touched: set[str] = set()
        offset = 0
        n = len(data)
        while offset + _EVENT_HEADER_SIZE <= n:
            wd, mask, _cookie, length = _EVENT_HEADER.unpack_from(data, offset)
            offset += _EVENT_HEADER_SIZE
            raw = data[offset:offset + length].split(b"\x00", 1)[0]
            offset += length
            src = self._wd_to_dir.get(wd)
            if src == "":
                # root watch: a new subagent dir was created → start watching it
                if raw and (mask & (_IN_CREATE | _IN_MOVED_TO)):
                    child = self._root / raw.decode("utf-8", "replace")
                    if child.is_dir() and child.name not in self._wd_to_dir.values():
                        cwd = self._add_watch(child)
                        if cwd >= 0:
                            self._wd_to_dir[cwd] = child.name
            elif src is not None and raw == _RESULT_BASENAME:
                touched.add(src)
        return touched

    async def _run(self) -> None:
        loop = asyncio.get_running_loop()
        ready = asyncio.Event()
        loop.add_reader(self._fd, ready.set)
        try:
            while self._active:
                await ready.wait()
                ready.clear()
                touched: set[str] = set()
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
                    touched |= self._dirs_from_events(data)
                if not touched:
                    continue
                if self._debounce:
                    await asyncio.sleep(self._debounce)
                    with __import__("contextlib").suppress(BlockingIOError, OSError):
                        while True:
                            extra = os.read(self._fd, _READ_BUFFER)
                            if not extra:
                                break
                            touched |= self._dirs_from_events(extra)
                for agent_id in touched:
                    delta = self._read_delta(agent_id)
                    if not delta.strip():
                        continue
                    try:
                        await self._on_fold(agent_id, delta)
                    except Exception:  # noqa: BLE001 - a fold failure must never kill the watch
                        logger.warning("DLC-YOLO crew-stream fold failed for %s", agent_id,
                                       exc_info=True)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 - fail-open
            logger.warning("DLC-YOLO crew-stream watch loop ended unexpectedly", exc_info=True)
        finally:
            with __import__("contextlib").suppress(Exception):
                loop.remove_reader(self._fd)
