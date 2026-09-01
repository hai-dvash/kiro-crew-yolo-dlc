"""TIER 6 — spawns cron (crons/dlc_yolo_spawns.py).

`_extract()` is defined INSIDE snapshot(), so it is not importable on its own. We drive
snapshot() end-to-end with a mock ctx.call_tool returning each envelope shape, point the
module-level SNAPSHOT path at a tmp file (monkeypatch), and assert on the written file plus
the Report/Skip control flow the runtime relies on.

Covers spec Tier 6 items 28-31:
  28  _extract: bare list; {runs:[...]}; MCP envelope {content:[{type:'text',text:json}]}; garbage -> []
  29  relevance filter: keeps dlc-yolo / card- / dlcyolo- (mixed case, task OR agent field); drops others
  30  change-signature: same (id,status) -> Skip; same ids changed status -> writes
  31  first-run (no prev file) -> writes
"""

from __future__ import annotations

import json
from unittest import mock

import pytest

import dlc_yolo_spawns as sp
from kiro_crew.cron_script import Report, Skip


# --------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------
def _run(ctx, monkeypatch, tmp_path, snapshot_name="live_spawns.json"):
    """Point the module SNAPSHOT at a tmp file and run snapshot(ctx).

    Returns (outcome, message, written_payload_or_None) where outcome is 'report' or 'skip'.
    """
    snap = tmp_path / snapshot_name
    monkeypatch.setattr(sp, "SNAPSHOT", snap, raising=True)
    try:
        sp.snapshot(ctx)
        outcome, message = "return", None
    except Report as r:
        outcome, message = "report", getattr(r, "message", "")
    except Skip:
        outcome, message = "skip", None
    payload = json.loads(snap.read_text()) if snap.exists() else None
    return outcome, message, payload


def _ctx_returning(value):
    ctx = mock.MagicMock(name="ctx")
    ctx.call_tool = mock.MagicMock(return_value=value)
    return ctx


def _mcp_envelope(obj):
    """Wrap a python object as the MCP text-content envelope spawn_list actually returns."""
    return {"content": [{"type": "text", "text": json.dumps(obj)}]}


DLC_RUN = {"agent_id": "a1", "task": "dlc-yolo card work", "status": "running"}


# --------------------------------------------------------------------------------------
# 28 — _extract handles every shape
# --------------------------------------------------------------------------------------
def test_extract_bare_list(monkeypatch, tmp_path):
    ctx = _ctx_returning([DLC_RUN])
    outcome, _msg, payload = _run(ctx, monkeypatch, tmp_path)
    assert outcome == "report"
    assert [r["id"] for r in payload["runs"]] == ["a1"]


def test_extract_runs_dict(monkeypatch, tmp_path):
    ctx = _ctx_returning({"runs": [DLC_RUN]})
    outcome, _msg, payload = _run(ctx, monkeypatch, tmp_path)
    assert outcome == "report"
    assert [r["id"] for r in payload["runs"]] == ["a1"]


def test_extract_mcp_envelope_text_json(monkeypatch, tmp_path):
    # The real spawn_list shape: {content:[{type:'text', text:'<json list>'}]}
    ctx = _ctx_returning(_mcp_envelope([DLC_RUN]))
    outcome, _msg, payload = _run(ctx, monkeypatch, tmp_path)
    assert outcome == "report"
    assert [r["id"] for r in payload["runs"]] == ["a1"]


def test_extract_mcp_envelope_text_runs_dict(monkeypatch, tmp_path):
    # envelope whose text decodes to {"runs":[...]} — also unwrapped
    ctx = _ctx_returning(_mcp_envelope({"runs": [DLC_RUN]}))
    outcome, _msg, payload = _run(ctx, monkeypatch, tmp_path)
    assert outcome == "report"
    assert [r["id"] for r in payload["runs"]] == ["a1"]


def test_extract_garbage_yields_empty(monkeypatch, tmp_path):
    # Garbage (a non-list/non-dict, and an envelope with unparseable text) -> [] -> a
    # first-run write of an empty runs list (Report), not a crash.
    ctx = _ctx_returning({"content": [{"type": "text", "text": "not json {{"}]})
    outcome, _msg, payload = _run(ctx, monkeypatch, tmp_path)
    assert outcome == "report"
    assert payload["runs"] == []


def test_extract_scalar_garbage_yields_empty(monkeypatch, tmp_path):
    ctx = _ctx_returning(12345)
    outcome, _msg, payload = _run(ctx, monkeypatch, tmp_path)
    assert outcome == "report"
    assert payload["runs"] == []


