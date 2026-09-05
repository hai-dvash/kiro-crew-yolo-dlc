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
        ]
        assert envelope["observations"]["observation_only"] == [
            "topology", "scheduler", "applied_reasoning_effort"]
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
        ]
        assert out["step_status"]["requirements"] == "pending"
        cron_add = next(call for call in mock_ctx.call_tool.call_args_list
                        if call.args[:2] == ("kirocrew-cron", "cron_add"))
        payload = cron_add.args[2]
        assert payload["agent"] == "dlcyolo-builder"
        assert "model" not in payload
        assert "reasoning_effort" not in payload
        pointer = out["step_sessions"]["requirements"]
        assert pointer["requested_model"] is None
        assert pointer["execution_envelope_id"] == envelope["id"]
        assert "model" not in pointer
        assert "reasoning_effort" not in pointer
        assert "ADAPTIVE EXECUTION CONTROL PACKET" in payload["message"]
        assert envelope["id"] in payload["message"]
        assert "ATOMIC STEP RESULT" in payload["message"]
        assert "requested_model=None" in payload["message"]
        assert "host API has no per-run reasoning-effort argument" in payload["message"]
        assert "PASS CEILINGS ARE HARD" in payload["message"]
        assert "topology, scheduler/event authority, and applied reasoning effort remain observational" in payload["message"]
        assert "gate_review" not in out

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
        card = card_factory(
            stage="design", step_status={"design": "done"},
            child_runs={"design": ["unexpected-child-run"]},
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
        assert handshake["routing"]["model"]["requested"] is None
        assert handshake["routing"]["model"]["applied"] is None
        assert handshake["routing"]["model"]["status"] == "unobservable"
        assert handshake["routing"]["reasoning_effort"]["requested"] == "high"
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
        assert {"kirocrew-core::select_crew", "kirocrew-core::spawn_run"} == set(
            mismatch["missing"])

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
        assert handshake["routing"]["model"]["requested"] is None
        assert handshake["routing"]["model"]["applied"] == "model-applied"
        assert handshake["routing"]["model"]["status"] == "observed"
        assert handshake["routing"]["reasoning_effort"]["requested"] == "high"
        assert handshake["routing"]["reasoning_effort"]["applied"] == "medium"
        assert handshake["routing"]["reasoning_effort"]["status"] == "mismatch"
        assert {item["kind"] for item in handshake["preflight"]["mismatches"]} >= {
            "effective-profile-missing-tools", "live-session-missing-tools",
            "reasoning-effort-below-requested",
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
    def test_assisted_gate_waits_and_notifies(self, advance_mod, mock_ctx, state_factory,
                                              card_factory, write_state, read_state):
        card = card_factory(stage="gate-spec", step_status={})
        exc = _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "gate-spec"  # waits
        mock_ctx.notify.assert_called_once()
        assert isinstance(exc, Report)

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
        assert out["step_status"]["requirements"] == ""
        assert "gate-spec" not in out["step_status"]
        assert ptr["cron_id"] == "producer-revise"
        assert ptr["retention"] == "held-for-gate"
        assert out["backstep_history"][-1]["reason"] == "gate rejected"

        mock_ctx.call_tool.reset_mock()
        _run(advance_mod, mock_ctx, write_state, rejected)
        calls = mock_ctx.call_tool.call_args_list
        assert len(calls) == 1
        assert calls[0].args[:2] == ("kirocrew-cron", "cron_trigger")
        assert calls[0].args[2] == {"job_id": "producer-revise"}
        resumed = read_state()["cards"][0]
        assert resumed["step_status"]["requirements"] == "pending"
        assert resumed["step_sessions"]["requirements"]["retention"] == "revising"


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
        pointer = card["step_sessions"]["requirements"]
        assert pointer["requested_model"] == "model-replacement"
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

    def test_load_corrupt_json_returns_empty(self, advance_mod, state_path):
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text("{not valid json,,,")
        assert advance_mod._load() == {}

    def test_load_missing_returns_empty(self, advance_mod, state_path):
        assert not state_path.exists()
        assert advance_mod._load() == {}

    def test_save_load_round_trip(self, advance_mod):
        payload = {"config": {"trust": "autonomous"}, "pipelines": [], "cards": [{"id": "x"}]}
        advance_mod._save(payload)
        assert advance_mod._load() == payload


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
