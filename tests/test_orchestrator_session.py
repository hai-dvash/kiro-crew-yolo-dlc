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
        if tool == "cron_add":
            return "Added job: abc123def456 (orchestrator :: card-x) scheduled"
        return "continued"  # spawn_continue

    def mints(self):
        return [c for c in self.calls if c[1] == "cron_add"]

    def continues(self):
        return [c for c in self.calls if c[1] == "spawn_continue"]


def _card(trigger_status="requested", cid="card-x"):
    return {"id": cid, "pipeline_id": "pl-1", "stage": "design",
            "orchestrator_trigger": {"status": trigger_status, "at": "t0"}}


def _state(*cards):
    return {"pipelines": [{"id": "pl-1", "repo": "o/r"}], "cards": list(cards)}


def test_trigger_mints_pipeline_session_with_slot_controls():
    ctx = _Ctx()
    state = _state(_card())
    assert advance._process_orchestrator_triggers(ctx, state, "t1") is True
    payload = ctx.mints()[0][2]
    assert payload["silent"] is False and payload["hide_in_chat"] is False
    assert payload["persistent_session"] is True
    assert payload["agent"] == "dlcyolo-coordinator"
    # SINGLE ORCHESTRATOR: session recorded on the PIPELINE, card holds a back-ref
    pl_os = state["pipelines"][0]["orchestrator_session"]
    assert pl_os["cron_id"] == "abc123def456"
    assert pl_os["slot_key"] == "cron-abc123def456"
    assert pl_os["session_key"] == "cron:abc123def456"
    card_ref = state["cards"][0]["orchestrator_session"]
    assert card_ref["ref"] is True and card_ref["pipeline_id"] == "pl-1"
    assert card_ref["session_key"] == "cron:abc123def456"
    assert state["cards"][0]["orchestrator_trigger"]["status"] == "satisfied"


def test_second_card_continues_not_remints():
    # SINGLE ORCHESTRATOR: a second card's trigger in the SAME pipeline continues the one session.
    ctx = _Ctx()
    state = _state(_card(cid="card-a"), _card(cid="card-b"))
    assert advance._process_orchestrator_triggers(ctx, state, "t1") is True
    assert len(ctx.mints()) == 1, "only ONE orchestrator session may be minted per pipeline"
    assert len(ctx.continues()) == 1, "the second card must CONTINUE the existing session"
    # both cards satisfied, both back-referencing the one session
    for c in state["cards"]:
        assert c["orchestrator_trigger"]["status"] == "satisfied"
        assert c["orchestrator_session"]["session_key"] == "cron:abc123def456"


def test_existing_pipeline_session_is_reused_via_continue():
    ctx = _Ctx()
    state = _state(_card())
    state["pipelines"][0]["orchestrator_session"] = {
        "cron_id": "existing", "slot_key": "cron-existing", "session_key": "cron:existing"}
    assert advance._process_orchestrator_triggers(ctx, state, "t1") is True
    assert ctx.mints() == [], "must not mint when a pipeline session already exists"
    assert len(ctx.continues()) == 1
    assert state["cards"][0]["orchestrator_session"]["session_key"] == "cron:existing"


def test_released_pipeline_session_re_mints():
    ctx = _Ctx()
    state = _state(_card())
    state["pipelines"][0]["orchestrator_session"] = {
        "cron_id": "old", "session_key": "cron:old", "released": True}
    assert advance._process_orchestrator_triggers(ctx, state, "t1") is True
    assert len(ctx.mints()) == 1, "a released session must be re-minted"


class _CtxFailContinue(_Ctx):
    def call_tool(self, server, tool, payload):
        self.calls.append((server, tool, payload))
        if tool == "spawn_continue":
            raise RuntimeError("conversation_gone")
        if tool == "cron_add":
            return "Added job: aaaabbbbcccc (orchestrator) scheduled"
        return "ok"


def test_continue_failure_remints_not_wedges():
    # A3: if the pipeline session's conversation is gone, spawn_continue fails — the pass must
    # RE-MINT a fresh session, not stamp the dead one and confirm success.
    ctx = _CtxFailContinue()
    state = _state(_card())
    state["pipelines"][0]["orchestrator_session"] = {
        "cron_id": "deadbeef0001", "session_key": "cron:deadbeef0001", "slot_key": "cron-deadbeef0001"}
    assert advance._process_orchestrator_triggers(ctx, state, "t1") is True
    assert len(ctx.mints()) == 1, "a gone conversation must re-mint"
    pl_os = state["pipelines"][0]["orchestrator_session"]
    assert pl_os["cron_id"] == "aaaabbbbcccc"
    assert state["cards"][0]["orchestrator_session"]["session_key"] == "cron:aaaabbbbcccc"


def test_release_reaps_session_when_no_active_cards():
    # A2: a pipeline whose every card is terminal must have its orchestrator session RELEASED
    # (spawn_release + cron_remove + released flag) — no per-pipeline cron leak.
    ctx = _Ctx()
    card = _card(trigger_status="satisfied")  # no pending trigger
    card["lifecycle"] = "retired"
    state = _state(card)
    state["pipelines"][0]["orchestrator_session"] = {
        "cron_id": "live", "session_key": "cron:live", "slot_key": "cron-live"}
    assert advance._process_orchestrator_triggers(ctx, state, "t1") is True
    sess = state["pipelines"][0]["orchestrator_session"]
    assert sess.get("released") is True
    tools = {c[1] for c in ctx.calls}
    assert "spawn_release" in tools and "cron_remove" in tools


def test_release_kept_when_a_card_is_active():
    ctx = _Ctx()
    active = _card(trigger_status="satisfied")  # lifecycle default 'ingested' (active)
    state = _state(active)
    state["pipelines"][0]["orchestrator_session"] = {
        "cron_id": "live", "session_key": "cron:live", "slot_key": "cron-live"}
    advance._process_orchestrator_triggers(ctx, state, "t1")
    assert state["pipelines"][0]["orchestrator_session"].get("released") is not True
    assert not any(c[1] in ("spawn_release", "cron_remove") for c in ctx.calls)


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
    # All writes to card["orchestrator_session"] must live INSIDE _process_orchestrator_triggers
    # (the mint path + the reuse/back-ref path both write it, per per-pipeline-orchestrator-session-
    # spec). No STEP-escalation code path may write it. Assert confinement to that one function.
    def _fn_body(name: str) -> str:
        m = re.search(rf"\ndef {name}\(.*?\n(?=\ndef |\Z)", src, re.DOTALL)
        return m.group(0) if m else ""
    orch_body = _fn_body("_process_orchestrator_triggers")
    write_re = r"""\[["']orchestrator_session["']\]\s*=|setdefault\(\s*["']orchestrator_session["']"""
    all_writes = re.findall(write_re, src)
    in_orch = re.findall(write_re, orch_body)
    assert all_writes and len(in_orch) == len(all_writes), (
        f"every card/pipeline orchestrator_session write must be inside "
        f"_process_orchestrator_triggers; found {len(all_writes)} total, {len(in_orch)} confined. "
        f"A step escalation must record step_sessions, never orchestrator_session."
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