# --------------------------------------------------------------------------------------
# 29 — relevance filter
# --------------------------------------------------------------------------------------
def test_relevance_keeps_dlc_markers_mixed_case_and_agent_field(monkeypatch, tmp_path):
    items = [
        {"agent_id": "keep-task-dlc", "task": "DLC-YOLO uppercase in task"},        # mixed case, task field
        {"agent_id": "keep-task-card", "task": "processing Card-42 now"},           # card- marker
        {"agent_id": "keep-agent", "task": "generic work", "agent": "dlcyolo-x-impl"},  # marker in agent field
        {"agent_id": "drop-1", "task": "some unrelated build job"},                 # no marker -> dropped
        {"agent_id": "drop-2", "task": "", "agent": "random-agent"},                # no marker -> dropped
    ]
    ctx = _ctx_returning(items)
    outcome, _msg, payload = _run(ctx, monkeypatch, tmp_path)
    assert outcome == "report"
    kept = sorted(r["id"] for r in payload["runs"])
    assert kept == ["keep-agent", "keep-task-card", "keep-task-dlc"]


def test_relevance_drops_non_dict_items(monkeypatch, tmp_path):
    ctx = _ctx_returning(["a string", 42, None, DLC_RUN])
    outcome, _msg, payload = _run(ctx, monkeypatch, tmp_path)
    assert outcome == "report"
    assert [r["id"] for r in payload["runs"]] == ["a1"]


# --------------------------------------------------------------------------------------
# 30 — change-signature
# --------------------------------------------------------------------------------------
def test_signature_same_id_status_skips(monkeypatch, tmp_path):
    snap = tmp_path / "live_spawns.json"
    monkeypatch.setattr(sp, "SNAPSHOT", snap, raising=True)
    # Prior snapshot with the same (id, status) signature the current call will produce.
    snap.write_text(json.dumps({"at": "old", "runs": [{"id": "a1", "status": "running"}]}))

    ctx = _ctx_returning([DLC_RUN])  # id=a1 status=running -> same signature
    with pytest.raises(Skip):
        sp.snapshot(ctx)
    # File left untouched (still the 'old' timestamp).
    assert json.loads(snap.read_text())["at"] == "old"


def test_signature_status_change_writes(monkeypatch, tmp_path):
    snap = tmp_path / "live_spawns.json"
    monkeypatch.setattr(sp, "SNAPSHOT", snap, raising=True)
    snap.write_text(json.dumps({"at": "old", "runs": [{"id": "a1", "status": "running"}]}))

    # Same id, DIFFERENT status -> signature changes -> rewrite.
    changed = {"agent_id": "a1", "task": "dlc-yolo card work", "status": "error"}
    ctx = _ctx_returning([changed])
    with pytest.raises(Report):
        sp.snapshot(ctx)
    payload = json.loads(snap.read_text())
    assert payload["at"] != "old"
    assert payload["runs"][0]["status"] == "error"


# --------------------------------------------------------------------------------------
# 31 — first run (no prev file) writes
# --------------------------------------------------------------------------------------
def test_first_run_no_prev_writes(monkeypatch, tmp_path):
    ctx = _ctx_returning([DLC_RUN])
    outcome, msg, payload = _run(ctx, monkeypatch, tmp_path, snapshot_name="fresh.json")
    assert outcome == "report"
    assert msg == "live spawns: 1"
    assert payload["runs"][0]["id"] == "a1"


def test_first_run_corrupt_prev_falls_through_to_write(monkeypatch, tmp_path):
    snap = tmp_path / "live_spawns.json"
    monkeypatch.setattr(sp, "SNAPSHOT", snap, raising=True)
    snap.write_text("{ this is not valid json")
    ctx = _ctx_returning([DLC_RUN])
    with pytest.raises(Report):
        sp.snapshot(ctx)
    assert json.loads(snap.read_text())["runs"][0]["id"] == "a1"


# --------------------------------------------------------------------------------------
# tool-unavailable path
# --------------------------------------------------------------------------------------
def test_call_tool_raises_yields_skip(monkeypatch, tmp_path):
    snap = tmp_path / "live_spawns.json"
    monkeypatch.setattr(sp, "SNAPSHOT", snap, raising=True)
    ctx = mock.MagicMock()
    ctx.call_tool = mock.MagicMock(side_effect=RuntimeError("tool down"))
    with pytest.raises(Skip):
        sp.snapshot(ctx)
    assert not snap.exists()
