"""Unit tests for the DLC-YOLO advance cron (dlc_yolo_advance.py).

Covers Tiers 1, 2, 4, 5 of docs/unit-testing-spec.md:
  T1  pure helpers (_ladder / _slug_step / _eff_trust / _is_gate / _pipeline_for)
  T2  advance() state machine (done/none/pending/blocked/error/caps/gates/empty)
  T4  _bootstrap + _load/_save (skeleton / promote / never-clobber / corrupt)
  T5  no-retire-until-consumed terminal lifecycle

Fixtures live in conftest.py: advance_mod (module bound to a tmp DLC_YOLO_STATE with
subprocess.run patched no-op), mock_ctx, state_factory, card_factory, write_state,
read_state, state_path.
"""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timedelta, timezone

import pytest

from kiro_crew.cron_script import Report, Skip  # resolved via conftest stub-or-real

_REAL_SUBPROCESS_RUN = subprocess.run


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _iso(dt: datetime) -> str:
    return dt.isoformat(timespec="seconds").replace("+00:00", "Z")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _run(advance_mod, mock_ctx, write_state, state):
    """Write state, run advance(ctx), and return the raised control-flow exception."""
    write_state(state)
    with pytest.raises((Skip, Report)) as ei:
        advance_mod.advance(mock_ctx)
    return ei.value


def _complete_gate_review(revision: int = 1, gate: str = "gate-spec",
                          producer: str = "requirements") -> dict:
    return {
        "gate": gate,
        "producer_step": producer,
        "producer_session_ref": f"step_sessions.{producer}",
        "envelope_id": f"env-{revision}",
        "result_revision": revision,
        "status": "awaiting-review",
        "created_at": "2026-09-05T00:00:00Z",
        "bundle": {
            "summary": f"Complete result revision {revision}",
            "artifacts": [{"id": f"artifact-{revision}", "path": f"/results/r{revision}.md"}],
            "changes_since_prior": [],
            "intent_and_requirement_coverage": [],
            "decisions_and_questions": [],
            "card_topology": {"action": "keep-unified", "children": []},
            "budget": {"allocated": {}, "consumed": {}, "remaining": {}},
            "routing_and_provenance": {},
            "validation_and_evidence": [],
            "known_risks": [],
            "omissions_and_deviations": [],
        },
    }


# =========================================================================== #
# TIER 1 — pure helpers
# =========================================================================== #
class TestSelfDelegationTargets:
    """stream-every-agent-step: every AGENT step must delegate >=1 subagent so its output streams
    (cron step sessions cannot emit chat_chunk; only spawn_run subagents emit subagent_chunk). A
    crew-less agent step SELF-DELEGATES its own main agent (kind='agent'); a crew step delegates the
    crew; a GATE delegates nothing (it is a human approval point, no agent)."""

    def test_agent_step_without_crew_works_inline_no_self_delegate(self, advance_mod):
        # step-agent-as-worker: a crewless agent step is the WORKER — it does NOT self-delegate a
        # clone. No delegation targets → the seed tells it to work inline and narrate via
        # step_progress. Subagents appear only for real crew/addenda.
        step = {"id": "implement", "type": "agent", "agent": {"name": "impl-agent"}}
        targets = advance_mod._delegation_targets(step)
        assert targets == []

    def test_agent_step_without_agent_name_also_no_self_delegate(self, advance_mod):
        step = {"id": "review", "type": "agent"}
        targets = advance_mod._delegation_targets(step)
        assert targets == []

    def test_gate_step_yields_no_delegation(self, advance_mod):
        step = {"id": "gate-spec", "type": "gate"}
        assert advance_mod._delegation_targets(step) == []

    def test_crew_step_still_delegates_crew_not_self(self, advance_mod):
        step = {"id": "design", "type": "agent",
                "agent": {"name": "design-agent", "crew": "dlcyolo-x-design"}}
        targets = advance_mod._delegation_targets(step)
        assert len(targets) == 1
        assert targets[0] == {"kind": "crew", "id": "dlcyolo-x-design", "required": True}

    def test_addenda_step_delegates_only_the_addendum(self, advance_mod):
        step = {"id": "design", "type": "agent", "agent": {"name": "design-agent"},
                "addenda": [{"crew": "secure-design"}]}
        targets = advance_mod._delegation_targets(step)
        # a real addendum target, and NO self-delegate agent target
        assert all(t["kind"] != "agent" for t in targets)
        assert any(t["kind"] == "addendum" for t in targets)

    def test_planned_routing_crewless_step_works_inline_zero_crew_passes(self, advance_mod):
        # A crewless agent step is the worker → no forced crew pass (was >=1 under the old hub).
        state = {"config": {}}
        card = {"id": "c1", "source": {"repo": "o/r"}}
        step = {"id": "implement", "type": "agent", "agent": {"name": "impl-agent"}}
        budget = {"compute": {"max_agent_passes": 3, "max_research_passes": 0,
                              "max_parallel_runs": 3}}
        contract = {"scope": {}}
        routing, _notes, _infeasible = advance_mod._planned_routing(
            state, card, None, "standard", "assisted", budget, step, contract, "builder")
        assert routing["crew_passes"] == 0
        assert routing["pass_allocation"]["targets"] == []

    def test_planned_routing_gate_gets_no_crew_pass(self, advance_mod):
        state = {"config": {}}
        card = {"id": "c1", "source": {"repo": "o/r"}}
        step = {"id": "gate-spec", "type": "gate"}
        budget = {"compute": {"max_agent_passes": 3, "max_research_passes": 0,
                              "max_parallel_runs": 3}}
        routing, _n, _i = advance_mod._planned_routing(
            state, card, None, "standard", "assisted", budget, step, {"scope": {}}, "authoring")
        assert routing["crew_passes"] == 0


class TestWildcardCapabilityMatch:
    """A profile's '@kirocrew-core' wildcard grants every core tool (incl spawn_run/select_crew),
    so a self-delegate/authoring step must NOT false-block on 'assigned-profile-missing-tools'."""

    def test_wildcard_satisfies_required_core_tools(self, advance_mod):
        observed = ["read", "write", "@kirocrew-core"]
        required = ["kirocrew-core::spawn_run", "kirocrew-core::select_crew"]
        assert advance_mod._missing_capabilities(required, observed) == []

    def test_explicit_server_wildcard_satisfies(self, advance_mod):
        observed = ["kirocrew-core::*"]
        assert advance_mod._missing_capabilities(["kirocrew-core::spawn_run"], observed) == []

    def test_missing_without_wildcard_is_reported(self, advance_mod):
        observed = ["read", "write", "kirocrew-core::ask_question"]
        assert advance_mod._missing_capabilities(
            ["kirocrew-core::spawn_run"], observed) == ["kirocrew-core::spawn_run"]

    def test_wildcard_does_not_cover_other_servers(self, advance_mod):
        observed = ["@kirocrew-core"]
        assert advance_mod._missing_capabilities(
            ["kirocrew-cron::cron_add"], observed) == ["kirocrew-cron::cron_add"]


# =========================================================================== #
# TIER 1 — pure helpers
# =========================================================================== #
class TestLadder:
    def test_default_ladder_when_no_steps(self, advance_mod):
        assert advance_mod._ladder({"steps": []}) == advance_mod.DEFAULT_STEP_IDS
        assert advance_mod._ladder(None) == advance_mod.DEFAULT_STEP_IDS

    def test_custom_steps_bracketed_intake_done(self, advance_mod):
        pl = {"steps": [{"id": "requirements"}, {"id": "implement"}]}
        assert advance_mod._ladder(pl) == ["intake", "requirements", "implement", "done"]

    def test_drops_stray_intake_and_done_and_dedupes(self, advance_mod):
        pl = {"steps": [
            {"id": "intake"}, {"id": "requirements"}, {"id": "requirements"},
            {"id": "done"}, {"id": "review"},
        ]}
        assert advance_mod._ladder(pl) == ["intake", "requirements", "review", "done"]

    def test_ignores_steps_without_id(self, advance_mod):
        pl = {"steps": [{"name": "no id"}, {"id": "design"}]}
        assert advance_mod._ladder(pl) == ["intake", "design", "done"]


class TestSlugStep:
    def test_keeps_allowed_chars(self, advance_mod):
        assert advance_mod._slug_step("gate-spec") == "gate-spec"
        assert advance_mod._slug_step("step_1.0") == "step_1.0"

    def test_strips_leading_dash_injection_guard(self, advance_mod):
        assert advance_mod._slug_step("--rm-rf") == "rm-rf"

    def test_strips_disallowed_chars(self, advance_mod):
        assert advance_mod._slug_step("a b;c$") == "abc"

    def test_empty_becomes_step(self, advance_mod):
        assert advance_mod._slug_step("") == "step"
        assert advance_mod._slug_step("---") == "step"


class TestEffTrust:
    def test_resolution_order_card_first(self, advance_mod):
        state = {"config": {"trust": "manual"}}
        card = {"trust": "autonomous"}
        step = {"trust": "assisted"}
        pl = {"trust": "manual"}
        assert advance_mod._eff_trust(state, card, step, pl) == "autonomous"

    def test_falls_through_to_step_then_pl_then_config(self, advance_mod):
        assert advance_mod._eff_trust({"config": {}}, {}, {"trust": "assisted"}, {}) == "assisted"
        assert advance_mod._eff_trust({"config": {}}, {}, {}, {"trust": "autonomous"}) == "autonomous"
        assert advance_mod._eff_trust({"config": {"trust": "manual"}}, {}, {}, {}) == "manual"

    def test_default_assisted(self, advance_mod):
        assert advance_mod._eff_trust({"config": {}}, {}, {}, None) == "assisted"


class TestIsGate:
    def test_by_type(self, advance_mod):
        assert advance_mod._is_gate({"type": "gate", "id": "x"}) is True

    def test_by_id_prefix(self, advance_mod):
        assert advance_mod._is_gate({"id": "gate-review"}) is True

    def test_agent_step_not_gate(self, advance_mod):
        assert advance_mod._is_gate({"type": "agent", "id": "implement"}) is False


class TestPipelineFor:
    def test_by_pipeline_id(self, advance_mod):
        state = {"pipelines": [{"id": "pl-1", "repo": "a/b"}, {"id": "pl-2", "repo": "c/d"}]}
        assert advance_mod._pipeline_for(state, {"pipeline_id": "pl-2"})["id"] == "pl-2"

    def test_by_repo_when_no_id_match(self, advance_mod):
        state = {"pipelines": [{"id": "pl-1", "repo": "a/b"}]}
        card = {"pipeline_id": "nope", "source": {"repo": "a/b"}}
        assert advance_mod._pipeline_for(state, card)["id"] == "pl-1"

    def test_none_when_no_match(self, advance_mod):
        state = {"pipelines": [{"id": "pl-1", "repo": "a/b"}]}
        assert advance_mod._pipeline_for(state, {"source": {"repo": "z/z"}}) is None


class TestStepRequestInstruction:
    def test_preserves_local_semantics_without_claiming_authority(self, advance_mod):
        instruction = advance_mod._step_request_instruction({
            "agent": {"name": "custom-agent", "role": "Build the exact custom artifact"},
        })
        assert 'preset_reference="custom-agent"' in instruction
        assert 'objective="Build the exact custom artifact"' in instruction
        assert "never runtime authority" in instruction

    def test_bounds_untrusted_state_text_before_cron_embedding(self, advance_mod):
        instruction = advance_mod._step_request_instruction({
            "agent": {"name": "n" * 300, "role": "é" * 5000},
        })
        assert instruction.count("…[truncated]") == 2
        assert len(instruction.encode("utf-8")) < 5000


