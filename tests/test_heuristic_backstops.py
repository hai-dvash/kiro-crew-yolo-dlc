"""HB1 + EF1 regression tests (parity-full-2.2 §3, §4). The heuristics that used to live only in
the orchestrator prompt now have deterministic code backstops: a prompt regression that drops the
scope-growth back-step, the phase trigger, or the bootstrap cap is SURFACED (raised/blocked), never
silently skipped. The backstops RAISE/SURFACE only — they never perform a back-step or create crews.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest import mock

import dlc_yolo_advance as advance


def _cycle():
    return {"moves": 0, "max_moves": 3, "escalations": 0, "max_escalations": 2,
            "moved": [], "waiting_gates": []}


def _run(state):
    ctx = mock.MagicMock(name="ctx")
    now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    return advance._run_advance_passes(ctx, state, now, _cycle())


def _pipeline():
    return {"id": "pl1", "repo": "o/r", "steps": [
        {"id": "requirements", "type": "agent"}, {"id": "design", "type": "agent"},
        {"id": "tasks", "type": "agent"}, {"id": "implement", "type": "agent"}]}


def test_effort_spent_is_written():
    card = {"id": "c1", "stage": "design", "pipeline_id": "pl1",
            "effort": {"scope": {"requirements": 3, "design": 5}}}
    state = {"config": {"depth": "standard"}, "pipelines": [_pipeline()], "cards": [card]}
    _run(state)
    assert card["effort"]["spent"] == 8


def test_scope_growth_raises_decision_when_prompt_missed_it():
    # standard depth factor 2.0: design 9 > 2.0 * requirements 3 → raise
    card = {"id": "c1", "stage": "design", "pipeline_id": "pl1",
            "depth": "standard", "effort": {"scope": {"requirements": 3, "design": 9}}}
    state = {"config": {"depth": "standard"}, "pipelines": [_pipeline()], "cards": [card]}
    _run(state)
    d = [x for x in card.get("decisions", []) if x.get("kind") == "scope-growth"]
    assert len(d) == 1
    assert d[0]["boundary"] == "design→requirements"
    assert d[0]["raised_by"] == "auto:growth-backstop"
    assert d[0]["status"] == "open"


def test_scope_growth_not_raised_within_factor():
    card = {"id": "c1", "stage": "design", "pipeline_id": "pl1",
            "depth": "standard", "effort": {"scope": {"requirements": 5, "design": 8}}}  # 8 <= 10
    state = {"config": {"depth": "standard"}, "pipelines": [_pipeline()], "cards": [card]}
    _run(state)
    assert not [x for x in card.get("decisions", []) if x.get("kind") == "scope-growth"]


def test_scope_growth_fires_on_tshirt_size_strings():
    # ROOT-CAUSE regression (scope-growth-dead-trigger): step-agents write effort.scope as SIZE
    # STRINGS ('S'/'XL'), and every numeric consumer used to skip on isinstance(int|float) — so
    # scope-growth NEVER fired on real data (0/15 live cards). With _scope_points coercion,
    # XL(8) > 2.0 * S(1) must now raise the fork.
    card = {"id": "c1", "stage": "design", "pipeline_id": "pl1",
            "depth": "standard", "effort": {"scope": {"requirements": "S", "design": "XL"}}}
    state = {"config": {"depth": "standard"}, "pipelines": [_pipeline()], "cards": [card]}
    _run(state)
    d = [x for x in card.get("decisions", []) if x.get("kind") == "scope-growth"]
    assert len(d) == 1, "scope-growth must fire on size strings, not only numeric points"
    assert d[0]["boundary"] == "design→requirements"
    # spent is the coerced sum: S(1) + XL(8) = 9
    assert card["effort"]["spent"] == 9


def test_scope_growth_size_strings_within_factor_not_raised():
    # M(3) <= 2.0 * M(3)=6 → no raise, proving the coercion respects the factor, not just presence.
    card = {"id": "c1", "stage": "design", "pipeline_id": "pl1",
            "depth": "standard", "effort": {"scope": {"requirements": "M", "design": "M"}}}
    state = {"config": {"depth": "standard"}, "pipelines": [_pipeline()], "cards": [card]}
    _run(state)
    assert not [x for x in card.get("decisions", []) if x.get("kind") == "scope-growth"]


def test_scope_growth_not_double_raised():
    card = {"id": "c1", "stage": "design", "pipeline_id": "pl1",
            "depth": "standard", "effort": {"scope": {"requirements": 3, "design": 9}},
            "decisions": [{"id": "x", "kind": "scope-growth", "boundary": "design→requirements"}]}
    state = {"config": {"depth": "standard"}, "pipelines": [_pipeline()], "cards": [card]}
    _run(state)
    assert len([x for x in card["decisions"] if x.get("kind") == "scope-growth"]) == 1


def test_phase_trigger_unrecorded_surfaces_after_staleness():
    old = (datetime.now(timezone.utc) - timedelta(seconds=advance.PENDING_STALE_SECS + 60)).isoformat().replace("+00:00", "Z")
    card = {"id": "c1", "stage": "design", "pipeline_id": "pl1",
            "step_status": {"design": "pending"}, "pending_at": {"design": old}}
    state = {"config": {}, "pipelines": [_pipeline()], "cards": [card]}
    _run(state)
    assert str(card["block_reason"]["design"]).startswith("phase-trigger-unrecorded")


def test_phase_trigger_not_surfaced_when_step_session_exists():
    # A step SESSION is positive evidence a trigger was picked (even without trigger_history) —
    # the backstop must NOT falsely block a card with real step activity.
    old = (datetime.now(timezone.utc) - timedelta(seconds=advance.PENDING_STALE_SECS + 60)).isoformat().replace("+00:00", "Z")
    card = {"id": "c1", "stage": "design", "pipeline_id": "pl1",
            "step_status": {"design": "pending"}, "pending_at": {"design": old},
            "step_sessions": {"design": {"slot_key": "cron-x", "cron_id": "x"}}}
    state = {"config": {}, "pipelines": [_pipeline()], "cards": [card]}
    _run(state)
    assert "design" not in card.get("block_reason", {})


def test_phase_trigger_not_surfaced_with_artifact():
    old = (datetime.now(timezone.utc) - timedelta(seconds=advance.PENDING_STALE_SECS + 60)).isoformat().replace("+00:00", "Z")
    card = {"id": "c1", "stage": "design", "pipeline_id": "pl1",
            "step_status": {"design": "pending"}, "pending_at": {"design": old},
            "artifacts": {"design": "s3://x"}}
    state = {"config": {}, "pipelines": [_pipeline()], "cards": [card]}
    _run(state)
    assert "design" not in card.get("block_reason", {})


def test_bootstrap_crew_cap_breach_blocks():
    card = {"id": "c1", "stage": "intake", "pipeline_id": "pl1",
            "bootstrap": {"status": "done", "crews_created": ["a", "b", "c", "d"]}}
    state = {"config": {}, "pipelines": [_pipeline()], "cards": [card]}
    _run(state)
    assert str(card["block_reason"]["intake"]).startswith("bootstrap-crew-cap")


def test_bootstrap_within_cap_ok():
    card = {"id": "c1", "stage": "intake", "pipeline_id": "pl1",
            "bootstrap": {"status": "done", "crews_created": ["a", "b"]}}
    state = {"config": {}, "pipelines": [_pipeline()], "cards": [card]}
    _run(state)
    assert "intake" not in card.get("block_reason", {})
