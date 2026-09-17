"""Regression tests for the per-step human-readable summary synthesizer
(legibility-and-event-tree-spec §3b).

Every terminal step must carry a plain-language card.step_summaries[step] — agent-authored
when present, synthesized from stable facts otherwise — so a step is NEVER surfaced as a raw
agent monologue. These pin the deterministic floor.
"""

from __future__ import annotations

import dlc_yolo_advance as advance


def _card(**over):
    c = {"id": "c1", "step_status": {}, "updated_at": "2026-09-12T00:00:00Z"}
    c.update(over)
    return c


def test_done_step_synthesizes_completed_summary():
    card = _card(step_status={"investigate": "done"},
                 child_runs={"investigate": [{"executor": "dlcyolo-rps3d-market"}]})
    state = {"cards": [card]}
    assert advance._synthesize_step_summaries(state, "t1") is True
    s = card["step_summaries"]["investigate"]
    assert s["synthesized"] is True
    assert s["needs_human"] is False
    assert s["executor"] == "dlcyolo-rps3d-market"
    assert "Investigated" in s["headline"]
    assert len(s["headline"]) <= 80 and len(s["description"]) <= 280


def test_blocked_step_is_needs_human_with_reason():
    card = _card(step_status={"design": "blocked"},
                 block_reason={"design": "needs a data-model decision"})
    state = {"cards": [card]}
    advance._synthesize_step_summaries(state, "t1")
    s = card["step_summaries"]["design"]
    assert s["needs_human"] is True
    assert "blocked" in s["headline"]
    assert "data-model decision" in s["description"]


def test_error_step_not_needs_human():
    card = _card(step_status={"implement": "error"},
                 error_reason={"implement": "toolchain flaked"})
    state = {"cards": [card]}
    advance._synthesize_step_summaries(state, "t1")
    s = card["step_summaries"]["implement"]
    assert s["needs_human"] is False
    assert "error" in s["headline"]


def test_agent_authored_summary_is_preserved():
    card = _card(step_status={"requirements": "done"},
                 step_summaries={"requirements": {
                     "headline": "Spec'd the rate-limit feature",
                     "description": "Human-written summary.",
                     "status": "done"}})  # no 'synthesized' flag → agent-authored
    state = {"cards": [card]}
    changed = advance._synthesize_step_summaries(state, "t1")
    # unchanged: the agent's own summary is kept, not overwritten
    assert changed is False
    assert card["step_summaries"]["requirements"]["headline"] == "Spec'd the rate-limit feature"


def test_transient_pending_step_gets_no_summary():
    card = _card(step_status={"investigate": "pending"})
    state = {"cards": [card]}
    assert advance._synthesize_step_summaries(state, "t1") is False
    assert "investigate" not in (card.get("step_summaries") or {})


def test_stale_summary_pruned_when_step_reverts_to_pending():
    # A block was cleared → step is pending again; the old terminal summary must be dropped so the
    # glanceable line doesn't lie ("tasks: blocked" on a pending step).
    card = _card(step_status={"tasks": "pending"},
                 step_summaries={"tasks": {"schema_version": 1, "step": "tasks", "status": "blocked",
                                           "headline": "tasks: blocked", "synthesized": True}})
    state = {"cards": [card]}
    assert advance._synthesize_step_summaries(state, "t1") is True
    assert "tasks" not in (card.get("step_summaries") or {})


def test_stale_synthesized_summary_is_refreshed_on_status_change():
    card = _card(step_status={"investigate": "blocked"},
                 block_reason={"investigate": "missing input"},
                 step_summaries={"investigate": {
                     "headline": "Investigated the issue", "status": "done",
                     "synthesized": True}})
    state = {"cards": [card]}
    assert advance._synthesize_step_summaries(state, "t1") is True
    s = card["step_summaries"]["investigate"]
    assert s["status"] == "blocked" and s["needs_human"] is True