# =========================================================================== #
# TIER 1b — EXECUTION ENVELOPE SCHEMA + OBSERVATION-ONLY RESOLUTION
# =========================================================================== #
class TestExecutionEnvelopeObservation:
    @staticmethod
    def _pipeline():
        return {
            "id": "pl-1", "repo": "owner/repo", "trust": "assisted", "depth": "standard",
            "budget": {
                "scope": {"max_child_cards": 5, "effort_ceiling": 25},
                "compute": {"max_agent_passes": 4},
            },
            "result_contract": {
                "version": 1,
                "scope": {"evidence": ["pipeline-proof"], "validation": ["pipeline-check"]},
            },
            "steps": [
                {"id": "requirements", "type": "agent", "depth": "standard",
                 "capability": "builder",
                 "budget": {"scope": {"max_child_cards": 4},
                            "compute": {"max_parallel_runs": 2}},
                 "result_contract": {"scope": {"validation": ["step-check"]}}},
                {"id": "approval", "type": "gate", "reviews_step": "requirements"},
                {"id": "design", "type": "agent"},
            ],
        }

    def test_resolves_per_field_precedence_and_normalizes_legacy_budget(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline()
        card = card_factory(
            stage="requirements", depth="deep", trust="autonomous",
            budget={"max_child_cards": 2},
            result_contract={"scope": {"artifact_detail": "custom"}},
        )
        state = state_factory(cards=[card], pipelines=[pipeline],
                              config={"trust": "manual", "depth": "quick"})
        step = advance_mod._step_def(pipeline, "requirements")

        envelope = advance_mod._build_envelope_observation(state, card, step, pipeline)
        effective = envelope["effective"]
        assert effective["depth"] == "deep"                 # card beats step/pipeline/config
        assert effective["trust"] == "autonomous"
        assert effective["capability"] == "builder"
        assert effective["budget"]["scope"]["max_child_cards"] == 2
        assert effective["budget"]["scope"]["effort_ceiling"] == 25
        assert effective["budget"]["compute"]["max_parallel_runs"] == 2
        assert envelope["input_sources"]["budget_fields"]["scope"]["max_child_cards"] == "card"
        assert envelope["input_sources"]["budget_fields"]["scope"]["effort_ceiling"] == "pipeline"
        assert envelope["input_sources"]["budget_fields"]["compute"]["max_parallel_runs"] == "step-suballocation"
        # Result-contract leaves resolve independently rather than choosing one whole object.
        assert {key: envelope["result_scope"][key] for key in
                ("detail", "alternatives", "evidence", "validation")} == {
            "detail": "custom", "alternatives": 3,
            "evidence": ["pipeline-proof"], "validation": ["step-check"],
        }
        assert envelope["result_scope"]["enforcement"] == {
            "alternatives": "advisory", "evidence": "preferred",
            "validation": "preferred", "research": "advisory",
            "intent_trace": "preferred",
        }
        fields = envelope["input_sources"]["result_contract_fields"]
        assert fields["scope.artifact_detail"] == "card"
        assert fields["scope.evidence"] == "pipeline"
        assert fields["scope.validation"] == "step"
        # A step request above the card cap is observed, never allowed to widen it.
        assert envelope["observations"]["budget_notes"] == [{
            "field": "budget.scope.max_child_cards",
            "status": "step-widening-observed-not-applied",
            "requested": 4, "parent_cap": 2,
        }]

    def test_depth_defaults_and_minimal_gate_bundle_are_schema_only(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline()
        card = card_factory(stage="requirements")
        state = state_factory(cards=[card], pipelines=[pipeline],
                              config={"trust": "manual", "depth": "quick"})
        # Remove higher-precedence depth so the config quick default is visible.
        pipeline.pop("depth")
        pipeline.pop("result_contract")
        step = advance_mod._step_def(pipeline, "requirements")
        step.pop("depth")
        step.pop("result_contract")
        assert advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z") is True

        envelope = card["execution_envelope"]
        assert envelope["id"].startswith("env-")
        assert envelope["revision"] == 1
        assert envelope["schema_version"] == 2
        assert envelope["effective"]["depth"] == "quick"
        assert envelope["effective"]["budget"]["scope"]["max_feature_size"] == "S"
        assert envelope["topology"]["action"] == "keep-unified"
        assert envelope["result_scope"]["detail"] == "lean"
        assert envelope["result_scope"]["enforcement"]["evidence"] == "advisory"
        skeleton = envelope["gate"]["bundle_skeleton"]
        assert skeleton["gate"] == "approval"
        assert skeleton["producer_step"] == "requirements"
        assert skeleton["envelope_id"] == envelope["id"]
        assert skeleton["result_revision"] is None
        assert skeleton["bundle"]["artifacts"] == []
        assert skeleton["bundle"]["intent_and_requirement_coverage"] == []
        assert envelope["observations"]["mode"] == "adaptive-routing-enforcement"
        assert envelope["observations"]["controls_runtime"] == [
            "questions", "research_policy", "skill_resolution",
            "intent_fidelity", "result_scope", "routing", "pass_allocation",
            "topology", "scheduler",
        ]
        assert envelope["observations"]["observation_only"] == [
            "applied_reasoning_effort"]
        assert "gate_review" not in card  # skeleton cannot make the real gate review-ready

    def test_stable_inputs_are_idempotent_and_policy_change_archives_revision(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline()
        card = card_factory(stage="requirements")
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        assert advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z") is True
        first = json.loads(json.dumps(card["execution_envelope"]))

        assert advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:01:00Z") is False
        assert card["execution_envelope"] == first
        assert card["execution_envelope_history"] == []

        card["depth"] = "deep"
        assert advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:02:00Z") is True
        second = card["execution_envelope"]
        assert second["revision"] == 2
        assert second["id"] != first["id"]
        assert card["execution_envelope_history"] == [first]
        assert card["execution_envelope_history"][0]["effective"]["depth"] == "standard"
        assert second["effective"]["depth"] == "deep"

    def test_interjection_and_backstep_are_causal_revision_inputs(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline()
        card = card_factory(stage="requirements")
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")

        card["interjection"] = [{"id": "ui-1", "at": "2026-09-05T00:01:00Z",
                                 "step": "approval", "kind": "feedback",
                                 "text": "Revise the contract", "status": "pending"}]
        assert advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:02:00Z") is True
        assert card["execution_envelope"]["revision"] == 2
        assert card["execution_envelope"]["causal_input"]["interjection"]["id"] == "ui-1"

        card["backstep_history"] = [{"from": "approval", "to": "requirements",
                                     "at": "2026-09-05T00:03:00Z",
                                     "reason": "gate rejected"}]
        assert advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:04:00Z") is True
        assert card["execution_envelope"]["revision"] == 3
        assert card["execution_envelope"]["causal_input"]["backstep"]["from"] == "approval"

    def test_retained_session_agent_is_the_observed_current_capability(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline()
        card = card_factory(
            stage="requirements",
            step_sessions={"requirements": {"agent": "dlcyolo-authoring"}},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        envelope = advance_mod._build_envelope_observation(state, card, step, pipeline)
        observed = envelope["observations"]
        assert observed["current_routing"]["capability"] == "authoring"
        assert observed["planned_routing"]["capability"] == "builder"
        assert {item["field"] for item in observed["differences"]} >= {"capability"}

    def test_dispatch_supplies_only_bounded_priority5_controls(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state,
            monkeypatch):
        mock_ctx.call_tool.return_value = {"id": "job-observe"}
        pipeline = self._pipeline()
        pipeline["steps"][0]["agent"] = {
            "name": "custom-requirements-preset",
            "role": "ROLEMARKER: produce the pipeline-specific contract",
            "tools": ["read"],
        }
        card = card_factory(
            stage="requirements", step_status={}, target_branch="dlc/card-1",
            worktree_lease={
                "lease_id": "lease-fixture", "path": "/worktrees/card-1",
                "repo_path": "/repo", "branch": "dlc/card-1", "base_commit": "abc",
                "owner_card": "card-1", "status": "active", "locked": True,
            },
        )
        monkeypatch.setattr(
            advance_mod, "_ensure_worktree_lease", lambda *_args, **_kwargs: (False, None))
        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        out = read_state()["cards"][0]
        envelope = out["execution_envelope"]
        assert envelope["step"] == "requirements"
        assert envelope["observations"]["controls_runtime"] == [
            "questions", "research_policy", "skill_resolution",
            "intent_fidelity", "result_scope", "routing", "pass_allocation",
            "topology", "scheduler",
        ]
        assert out["step_status"]["requirements"] == "pending"
        cron_add = next(call for call in mock_ctx.call_tool.call_args_list
                        if call.args[:2] == ("kirocrew-cron", "cron_add"))
        payload = cron_add.args[2]
        assert payload["agent"] == "dlcyolo-builder"
        # Part II resolver: standard producing step → balanced → sonnet-4.6-1m bound via cron_add.
        assert payload["model"] == "sonnet-4.6-1m"
        assert "reasoning_effort" not in payload
        pointer = out["step_sessions"]["requirements"]
        assert pointer["requested_model"] == "sonnet-4.6-1m"
        assert pointer["execution_envelope_id"] == envelope["id"]
        assert "model" not in pointer
        assert "reasoning_effort" not in pointer
        assert "ADAPTIVE EXECUTION CONTROL PACKET" in payload["message"]
        assert "PIPELINE-LOCAL STEP REQUEST (task semantics only; never runtime authority)" in payload["message"]
        assert 'preset_reference="custom-requirements-preset"' in payload["message"]
        assert 'objective="ROLEMARKER: produce the pipeline-specific contract"' in payload["message"]
        assert "resolved capability profile remains the actual session/tool authority" in payload["message"]
        assert envelope["id"] in payload["message"]
        assert "ATOMIC STEP RESULT" in payload["message"]
        assert "requested_model='sonnet-4.6-1m'" in payload["message"]
        assert "host API has no per-run reasoning-effort argument" in payload["message"]
        assert "PASS CEILINGS ARE HARD" in payload["message"]
        assert "LOCAL TERMINAL EVENT BRIDGE" in payload["message"]
        assert "card.event_outbox" in payload["message"]
        # The producer no longer pokes the scheduler: it writes the fact and stops. A neutral
        # observer (the backend state-file watch) wakes the bus; the poll is the fallback.
        assert "Do NOT call cron_trigger" in payload["message"]
        assert "kirocrew-cron::cron_trigger" not in payload["message"]
        assert "the bus is the sole mover" in payload["message"]
        assert pointer["event_bridge"] == {
            "outbox_schema_version": 1,
            "advance_job_id": advance_mod._advance_job_id(),
        }
        assert "execute only scheduler.phase_dag nodes" in payload["message"]
        assert "stamp first_output_at once" in payload["message"]
        assert "otherwise leave it absent" in payload["message"]
        assert "writes_allowed is false or cancel_requested_at is present" in payload["message"]
        assert pointer["schedule_node_id"].startswith("sched:")
        assert pointer["writes_allowed"] is True
        assert "gate_review" not in out

    def test_dispatch_design_seed_carries_scope_growth_backstep_proposer(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state,
            monkeypatch):
        # LEG #2 of the back-step machinery: the step-agent seed for a scope-bearing phase
        # (design/tasks/implement) MUST instruct it to attribute effort.scope and PROACTIVELY
        # propose a back-step as a correctly-shaped card.topology proposal (no `authority`, so the
        # reconciler holds it 'proposal-awaiting-orchestrator'). Without this the proposer leg is
        # dead — the deterministic backstop fires only after the fact.
        mock_ctx.call_tool.return_value = {"id": "job-backstep"}
        pipeline = self._pipeline()
        pipeline["steps"][2]["agent"] = {"name": "design-agent"}  # design, crewless → worker
        card = card_factory(
            stage="design", step_status={}, target_branch="dlc/card-1",
            worktree_lease={
                "lease_id": "lease-bs", "path": "/worktrees/card-1",
                "repo_path": "/repo", "branch": "dlc/card-1", "base_commit": "abc",
                "owner_card": "card-1", "status": "active", "locked": True,
            },
        )
        monkeypatch.setattr(
            advance_mod, "_ensure_worktree_lease", lambda *_args, **_kwargs: (False, None))
        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        payload = next(call.args[2] for call in mock_ctx.call_tool.call_args_list
                       if call.args[:2] == ("kirocrew-cron", "cron_add"))
        msg = payload["message"]
        # It is told to attribute realized scope (feeds the deterministic backstop)…
        assert "SELF-REVIEW / SCOPE-GROWTH" in msg
        assert "card.effort.scope['design']" in msg
        # …and to raise the fork as an UN-authorized topology proposal (never self-authorize)…
        assert "'action':'back-step'" in msg
        assert "proposal-awaiting-orchestrator" in msg
        assert "OMIT `authority`" in msg
        # …with the back-step decision fallback and no-spam guard.
        assert "kind='back-step'" in msg

    def test_dispatch_design_seed_carries_topology_rubric_and_escalation(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state,
            monkeypatch):
        # topology-decision-rubric: the step seed for a topology-live phase (intent/requirements/
        # design) must carry the PRINCIPLED selection rubric (coupling/independence/difficulty/
        # reversibility/integration-cost) AND the bounded known-unknowns escalation predicate — so
        # the step decides by principle, not vibes-under-a-depth-cap, and escalates only for a named
        # known-unknown (incl. the ratifiable over-budget request).
        mock_ctx.call_tool.return_value = {"id": "job-rubric"}
        pipeline = self._pipeline()
        pipeline["steps"][2]["agent"] = {"name": "design-agent"}
        card = card_factory(
            stage="design", step_status={}, target_branch="dlc/card-1",
            worktree_lease={
                "lease_id": "lease-rub", "path": "/worktrees/card-1",
                "repo_path": "/repo", "branch": "dlc/card-1", "base_commit": "abc",
                "owner_card": "card-1", "status": "active", "locked": True,
            },
        )
        monkeypatch.setattr(
            advance_mod, "_ensure_worktree_lease", lambda *_args, **_kwargs: (False, None))
        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        msg = next(call.args[2] for call in mock_ctx.call_tool.call_args_list
                   if call.args[:2] == ("kirocrew-cron", "cron_add"))["message"]
        assert "TOPOLOGY DECISION RUBRIC" in msg
        assert "COUPLING" in msg and "keep-unified" in msg
        assert "child COUNT = the number of independent scopes" in msg
        # bounded escalation ladder — the enumerated known-unknowns
        assert "KNOWN-UNKNOWN" in msg
        assert "CROSS-CARD" in msg
        assert "over_budget:true" in msg
        assert "escalate merely because a choice exists" in msg

    def test_dispatch_requirements_seed_omits_backstep_proposer(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state,
            monkeypatch):
        # requirements has no scope-bearing predecessor, so the back-step proposer line is omitted
        # (it is scoped to design/tasks/implement — the boundaries the deterministic backstop walks).
        mock_ctx.call_tool.return_value = {"id": "job-req"}
        pipeline = self._pipeline()
        card = card_factory(
            stage="requirements", step_status={}, target_branch="dlc/card-1",
            worktree_lease={
                "lease_id": "lease-req", "path": "/worktrees/card-1",
                "repo_path": "/repo", "branch": "dlc/card-1", "base_commit": "abc",
                "owner_card": "card-1", "status": "active", "locked": True,
            },
        )
        monkeypatch.setattr(
            advance_mod, "_ensure_worktree_lease", lambda *_args, **_kwargs: (False, None))
        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        payload = next(call.args[2] for call in mock_ctx.call_tool.call_args_list
                       if call.args[:2] == ("kirocrew-cron", "cron_add"))
        assert "SELF-REVIEW / SCOPE-GROWTH" not in payload["message"]

    def test_dispatch_binds_explicit_model_and_records_requested_provenance(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state,
            monkeypatch):
        mock_ctx.call_tool.return_value = {"id": "job-model"}
        pipeline = self._pipeline()
        pipeline["steps"][0]["agent"] = {"model": "model-step-explicit"}
        card = card_factory(
            stage="requirements", step_status={}, target_branch="dlc/card-1",
            worktree_lease={
                "lease_id": "lease-model", "path": "/worktrees/card-1",
                "repo_path": "/repo", "branch": "dlc/card-1", "base_commit": "abc",
                "owner_card": "card-1", "status": "active", "locked": True,
            },
        )
        monkeypatch.setattr(
            advance_mod, "_ensure_worktree_lease", lambda *_args, **_kwargs: (False, None))
        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        out = read_state()["cards"][0]
        envelope = out["execution_envelope"]
        payload = next(call.args[2] for call in mock_ctx.call_tool.call_args_list
                       if call.args[:2] == ("kirocrew-cron", "cron_add"))
        assert payload["model"] == "model-step-explicit"
        assert "reasoning_effort" not in payload
        assert "requested_model='model-step-explicit'" in payload["message"]
        assert '"pass_allocation":' in payload["message"]
        pointer = out["step_sessions"]["requirements"]
        assert pointer["requested_model"] == "model-step-explicit"
        assert pointer["requested_reasoning_effort"] == "high"
        assert pointer["execution_envelope_id"] == envelope["id"]
        assert pointer["pass_allocation"] == envelope["routing"]["pass_allocation"]
        assert "model" not in pointer
        assert "reasoning_effort" not in pointer

    def test_observation_failure_cannot_block_existing_dispatch(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state, monkeypatch):
        def _broken(*_args, **_kwargs):
            raise ValueError("observation schema failure")

        monkeypatch.setattr(advance_mod, "_ensure_execution_envelope", _broken)
        card = card_factory(stage="requirements", step_status={})
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"]["requirements"] == "pending"
        assert "execution_envelope" not in out
        assert any(call.args[:2] == ("kirocrew-cron", "cron_add")
                   for call in mock_ctx.call_tool.call_args_list)


# =========================================================================== #
# TIER 1c — PRIORITY 5 INTENT, QUESTION, RESEARCH, SKILL + RESULT ENFORCEMENT
# =========================================================================== #
class TestPriority5IntentResearchResultScope:
    @staticmethod
    def _pipeline(step_id="design", depth="deep", trust="assisted"):
        return {
            "id": "pl-p5", "repo": "owner/repo", "depth": depth, "trust": trust,
            "steps": [
                {"id": step_id, "type": "agent", "capability": "authoring"},
                {"id": "done", "type": "terminal"},
            ],
        }

    @staticmethod
    def _bundle(**overrides):
        bundle = {
            "summary": "Complete result",
            "artifacts": [{"id": "artifact-1", "path": "/results/design.md"}],
            "alternatives": [],
            "intent_and_requirement_coverage": [],
            "decisions_and_questions": [],
            "research_and_citations": [],
            "validation_and_evidence": [],
            "known_risks": [], "omissions_and_deviations": [],
        }
        bundle.update(overrides)
        return bundle

    def test_envelope_qualifies_questions_required_intent_research_and_visual_skill(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline(trust="manual")
        card = card_factory(
            stage="design", depth="deep", facets=["visual", "frontend"],
            raw_intent={"text": "SECRET RAW INTENT", "source_ref": "session://s/m"},
            intent_contract={
                "version": 2, "raw_prompt_ref": "session://s/m", "status": "active",
                "outcomes": [
                    {"id": "I-1", "text": "SECRET SHOWCASE OUTCOME", "priority": "must"},
                    {"id": "I-2", "text": "SECRET NICE TO HAVE", "priority": "preferred"},
                ],
                "quality": {"target": "showcase", "enforcement": "required"},
                "research_required": True,
            },
            result_contract={
                "outcomes": [{"id": "I-3", "text": "SECRET ADLC OUTCOME",
                              "enforcement": "required"}],
                "hard_constraints": [{"id": "C-1", "text": "SECRET HARD CONSTRAINT"}],
                "quality": {"target": "showcase", "enforcement": "required"},
                "scope": {"alternatives": 2, "evidence": ["visual-proof"],
                          "validation": ["visual-review"]},
            },
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "design")
        envelope = advance_mod._build_envelope_observation(state, card, step, pipeline)

        assert envelope["questions"]["rigor"] == "adversarial"
        assert envelope["questions"]["ask_threshold"] == "envelope-qualified"
        assert envelope["questions"]["cadence"] == "one-at-a-time"
        assert "intent-bearing-qualitative-fork" in envelope["questions"]["qualified_triggers"]
        assert envelope["result_scope"]["required_outcome_ids"] == ["I-1", "I-3"]
        assert envelope["result_scope"]["hard_constraint_ids"] == ["C-1"]
        assert envelope["result_scope"]["enforcement"]["alternatives"] == "required"
        assert envelope["research_policy"]["mode"] == "required"
        assert envelope["research_policy"]["citations"] == "required"
        assert envelope["skill_resolution"]["required"] == [
            "pipeline-workflow", "frontend-design-workflow"]
        packet = json.dumps({
            key: envelope[key] for key in
            ("questions", "result_scope", "research_policy", "skill_resolution")})
        assert "SECRET RAW INTENT" not in packet
        assert "SECRET SHOWCASE OUTCOME" not in packet
        assert "SECRET NICE TO HAVE" not in packet
        assert "SECRET ADLC OUTCOME" not in packet
        assert "SECRET HARD CONSTRAINT" not in packet

    def test_required_research_with_zero_pass_budget_is_infeasible_and_blocks_dispatch(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        pipeline = self._pipeline(step_id="requirements", depth="quick")
        card = card_factory(
            stage="requirements", step_status={},
            budget={"compute": {"max_research_passes": 0}},
            intent_contract={"version": 1, "research_required": True, "outcomes": []},
        )
        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))
        out = read_state()["cards"][0]
        assert out["step_status"]["requirements"] == "blocked"
        assert out["block_reason"]["requirements"] == (
            "envelope infeasible: required research exceeds max_research_passes=0")
        assert not any(call.args[:2] == ("kirocrew-cron", "cron_add")
                       for call in mock_ctx.call_tool.call_args_list)

    @pytest.mark.parametrize(("policy", "reason"), [
        ({"mode": "fixed"}, "fixed model policy has no concrete model"),
        ({"mode": "fixed", "model": "model-a", "allowed_models": ["model-b"]},
         "requested model model-a is outside allowed_models"),
    ])
    def test_infeasible_model_policy_blocks_before_dispatch(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state,
            policy, reason):
        pipeline = self._pipeline(step_id="requirements", depth="standard")
        pipeline["steps"][0]["model_policy"] = policy
        card = card_factory(stage="requirements", step_status={})

        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        out = read_state()["cards"][0]
        assert out["step_status"]["requirements"] == "blocked"
        assert reason in out["block_reason"]["requirements"]
        assert not any(call.args[:2] == ("kirocrew-cron", "cron_add")
                       for call in mock_ctx.call_tool.call_args_list)

    def test_required_crew_passes_over_cap_block_before_dispatch(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        pipeline = self._pipeline(step_id="requirements", depth="standard")
        step = pipeline["steps"][0]
        step["agent"] = {"crew": "primary-crew"}
        step["addenda"] = [{"crew": "security-crew"}]
        card = card_factory(
            stage="requirements", step_status={},
            budget={"compute": {"max_agent_passes": 1}},
        )

        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        out = read_state()["cards"][0]
        assert out["step_status"]["requirements"] == "blocked"
        assert "required crew/addendum passes 2 exceed max_agent_passes=1" in (
            out["block_reason"]["requirements"])
        assert not any(call.args[:2] == ("kirocrew-cron", "cron_add")
                       for call in mock_ctx.call_tool.call_args_list)

    def test_terminal_result_blocks_research_and_crew_pass_overruns(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline(depth="standard")
        # This design step has no crew, so under step-agent-as-worker its crew allocation = 0 (it
        # works inline; subagents are only for real fan-out). Recording TWO child runs is an overrun
        # (2 > 0) and must block, the same way an over-allocated crew pass does.
        card = card_factory(
            stage="design", step_status={"design": "done"},
            child_runs={"design": ["child-run-a", "child-run-b"]},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "design")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        envelope = card["execution_envelope"]
        card["research_artifacts"] = {"design": [{"id": "research-1"}]}
        card["step_results"] = {"design": {
            "envelope_id": envelope["id"], "status": "completed",
            "bundle": self._bundle(
                research_and_citations=[{"id": "research-2"}]),
        }}

        assert advance_mod._enforce_step_result(
            card, pipeline, "design", "2026-09-05T00:01:00Z") is True

        assert card["step_status"]["design"] == "blocked"
        required = card["result_scope_checks"]["design"]["required_missing"]
        assert "research passes within allocation=1" in required
        assert "crew/addendum passes within allocation=0" in required

    def test_advisory_depth_defaults_never_become_universal_blockers(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline(depth="standard")
        card = card_factory(stage="design", step_status={"design": "done"})
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "design")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        envelope = card["execution_envelope"]
        card["step_results"] = {"design": {
            "envelope_id": envelope["id"], "status": "completed",
            "bundle": self._bundle(),
        }}

        assert advance_mod._enforce_step_result(
            card, pipeline, "design", "2026-09-05T00:01:00Z") is True
        assert card["step_status"]["design"] == "done"
        assert card["result_scope_checks"]["design"]["status"] == "satisfied"
        assert card["result_scope_checks"]["design"]["required_missing"] == []

    def test_required_outcome_and_unresolved_question_block_with_drift_fact(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline(depth="standard")
        card = card_factory(
            stage="design", step_status={"design": "done"},
            intent_contract={
                "version": 1,
                "outcomes": [{"id": "I-1", "text": "SENSITIVE", "enforcement": "required"}],
            },
            decisions=[{
                "id": "D-1", "step": "design", "kind": "qualitative-direction",
                "question": "SECRET QUESTION", "status": "pending",
            }],
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "design")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        envelope = card["execution_envelope"]
        card["step_results"] = {"design": {
            "envelope_id": envelope["id"], "status": "completed",
            "bundle": self._bundle(),
        }}

        assert advance_mod._enforce_step_result(
            card, pipeline, "design", "2026-09-05T00:01:00Z") is True
        assert card["step_status"]["design"] == "blocked"
        reason = card["block_reason"]["design"]
        assert "all qualified questions resolved" in reason
        assert "required intent coverage I-1" in reason
        assert card["intent_fidelity"] == [{
            "step": "design", "envelope_id": envelope["id"], "status": "drifted",
            "missing_intent_ids": ["I-1"], "at": "2026-09-05T00:01:00Z",
        }]

    def test_complete_required_visual_research_result_passes(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline(depth="deep")
        card = card_factory(
            stage="design", step_status={"design": "done"}, facets=["visual"],
            intent_contract={
                "version": 1, "research_required": True,
                "outcomes": [{"id": "I-1", "text": "SENSITIVE", "enforcement": "required"}],
                "quality": {"target": "showcase", "enforcement": "required"},
            },
            result_contract={
                "quality": {"target": "showcase", "enforcement": "required"},
                "scope": {"alternatives": 2, "evidence": ["visual-proof"],
                          "validation": ["visual-review"]},
            },
            decisions=[{
                "id": "D-visual", "step": "design", "kind": "qualitative-direction",
                "question": "SECRET", "chosen": "direction-a", "resolved_at": "2026-09-05T00:00:30Z",
            }],
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "design")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        envelope = card["execution_envelope"]
        research = {
            "id": "research-1",
            "findings": [{"id": "F-1", "claim": "SENSITIVE CLAIM", "source_ids": ["S-1"]}],
            "sources": [{"id": "S-1", "url": "https://example.test/reference",
                         "title": "Primary reference", "accessed_at": "2026-09-05T00:00:20Z",
                         "source_type": "primary"}],
        }
        card["research_artifacts"] = {"design": [research]}
        card["step_results"] = {"design": {
            "envelope_id": envelope["id"], "status": "completed",
            "bundle": self._bundle(
                alternatives=[{"id": "A-1"}, {"id": "A-2"}],
                intent_and_requirement_coverage=[{
                    "intent_id": "I-1", "status": "satisfied", "evidence_refs": ["E-1"]}],
                decisions_and_questions=["D-visual"],
                research_and_citations=[research],
                validation_and_evidence=[
                    {"id": "E-1", "kind": "visual-proof", "status": "passed",
                     "ref": "/results/proof.png"},
                    {"id": "V-1", "kind": "visual-review", "status": "passed",
                     "ref": "/results/review.md"},
                ]),
        }}

        assert advance_mod._enforce_step_result(
            card, pipeline, "design", "2026-09-05T00:01:00Z") is True
        assert card["step_status"]["design"] == "done"
        assert card["result_scope_checks"]["design"]["status"] == "satisfied"

    def test_visual_step_without_any_visual_evidence_blocks(
            self, advance_mod, state_factory, card_factory):
        # Regression (visual-critic gate): a visual-facet step whose bundle carries NO
        # rendered-and-inspected evidence must BLOCK, not self-pass. This is the exact
        # card-rps3d-fixgame failure — a washed-out render shipped as PASS-WITH-NOTES because
        # nothing forced external visual eyes.
        pipeline = self._pipeline(depth="standard")
        card = card_factory(
            stage="design", step_status={"design": "done"}, facets=["visual"],
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "design")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        envelope = card["execution_envelope"]
        # visual-evidence must be a REQUIRED evidence item on a visual step
        assert "visual-evidence" in envelope["result_scope"]["evidence"]
        assert envelope["result_scope"]["enforcement"]["evidence"] == "required"
        card["step_results"] = {"design": {
            "envelope_id": envelope["id"], "status": "completed",
            "bundle": self._bundle(),  # no validation_and_evidence records at all
        }}
        assert advance_mod._enforce_step_result(
            card, pipeline, "design", "2026-09-05T00:01:00Z") is True
        assert card["step_status"]["design"] == "blocked"
        assert "required evidence visual-evidence" in card["block_reason"]["design"]

    def test_screenshot_kind_satisfies_visual_evidence_family(
            self, advance_mod, state_factory, card_factory):
        # A record whose kind is in the visual-evidence family (here 'screenshot') satisfies the
        # requirement — the gate demands external eyes, not one literal kind string.
        pipeline = self._pipeline(depth="standard")
        card = card_factory(
            stage="design", step_status={"design": "done"}, facets=["frontend"],
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "design")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        envelope = card["execution_envelope"]
        card["step_results"] = {"design": {
            "envelope_id": envelope["id"], "status": "completed",
            "bundle": self._bundle(validation_and_evidence=[
                {"id": "SS-1", "kind": "screenshot", "status": "passed",
                 "ref": "/results/frame.png"},
                {"id": "F-1", "kind": "functional", "status": "passed", "ref": "/results/f.md"},
                {"id": "R-1", "kind": "rationale", "status": "passed", "ref": "/results/r.md"},
            ]),
        }}
        assert advance_mod._enforce_step_result(
            card, pipeline, "design", "2026-09-05T00:01:00Z") is True
        # visual-evidence is NOT in the missing set — the screenshot kind satisfied its family
        assert "visual-evidence" not in (card.get("block_reason", {}).get("design") or "")
        assert card["step_status"]["design"] == "done"

    def test_preferred_shortfall_is_visible_but_does_not_block(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline(depth="standard")
        card = card_factory(
            stage="design", step_status={"design": "done"},
            result_contract={"scope": {"evidence": ["reference-rationale"]}},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "design")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        envelope = card["execution_envelope"]
        card["step_results"] = {"design": {
            "envelope_id": envelope["id"], "status": "completed",
            "bundle": self._bundle(),
        }}

        advance_mod._enforce_step_result(card, pipeline, "design", "2026-09-05T00:01:00Z")
        assert card["step_status"]["design"] == "done"
        assert card["result_scope_checks"]["design"]["preferred_shortfalls"] == [
            "preferred evidence reference-rationale"]

    def test_raw_intent_is_restored_and_contract_requires_monotonic_revision(
            self, advance_mod, card_factory):
        card = card_factory(
            stage="design", step_status={"design": "done"},
            raw_intent={"text": "ORIGINAL", "captured_at": "2026-09-05T00:00:00Z",
                        "source_ref": "session://s/m"},
            intent_contract={
                "version": 1, "outcomes": [{"id": "I-1", "text": "Original",
                                              "enforcement": "required"}]},
        )
        changed, violations = advance_mod._ensure_intent_integrity(
            card, "2026-09-05T00:00:10Z")
        assert changed is True
        assert violations == []
        assert card["intent_contract_revisions"][0]["version"] == 1

        card["raw_intent_mutation_attempts"] = {"legacy": "malformed"}
        card["intent_contract_mutation_attempts"] = "malformed"
        card["raw_intent"]["text"] = "MUTATED SECRET"
        card["intent_contract"] = {
            "version": 1,
            "outcomes": [{"id": "I-2", "text": "SILENT OVERWRITE",
                          "enforcement": "advisory"}],
        }
        changed, violations = advance_mod._ensure_intent_integrity(
            card, "2026-09-05T00:01:00Z")
        assert changed is True
        assert violations == [
            "raw-intent-mutation-reverted", "intent-contract-version-not-monotonic"]
        assert card["raw_intent"]["text"] == "ORIGINAL"
        assert card["intent_contract"]["outcomes"][0]["id"] == "I-1"
        assert card["intent_integrity"]["status"] == "violation"
        assert "MUTATED SECRET" not in json.dumps(card["raw_intent_mutation_attempts"])
        assert "SILENT OVERWRITE" not in json.dumps(card["intent_contract_mutation_attempts"])

    def test_monotonic_intent_contract_revision_is_archived_and_accepted(
            self, advance_mod, card_factory):
        card = card_factory(
            raw_intent={"text": "ORIGINAL", "source_ref": None},
            intent_contract={"version": 1, "outcomes": []},
        )
        advance_mod._ensure_intent_integrity(card, "2026-09-05T00:00:00Z")
        card["intent_contract"] = {
            "version": 2,
            "outcomes": [{"id": "I-1", "text": "Refined", "enforcement": "preferred"}],
        }
        changed, violations = advance_mod._ensure_intent_integrity(
            card, "2026-09-05T00:01:00Z")
        assert changed is True
        assert violations == []
        assert [item["version"] for item in card["intent_contract_revisions"]] == [1, 2]
        assert card["intent_contract"]["version"] == 2
        assert card["intent_integrity"]["status"] == "satisfied"

    def test_live_missing_required_research_tools_and_visual_skill_blocks_handshake(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline(depth="deep")
        card = card_factory(
            stage="design", facets=["visual"],
            intent_contract={"version": 1, "research_required": True, "outcomes": []},
            step_sessions={"design": {
                "agent": "dlcyolo-authoring", "tools": ["read", "write"],
                "skills": ["pipeline-workflow"],
            }},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "design")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        handshake, _ = advance_mod._ensure_runtime_handshake(
            state, card, step, pipeline, "2026-09-05T00:00:01Z", "pre-dispatch")
        assert handshake["preflight"]["status"] == "blocked"
        mismatches = handshake["preflight"]["mismatches"]
        assert {item["kind"] for item in mismatches} == {
            "live-session-missing-tools", "live-session-missing-skills"}
        assert {"web_search", "web_fetch"} <= set(mismatches[0].get("missing", [])
                                                      + mismatches[1].get("missing", []))
        assert "frontend-design-workflow" in str(mismatches)


# =========================================================================== #
# TIER 1d — RUNTIME HANDSHAKE + DELEGATION PREFLIGHT
# =========================================================================== #
class TestRuntimeHandshake:
    @staticmethod
    def _pipeline(capability="coordinator", fallback_policy=None, crew="spec-crew"):
        step = {
            "id": "requirements", "type": "agent", "capability": capability,
            "skills": ["pipeline-workflow"],
            "agent": {"tools": ["read"], "crew": crew},
            "addenda": [{"id": "security", "crew": "security-crew"}],
        }
        if fallback_policy is not None:
            step["fallback_policy"] = fallback_policy
        return {
            "id": "pl-1", "repo": "owner/repo", "trust": "assisted",
            "depth": "standard",
            "steps": [step,
                      {"id": "gate-spec", "type": "gate", "reviews_step": "requirements"},
                      {"id": "design", "type": "agent"}],
        }

    @staticmethod
    def _ensure(advance_mod, state, card, pipeline, phase="pre-dispatch"):
        step = advance_mod._step_def(pipeline, "requirements")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        return advance_mod._ensure_runtime_handshake(
            state, card, step, pipeline, "2026-09-05T00:00:01Z", phase)

    def test_declared_snapshot_never_becomes_actual_runtime_inventory(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline()
        card = card_factory(stage="requirements")
        state = state_factory(cards=[card], pipelines=[pipeline])

        handshake, changed = self._ensure(advance_mod, state, card, pipeline)

        assert changed is True
        assert handshake["schema_version"] == 1
        assert handshake["assignment"] == {
            "assigned_profile": "dlcyolo-coordinator",
            "assigned_crew": "spec-crew",
            "addenda": ["security-crew"],
            "effective_profile": None,
            "effective_status": "unobservable",
            "profile_matches": None,
        }
        tools = handshake["capabilities"]["tools"]
        assert {"kirocrew-core::select_crew", "kirocrew-core::spawn_run"} <= set(
            tools["profile_declared"])
        assert tools["step_declared"] == ["read"]
        assert tools["actual"] is None
        assert tools["status"] == "unobservable"
        assert handshake["capabilities"]["skills"]["actual"] is None
        assert handshake["routing"]["model"]["requested"] == "sonnet-4.6-1m"
        assert handshake["routing"]["model"]["applied"] is None
        assert handshake["routing"]["model"]["status"] == "unobservable"
        assert handshake["routing"]["reasoning_effort"]["requested"] == "medium"
        assert handshake["routing"]["reasoning_effort"]["applied"] is None
        assert handshake["routing"]["reasoning_effort"]["status"] == "unobservable"
        assert handshake["scope"]["write"]["declared"]["owned_repository"] == "owner/repo"
        assert handshake["delegation"]["outcome"] is None
        assert handshake["preflight"]["status"] == "unverified"
        assert "live-session-tool-inventory" in handshake["preflight"]["integration_prerequisites"]

        same, changed = advance_mod._ensure_runtime_handshake(
            state, card, advance_mod._step_def(pipeline, "requirements"), pipeline,
            "2026-09-05T00:00:02Z", "pre-dispatch")
        assert changed is False
        assert same == handshake

    def test_compatible_coordinator_dispatches_without_claiming_live_tools(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state):
        mock_ctx.call_tool.return_value = {"id": "job-handshake"}
        pipeline = self._pipeline()
        card = card_factory(stage="requirements", step_status={})

        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        out = read_state()["cards"][0]
        handshake = out["runtime_handshakes"]["requirements"]
        assert out["step_status"]["requirements"] == "pending"
        assert handshake["phase"] == "dispatched"
        assert handshake["capabilities"]["tools"]["actual"] is None
        assert handshake["delegation"]["outcome_status"] == "pending"
        assert out["step_sessions"]["requirements"]["assigned_agent"] == "dlcyolo-coordinator"
        payload = mock_ctx.call_tool.call_args.args[2]
        assert payload["agent"] == "dlcyolo-coordinator"
        assert "cannot observe the live tool inventory" in payload["message"]
        assert "and HOLD select_crew/spawn_run" not in payload["message"]

    def test_proven_assigned_profile_mismatch_blocks_before_dispatch(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state):
        pipeline = self._pipeline(capability="authoring")
        card = card_factory(stage="requirements", step_status={})

        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        out = read_state()["cards"][0]
        handshake = out["runtime_handshakes"]["requirements"]
        assert mock_ctx.call_tool.call_count == 0
        assert out["step_status"]["requirements"] == "blocked"
        assert handshake["delegation"]["outcome"] == "blocked"
        mismatch = handshake["preflight"]["mismatches"][0]
        assert mismatch["kind"] == "assigned-profile-missing-tools"
        # This step has a crew + addenda → it needs the full routing toolbelt. The authoring profile
        # now declares kirocrew-core::spawn_run (required for self-delegation streaming) but still
        # does NOT declare select_crew, so a crew-routing step correctly blocks on the missing verb.
        assert {"kirocrew-core::select_crew"} == set(mismatch["missing"])

    def test_inline_fallback_requires_explicit_allow_inline_policy(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state):
        mock_ctx.call_tool.return_value = {"id": "job-inline"}
        pipeline = self._pipeline(capability="authoring", fallback_policy="allow-inline")
        card = card_factory(stage="requirements", step_status={})

        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        out = read_state()["cards"][0]
        handshake = out["runtime_handshakes"]["requirements"]
        assert out["step_status"]["requirements"] == "pending"
        assert handshake["delegation"]["outcome"] == "inline-authorized"
        assert handshake["delegation"]["fallback_policy_source"] == "step"
        assert mock_ctx.call_tool.call_count == 1
        assert "fallback_policy=allow-inline" in mock_ctx.call_tool.call_args.args[2]["message"]

    def test_missing_profile_declaration_is_unverified_not_fabricated_mismatch(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state, monkeypatch):
        monkeypatch.setattr(advance_mod, "_profile_declaration", lambda _profile: {
            "status": "unobservable", "source": None,
            "tools": [], "tools_status": "unobservable",
            "skills": [], "skills_status": "unobservable",
            "model": None, "reasoning_effort": None,
            "network_policy": None, "write_scope": {},
        })
        mock_ctx.call_tool.return_value = {"id": "job-unverified"}
        pipeline = self._pipeline()
        card = card_factory(stage="requirements", step_status={})

        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        out = read_state()["cards"][0]
        handshake = out["runtime_handshakes"]["requirements"]
        assert out["step_status"]["requirements"] == "pending"
        assert mock_ctx.call_tool.call_count == 1
        assert handshake["preflight"]["status"] == "unverified"
        assert handshake["preflight"]["mismatches"] == []
        assert handshake["capabilities"]["tools"]["actual"] is None

    def test_authoritative_effective_profile_and_routing_are_visible_and_can_block(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state):
        mock_ctx.call_tool.return_value = {"id": "job-applied"}
        pipeline = self._pipeline()
        card = card_factory(stage="requirements", step_status={})
        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))
        state = read_state()
        pointer = state["cards"][0]["step_sessions"]["requirements"]
        pointer.update({
            "effective_agent": "dlcyolo-authoring",
            "tools": ["read", "write"],
            "skills": ["pipeline-workflow"],
            "model": "model-applied", "provider": "provider-applied",
            "model_version": "v2", "reasoning_effort": "medium",
        })
        mock_ctx.call_tool.reset_mock()

        _run(advance_mod, mock_ctx, write_state, state)

        out = read_state()["cards"][0]
        handshake = out["runtime_handshakes"]["requirements"]
        assert mock_ctx.call_tool.call_count == 0
        assert out["step_status"]["requirements"] == "blocked"
        assert handshake["assignment"]["assigned_profile"] == "dlcyolo-coordinator"
        assert handshake["assignment"]["effective_profile"] == "dlcyolo-authoring"
        assert handshake["assignment"]["profile_matches"] is False
        # Part II resolver: standard producing step (crew + addenda → not a leaf) → D2 → balanced →
        # sonnet-4.6-1m requested, effort dialed to medium. Applied medium now MATCHES requested
        # medium, so the effort observation is no longer a below-requested mismatch.
        assert handshake["routing"]["model"]["requested"] == "sonnet-4.6-1m"
        assert handshake["routing"]["model"]["applied"] == "model-applied"
        assert handshake["routing"]["model"]["status"] == "mismatch"
        assert handshake["routing"]["reasoning_effort"]["requested"] == "medium"
        assert handshake["routing"]["reasoning_effort"]["applied"] == "medium"
        assert handshake["routing"]["reasoning_effort"]["status"] == "verified"
        assert {item["kind"] for item in handshake["preflight"]["mismatches"]} >= {
            "effective-profile-missing-tools", "live-session-missing-tools",
        }

    @pytest.mark.parametrize(
        ("applied", "expected_status", "blocked"),
        [
            ("model-primary", "verified", False),
            ("model-fallback", "fallback-observed", False),
            ("model-disallowed", "mismatch", True),
        ],
    )
    def test_observed_model_is_verified_fallback_or_blocking_mismatch(
            self, advance_mod, state_factory, card_factory,
            applied, expected_status, blocked):
        pipeline = self._pipeline()
        pipeline["steps"][0]["model_policy"] = {
            "mode": "fixed", "model": "model-primary",
            "fallbacks": ["model-fallback"],
        }
        card = card_factory(
            stage="requirements",
            step_sessions={"requirements": {"model": applied}},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])

        handshake, _ = self._ensure(advance_mod, state, card, pipeline)

        assert handshake["routing"]["model"]["requested"] == "model-primary"
        assert handshake["routing"]["model"]["status"] == expected_status
        mismatch_kinds = {item["kind"] for item in handshake["preflight"]["mismatches"]}
        if blocked:
            assert handshake["delegation"]["outcome"] == "blocked"
            assert "model-binding-mismatch" in mismatch_kinds
        else:
            assert handshake["delegation"]["outcome"] is None
            assert "model-binding-mismatch" not in mismatch_kinds

    def test_inline_delegation_fallback_cannot_excuse_model_mismatch(
            self, advance_mod, state_factory, card_factory):
        pipeline = self._pipeline(fallback_policy="allow-inline")
        pipeline["steps"][0]["model_policy"] = {
            "mode": "fixed", "model": "model-primary",
        }
        card = card_factory(
            stage="requirements",
            step_sessions={"requirements": {"model": "model-disallowed"}},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])

        handshake, _ = self._ensure(advance_mod, state, card, pipeline)

        assert handshake["routing"]["model"]["status"] == "mismatch"
        assert handshake["delegation"]["outcome"] == "blocked"
        assert handshake["preflight"]["status"] == "blocked"
        assert any(item["kind"] == "model-binding-mismatch"
                   for item in handshake["preflight"]["mismatches"])

    def test_required_delegation_needs_child_run_evidence_before_done_can_advance(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state):
        pipeline = self._pipeline()
        card = card_factory(stage="requirements", step_status={"requirements": "pending"})
        state = state_factory(cards=[card], pipelines=[pipeline])
        self._ensure(advance_mod, state, card, pipeline, "dispatched")
        card["step_status"]["requirements"] = "done"

        _run(advance_mod, mock_ctx, write_state, state)

        out = read_state()["cards"][0]
        assert out["stage"] == "requirements"
        assert out["step_status"]["requirements"] == "blocked"
        assert out["runtime_handshakes"]["requirements"]["delegation"]["outcome"] == "blocked"

    def test_recorded_child_run_allows_normal_done_to_gate_movement(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state):
        pipeline = self._pipeline()
        card = card_factory(
            stage="requirements", step_status={"requirements": "pending"},
            child_runs={"requirements": ["child-run-1"]},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        self._ensure(advance_mod, state, card, pipeline, "dispatched")
        envelope_id = card["execution_envelope"]["id"]
        bundle = {
            "summary": "Requirements complete",
            "artifacts": [{"id": "requirements", "path": "/results/requirements.md"}],
            "alternatives": [], "intent_and_requirement_coverage": [],
            "decisions_and_questions": [], "research_and_citations": [],
            "validation_and_evidence": [], "known_risks": [],
            "omissions_and_deviations": [],
            "card_topology": {"action": "keep-unified", "children": []},
        }
        card["step_results"] = {"requirements": {
            "envelope_id": envelope_id, "status": "completed", "bundle": bundle}}
        card["gate_review"] = {
            "gate": "gate-spec", "producer_step": "requirements",
            "envelope_id": envelope_id, "result_revision": 1,
            "status": "awaiting-review", "bundle": bundle,
        }
        card["step_status"]["requirements"] = "done"

        _run(advance_mod, mock_ctx, write_state, state)

        out = read_state()["cards"][0]
        assert out["stage"] == "gate-spec"
        assert out["step_status"]["requirements"] == "advanced"
        assert out["runtime_handshakes"]["requirements"]["delegation"]["outcome"] == "delegated"

    def test_handshake_crash_blocks_required_delegation_without_fake_success(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state, monkeypatch):
        def _broken(*_args, **_kwargs):
            raise RuntimeError("handshake integration failed")

        monkeypatch.setattr(advance_mod, "_ensure_runtime_handshake", _broken)
        pipeline = self._pipeline()
        card = card_factory(stage="requirements", step_status={})

        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        out = read_state()["cards"][0]
        assert mock_ctx.call_tool.call_count == 0
        assert out["step_status"]["requirements"] == "blocked"
        assert "runtime handshake failed" in out["block_reason"]["requirements"]
        assert "runtime_handshakes" not in out


# =========================================================================== #
# TIER 2 — advance() state machine
# =========================================================================== #
class TestAdvanceDone:
    def test_done_advances_stage(self, advance_mod, mock_ctx, state_factory, card_factory,
                                 write_state, read_state):
        card = card_factory(stage="requirements", step_status={"requirements": "done"})
        exc = _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert isinstance(exc, Report)
        out = read_state()["cards"][0]
        # default ladder: intake, requirements, gate-spec, ...
        assert out["stage"] == "gate-spec"
        assert out["step_status"]["requirements"] == "advanced"
        assert out["history"][-1] == {
            "from": "requirements", "to": "gate-spec",
            "at": out["updated_at"], "agent": "advance-cron",
        }
        [receipt] = out["event_outbox"]
        assert receipt["type"] == "io.dlcyolo.step.completed"
        assert receipt["delivery_status"] == "consumed"
        assert receipt["consumed_by"] == "local-terminal-dispatch"

    def test_completed_event_cascades_through_gate_to_successor_dispatch_same_cycle(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state):
        card = card_factory(
            stage="requirements", trust="autonomous",
            step_status={"requirements": "done"},
            gate_review=_complete_gate_review(1),
        )

        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))

        out = read_state()["cards"][0]
        assert out["stage"] == "design"
        assert out["step_status"]["requirements"] == "advanced"
        assert out["step_status"]["gate-spec"] == "advanced"
        assert out["step_status"]["design"] == "pending"
        assert out["event_outbox"][0]["delivery_status"] == "consumed"
        calls = [call for call in mock_ctx.call_tool.call_args_list
                 if call.args[:2] == ("kirocrew-cron", "cron_add")]
        assert len(calls) == 1
        assert calls[0].args[2]["name"] == f"design :: {card['id']}"


class TestAdvanceEscalate:
    def test_none_status_fires_one_escalation_and_sets_pending(self, advance_mod, mock_ctx,
                                                              state_factory, card_factory,
                                                              write_state, read_state):
        # Session-as-slot: escalation registers a one-shot AGENT CRON (cron_add) bound to the
        # step's capability profile — NOT a slot-less spawn_run — so the step gets an openable
        # dashboard slot. The mock cron_add returns a MagicMock (no id), so step_sessions may be
        # unrecorded; the contract asserted here is the CALL + the pending transition.
        card = card_factory(stage="requirements", step_status={})
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert mock_ctx.call_tool.call_count == 1
        args = mock_ctx.call_tool.call_args
        assert args.args[0] == "kirocrew-cron"
        assert args.args[1] == "cron_add"
        payload = args.args[2]
        assert payload.get("agent", "").startswith("dlcyolo-")   # bound to a capability profile
        assert payload.get("delay") == 1                          # one-shot, fires immediately (>=1)
        assert payload.get("hide_in_chat") is False              # so the slot actually appears
        assert payload.get("silent") is False                     # MUST be False — silent routes to the
        #                                                           non-creator gateway branch; the openable
        #                                                           slot is only minted on the non-silent path
        assert "RESPONSE LINKAGE" in payload["message"]
        assert "last_response_handled_at" in payload["message"]
        assert "cron cleanup as chat disablement" in payload["message"]
        assert "RESULT PUBLICATION" in payload["message"]
        assert "'gate':'gate-spec'" in payload["message"]
        assert "'producer_step':'requirements'" in payload["message"]
        assert "'status':'awaiting-review'" in payload["message"]
        assert "Revisions are monotonic and never reused" in payload["message"]
        assert "do not publish an incomplete gate review" in payload["message"]
        assert "deterministic runtime exclusively owns gate decisions" in payload["message"]
        assert "autonomous → auto-approve" not in payload["message"]
        out = read_state()["cards"][0]
        assert out["step_status"]["requirements"] == "pending"
        assert "requirements" in out["pending_at"]

    def test_successor_launch_requires_explicit_gate_receipt(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state):
        handoff = _iso(_now() - timedelta(minutes=1))
        card = card_factory(
            stage="design",
            step_status={"requirements": "advanced", "gate-spec": "advanced"},
            step_sessions={"requirements": {
                "cron_id": "held-for-design", "kept": True,
                "retention": "held-for-gate", "retained_for_gate": "gate-spec",
                "release_after": "design", "retained_at": handoff,
                "retention_handoff_at": handoff,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        cron_add = [call for call in mock_ctx.call_tool.call_args_list
                    if call.args[:2] == ("kirocrew-cron", "cron_add")]
        assert len(cron_add) == 1
        message = cron_add[0].args[2]["message"]
        assert "SUCCESSOR RECEIPT" in message
        assert "successor_receipts['gate-spec']" in message
        assert "'producer_step':'requirements'" in message
        assert "'successor_step':'design'" in message
        assert "Only AFTER you actually read and accept" in message

    def test_empty_string_status_also_escalates(self, advance_mod, mock_ctx, state_factory,
                                                card_factory, write_state, read_state):
        card = card_factory(stage="requirements", step_status={"requirements": ""})
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert mock_ctx.call_tool.call_count == 1

    def test_manual_trust_does_not_escalate(self, advance_mod, mock_ctx, state_factory,
                                            card_factory, write_state):
        card = card_factory(stage="requirements", step_status={}, trust="manual")
        exc = _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert mock_ctx.call_tool.call_count == 0
        assert isinstance(exc, Skip)  # no change, no gate


class TestAdvancePending:
    def test_fresh_pending_no_respawn(self, advance_mod, mock_ctx, state_factory,
                                      card_factory, write_state):
        card = card_factory(
            stage="requirements",
            step_status={"requirements": "pending"},
            pending_at={"requirements": _iso(_now())},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert mock_ctx.call_tool.call_count == 0

    def test_stale_pending_reescalates_once(self, advance_mod, mock_ctx, state_factory,
                                            card_factory, write_state):
        stale = _now() - timedelta(seconds=advance_mod.PENDING_STALE_SECS + 60)
        card = card_factory(
            stage="requirements",
            step_status={"requirements": "pending"},
            pending_at={"requirements": _iso(stale)},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert mock_ctx.call_tool.call_count == 1


class TestAdvanceBlocked:
    def test_blocked_no_advance_no_escalate_surfaces(self, advance_mod, mock_ctx,
                                                     state_factory, card_factory,
                                                     write_state, read_state):
        card = card_factory(
            stage="requirements",
            step_status={"requirements": "blocked"},
            block_reason={"requirements": "needs a decision"},
        )
        exc = _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert mock_ctx.call_tool.call_count == 0
        out = read_state()["cards"][0]
        assert out["stage"] == "requirements"  # did not advance
        assert isinstance(exc, Report)  # waiting_gates -> notify -> Report
        mock_ctx.notify.assert_called_once()
        assert "blocked" in mock_ctx.notify.call_args.args[0]

    def test_false_card_init_capability_gap_is_cleared_and_reescalated(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        # A readonly step-agent self-blocked claiming the card "must be written by the orchestrator"
        # / "cannot initialize card" — but the card IS runtime-initialized (intent_integrity
        # satisfied + envelope + intent). The predicate that drives the deterministic clear must
        # recognize this as a FALSE block (issue-#33 class), and NOT a genuine tool/crew gap.
        false_card = {
            "intent_integrity": {"status": "satisfied", "violations": [], "checked_at": "t"},
            "execution_envelope": {"id": "env-x", "step": "investigate"},
            "raw_intent": {"text": "fix my game", "captured_at": "t", "source_ref": None},
        }
        false_reason = ("capability-gap: readonly step agent cannot initialize card in state.json; "
                        "card must be written by orchestrator or console before investigate can run.")
        assert advance_mod._is_false_card_init_block(false_card, false_reason) is True

        # A GENUINE capability-gap (missing tool/crew) must NOT be treated as the false card-init
        # block — the clear must not over-reach.
        genuine_reason = "capability-gap: missing select_crew tool to dispatch the research crew"
        assert advance_mod._is_false_card_init_block(false_card, genuine_reason) is False

        # An uninitialized card (integrity NOT satisfied) with the same wording is a REAL block —
        # the premise holds, so it must not be cleared.
        uninit_card = {"intent_integrity": {"status": "violation"}, "raw_intent": {"text": "x"}}
        assert advance_mod._is_false_card_init_block(uninit_card, false_reason) is False


class TestAdvanceError:
    def test_error_under_cap_reescalates(self, advance_mod, mock_ctx, state_factory,
                                         card_factory, write_state, read_state):
        stale = _now() - timedelta(seconds=advance_mod.PENDING_STALE_SECS + 60)
        card = card_factory(
            stage="requirements",
            step_status={"requirements": "error"},
            pending_at={"requirements": _iso(stale)},
            retry_count={"requirements": 1},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert mock_ctx.call_tool.call_count == 1
        out = read_state()["cards"][0]
        assert out["retry_count"]["requirements"] == 2
        assert out["step_status"]["requirements"] == "pending"

    def test_error_at_cap_converts_to_blocked(self, advance_mod, mock_ctx, state_factory,
                                              card_factory, write_state, read_state):
        card = card_factory(
            stage="requirements",
            step_status={"requirements": "error"},
            retry_count={"requirements": advance_mod.MAX_STEP_RETRIES},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert mock_ctx.call_tool.call_count == 0
        out = read_state()["cards"][0]
        assert out["step_status"]["requirements"] == "blocked"
        assert str(advance_mod.MAX_STEP_RETRIES) in out["block_reason"]["requirements"]


class TestAdvanceCaps:
    def test_escalation_cap(self, advance_mod, mock_ctx, state_factory, card_factory,
                            write_state):
        # 4 fresh (un-started) cards; only MAX_ESCALATIONS (2) should spawn.
        cards = [card_factory(stage="requirements", step_status={}) for _ in range(4)]
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=cards))
        assert mock_ctx.call_tool.call_count == 2

    def test_move_cap(self, advance_mod, mock_ctx, state_factory, card_factory,
                      write_state, read_state):
        # 5 done cards; only MAX_MOVES (3) should move this cycle.
        cards = [card_factory(stage="requirements", step_status={"requirements": "done"})
                 for _ in range(5)]
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=cards))
        out = read_state()["cards"]
        advanced = [c for c in out if c["stage"] != "requirements"]
        assert len(advanced) == 3
        # the remaining two stayed put for the next tick
        untouched = [c for c in out if c["stage"] == "requirements"]
        assert len(untouched) == 2


class TestAdvanceGate:
    def test_cancelled_card_is_not_listed_as_a_waiting_gate(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        # Regression: a cancelled card (lifecycle:cancelled) whose scheduler node carries a
        # "lifecycle:cancelled" wait_reason was leaking into waiting_gates and being rendered as
        # "DLC-YOLO gates awaiting approval: … (scheduler withheld: lifecycle:cancelled)" — a false
        # claim (a cancelled card awaits nothing). A cancelled card at a mid-ladder stage must NOT
        # notify and must NOT appear in the waiting set.
        cancelled = card_factory(
            stage="requirements", step_status={},
            lifecycle="cancelled", writes_allowed=False)
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[cancelled]))
        # The load-bearing invariant: a cancelled card triggers no "awaiting approval" notice and
        # never enters the persisted waiting-set signature.
        mock_ctx.notify.assert_not_called()
        assert read_state()["cards"][0].get("_notified_waiting") is None
        assert read_state().get("_notified_waiting") in (None, [])

    def test_assisted_gate_waits_and_notifies(self, advance_mod, mock_ctx, state_factory,
                                              card_factory, write_state, read_state):
        card = card_factory(stage="gate-spec", step_status={})
        exc = _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "gate-spec"  # waits
        mock_ctx.notify.assert_called_once()
        assert isinstance(exc, Report)

    def test_steady_state_wait_notifies_once_then_stays_silent(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        # A card parked at a gate makes waiting_gates truthy on EVERY poll. The FIRST wake
        # notifies + Reports (new signal); subsequent wakes with an unchanged waiting-set must
        # stay SILENT (Skip, no notify) — otherwise the "advanced … N gate(s) waiting" line spams
        # every 120s. Regression for the notification-spam bug.
        card = card_factory(stage="gate-spec", step_status={})
        first = _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert isinstance(first, Report)
        assert mock_ctx.notify.call_count == 1

        # Second + third wake: state already persisted (incl. _notified_waiting); do NOT rewrite.
        for _ in range(2):
            with pytest.raises(advance_mod.Skip):
                advance_mod.advance(mock_ctx)
        # No further notifications fired on the steady-state waits.
        assert mock_ctx.notify.call_count == 1

    def test_autonomous_gate_without_review_bundle_stays_waiting(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        card = card_factory(stage="gate-spec", step_status={}, trust="autonomous")
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "gate-spec"
        assert out.get("gate_commands") is None

    def test_autonomous_gate_uses_same_revision_specific_approval_path(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        card = card_factory(
            stage="gate-spec", trust="autonomous",
            step_status={"requirements": "advanced"},
            gate_review=_complete_gate_review(3),
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "design"
        command = out["gate_commands"][0]
        assert command["id"] == f"auto-{card['id']}-gate-spec-r3"
        assert command["status"] == "applied"
        assert out["gate_history"][0]["result_revision"] == 3
        assert out["approved_gate_inputs"]["gate-spec"]["result_revision"] == 3

    def test_approved_gate_advances_even_assisted(self, advance_mod, mock_ctx, state_factory,
                                                  card_factory, write_state, read_state):
        card = card_factory(
            stage="gate-spec", step_status={"requirements": "advanced"},
            gate_review=_complete_gate_review(2),
            gate_commands=[{
                "id": "ui-approve-r2", "gate": "gate-spec", "action": "approve",
                "expected_revision": 2, "actor": "user", "at": _iso(_now()),
                "status": "pending",
            }],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "design"
        assert out["gate_commands"][0]["status"] == "applied"
        assert out["gate_review"]["status"] == "approved"
        assert out["approved_gate_inputs"]["gate-spec"]["result_revision"] == 2

    def test_rejected_gate_routes_back_and_resumes_retained_producer(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        card = card_factory(
            stage="gate-spec",
            step_status={"requirements": "advanced"},
            gate_review=_complete_gate_review(4),
            gate_commands=[{
                "id": "ui-reject-r4", "gate": "gate-spec", "action": "reject",
                "expected_revision": 4, "reason": "Requirements omit recovery behavior",
                "actor": "user", "at": _iso(_now()), "status": "pending",
            }],
            step_sessions={"requirements": {
                "cron_id": "producer-revise", "slot_key": "cron-producer-revise", "kept": True,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        rejected = read_state()
        out = rejected["cards"][0]
        ptr = out["step_sessions"]["requirements"]
        assert out["gate_commands"][0]["status"] == "applied"
        assert out["gate_review"]["status"] == "rejected"
        assert out["gate_revision"]["base_result_revision"] == 4
        assert out["interjection"][0]["kind"] == "rejection"
        assert out["interjection"][0]["status"] == "pending"
        assert out["stage"] == "requirements"
        assert out["step_status"]["requirements"] == "pending"
        assert "gate-spec" not in out["step_status"]
        assert ptr["cron_id"] == "producer-revise"
        assert ptr["retention"] == "revising"
        assert out["backstep_history"][-1]["reason"] == "gate rejected"

        calls = mock_ctx.call_tool.call_args_list
        assert len(calls) == 1
        assert calls[0].args[:2] == ("kirocrew-cron", "cron_trigger")
        assert calls[0].args[2] == {"job_id": "producer-revise"}


class TestRevisionSafeGateStateMachine:
    @staticmethod
    def _command(command_id: str, action: str, revision: int, **extra) -> dict:
        return {
            "id": command_id,
            "gate": "gate-spec",
            "action": action,
            "expected_revision": revision,
            "actor": "user",
            "at": "2026-09-05T00:01:00Z",
            "status": "pending",
            **extra,
        }

    def test_stale_revision_is_rejected_without_mutating_gate(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        card = card_factory(
            stage="gate-spec", step_status={"requirements": "advanced"},
            gate_review=_complete_gate_review(3),
            gate_commands=[self._command("stale-r2", "approve", 2)],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "gate-spec"
        assert out["gate_review"]["status"] == "awaiting-review"
        assert out["gate_commands"][0]["status"] == "rejected"
        assert out["gate_commands"][0]["rejection_reason"] == "revision-mismatch"
        assert out.get("gate_history", []) == []

    def test_duplicate_command_id_applies_once_and_rejects_duplicate(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        command = self._command("same-command", "approve", 1)
        card = card_factory(
            stage="gate-spec", step_status={"requirements": "advanced"},
            gate_review=_complete_gate_review(1),
            gate_commands=[dict(command), dict(command)],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "design"
        assert [item["status"] for item in out["gate_commands"]] == ["applied", "rejected"]
        assert out["gate_commands"][1]["rejection_reason"] == "duplicate-command-id"
        assert len(out["gate_history"]) == 1

    def test_approval_cannot_race_past_accepted_interjection(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        card = card_factory(
            stage="gate-spec", step_status={"requirements": "advanced"},
            gate_review=_complete_gate_review(5),
            gate_commands=[
                self._command("revise-r5", "interject", 5,
                              kind="feedback", text="Add rollback evidence"),
                self._command("approve-r5", "approve", 5),
            ],
            step_sessions={"requirements": {
                "cron_id": "producer-r5", "slot_key": "cron-producer-r5",
                "session_key": "cron:producer-r5", "kept": True,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "gate-spec"
        assert out["gate_review"]["status"] == "revising"
        assert out["gate_commands"][0]["status"] == "applied"
        assert out["gate_commands"][1]["status"] == "rejected"
        assert out["gate_commands"][1]["rejection_reason"] == "review-not-awaiting"
        assert out["step_status"]["requirements"] == "pending"
        assert out["step_sessions"]["requirements"]["retention"] == "revising"
        assert out["interjection"][0]["status"] == "pending"
        triggers = [call for call in mock_ctx.call_tool.call_args_list
                    if call.args[:2] == ("kirocrew-cron", "cron_trigger")]
        assert len(triggers) == 1
        assert triggers[0].args[2] == {"job_id": "producer-r5"}

    def test_new_terminal_revision_supersedes_old_and_handles_interjection(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        old = _complete_gate_review(5)
        old["status"] = "revising"
        old["resolved_by_command"] = "revise-r5"
        card = card_factory(
            stage="gate-spec", step_status={"requirements": "done"},
            gate_review=_complete_gate_review(6),
            gate_review_history=[old],
            gate_revision={
                "gate": "gate-spec", "producer_step": "requirements",
                "base_result_revision": 5, "kind": "interject", "status": "running",
                "requested_at": "2026-09-05T00:01:00Z",
                "command_ids": ["revise-r5"], "interjection_ids": ["revise-r5"],
            },
            interjection=[{
                "id": "revise-r5", "at": "2026-09-05T00:01:00Z",
                "step": "gate-spec", "kind": "feedback", "text": "sensitive",
                "by": "user", "status": "pending", "result_revision": 5,
            }],
            step_sessions={"requirements": {
                "cron_id": "producer-r6", "slot_key": "cron-producer-r6",
                "session_key": "cron:producer-r6", "kept": True,
                "retention": "revising", "retained_for_gate": "gate-spec",
                "release_after": "design",
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["gate_review"]["status"] == "awaiting-review"
        assert out["gate_review_history"][0]["status"] == "superseded"
        assert out["gate_review_history"][0]["superseded_by_revision"] == 6
        assert out["interjection"][0]["status"] == "handled"
        assert out["interjection"][0]["handled_by_run_id"] == "producer-r6"
        assert "gate_revision" not in out
        assert out["gate_revision_history"][-1]["result_revision"] == 6
        assert out["stage"] == "gate-spec"

    def test_unavailable_retained_session_creates_provenance_linked_replacement(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        def call_tool(server, tool, args):
            if (server, tool) == ("kirocrew-cron", "cron_trigger"):
                raise RuntimeError("job not found")
            if (server, tool) == ("kirocrew-cron", "cron_add"):
                return {"id": "replacement1"}
            return {}

        mock_ctx.call_tool.side_effect = call_tool
        card = card_factory(
            stage="gate-spec", step_status={"requirements": "advanced"},
            gate_review=_complete_gate_review(7),
            gate_commands=[self._command(
                "revise-r7", "interject", 7, kind="feedback", text="Rework evidence")],
            step_sessions={"requirements": {
                "cron_id": "gone-producer", "slot_key": "cron-gone-producer",
                "session_key": "cron:gone-producer", "agent": "dlcyolo-authoring",
                "kept": True, "worktree": {"path": "/worktrees/card", "branch": "dlc/card"},
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        ptr = out["step_sessions"]["requirements"]
        assert out["gate_commands"][0]["status"] == "applied"
        assert ptr["cron_id"] == "replacement1"
        assert ptr["replacement_for"]["cron_id"] == "gone-producer"
        assert ptr["continuity_loss"] == "retained-session-unavailable"
        assert ptr["worktree"] == {"path": "/worktrees/card", "branch": "dlc/card"}
        assert out["session_replacements"][0]["replacement"]["cron_id"] == "replacement1"
        assert out["interjection"][0]["status"] == "pending"
        assert out["step_status"]["requirements"] == "pending"

    def test_replacement_dispatch_binds_same_concrete_model_request(
            self, advance_mod, mock_ctx, state_factory, card_factory):
        mock_ctx.call_tool.return_value = {"id": "replacement-model"}
        pipeline = {
            "id": "pl-model", "repo": "owner/repo", "depth": "standard",
            "steps": [
                {"id": "requirements", "type": "agent", "capability": "authoring",
                 "agent": {"model": "model-replacement"}},
                {"id": "gate-spec", "type": "gate", "reviews_step": "requirements"},
            ],
        }
        card = card_factory(
            stage="gate-spec",
            step_sessions={"requirements": {
                "cron_id": "gone", "agent": "dlcyolo-authoring", "kept": True,
            }},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")

        assert advance_mod._start_replacement_producer(
            mock_ctx, card, pipeline, "requirements", "gate-spec", 3,
            ["interjection-1"], "2026-09-05T00:01:00Z") is True

        payload = mock_ctx.call_tool.call_args.args[2]
        assert payload["model"] == "model-replacement"
        assert "reasoning_effort" not in payload
        assert "bounded adaptive execution control packet" in payload["message"]
        assert "requested_model='model-replacement'" in payload["message"]
        assert "Do not exceed pass_allocation" in payload["message"]
        assert "stamp first_output_at once" in payload["message"]
        assert "leave it absent if not observed" in payload["message"]
        assert "LOCAL TERMINAL EVENT BRIDGE" in payload["message"]
        assert "card.event_outbox" in payload["message"]
        assert "Do NOT call cron_trigger" in payload["message"]
        assert "kirocrew-cron::cron_trigger" not in payload["message"]
        pointer = card["step_sessions"]["requirements"]
        assert pointer["requested_model"] == "model-replacement"
        assert pointer["event_bridge"] == {
            "outbox_schema_version": 1,
            "advance_job_id": advance_mod._advance_job_id(),
        }
        assert pointer["requested_reasoning_effort"] == "high"
        assert pointer["execution_envelope_id"] == card["execution_envelope"]["id"]
        assert "model" not in pointer
        assert "reasoning_effort" not in pointer

    def test_transient_resume_failure_does_not_fork_replacement(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        mock_ctx.call_tool.side_effect = RuntimeError("scheduler busy")
        card = card_factory(
            stage="gate-spec", step_status={"requirements": "advanced"},
            gate_review=_complete_gate_review(8),
            gate_commands=[self._command(
                "revise-r8", "interject", 8, kind="feedback", text="Retry continuity")],
            step_sessions={"requirements": {
                "cron_id": "busy-producer", "slot_key": "cron-busy-producer",
                "session_key": "cron:busy-producer", "kept": True,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["gate_commands"][0]["status"] == "routing"
        assert out["gate_review"]["status"] == "revising"
        assert out["step_sessions"]["requirements"]["cron_id"] == "busy-producer"
        assert out.get("session_replacements") is None
        assert out["interjection"][0]["status"] == "pending"


class TestAdvanceControlFlow:
    def test_empty_state_raises_skip(self, advance_mod, mock_ctx, write_state):
        with pytest.raises(Skip):
            advance_mod.advance(mock_ctx)  # no state file written -> _load()->{} -> no cards

    def test_no_cards_raises_skip(self, advance_mod, mock_ctx, state_factory, write_state):
        with pytest.raises(Skip):
            write_state(state_factory(cards=[]))
            advance_mod.advance(mock_ctx)

    def test_no_change_no_gate_raises_skip(self, advance_mod, mock_ctx, state_factory,
                                           card_factory, write_state):
        # fresh pending card -> no escalation, no move, no gate -> Skip
        card = card_factory(stage="requirements",
                            step_status={"requirements": "pending"},
                            pending_at={"requirements": _iso(_now())})
        with pytest.raises(Skip):
            write_state(state_factory(cards=[card]))
            advance_mod.advance(mock_ctx)


# =========================================================================== #
# TIER 4 — bootstrap / state tiers
# =========================================================================== #
class TestBootstrap:
    def test_empty_writes_skeleton(self, advance_mod, state_path):
        assert not state_path.exists()
        advance_mod._bootstrap()
        data = json.loads(state_path.read_text())
        assert data == {"config": {"trust": "assisted", "depth": "standard"},
                        "pipelines": [], "cards": []}

    def test_explicit_override_publishes_bounded_durable_0600_pointer(
            self, advance_mod, state_path, monkeypatch):
        calls = []
        real_fsync = advance_mod.os.fsync

        def tracked_fsync(fd):
            calls.append(fd)
            return real_fsync(fd)

        monkeypatch.setattr(advance_mod.os, "fsync", tracked_fsync)
        advance_mod._bootstrap()

        raw = advance_mod.STATE_POINTER.read_bytes()
        assert len(raw) <= advance_mod._STATE_POINTER_MAX_BYTES
        assert json.loads(raw) == {
            "schema_version": advance_mod._STATE_POINTER_SCHEMA_VERSION,
            "path": str(state_path),
        }
        assert advance_mod.stat.S_IMODE(
            advance_mod.STATE_POINTER.stat().st_mode) == 0o600
        assert len(calls) >= 2  # temporary file and containing directory

    def test_explicit_state_path_must_be_absolute(self, advance_mod, monkeypatch):
        monkeypatch.setenv("DLC_YOLO_STATE", "relative/state.json")
        with pytest.raises(ValueError, match="absolute path"):
            advance_mod._resolve_state_path()

    def test_state_and_pointer_paths_never_traverse_symlinks(
            self, advance_mod, tmp_path):
        real = tmp_path / "real"
        real.mkdir()
        linked = tmp_path / "linked"
        linked.symlink_to(real, target_is_directory=True)
        assert advance_mod._absolute_state_path(str(linked / "state.json")) is None

        advance_mod.STATE.parent.mkdir(parents=True, exist_ok=True)
        advance_mod.STATE.write_text("{}", encoding="utf-8")
        advance_mod.STATE_POINTER = linked / ".statepath"
        assert advance_mod._publish_state_pointer() is False

    def test_promote_from_tmp(self, advance_mod, monkeypatch, tmp_path, state_path):
        # durable (STATE) empty; a legacy /tmp board has real cards -> promote it.
        legacy = tmp_path / "legacy_tmp_state.json"
        legacy.write_text(json.dumps(
            {"config": {"trust": "assisted"}, "pipelines": [{"id": "pl-x"}],
             "cards": [{"id": "c-1"}]}))
        # redirect the module's hard-coded /tmp path to our fixture legacy file
        real_path = advance_mod.Path

        def _fake_path(arg):
            if str(arg) == "/tmp/dlc-yolo/state.json":
                return legacy
            return real_path(arg)

        monkeypatch.setattr(advance_mod, "Path", _fake_path)
        advance_mod._bootstrap()
        data = json.loads(state_path.read_text())
        assert data["cards"] == [{"id": "c-1"}]
        assert data["pipelines"] == [{"id": "pl-x"}]

    def test_never_clobber_existing_work(self, advance_mod, state_path):
        real = {"config": {"trust": "manual"}, "pipelines": [{"id": "keep"}],
                "cards": [{"id": "keep-card"}]}
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(json.dumps(real))
        advance_mod._bootstrap()
        assert json.loads(state_path.read_text()) == real

    def test_bootstrap_never_seeds_over_unreadable_file(self, advance_mod, state_path):
        # REGRESSION (16:31 wipe): a file that EXISTS with bytes but does not parse (a
        # transient read caught mid os.replace, or a lock) must NOT be seeded empty — that
        # is how a live reconcile clobbered a 13-card board. _content returns None on the
        # unparseable read; the clobber guard must leave the bytes intact.
        state_path.parent.mkdir(parents=True, exist_ok=True)
        # non-empty, non-JSON bytes stand in for the transient partial/locked read
        original = "{partial write not yet valid json ....."
        state_path.write_text(original)
        advance_mod._bootstrap()
        # the guard must have refused to write the empty seed
        assert state_path.read_text() == original, "bootstrap clobbered an unreadable non-empty state"

    def test_bootstrap_seeds_when_truly_empty(self, advance_mod, state_path):
        # A genuinely EMPTY (zero-byte) or absent file is a real first run — seeding is correct.
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text("")  # zero bytes
        advance_mod._bootstrap()
        data = json.loads(state_path.read_text())
        assert data["cards"] == [] and data["pipelines"] == []

    def test_load_corrupt_json_raises_not_empty(self, advance_mod, state_path):
        # S2: a NON-EMPTY file that doesn't parse is a transient/corrupt read — it must RAISE
        # _StateUnreadable, never collapse to {} (that was the wipe path). advance() catches this
        # and skips the cycle; the poll repairs.
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text("{not valid json,,,")
        import pytest as _pytest
        with _pytest.raises(advance_mod._StateUnreadable):
            advance_mod._load()

    def test_load_empty_or_absent_returns_empty(self, advance_mod, state_path):
        # A truly empty (zero-byte) or absent file is a genuine first run → {} is correct.
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text("")  # zero bytes → not "exists with bytes"
        assert advance_mod._load() == {}

    def test_save_refuses_empty_over_populated(self, advance_mod, state_path):
        # S2: _save must never persist an empty state over a populated on-disk file.
        state_path.parent.mkdir(parents=True, exist_ok=True)
        populated = {"config": {}, "pipelines": [{"id": "keep"}], "cards": [{"id": "keep-card"}]}
        state_path.write_text(json.dumps(populated))
        import pytest as _pytest
        with _pytest.raises(advance_mod._StateUnreadable):
            advance_mod._save({"config": {}, "pipelines": [], "cards": []})
        # disk untouched
        assert json.loads(state_path.read_text()) == populated

    def test_load_missing_returns_empty(self, advance_mod, state_path):
        assert not state_path.exists()
        assert advance_mod._load() == {}

    def test_save_load_round_trip(self, advance_mod):
        payload = {"config": {"trust": "autonomous"}, "pipelines": [], "cards": [{"id": "x"}]}
        advance_mod._save(payload)
        assert advance_mod._load() == payload

    def test_state_lock_is_exclusive_across_holders(self, advance_mod, state_path):
        # ROOT-2: the cross-process state lock must be EXCLUSIVE — while one holder has it, a
        # non-blocking second acquire on the same path must fail (so a backend writer waits for the
        # cron's RMW instead of interleaving-and-losing).
        import fcntl, os as _os
        state_path.parent.mkdir(parents=True, exist_ok=True)
        with advance_mod._state_lock() as got:
            assert got is True  # uncontended acquire succeeds
            lock_path = str(advance_mod.STATE)[:-5] + ".json.lock"
            fd = _os.open(lock_path, _os.O_CREAT | _os.O_RDWR, 0o600)
            try:
                raised = False
                try:
                    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except OSError:
                    raised = True
                assert raised, "a second non-blocking acquire must fail while the lock is held"
            finally:
                _os.close(fd)
        # released after the context — a fresh acquire now succeeds
        with advance_mod._state_lock() as got2:
            assert got2 is True

    def test_save_collapses_duplicate_card_ids(self, advance_mod, state_path):
        # Render-safety: two cards sharing an id break the board (duplicate React key → the pipeline
        # column fails to render, "pipe gone UI-wise"). _save must collapse duplicates to the MOST
        # COMPLETE entry before persisting, so a double-append (two sessions backfilling the same
        # card) can never recur.
        bare = {"id": "card-x", "stage": "investigate", "lifecycle": "ingested"}
        full = {"id": "card-x", "stage": "investigate", "lifecycle": "ingested",
                "step_status": {"investigate": "blocked"}, "execution_schedule": {"nodes": {}},
                "event_outbox": []}
        advance_mod._save({"config": {}, "pipelines": [{"id": "pl-1"}, {"id": "pl-1"}],
                           "cards": [bare, {"id": "card-y"}, full]})
        out = advance_mod._load()
        fixgame = [c for c in out["cards"] if c["id"] == "card-x"]
        assert len(fixgame) == 1                                  # collapsed to one
        assert fixgame[0].get("step_status") == {"investigate": "blocked"}  # kept the complete one
        assert [c["id"] for c in out["cards"]] == ["card-x", "card-y"]       # order preserved
        assert len(out["pipelines"]) == 1                          # pipeline dupes collapse too

    def test_save_caps_per_card_history(self, advance_mod, state_path):
        # RENDER-SAFETY: the host /api/file-read endpoint truncates at 512000 bytes; unbounded
        # per-card history (execution_envelope_history entries are ~11KB each) grows state.json
        # past the cap → the UI reads chopped JSON → JSON.parse throws → board shows 0 cards
        # despite intact state (the "pipeline ghosting" root cause). _save must bound these
        # append-only arrays to the last 3 snapshots on every persist, without touching the live
        # execution_envelope / gate_review fields or any other card data.
        card = {
            "id": "card-hist", "stage": "requirements", "lifecycle": "ingested",
            "execution_envelope": {"live": True},                       # live field, must survive
            "execution_envelope_history": [{"revision": r} for r in range(9)],
            "gate_review_history": [{"g": g} for g in range(7)],
        }
        advance_mod._save({"config": {}, "pipelines": [{"id": "pl-1"}], "cards": [card]})
        out = advance_mod._load()
        saved = out["cards"][0]
        assert len(saved["execution_envelope_history"]) == 1
        assert [e["revision"] for e in saved["execution_envelope_history"]] == [8]   # last 1
        assert len(saved["gate_review_history"]) == 1
        assert [e["g"] for e in saved["gate_review_history"]] == [6]                 # last 1
        assert saved["execution_envelope"] == {"live": True}           # live field untouched

    def test_save_is_durable_and_atomic(self, advance_mod, state_path):
        # ROOT-2: _save writes via a temp file + fsync + os.replace (no partial/torn file) and
        # leaves no .tmp behind.
        payload = {"config": {}, "pipelines": [{"id": "p"}], "cards": [{"id": "c"}]}
        advance_mod._save(payload)
        assert json.loads(state_path.read_text()) == payload
        assert not state_path.with_suffix(".json.tmp").exists()  # temp cleaned by os.replace


# =========================================================================== #
# TIER 5 — no-retire-until-consumed / terminal lifecycle
# =========================================================================== #
class TestTerminalLifecycle:
    def test_terminal_no_children_retires(self, advance_mod, mock_ctx, state_factory,
                                          card_factory, write_state, read_state):
        card = card_factory(stage="done")
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert read_state()["cards"][0]["lifecycle"] == "retired"

    def test_terminal_all_children_consumed_retires(self, advance_mod, mock_ctx, state_factory,
                                                    card_factory, write_state, read_state):
        card = card_factory(
            stage="done",
            child_tickets=[{"issue": 5, "status": "consumed"},
                           {"issue": 6, "status": "consumed"}],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert read_state()["cards"][0]["lifecycle"] == "retired"

    def test_terminal_unconsumed_child_stays_handed_off(self, advance_mod, mock_ctx,
                                                        state_factory, card_factory,
                                                        write_state, read_state):
        card = card_factory(
            stage="done",
            child_tickets=[{"issue": 5, "status": "consumed"},
                           {"issue": 6, "status": "open"}],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert read_state()["cards"][0]["lifecycle"] == "handed-off"

    def test_lifecycle_no_spurious_change(self, advance_mod, mock_ctx, state_factory,
                                          card_factory, write_state):
        # already 'retired' terminal card, nothing else -> no change -> Skip
        card = card_factory(stage="done", lifecycle="retired")
        with pytest.raises(Skip):
            write_state(state_factory(cards=[card]))
            advance_mod.advance(mock_ctx)


# =========================================================================== #
# TIER 2b — BUDGET GUARD (depth-budget-spec §2/§4; system-model §5 #1)
# =========================================================================== #
class TestBudgetGuard:
    def test_child_count_over_cap_blocks_parent(self, advance_mod, mock_ctx, state_factory,
                                                card_factory, write_state, read_state):
        # standard depth default cap = 3; 4 children -> breach -> non-destructive block.
        card = card_factory(
            stage="design", depth="standard",
            child_tickets=[{"issue": i, "status": "open"} for i in range(4)],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"]["design"] == "blocked"
        assert out["block_reason"]["design"].startswith("budget:")
        # children are NEVER deleted
        assert len(out["child_tickets"]) == 4

    def test_over_budget_proposal_with_reason_is_ratifiable_not_blocked(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        # topology-decision-rubric authority model: depth budget is a SOFT default. An UNAUTHORIZED
        # over-budget fan-out that carries over_budget:true + a reason is a ratifiable REQUEST — it
        # must be held proposal-awaiting-orchestrator, NOT hard-blocked.
        card = card_factory(
            stage="design", depth="standard",
            child_tickets=[{"issue": i, "status": "open"} for i in range(5)],  # cap 3 → over
            topology={"schema_version": 1, "action": "fan-out",
                      "over_budget": True, "reason": "5 truly independent subsystems",
                      "status": "proposal-awaiting-orchestrator", "raised_by": "step:design"},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"].get("design") != "blocked"          # not hard-blocked
        assert out["topology"]["status"] == "proposal-awaiting-orchestrator"
        assert out["topology"]["over_budget_request"]["proposed_children"] == 5
        assert out["topology"]["over_budget_request"]["budget"] == 3

    def test_authorized_over_budget_fanout_proceeds(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        # Once ratified (authority stamped), an over-budget fan-out proceeds past the cap — the
        # deviation was explicitly authorized, not a silent overrun.
        card = card_factory(
            stage="design", depth="standard",
            child_tickets=[{"issue": i, "status": "open"} for i in range(5)],
            topology={"schema_version": 1, "action": "fan-out", "authority": "orchestrator",
                      "over_budget": True, "reason": "ratified: 5 independent subsystems"},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"].get("design") != "blocked"
        assert out["topology"].get("status") != "blocked-budget"

    def test_over_budget_without_reason_still_blocks(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        # An over-budget fan-out with no reason (and no authority) is still a budget breach — a
        # silent overrun must not slip through; the block hint names the ratifiable path.
        card = card_factory(
            stage="design", depth="standard",
            child_tickets=[{"issue": i, "status": "open"} for i in range(5)],
            topology={"schema_version": 1, "action": "fan-out", "over_budget": True},  # no reason
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"]["design"] == "blocked"
        assert "topology.over_budget=true" in out["block_reason"]["design"]

    def test_unlimited_budget_never_blocks(self, advance_mod, mock_ctx, state_factory,
                                           card_factory, write_state, read_state):
        card = card_factory(
            stage="design", depth="deep",
            budget={"max_child_cards": "unlimited", "effort_ceiling": "unlimited"},
            child_tickets=[{"issue": i, "status": "open"} for i in range(20)],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"].get("design") != "blocked"

    def test_under_cap_no_block(self, advance_mod, mock_ctx, state_factory, card_factory,
                                write_state, read_state):
        card = card_factory(
            stage="design", depth="standard",
            child_tickets=[{"issue": 1, "status": "open"}, {"issue": 2, "status": "open"}],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"].get("design") != "blocked"

    def test_effort_ceiling_from_computed_scope_blocks(self, advance_mod, mock_ctx, state_factory,
                                                       card_factory, write_state, read_state):
        # deep ceiling = 40; scope sums to 50 -> breach (computed spent, no effort.spent needed).
        card = card_factory(
            stage="design", depth="deep",
            child_tickets=[{"issue": 1, "status": "open"}],
            effort={"scope": {"requirements": 20, "design": 30}},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"]["design"] == "blocked"
        assert "effort" in out["block_reason"]["design"]

    def test_no_children_not_evaluated(self, advance_mod, mock_ctx, state_factory, card_factory,
                                       write_state, read_state):
        # a childless card can't breach a FAN-OUT budget — it is skipped, not blocked.
        card = card_factory(stage="design", depth="quick",
                            step_status={"design": "done"})
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"].get("design") != "blocked"


# =========================================================================== #
# TIER 2c — ENABLED CHAT RESPONSE -> CARD REACTION (Order 6)
# =========================================================================== #
class TestChatResponseLinkage:
    def test_same_step_response_reactivates_without_second_model_call(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        responded = _iso(_now())
        card = card_factory(
            stage="requirements",
            step_status={"requirements": "done"},
            step_sessions={"requirements": {
                "slot_key": "cron-abc123", "session_key": "cron:abc123",
                "last_response_at": responded,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "requirements"
        assert out["step_status"]["requirements"] == "pending"
        assert out["pending_at"]["requirements"] == responded
        ptr = out["step_sessions"]["requirements"]
        assert ptr["response_routed_at"] == responded
        assert "last_response_handled_at" not in ptr
        # The human prompt already started the linked session; the cron must not duplicate it.
        assert not any(c.args[1] in ("cron_add", "cron_trigger")
                       for c in mock_ctx.call_tool.call_args_list if len(c.args) > 1)

    def test_explicitly_disabled_chat_does_not_reactivate(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        responded = _iso(_now())
        card = card_factory(
            stage="requirements",
            step_status={"requirements": "blocked"},
            step_sessions={"requirements": {
                "slot_key": "cron-disabled", "last_response_at": responded,
                "chat_disabled_at": responded,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"]["requirements"] == "blocked"
        assert "response_routed_at" not in out["step_sessions"]["requirements"]

    def test_response_to_advanced_step_routes_to_current_stage_without_backstep(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        responded = _iso(_now())
        card = card_factory(
            stage="design",
            step_status={"requirements": "advanced", "design": "pending"},
            pending_at={"design": responded},
            step_sessions={"requirements": {
                "slot_key": "cron-oldstep", "last_response_at": responded,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "design"
        routed = [i for i in out["interjection"] if i["kind"] == "chat-response"]
        assert len(routed) == 1
        assert routed[0]["step"] == "design"
        assert routed[0]["response_at"] == responded
        assert out["step_sessions"]["requirements"]["response_routed_to_step"] == "design"

    def test_handled_response_is_idempotent(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        responded = _iso(_now())
        card = card_factory(
            stage="requirements",
            step_status={"requirements": "blocked"},
            step_sessions={"requirements": {
                "slot_key": "cron-handled", "last_response_at": responded,
                "last_response_handled_at": responded,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"]["requirements"] == "blocked"
        assert "response_routed_at" not in out["step_sessions"]["requirements"]


# =========================================================================== #
# TIER 2d — GATE PRODUCER RETENTION + STEP-CRON CLEANUP
# =========================================================================== #
class TestGateProducerResolution:
    def test_explicit_reviews_step_overrides_position(self, advance_mod):
        pipeline = {"steps": [
            {"id": "source", "type": "agent"},
            {"id": "decoy", "type": "agent"},
            {"id": "approval", "type": "gate", "reviews_step": "source"},
        ]}
        assert advance_mod._gate_producer_step(pipeline, "approval") == "source"

    def test_positional_inference_skips_adjacent_gates(self, advance_mod):
        pipeline = {"steps": [
            {"id": "build", "type": "agent"},
            {"id": "preflight", "type": "gate"},
            {"id": "approval", "type": "gate"},
        ]}
        assert advance_mod._gate_producer_step(pipeline, "approval") == "build"


class TestStepCronCleanup:
    @staticmethod
    def _removes(mock_ctx):
        return [c for c in mock_ctx.call_tool.call_args_list
                if c.args[:2] == ("kirocrew-cron", "cron_remove")]

    def test_terminal_step_removes_cron_and_clears_id(self, advance_mod, mock_ctx, state_factory,
                                                      card_factory, write_state, read_state):
        pipeline = {
            "id": "pl-1", "repo": "owner/repo", "trust": "assisted",
            "steps": [
                {"id": "alpha", "type": "agent"},
                {"id": "beta", "type": "agent"},
            ],
        }
        card = card_factory(
            stage="beta",
            step_status={"alpha": "advanced", "beta": "pending"},
            pending_at={"beta": _iso(_now())},
            step_sessions={"alpha": {"cron_id": "abc123", "slot_key": "cron-abc123",
                                     "kept": True}},
        )
        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))
        calls = self._removes(mock_ctx)
        assert len(calls) == 1
        assert calls[0].args[2] == {"job_id": "abc123"}
        ptr = read_state()["cards"][0]["step_sessions"]["alpha"]
        assert "cron_id" not in ptr
        assert ptr["slot_key"] == "cron-abc123"
        assert "retired_at" in ptr

    def test_terminal_producer_is_held_before_move_to_gate(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        card = card_factory(
            stage="requirements",
            step_status={"requirements": "done"},
            step_sessions={"requirements": {
                "cron_id": "producer1", "slot_key": "cron-producer1", "kept": True,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "gate-spec"
        assert self._removes(mock_ctx) == []
        ptr = out["step_sessions"]["requirements"]
        assert ptr["cron_id"] == "producer1"
        assert ptr["retention"] == "held-for-gate"
        assert ptr["retained_for_gate"] == "gate-spec"
        assert ptr["release_after"] == "design"
        assert "retention_handoff_at" not in ptr  # entering the gate is not successor receipt
        assert out["step_status"]["requirements"] == "advanced"

    def test_approved_gate_records_handoff_but_does_not_release(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        card = card_factory(
            stage="gate-spec",
            step_status={"requirements": "advanced", "gate-spec": "approved"},
            successor_receipts={"gate-spec": {
                "producer_step": "requirements", "successor_step": "design",
                "received_at": _iso(_now() - timedelta(days=1)),
            }},
            step_sessions={"requirements": {
                "cron_id": "producer-approved", "slot_key": "cron-producer-approved",
                "kept": True,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        ptr = out["step_sessions"]["requirements"]
        assert out["stage"] == "design"
        assert ptr["cron_id"] == "producer-approved"
        assert ptr["retention_handoff_at"] == out["updated_at"]
        assert ptr["retention"] == "held-for-gate"
        assert "gate-spec" not in out.get("successor_receipts", {})
        assert self._removes(mock_ctx) == []

    def test_unresolved_gate_holds_terminal_producer_idempotently(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        card = card_factory(
            stage="gate-spec",
            step_status={"requirements": "advanced"},
            step_sessions={"requirements": {
                "cron_id": "producer2", "slot_key": "cron-producer2", "kept": True,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        first = read_state()
        retained_at = first["cards"][0]["step_sessions"]["requirements"]["retained_at"]
        assert self._removes(mock_ctx) == []

        mock_ctx.call_tool.reset_mock()
        _run(advance_mod, mock_ctx, write_state, first)
        ptr = read_state()["cards"][0]["step_sessions"]["requirements"]
        assert self._removes(mock_ctx) == []
        assert ptr["cron_id"] == "producer2"
        assert ptr["retained_at"] == retained_at
        assert ptr["retention"] == "held-for-gate"

    def test_explicit_reviews_step_holds_source_and_reaps_positional_decoy(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        pipeline = {
            "id": "pl-1", "repo": "owner/repo", "trust": "assisted",
            "steps": [
                {"id": "source", "type": "agent"},
                {"id": "decoy", "type": "agent"},
                {"id": "approval", "type": "gate", "reviews_step": "source"},
                {"id": "ship", "type": "agent"},
            ],
        }
        card = card_factory(
            stage="approval",
            step_status={"source": "advanced", "decoy": "advanced"},
            step_sessions={
                "source": {"cron_id": "keep-source", "kept": True},
                "decoy": {"cron_id": "reap-decoy", "kept": True},
            },
        )
        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))
        out = read_state()["cards"][0]["step_sessions"]
        assert out["source"]["cron_id"] == "keep-source"
        assert out["source"]["retention"] == "held-for-gate"
        assert "cron_id" not in out["decoy"]
        assert [c.args[2] for c in self._removes(mock_ctx)] == [{"job_id": "reap-decoy"}]

    def test_custom_reordered_gate_infers_prior_agent(self, advance_mod, mock_ctx, state_factory,
                                                       card_factory, write_state, read_state):
        pipeline = {
            "id": "pl-1", "repo": "owner/repo", "trust": "assisted",
            "steps": [
                {"id": "build", "type": "agent"},
                {"id": "preflight", "type": "gate"},
                {"id": "approval", "type": "gate"},
                {"id": "ship", "type": "agent"},
            ],
        }
        card = card_factory(
            stage="approval",
            step_status={"build": "advanced"},
            step_sessions={"build": {"cron_id": "custom1", "kept": True}},
        )
        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))
        ptr = read_state()["cards"][0]["step_sessions"]["build"]
        assert ptr["cron_id"] == "custom1"
        assert ptr["retained_for_gate"] == "approval"
        assert self._removes(mock_ctx) == []

    def test_approval_alone_does_not_release_before_successor_receipt(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        handoff = _iso(_now() - timedelta(minutes=2))
        card = card_factory(
            stage="design",
            step_status={"requirements": "advanced", "gate-spec": "advanced", "design": "pending"},
            pending_at={"design": _iso(_now())},
            step_sessions={"requirements": {
                "cron_id": "held1", "kept": True, "retention": "held-for-gate",
                "retained_for_gate": "gate-spec", "release_after": "design",
                "retained_at": handoff, "retention_handoff_at": handoff,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        ptr = read_state()["cards"][0]["step_sessions"]["requirements"]
        assert ptr["cron_id"] == "held1"
        assert ptr["retention"] == "held-for-gate"
        assert self._removes(mock_ctx) == []

    def test_matching_successor_receipt_releases_once(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        handoff = _iso(_now() - timedelta(minutes=2))
        received = _iso(_now() - timedelta(minutes=1))
        card = card_factory(
            stage="design",
            step_status={"requirements": "advanced", "gate-spec": "advanced", "design": "pending"},
            pending_at={"design": _iso(_now())},
            successor_receipts={"gate-spec": {
                "producer_step": "requirements", "successor_step": "design",
                "received_at": received,
            }},
            step_sessions={"requirements": {
                "cron_id": "release1", "kept": True, "retention": "held-for-gate",
                "retained_for_gate": "gate-spec", "release_after": "design",
                "retained_at": handoff, "retention_handoff_at": handoff,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        first = read_state()
        ptr = first["cards"][0]["step_sessions"]["requirements"]
        assert [c.args[2] for c in self._removes(mock_ctx)] == [{"job_id": "release1"}]
        assert "cron_id" not in ptr
        assert ptr["retention"] == "released"
        assert ptr["retention_released_at"] >= received

        mock_ctx.call_tool.reset_mock()
        _run(advance_mod, mock_ctx, write_state, first)
        assert self._removes(mock_ctx) == []

    def test_rejected_gate_never_releases_from_stale_receipt(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        handoff = _iso(_now() - timedelta(minutes=3))
        card = card_factory(
            stage="gate-spec",
            step_status={"requirements": "advanced", "gate-spec": "rejected"},
            successor_receipts={"gate-spec": {
                "producer_step": "requirements", "successor_step": "design",
                "received_at": _iso(_now() - timedelta(minutes=1)),
            }},
            step_sessions={"requirements": {
                "cron_id": "reject1", "kept": True, "retention": "held-for-gate",
                "retained_for_gate": "gate-spec", "release_after": "design",
                "retained_at": handoff, "retention_handoff_at": handoff,
            }},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        ptr = read_state()["cards"][0]["step_sessions"]["requirements"]
        assert ptr["cron_id"] == "reject1"
        assert self._removes(mock_ctx) == []

    def test_pending_step_cron_not_removed(self, advance_mod, mock_ctx, state_factory,
                                           card_factory, write_state, read_state):
        card = card_factory(
            stage="requirements",
            step_status={"requirements": "pending"},
            pending_at={"requirements": _iso(_now())},
            step_sessions={"requirements": {"cron_id": "live99", "kept": True}},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert self._removes(mock_ctx) == []
        assert read_state()["cards"][0]["step_sessions"]["requirements"]["cron_id"] == "live99"


# =========================================================================== #
# TIER 2d — OWNERSHIP GUARD @ RESOLVE (ownership-guard-spec §3/§6)
# =========================================================================== #
class TestResolveGuard:
    def test_guarded_card_not_retired_when_author_untrusted(self, advance_mod, mock_ctx,
                                                            state_factory, card_factory,
                                                            write_state, read_state, monkeypatch):
        # SECURITY OUTCOME (ownership-guard §6): a github-sot card whose author fails the guard
        # is NEVER resolved/retired. In practice the TOP-OF-LOOP guard catches it first — it
        # guard-blocks the card and skips before the terminal/retire block — so the card is not
        # retired (lifecycle never flips to 'retired'). The resolve-boundary re-check is
        # defense-in-depth behind that. Assert the outcome that matters: not retired + guarded.
        monkeypatch.setattr(advance_mod, "_owner_ok", lambda *a, **k: False)
        card = card_factory(stage="done", sot="github")
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out.get("lifecycle") != "retired"          # never resolved
        assert out.get("guard", {}).get("passed") is False  # guard-blocked, visible

    def test_trusted_card_retires_at_terminal(self, advance_mod, mock_ctx, state_factory,
                                              card_factory, write_state, read_state, monkeypatch):
        monkeypatch.setattr(advance_mod, "_owner_ok", lambda *a, **k: True)
        card = card_factory(stage="done", sot="github")
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert read_state()["cards"][0]["lifecycle"] == "retired"


# =========================================================================== #
# TIER 2e — PARENT_TICKET SELF-HEAL (§5 gap #4 — harden writers)
# =========================================================================== #
class TestParentTicketSelfHeal:
    def test_bare_int_parent_ticket_normalized_to_dict(self, advance_mod, mock_ctx, state_factory,
                                                       card_factory, write_state, read_state):
        parent = card_factory(stage="requirements",
                              step_status={"requirements": "pending"},
                              pending_at={"requirements": _iso(_now())},
                              source={"type": "github", "repo": "owner/repo", "issue": 41,
                                      "url": "https://x/41"})
        child = card_factory(stage="requirements",
                             step_status={"requirements": "pending"},
                             pending_at={"requirements": _iso(_now())},
                             parent_ticket=41)  # bare int (malformed writer)
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[parent, child]))
        out = {c["id"]: c for c in read_state()["cards"]}
        healed = out[child["id"]]["parent_ticket"]
        assert isinstance(healed, dict)
        assert healed["issue"] == 41
        assert healed["card_id"] == parent["id"]
        assert healed["url"] == "https://x/41"

    def test_dict_parent_ticket_untouched(self, advance_mod, mock_ctx, state_factory,
                                          card_factory, write_state, read_state):
        pt = {"issue": 9, "card_id": "card-parent", "url": "u"}
        child = card_factory(stage="requirements",
                             step_status={"requirements": "pending"},
                             pending_at={"requirements": _iso(_now())},
                             parent_ticket=dict(pt))
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[child]))
        assert read_state()["cards"][0]["parent_ticket"] == pt


# =========================================================================== #
# TIER 2f — CHILD INGESTION + DECOMPOSE FORM-CHANGE (fan-out completeness)
# =========================================================================== #
class TestChildIngestion:
    def test_child_ticket_card_id_null_becomes_driven_card(self, advance_mod, mock_ctx,
                                                           state_factory, card_factory,
                                                           write_state, read_state):
        # a mid-ladder parent with an un-carded child_ticket -> a real child card is created,
        # card_id back-filled, parent marked decomposed.
        parent = card_factory(
            stage="requirements",
            step_status={"requirements": "advanced"},
            child_tickets=[{"issue": 43, "url": "u43", "feature": "f1", "status": "handed-off",
                            "card_id": None}],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[parent]))
        out = read_state()["cards"]
        p = next(c for c in out if c["id"] == parent["id"])
        assert p.get("decomposed")                                   # parent form-changed
        entry = p["child_tickets"][0]
        assert entry["card_id"] is not None                          # back-filled
        child = next(c for c in out if c["id"] == entry["card_id"])
        assert (child["source"] or {}).get("issue") == 43            # driven card exists
        assert child["parent_ticket"]["card_id"] == parent["id"]     # links back
        assert child["stage"]                                        # has a start stage

    def test_decomposed_parent_does_not_run_its_ladder(self, advance_mod, mock_ctx, state_factory,
                                                       card_factory, write_state, read_state):
        # an already-decomposed parent at an agent step is NOT escalated (no cron_add for it).
        parent = card_factory(
            stage="requirements", step_status={},
            decomposed={"at": "x", "children": [43]},
            child_tickets=[{"issue": 43, "card_id": "card-child-43", "status": "open"}],
        )
        child = card_factory(id="card-child-43", stage="requirements", step_status={},
                             source={"type": "github", "repo": "owner/repo", "issue": 43})
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[parent, child]))
        # the parent must not have been escalated; only the child (if any) drives.
        add_calls = [c for c in mock_ctx.call_tool.call_args_list
                     if c.args[:2] == ("kirocrew-cron", "cron_add")
                     and parent["id"] in str(c.args[2])]
        assert len(add_calls) == 0

    def test_consumed_child_ticket_not_re_ingested(self, advance_mod, mock_ctx, state_factory,
                                                   card_factory, write_state, read_state):
        # a consumed child_ticket on a mid-ladder parent creates no new card + no decompose.
        parent = card_factory(
            stage="requirements", step_status={"requirements": "advanced"},
            child_tickets=[{"issue": 44, "status": "consumed", "card_id": None}],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[parent]))
        out = read_state()["cards"]
        assert not any((c.get("source") or {}).get("issue") == 44 for c in out)  # no card made
        p = next(c for c in out if c["id"] == parent["id"])
        assert not p.get("decomposed")


# =========================================================================== #
# PRIORITY 6 — CARD WORKTREE / BRANCH LEASES
# =========================================================================== #
class TestWorktreeLeases:
    @staticmethod
    def _repo(tmp_path):
        repo = tmp_path / "source-repo"
        _REAL_SUBPROCESS_RUN(
            ["git", "init", "-b", "main", str(repo)], check=True,
            capture_output=True, text=True)
        _REAL_SUBPROCESS_RUN(
            ["git", "-C", str(repo), "config", "user.email", "tests@example.invalid"],
            check=True, capture_output=True, text=True)
        _REAL_SUBPROCESS_RUN(
            ["git", "-C", str(repo), "config", "user.name", "DLC Tests"],
            check=True, capture_output=True, text=True)
        (repo / "README.md").write_text("base\n", encoding="utf-8")
        _REAL_SUBPROCESS_RUN(
            ["git", "-C", str(repo), "add", "README.md"], check=True,
            capture_output=True, text=True)
        _REAL_SUBPROCESS_RUN(
            ["git", "-C", str(repo), "commit", "-m", "base"], check=True,
            capture_output=True, text=True)
        _REAL_SUBPROCESS_RUN(
            ["git", "-C", str(repo), "remote", "add", "origin",
             "https://github.com/owner/repo.git"], check=True,
            capture_output=True, text=True)
        return repo

    @staticmethod
    def _pipeline(repo_path=None):
        pipeline = {
            "id": "pl-lease", "repo": "owner/repo", "source": "manual",
            "workspace": "default", "trust": "assisted", "depth": "standard",
            "steps": [{"id": "implement", "type": "agent", "capability": "builder"}],
        }
        if repo_path is not None:
            pipeline["repo_path"] = str(repo_path)
        return pipeline

    def test_acquires_locked_deterministic_lease_and_reconciles_idempotently(
            self, advance_mod, state_factory, card_factory, tmp_path, monkeypatch):
        repo = self._repo(tmp_path)
        monkeypatch.setattr(advance_mod.subprocess, "run", _REAL_SUBPROCESS_RUN)
        pipeline = self._pipeline(repo)
        card = card_factory(id="card-lease", title="Implement Safe Thing", pipeline_id="pl-lease",
                            stage="implement")
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "implement")

        changed, error = advance_mod._ensure_worktree_lease(
            state, card, step, pipeline, "2026-09-05T08:00:00Z")
        assert changed is True
        assert error is None
        lease = card["worktree_lease"]
        assert lease["status"] == "active"
        assert lease["locked"] is True
        assert lease["owner_card"] == "card-lease"
        assert lease["branch"] == "dlc/pl-lease/card-lease/implement-safe-thing"
        assert card["target_branch"] == lease["branch"]
        assert lease["path"] == str(
            advance_mod.STATE.parent / "workspaces/default/worktrees/card-lease")
        assert (advance_mod.Path(lease["path"]) / "README.md").exists()
        listed = _REAL_SUBPROCESS_RUN(
            ["git", "-C", str(repo), "worktree", "list", "--porcelain", "-z"],
            check=True, capture_output=True, text=True).stdout
        entry = next(item for item in advance_mod._parse_worktree_porcelain(listed)
                     if item.get("branch") == lease["branch"])
        assert entry["locked"] is True

        changed, error = advance_mod._ensure_worktree_lease(
            state, card, step, pipeline, "2026-09-05T08:01:00Z")
        assert (changed, error) == (False, None)

    def test_missing_repo_path_and_cross_card_branch_collision_fail_closed(
            self, advance_mod, state_factory, card_factory, tmp_path, monkeypatch):
        pipeline = self._pipeline()
        first = card_factory(id="card-first", pipeline_id="pl-lease", stage="implement")
        state = state_factory(cards=[first], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "implement")
        changed, error = advance_mod._ensure_worktree_lease(
            state, first, step, pipeline, "2026-09-05T08:00:00Z")
        assert changed is True
        assert error == "worktree lease: repo-path-unconfigured"
        assert first["worktree_lease"]["status"] == "blocked"

        repo = self._repo(tmp_path)
        monkeypatch.setattr(advance_mod.subprocess, "run", _REAL_SUBPROCESS_RUN)
        pipeline["repo_path"] = str(repo)
        first.pop("worktree_lease")
        assert advance_mod._ensure_worktree_lease(
            state, first, step, pipeline, "2026-09-05T08:01:00Z")[1] is None
        second = card_factory(
            id="card-second", pipeline_id="pl-lease", stage="implement",
            target_branch=first["target_branch"])
        state["cards"].append(second)
        changed, error = advance_mod._ensure_worktree_lease(
            state, second, step, pipeline, "2026-09-05T08:02:00Z")
        assert changed is True
        assert error == "worktree lease: branch-leased-by-another-card"
        assert second["worktree_lease"]["status"] == "blocked"

    def test_terminal_binding_must_match_exact_lease_path(
            self, advance_mod, state_factory, card_factory, tmp_path, monkeypatch):
        repo = self._repo(tmp_path)
        monkeypatch.setattr(advance_mod.subprocess, "run", _REAL_SUBPROCESS_RUN)
        pipeline = self._pipeline(repo)
        card = card_factory(id="card-binding", pipeline_id="pl-lease", stage="implement",
                            step_status={"implement": "done"})
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "implement")
        assert advance_mod._ensure_worktree_lease(
            state, card, step, pipeline, "2026-09-05T08:00:00Z")[1] is None

        handshake, _ = advance_mod._ensure_runtime_handshake(
            state, card, step, pipeline, "2026-09-05T08:01:00Z", "terminal")
        assert handshake["preflight"]["status"] == "blocked"
        assert {item["kind"] for item in handshake["preflight"]["mismatches"]} >= {
            "worktree-binding-unverified"}

        card["step_sessions"] = {"implement": {
            "working_dir": card["worktree_lease"]["path"],
            "worktree_lease_id": card["worktree_lease"]["lease_id"],
        }}
        handshake, _ = advance_mod._ensure_runtime_handshake(
            state, card, step, pipeline, "2026-09-05T08:02:00Z", "terminal")
        assert handshake["scope"]["worktree"]["binding_status"] == "verified"
        assert not any(item["kind"].startswith("worktree-")
                       for item in handshake["preflight"]["mismatches"])

    def test_terminal_unobservable_binding_with_completed_result_does_not_false_block(
            self, advance_mod, state_factory, card_factory, tmp_path, monkeypatch):
        # FALSE-BLOCK GUARD: a finished cron step reports no live worktree observation, so
        # binding_status is unobservable (not 'verified'). If the step RESULT is completed, that
        # absence of evidence must NOT hard-block the step on 'worktree-binding-unverified'.
        repo = self._repo(tmp_path)
        monkeypatch.setattr(advance_mod.subprocess, "run", _REAL_SUBPROCESS_RUN)
        pipeline = self._pipeline(repo)
        card = card_factory(id="card-unobs", pipeline_id="pl-lease", stage="implement",
                            step_status={"implement": "done"})
        # The step produced a completed result but NO step_sessions working_dir → binding unobservable.
        card["step_results"] = {"implement": {"status": "completed",
                                              "bundle": {"summary": "done"}}}
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "implement")
        assert advance_mod._ensure_worktree_lease(
            state, card, step, pipeline, "2026-09-05T08:00:00Z")[1] is None
        handshake, _ = advance_mod._ensure_runtime_handshake(
            state, card, step, pipeline, "2026-09-05T08:01:00Z", "terminal")
        # No worktree-binding-unverified mismatch, because the binding is unobservable AND the
        # result is completed — evidence of absence is not evidence of mismatch.
        assert not any(item["kind"] == "worktree-binding-unverified"
                       for item in handshake["preflight"]["mismatches"])

    def test_dispatch_provisions_lease_and_never_instructs_branch_switching(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state,
            read_state, tmp_path, monkeypatch):
        repo = self._repo(tmp_path)
        monkeypatch.setattr(advance_mod.subprocess, "run", _REAL_SUBPROCESS_RUN)
        mock_ctx.call_tool.return_value = {"id": "job-lease"}
        pipeline = self._pipeline(repo)
        card = card_factory(id="card-dispatch", pipeline_id="pl-lease", stage="implement")

        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))
        out = read_state()["cards"][0]
        lease = out["worktree_lease"]
        assert lease["status"] == "active"
        assert out["step_status"]["implement"] == "pending"
        pointer = out["step_sessions"]["implement"]
        assert pointer["requested_working_dir"] == lease["path"]
        assert "working_dir" not in pointer  # requested is never fabricated as applied
        cron_add = next(call for call in mock_ctx.call_tool.call_args_list
                        if call.args[:2] == ("kirocrew-cron", "cron_add"))
        seed = cron_add.args[2]["message"]
        assert lease["path"] in seed
        assert lease["branch"] in seed
        assert "git checkout -B" not in seed
        assert "Never checkout/switch/create/reset a branch" in seed

    def test_dirty_terminal_worktree_is_quarantined_then_cleanly_released(
            self, advance_mod, state_factory, card_factory, tmp_path, monkeypatch):
        repo = self._repo(tmp_path)
        monkeypatch.setattr(advance_mod.subprocess, "run", _REAL_SUBPROCESS_RUN)
        pipeline = self._pipeline(repo)
        card = card_factory(id="card-release", pipeline_id="pl-lease", stage="implement",
                            lifecycle="cancelled")
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "implement")
        assert advance_mod._ensure_worktree_lease(
            state, card, step, pipeline, "2026-09-05T08:00:00Z")[1] is None
        worktree = advance_mod.Path(card["worktree_lease"]["path"])
        dirty = worktree / "uncommitted.txt"
        dirty.write_text("preserve me\n", encoding="utf-8")

        assert advance_mod._release_worktree_lease(
            state, card, pipeline, "2026-09-05T08:01:00Z") is True
        assert card["worktree_lease"]["status"] == "quarantined"
        assert card["worktree_lease"]["reason_code"] == "dirty-worktree"
        assert card["worktree_lease"]["dirty_entry_count"] == 1
        assert dirty.exists()

        dirty.unlink()
        assert advance_mod._release_worktree_lease(
            state, card, pipeline, "2026-09-05T08:02:00Z") is True
        assert card["worktree_lease"]["status"] == "released"
        assert not worktree.exists()
        branch = card["worktree_lease"]["branch"]
        assert _REAL_SUBPROCESS_RUN(
            ["git", "-C", str(repo), "show-ref", "--verify", f"refs/heads/{branch}"],
            capture_output=True, text=True).returncode == 0


# =========================================================================== #
# STALE-NODE REAPER — orphaned scheduler node whose owning session is dead      #
# (card-rps3d-fixgame: node status='running', session_ref -> a dead cron,       #
#  step_status='pending' -> the card wedged forever). The reaper resets such a  #
#  node to a re-dispatchable 'observed' status so the plan re-escalates it.     #
# =========================================================================== #
class TestStaleNodeReaper:
    def _card_with_orphan_node(self, advance_mod, *, step="investigate",
                               node_status="running", pending_age_secs, lifecycle="ingested",
                               step_status="pending", first_output=False,
                               session_started_delta=None):
        """Build a card carrying ONE card-step node in an ACTIVE status with a session_ref
        pointing at a (dead) cron, and a matching pending_at that is `pending_age_secs` old."""
        pending_ts = _iso(_now() - timedelta(seconds=pending_age_secs))
        node = {
            "schema_version": advance_mod._SCHEDULER_SCHEMA_VERSION,
            "id": f"sched:card-orphan:{step}:1",
            "kind": "card-step",
            "card_id": "card-orphan",
            "step": step,
            "status": node_status,
            "session_ref": {"cron_id": "b2076bd0", "slot_key": "cron-b2076bd0",
                            "session_key": "cron:b2076bd0"},
            "session_started_at": pending_ts,
            "permit_id": "permit-deadbeef",
            "permit_acquired_at": pending_ts,
            "created_at": pending_ts,
            "updated_at": pending_ts,
        }
        if first_output:
            node["first_output_at"] = _iso(_now() - timedelta(seconds=5))
        if session_started_delta is not None:
            node["session_started_at"] = _iso(_now() - timedelta(seconds=session_started_delta))
        card = {
            "id": "card-orphan",
            "title": "Orphaned node card",
            "pipeline_id": "pl-1",
            "stage": step,
            "lifecycle": lifecycle,
            "step_status": {step: step_status} if step_status is not None else {},
            "pending_at": {step: pending_ts},
            "execution_schedule": {
                "schema_version": advance_mod._SCHEDULER_SCHEMA_VERSION,
                "nodes": {node["id"]: node},
                "current_node_id": node["id"],
            },
        }
        state = {"config": {}, "pipelines": [{"id": "pl-1", "repo": "owner/repo"}],
                 "cards": [card]}
        return state, card, node["id"]

    def test_orphaned_stale_running_node_is_reaped_to_observed(self, advance_mod):
        # (a) An orphaned RUNNING node stale past the window is reset to a re-dispatchable state.
        state, card, node_id = self._card_with_orphan_node(
            advance_mod, pending_age_secs=advance_mod.PENDING_STALE_SECS + 120)
        now = _iso(_now())
        changed = advance_mod._scheduler_reconcile_nodes(state, now)
        node = card["execution_schedule"]["nodes"][node_id]
        assert changed is True
        assert node["status"] == "observed"                       # re-dispatchable resting status
        assert "session_ref" not in node                          # dead binding popped
        assert "session_started_at" not in node
        assert "permit_id" not in node
        assert "permit_acquired_at" not in node
        assert node["requeued_reason"] == "orphaned-session-dead"
        assert node["requeued_at"] == now
        assert node["updated_at"] == now

    def test_orphaned_node_with_completed_result_is_not_reaped(self, advance_mod):
        # GUARD: a step whose RESULT is already completed is NOT an abandoned spawn — reaping it
        # re-queues finished work (observed: implement completed inline, node stayed 'running' on a
        # dead session, step_status got re-opened to 'pending', reaper re-ran the whole step).
        state, card, node_id = self._card_with_orphan_node(
            advance_mod, step="implement", pending_age_secs=advance_mod.PENDING_STALE_SECS + 120)
        card["step_results"] = {"implement": {"status": "completed", "bundle": {"summary": "done"}}}
        now = _iso(_now())
        advance_mod._scheduler_reconcile_nodes(state, now)
        node = card["execution_schedule"]["nodes"][node_id]
        # Not reaped: no requeue, session binding preserved (the status branches finalize it).
        assert node.get("requeued_reason") != "orphaned-session-dead"
        assert node["status"] != "observed" or "session_ref" in node

    def test_fresh_running_node_within_window_is_not_reaped(self, advance_mod):
        # (b) A FRESH running node inside the staleness window is left untouched.
        state, card, node_id = self._card_with_orphan_node(
            advance_mod, pending_age_secs=30)                     # well under PENDING_STALE_SECS
        now = _iso(_now())
        advance_mod._scheduler_reconcile_nodes(state, now)
        node = card["execution_schedule"]["nodes"][node_id]
        assert node.get("requeued_reason") is None               # never reaped
        assert "session_ref" in node                              # binding intact
        # the normal reconcile keeps a fresh pending node as running (not observed)
        assert node["status"] == "running"

    def test_node_with_observed_progress_is_not_reaped(self, advance_mod):
        # A stale-but-LIVE session (recorded first_output_at) is protected from reaping.
        state, card, node_id = self._card_with_orphan_node(
            advance_mod, pending_age_secs=advance_mod.PENDING_STALE_SECS + 120,
            first_output=True)
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        node = card["execution_schedule"]["nodes"][node_id]
        assert node.get("requeued_reason") is None
        assert "session_ref" in node

    def test_retired_card_node_is_untouched(self, advance_mod):
        # (c) A retired/terminal-lifecycle card is untouched by the reaper (its own branch owns it).
        state, card, node_id = self._card_with_orphan_node(
            advance_mod, pending_age_secs=advance_mod.PENDING_STALE_SECS + 120,
            lifecycle="retired")
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        node = card["execution_schedule"]["nodes"][node_id]
        assert node.get("requeued_reason") is None               # reaper skipped it
        # terminal-lifecycle reconcile completes the node instead.
        assert node["status"] == "completed"

    def test_cancelled_card_node_is_untouched_by_reaper(self, advance_mod):
        # A cancel-lifecycle card is handled by the cancel branch, not the reaper.
        state, card, node_id = self._card_with_orphan_node(
            advance_mod, pending_age_secs=advance_mod.PENDING_STALE_SECS + 120,
            lifecycle="cancelled")
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        node = card["execution_schedule"]["nodes"][node_id]
        assert node.get("requeued_reason") is None

    def test_terminal_step_status_node_is_not_reaped(self, advance_mod):
        # A node whose step already reached a terminal outcome (done) is NOT an orphan.
        state, card, node_id = self._card_with_orphan_node(
            advance_mod, pending_age_secs=advance_mod.PENDING_STALE_SECS + 120,
            step_status="done")
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        node = card["execution_schedule"]["nodes"][node_id]
        assert node.get("requeued_reason") is None
        assert node["status"] == "completed"                     # terminal branch owns it

    def test_reaper_is_idempotent(self, advance_mod):
        # (d) Running the reconcile twice yields the SAME result (idempotent) — the second pass is
        # a no-op because the node is no longer in an active status.
        state, card, node_id = self._card_with_orphan_node(
            advance_mod, pending_age_secs=advance_mod.PENDING_STALE_SECS + 120)
        now1 = _iso(_now())
        advance_mod._scheduler_reconcile_nodes(state, now1)
        node = card["execution_schedule"]["nodes"][node_id]
        first = json.loads(json.dumps(node))                     # snapshot after first reap
        assert first["status"] == "observed"
        assert first["requeued_at"] == now1

        now2 = _iso(_now() + timedelta(seconds=1))
        advance_mod._scheduler_reconcile_nodes(state, now2)
        node2 = card["execution_schedule"]["nodes"][node_id]
        # requeue provenance is stable — a second pass did not re-reap or re-stamp it.
        assert node2["requeued_at"] == now1
        assert node2["requeued_reason"] == "orphaned-session-dead"
        assert "session_ref" not in node2

    def test_permit_acquired_orphan_is_reaped(self, advance_mod):
        # The reaper covers all three active statuses; a stale 'permit-acquired' orphan is reset.
        state, card, node_id = self._card_with_orphan_node(
            advance_mod, node_status="permit-acquired",
            pending_age_secs=advance_mod.PENDING_STALE_SECS + 120)
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        node = card["execution_schedule"]["nodes"][node_id]
        assert node["status"] == "observed"
        assert node["requeued_reason"] == "orphaned-session-dead"

    def test_reaped_node_becomes_dispatchable_through_full_plan(self, advance_mod):
        # END-TO-END: the whole point of the reaper is that _scheduler_plan (which calls
        # reconcile first) turns a wedged orphan into a SELECTED/ready node instead of an
        # immortal 'running' one. After the plan runs, the orphan node must no longer be counted
        # active-and-stuck; it is re-readied (ready/queued/permit-acquired/selected), which is
        # exactly what unwedges the card.
        state, card, node_id = self._card_with_orphan_node(
            advance_mod, step="requirements",              # a real ladder step so the plan visits it
            pending_age_secs=advance_mod.PENDING_STALE_SECS + 120)
        # give the pipeline the default ladder so stage 'requirements' is planned
        state["pipelines"][0]["steps"] = [
            {"id": "requirements", "name": "Requirements", "type": "agent",
             "agent": {"name": "spec-agent", "role": "req"}, "label": "dlc:requirements"},
        ]
        now = _iso(_now())
        cycle = {"max_escalations": 2, "escalations": 0}
        selected, _changed = advance_mod._scheduler_plan(state, now, cycle)
        node = card["execution_schedule"]["nodes"][node_id]
        # The node was reaped (requeued provenance present) and re-planned to a live/ready status,
        # NOT left immortally 'running'. Either it was selected this cycle or it is queued/ready
        # for the next — never stuck active on the dead session.
        assert node.get("requeued_reason") == "orphaned-session-dead"
        assert "session_ref" not in node
        assert node["status"] in {"ready", "queued", "permit-acquired"}



# =========================================================================== #
# COMPLETED-RESULT FINALIZER — anti-wedge for the self-delegate HUB model.       #
# A step's streaming subagent completes the work and the step writes a           #
# completed result (step_results[step].status == 'completed'), but the thin hub  #
# session ends WITHOUT writing terminal step_status='done'. The reconcile was    #
# purely (step_status -> node) so the step stayed 'pending', the node was        #
# re-derived to 'running' every cycle, and the card wedged forever (observed at  #
# tasks/implement/review on card-rps3d-fixgame). The finalizer promotes a        #
# non-terminal, non-blocked completed step to 'done' deterministically.          #
# =========================================================================== #
class TestCompletedResultFinalizer:
    def _card(self, *, step="review", step_status="pending", node_status="running",
              result_status="completed", lifecycle="elaborated", is_gate=False,
              stale=True):
        pending_ts = _iso(_now() - timedelta(seconds=999999 if stale else 5))
        card = {
            "id": "card-fin",
            "title": "Finalizer card",
            "pipeline_id": "pl-1",
            "stage": step,
            "sot": "local",
            "source": {"type": "github", "repo": "owner/repo", "issue": 7},
            "lifecycle": lifecycle,
            "step_status": {step: step_status} if step_status is not None else {},
            "pending_at": {step: pending_ts},
            "step_sessions": {step: {"cron_id": "dead", "kept": True, "at": pending_ts}},
            "execution_schedule": {
                "schema_version": 1,
                "current_node_id": f"sched:card-fin:{step}:1",
                "nodes": {f"sched:card-fin:{step}:1": {
                    "schema_version": 1, "id": f"sched:card-fin:{step}:1",
                    "kind": "card-step", "card_id": "card-fin", "step": step,
                    "status": node_status, "created_at": pending_ts}},
            },
        }
        if result_status is not None:
            card["step_results"] = {step: {"status": result_status,
                                           "bundle": {"summary": "PASS"}}}
        step_def = ({"id": step, "type": "gate", "label": f"dlc:{step}"} if is_gate
                    else {"id": step, "type": "agent",
                          "agent": {"name": "review-agent", "role": "review"},
                          "label": f"dlc:{step}"})
        state = {
            "config": {"trust": "assisted", "depth": "standard"},
            "pipelines": [{"id": "pl-1", "repo": "owner/repo", "workspace": "default",
                           "trust": "assisted", "depth": "standard", "steps": [step_def]}],
            "cards": [card],
        }
        return state, card, f"sched:card-fin:{step}:1"

    def test_completed_result_pending_step_finalizes_to_done(self, advance_mod):
        # (a) THE FIX: a step with a completed result but step_status='pending' on a 'running'
        # node is finalized to step_status='done' and node 'completed' on reconcile — it does NOT
        # stay pending/running (the wedge).
        state, card, node_id = self._card(step="review", step_status="pending",
                                           node_status="running", result_status="completed")
        changed = advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        assert changed is True
        assert card["step_status"]["review"] == "done"
        assert card["execution_schedule"]["nodes"][node_id]["status"] == "completed"
        assert card["execution_schedule"]["nodes"][node_id].get("finalized_reason") \
            == "completed-result"
        # pending_at for the step is cleared so nothing re-reads it as an in-flight spawn.
        assert "review" not in (card.get("pending_at") or {})

    def test_completed_result_finalizes_regardless_of_staleness(self, advance_mod):
        # The finalizer keys on the completed RESULT, not on the pending window — a FRESH pending
        # (within the window) whose result already completed must also finalize, not sit 'running'.
        state, card, node_id = self._card(step="tasks", step_status="pending",
                                          node_status="running", result_status="completed",
                                          stale=False)
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        assert card["step_status"]["tasks"] == "done"
        assert card["execution_schedule"]["nodes"][node_id]["status"] == "completed"

    def test_error_status_with_completed_result_finalizes(self, advance_mod):
        # A step left 'error' whose work nonetheless completed is finalized rather than retried.
        state, card, node_id = self._card(step="implement", step_status="error",
                                          node_status="running", result_status="completed")
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        assert card["step_status"]["implement"] == "done"
        assert card["execution_schedule"]["nodes"][node_id]["status"] == "completed"

    def test_running_step_without_completed_result_is_not_finalized(self, advance_mod):
        # (b) A step still genuinely running (NO completed result) must NOT be prematurely
        # finalized — it stays pending/running as before.
        state, card, node_id = self._card(step="review", step_status="pending",
                                          node_status="running", result_status=None,
                                          stale=False)
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        assert card["step_status"]["review"] == "pending"
        assert card["execution_schedule"]["nodes"][node_id]["status"] == "running"
        assert "finalized_reason" not in card["execution_schedule"]["nodes"][node_id]

    def test_in_progress_result_status_is_not_finalized(self, advance_mod):
        # A result present but NOT 'completed' (e.g. 'in_progress') is not proof of completion.
        state, card, node_id = self._card(step="review", step_status="pending",
                                          node_status="running", result_status="in_progress",
                                          stale=False)
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        assert card["step_status"]["review"] == "pending"
        assert card["execution_schedule"]["nodes"][node_id]["status"] == "running"

    def test_gate_is_unaffected_by_finalizer(self, advance_mod):
        # (c) A gate carries no step_results and is a gate type — the finalizer must never touch
        # it. It stays whatever it was (here: awaiting, no step_status promotion).
        state, card, node_id = self._card(step="gate-review", step_status="pending",
                                          node_status="running", result_status=None,
                                          is_gate=True, stale=False)
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        assert card["step_status"]["gate-review"] == "pending"
        assert "finalized_reason" not in card["execution_schedule"]["nodes"][node_id]

    def test_gate_with_stray_completed_result_still_unaffected(self, advance_mod):
        # Defense in depth: even if a gate somehow carried a completed step_result, the explicit
        # _is_gate guard keeps the finalizer from promoting a gate step.
        state, card, node_id = self._card(step="gate-review", step_status="pending",
                                          node_status="running", result_status="completed",
                                          is_gate=True, stale=False)
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        assert card["step_status"]["gate-review"] == "pending"
        assert "finalized_reason" not in card["execution_schedule"]["nodes"][node_id]

    def test_terminal_lifecycle_card_not_re_finalized(self, advance_mod):
        # A retired card is owned by the terminal-lifecycle branch; the finalizer must not run
        # ahead of it (guarded on lifecycle).
        state, card, node_id = self._card(step="review", step_status="pending",
                                          node_status="running", result_status="completed",
                                          lifecycle="retired")
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        node = card["execution_schedule"]["nodes"][node_id]
        # terminal-lifecycle branch owns it -> completed; the finalizer did not stamp it.
        assert node["status"] == "completed"
        assert node.get("finalized_reason") != "completed-result"

    def test_finalizer_is_idempotent(self, advance_mod):
        # Running reconcile twice yields the same terminal result (second pass sees 'done', the
        # done branch owns it — no re-finalization churn).
        state, card, node_id = self._card(step="review", step_status="pending",
                                          node_status="running", result_status="completed")
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now()))
        advance_mod._scheduler_reconcile_nodes(state, _iso(_now() + timedelta(seconds=1)))
        assert card["step_status"]["review"] == "done"
        assert card["execution_schedule"]["nodes"][node_id]["status"] == "completed"
