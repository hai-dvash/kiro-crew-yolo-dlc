"""Tests for the poll-free state-file inotify watcher (backend/inotify_watch.py).

Style mirrors test_backend_server.py: syspath-prepend the repo root, import the module, drive the
async watcher with asyncio.run. The whole module is skipped when inotify is not available on the
test host (non-Linux CI) — the watcher itself degrades to a no-op there, which is asserted
separately without needing a live kernel watch.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest


@pytest.fixture()
def watch_mod(monkeypatch):
    monkeypatch.syspath_prepend(str(Path(__file__).resolve().parent.parent))
    sys.modules.pop("backend.inotify_watch", None)
    import backend.inotify_watch as mod  # noqa: PLC0415
    return mod


def _inotify_available(mod) -> bool:
    return mod._load_libc() is not None


def test_graceful_noop_when_inotify_unavailable(watch_mod, tmp_path, monkeypatch):
    # Simulate a platform without inotify: start() must return False and never arm a task.
    monkeypatch.setattr(watch_mod, "_load_libc", lambda: None)
    fired = []
    w = watch_mod.StateFileWatcher(
        tmp_path / "state.json", on_change=lambda: fired.append(1))

    async def scenario():
        armed = await w.start()
        assert armed is False
        assert w.active is False
        await w.stop()  # idempotent, safe on an unarmed watcher

    asyncio.run(scenario())
    assert fired == []


def test_relevant_filters_to_target_basename(watch_mod, tmp_path):
    w = watch_mod.StateFileWatcher(tmp_path / "state.json", on_change=lambda: None)
    import struct  # noqa: PLC0415

    def _event(name: bytes) -> bytes:
        # struct inotify_event: wd, mask, cookie, len, name (NUL-padded)
        padded = name + b"\x00"
        return struct.pack("iIII", 1, watch_mod._IN_CLOSE_WRITE, 0, len(padded)) + padded

    assert w._relevant(_event(b"state.json")) is True
    assert w._relevant(_event(b"live_spawns.json")) is False
    assert w._relevant(_event(b".statepath")) is False
    # a buffer with several events, one of which is the target
    assert w._relevant(_event(b"other") + _event(b"state.json")) is True


@pytest.mark.skipif(
    "not __import__('backend.inotify_watch', fromlist=['_load_libc'])._load_libc()",
    reason="inotify unavailable on this host")
def test_fires_on_target_write_not_on_sibling(watch_mod, tmp_path):
    if not _inotify_available(watch_mod):
        pytest.skip("inotify unavailable")
    state = tmp_path / "state.json"
    state.write_text("{}", encoding="utf-8")
    fired = asyncio.Event()

    async def on_change():
        fired.set()

    w = watch_mod.StateFileWatcher(state, on_change=on_change, debounce_seconds=0.02)

    async def scenario():
        armed = await w.start()
        assert armed is True
        try:
            # A sibling write must NOT fire the callback.
            (tmp_path / "live_spawns.json").write_text("x", encoding="utf-8")
            await asyncio.sleep(0.2)
            assert not fired.is_set()
            # An atomic replace of the target (temp + os.replace) MUST fire it.
            tmp = tmp_path / "state.json.tmp"
            tmp.write_text('{"v":1}', encoding="utf-8")
            import os  # noqa: PLC0415
            os.replace(tmp, state)
            await asyncio.wait_for(fired.wait(), timeout=2.0)
        finally:
            await w.stop()
        assert w.active is False

    asyncio.run(scenario())


def test_stop_is_idempotent_and_safe(watch_mod, tmp_path, monkeypatch):
    monkeypatch.setattr(watch_mod, "_load_libc", lambda: None)
    w = watch_mod.StateFileWatcher(tmp_path / "state.json", on_change=lambda: None)

    async def scenario():
        await w.stop()  # never started
        await w.start()
        await w.stop()
        await w.stop()  # double stop

    asyncio.run(scenario())
