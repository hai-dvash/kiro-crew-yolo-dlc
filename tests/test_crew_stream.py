"""Tests for the live crew-stream watcher (backend/crew_stream.py).

Mirrors test_inotify_watch.py: syspath-prepend, import, drive the async watcher with asyncio.run.
The live-fire test is skipped when inotify is unavailable (non-Linux CI); the delta-reader logic and
the graceful no-op are tested without a live kernel watch.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest


@pytest.fixture()
def crew_mod(monkeypatch):
    monkeypatch.syspath_prepend(str(Path(__file__).resolve().parent.parent))
    sys.modules.pop("backend.crew_stream", None)
    import backend.crew_stream as mod  # noqa: PLC0415
    return mod


def _inotify_available(mod) -> bool:
    return mod._load_libc() is not None


def test_graceful_noop_when_inotify_unavailable(crew_mod, tmp_path, monkeypatch):
    monkeypatch.setattr(crew_mod, "_load_libc", lambda: None)
    folds = []

    async def on_fold(agent_id, text):
        folds.append((agent_id, text))

    w = crew_mod.CrewStreamWatcher(tmp_path / "subagents", on_fold=on_fold)

    async def scenario():
        armed = await w.start()
        assert armed is False
        assert w.active is False
        await w.stop()

    asyncio.run(scenario())
    assert folds == []


def test_read_delta_tracks_offset_and_caps(crew_mod, tmp_path):
    root = tmp_path / "subagents"
    (root / "agent-1").mkdir(parents=True)
    rt = root / "agent-1" / "result.txt"
    w = crew_mod.CrewStreamWatcher(root, on_fold=lambda *_: None, max_delta_bytes=16)

    rt.write_text("hello", encoding="utf-8")
    assert w._read_delta("agent-1") == "hello"        # first read: whole file
    assert w._read_delta("agent-1") == ""             # nothing new
    rt.write_text("hello world", encoding="utf-8")    # appended " world"
    assert w._read_delta("agent-1") == " world"        # only the delta
    # cap: a big append hands back at most max_delta_bytes, advancing the cursor to EOF
    rt.write_text("hello world" + "x" * 100, encoding="utf-8")
    delta = w._read_delta("agent-1")
    assert len(delta.encode("utf-8")) <= 16
    assert w._read_delta("agent-1") == ""             # cursor advanced to EOF despite the cap

    # truncation/rotation → cursor resets, does not replay the whole file
    rt.write_text("short", encoding="utf-8")
    out = w._read_delta("agent-1")
    assert out in ("short", "")                        # reset path (size < prev) yields no replay


def test_missing_result_file_is_silent(crew_mod, tmp_path):
    root = tmp_path / "subagents"
    root.mkdir()
    w = crew_mod.CrewStreamWatcher(root, on_fold=lambda *_: None)
    assert w._read_delta("nonexistent") == ""


@pytest.mark.skipif(
    "not __import__('backend.crew_stream', fromlist=['_load_libc'])._load_libc()",
    reason="inotify unavailable on this host")
def test_fires_fold_on_result_append(crew_mod, tmp_path):
    if not _inotify_available(crew_mod):
        pytest.skip("inotify unavailable")
    root = tmp_path / "subagents"
    (root / "agent-x").mkdir(parents=True)
    rt = root / "agent-x" / "result.txt"
    rt.write_text("", encoding="utf-8")
    got = {}
    done = asyncio.Event()

    async def on_fold(agent_id, text):
        got[agent_id] = text
        done.set()

    w = crew_mod.CrewStreamWatcher(root, on_fold=on_fold, debounce_seconds=0.05)

    async def scenario():
        armed = await w.start()
        if not armed:
            pytest.skip("inotify did not arm")
        await asyncio.sleep(0.1)
        with rt.open("a", encoding="utf-8") as fh:
            fh.write("crew is thinking about the layout")
        try:
            await asyncio.wait_for(done.wait(), timeout=3.0)
        finally:
            await w.stop()

    asyncio.run(scenario())
    assert "agent-x" in got
    assert "layout" in got["agent-x"]
