"""Orchestrator-session trigger tests (first-class-sessions §4).

The advance cron's _process_orchestrator_triggers pass turns a card's
`orchestrator_trigger` request into an openable persistent orchestrator session
recorded as `card.orchestrator_session`. These pin: it mints the session with a
slot-creating spawn (silent:False + hide_in_chat:False), records the spec state
shape, is idempotent when a session already exists, and no-ops without a request.
"""

from __future__ import annotations

import dlc_yolo_advance as advance


class _Ctx:
    def __init__(self):
        self.calls = []

    def call_tool(self, server, tool, payload):
        self.calls.append((server, tool, payload))
        assert server == "kirocrew-cron" and tool == "cron_add"
        return "Added job: abc123def456 (orchestrator :: card-x) scheduled"


def _card(trigger_status="requested"):
    return {"id": "card-x", "pipeline_id": "pl-1", "stage": "design",
            "orchestrator_trigger": {"status": trigger_status, "at": "t0"}}


def _state(card):
    return {"pipelines": [{"id": "pl-1", "repo": "o/r"}], "cards": [card]}


def test_trigger_mints_openable_session_with_slot_controls():
    ctx = _Ctx()
    state = _state(_card())
    assert advance._process_orchestrator_triggers(ctx, state, "t1") is True
    payload = ctx.calls[0][2]
    assert payload["silent"] is False
    assert payload["hide_in_chat"] is False
    assert payload["persistent_session"] is True
    assert payload["agent"] == "dlcyolo-coordinator"
    os_ = state["cards"][0]["orchestrator_session"]
    assert os_["cron_id"] == "abc123def456"
    assert os_["slot_key"] == "cron-abc123def456"
    assert os_["session_key"] == "cron:abc123def456"
    assert os_["name"] == "dlc-yolo · o/r · orchestrator"
    assert os_["warm"] is False
    assert state["cards"][0]["orchestrator_trigger"]["status"] == "satisfied"


def test_trigger_is_idempotent_when_session_exists():
    ctx = _Ctx()
    card = _card()
    card["orchestrator_session"] = {"cron_id": "existing", "session_key": "cron:existing"}
    state = _state(card)
    assert advance._process_orchestrator_triggers(ctx, state, "t1") is True
    # no new spawn — the existing session is reused
    assert ctx.calls == []
    assert card["orchestrator_trigger"]["status"] == "satisfied"


def test_no_trigger_is_noop():
    ctx = _Ctx()
    state = {"pipelines": [], "cards": [{"id": "c2"}]}
    assert advance._process_orchestrator_triggers(ctx, state, "t1") is False
    assert ctx.calls == []


def test_unrequested_trigger_status_ignored():
    ctx = _Ctx()
    state = _state(_card(trigger_status="satisfied"))
    assert advance._process_orchestrator_triggers(ctx, state, "t1") is False
    assert ctx.calls == []


# --- Actor distinction: coordinator step-agent is NOT the pipeline orchestrator --- #

def test_orchestrator_session_has_exactly_one_writer():
    """`card.orchestrator_session` must be written ONLY by _process_orchestrator_triggers.

    A per-step escalation records `card.step_sessions[...]` (a STEP-AGENT, which may wear the
    dlcyolo-coordinator PROFILE for crew dispatch); it must NEVER write orchestrator_session.
    If a second writer appears, the step-vs-orchestrator distinction the whole system hinges on
    has been broken (the exact 'coordinator sessions end up as orchestrator crons' confusion).
    """
    import re
    from pathlib import Path
    src = (Path(__file__).resolve().parent.parent / "crons" / "_dlc_yolo_impl.py").read_text(
        encoding="utf-8")
    # Assignment/setdefault writes to card["orchestrator_session"] / card.setdefault("orchestrator_session"...
    write_sites = re.findall(
        r"""\[["']orchestrator_session["']\]\s*=|setdefault\(\s*["']orchestrator_session["']""",
        src,
    )
    # There is exactly one legitimate write site (inside _process_orchestrator_triggers).
    assert len(write_sites) == 1, (
        f"expected exactly 1 writer of card.orchestrator_session (in "
        f"_process_orchestrator_triggers); found {len(write_sites)}. A step escalation must "
        f"record step_sessions, never orchestrator_session."
    )


def test_step_escalation_agent_is_a_capability_profile_not_the_orchestrator():
    """The escalation seed's `agent` is a capability PROFILE (dlcyolo-*), and the orchestrator
    trigger's session is recorded separately. This pins that the trigger pass uses the coordinator
    PROFILE as a toolbelt (it needs select_crew/spawn_run), which is distinct from the profile a
    producing step-agent gets — the coordinator name is a toolbelt, not the actor."""
    ctx = _Ctx()
    state = _state(_card())
    advance._process_orchestrator_triggers(ctx, state, "t1")
    payload = ctx.calls[0][2]
    # orchestrator session runs ON the coordinator profile (needs crew-routing tools) ...
    assert payload["agent"] == "dlcyolo-coordinator"
    # ... but it is recorded as orchestrator_session, NOT as a step_sessions entry.
    card = state["cards"][0]
    assert "orchestrator_session" in card
    assert not (card.get("step_sessions") or {}), (
        "orchestrator trigger must not write step_sessions (that is the step-agent lane)")
