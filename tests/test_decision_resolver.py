"""Part II decision-resolver unit tests (event-driven-liveness-spec §II).

Pure, zero-token seams — the difficulty classifier, the class dial + clamp-down, and the
model_class → concrete model table. Behavior asserted, not an LLM's judgment.

Covers:
  - _class_to_model: the ONE class→name table, unknown → None (host default).
  - _resolve_difficulty_model_class: tier→class, quality_floor raise, clamp DOWN to ceiling.
  - _classify_dispatch_difficulty: D1 leaf, D2 producing, D3 hard-irreducible, D4/D5 shatter.
"""

from __future__ import annotations


class TestClassToModel:
    def test_known_classes_map_to_concrete_models(self, advance_mod):
        assert advance_mod._class_to_model("economy") == "haiku-4.5"
        assert advance_mod._class_to_model("balanced") == "sonnet-4.6-1m"
        assert advance_mod._class_to_model("decision-grade") == "opus-4.8-1m"
        assert advance_mod._class_to_model("frontier") == "fable-5-1m"

    def test_unknown_class_returns_none_for_host_default(self, advance_mod):
        assert advance_mod._class_to_model("auto") is None
        assert advance_mod._class_to_model("") is None
        assert advance_mod._class_to_model(None) is None


class TestDifficultyModelClass:
    def test_tier_maps_to_dialed_class(self, advance_mod):
        # D1 wants economy, D3 wants decision-grade — within a frontier ceiling both pass through.
        cls, clamped = advance_mod._resolve_difficulty_model_class("D1", "decision-grade", "frontier")
        assert cls == "economy" and clamped == []
        cls, clamped = advance_mod._resolve_difficulty_model_class("D3", "balanced", "frontier")
        assert cls == "decision-grade" and clamped == []

    def test_clamps_down_to_ceiling_never_flags(self, advance_mod):
        # D3 wants decision-grade but a 'balanced' ceiling clamps it DOWN (records the clamp, no raise).
        cls, clamped = advance_mod._resolve_difficulty_model_class("D3", "balanced", "balanced")
        assert cls == "balanced"
        assert any("ceiling" in c for c in clamped)

    def test_quality_floor_raises_within_ceiling(self, advance_mod):
        # A D1 economy dial with a decision-grade floor is raised to the floor (still ≤ ceiling).
        cls, _ = advance_mod._resolve_difficulty_model_class("D1", "economy", "frontier", "decision-grade")
        assert cls == "decision-grade"


class TestClassifyDifficulty:
    @staticmethod
    def _pl():
        return {"id": "pl-1", "depth": "standard", "steps": [
            {"id": "requirements", "type": "agent"},
            {"id": "design", "type": "agent"},
        ]}

    def test_single_crew_leaf_no_features_is_easy(self, advance_mod):
        card = {"id": "c1", "stage": "requirements"}
        step = {"id": "requirements", "type": "agent", "agent": {"crew": "spec-crew"}}
        out = advance_mod._classify_dispatch_difficulty(card, step, self._pl(), "standard", {})
        assert out["tier"] in {"D1", "D2"}          # a clean leaf is lively
        assert out["breadth"] == 1

    def test_producing_step_with_addenda_is_standard(self, advance_mod):
        card = {"id": "c1", "stage": "requirements", "effort": {"features": [{"id": "f1"}]}}
        step = {"id": "requirements", "type": "agent",
                "agent": {"crew": "spec-crew"}, "addenda": [{"id": "sec", "crew": "x"}]}
        out = advance_mod._classify_dispatch_difficulty(card, step, self._pl(), "standard", {})
        assert out["tier"] == "D2"

    def test_low_confidence_decision_is_hard_irreducible(self, advance_mod):
        # A hard signal with NO decomposable units → D3 (one deep pass), not a shatter.
        card = {"id": "c1", "stage": "design",
                "decisions": [{"id": "d1", "chosen": None, "confidence": "low"}]}
        step = {"id": "design", "type": "agent", "agent": {"crew": "c"}}
        out = advance_mod._classify_dispatch_difficulty(card, step, self._pl(), "standard", {})
        assert out["tier"] == "D3"
        assert out["breadth"] == 1

    def test_decomposable_fanout_is_shatter(self, advance_mod):
        # High scope + many weakly-coupled features + fan-out topology → D4/D5 (many cheap pieces).
        card = {"id": "c1", "stage": "design",
                "topology": {"action": "fan-out"},
                "effort": {"features": [{"id": f"f{i}"} for i in range(5)]}}
        step = {"id": "design", "type": "agent", "agent": {"crew": "c"}}
        out = advance_mod._classify_dispatch_difficulty(card, step, self._pl(), "standard", {})
        assert out["tier"] in {"D4", "D5"}
        assert out["breadth"] >= 2
        assert out["decomposable"] is True


class TestPrefireChildRouting:
    @staticmethod
    def _budget(model_ceiling="frontier", effort_ceiling="xhigh"):
        return {"compute": {"model_class_ceiling": model_ceiling,
                            "reasoning_effort_ceiling": effort_ceiling}}

    def test_leaf_is_lean_and_notches_depth_down(self, advance_mod):
        r = advance_mod._prefire_child_routing(
            {"id": "p"}, {"issue": 5}, "leaf", self._budget(), "deep", parent_class="decision-grade")
        assert r["model_class"] == "economy"
        assert r["requested_model"] == "haiku-4.5"
        assert r["reasoning_effort"] == "low"
        assert r["depth"] == "standard"          # one notch below the deep parent
        assert r["source"] == "prefire-config-pass"

    def test_integration_owner_takes_parent_class_and_depth_effort(self, advance_mod):
        r = advance_mod._prefire_child_routing(
            {"id": "p"}, {"issue": 6}, "integration-owner", self._budget(), "standard",
            parent_class="decision-grade")
        assert r["model_class"] == "decision-grade"
        assert r["requested_model"] == "opus-4.8-1m"
        assert r["reasoning_effort"] == "high"   # depth-effort for standard

    def test_facet_is_one_rank_below_parent(self, advance_mod):
        r = advance_mod._prefire_child_routing(
            {"id": "p"}, {"issue": 7}, "facet", self._budget(), "standard",
            parent_class="decision-grade")
        assert r["model_class"] == "balanced"    # one below decision-grade
        assert r["reasoning_effort"] == "medium"

    def test_ceiling_clamps_down_and_records(self, advance_mod):
        # integration-owner wants decision-grade but a 'balanced' ceiling clamps it DOWN.
        r = advance_mod._prefire_child_routing(
            {"id": "p"}, {"issue": 8}, "integration-owner",
            self._budget(model_ceiling="balanced"), "standard", parent_class="decision-grade")
        assert r["model_class"] == "balanced"
        assert any("ceiling" in c for c in r["clamped"])

    def test_planned_routing_honors_a_prefire_stamp(self, advance_mod):
        # A child born with a leaf stamp keeps economy/haiku instead of re-deriving decision-grade.
        pl = {"id": "pl-1", "depth": "standard", "steps": [
            {"id": "requirements", "type": "agent", "agent": {"crew": "c"}},
            {"id": "gate-spec", "type": "gate"}, {"id": "design", "type": "agent"}]}
        card = {"id": "child-1", "stage": "requirements", "depth": "standard",
                "resolved_routing": {"schema_version": 1, "source": "prefire-config-pass",
                                     "topology_role": "leaf", "model_class": "economy",
                                     "requested_model": "haiku-4.5", "reasoning_effort": "low"}}
        step = advance_mod._step_def(pl, "requirements")
        budget = {"compute": {"model_class_ceiling": "frontier",
                              "reasoning_effort_ceiling": "xhigh",
                              "max_research_passes": 1, "max_agent_passes": 1,
                              "max_parallel_runs": 1}}
        contract = {"scope": {}}
        routing, _notes, _infeasible = advance_mod._planned_routing(
            {"cards": [card], "pipelines": [pl]}, card, pl, "standard", "assisted",
            budget, step, contract, "authoring")
        assert routing["model_class"] == "economy"
        assert routing["requested_model"] == "haiku-4.5"
        assert routing["reasoning_effort"] == "low"
