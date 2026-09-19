"""Unattended self-enablement regression/integration proof.

Self-enablement is intentionally prompt-driven orchestrator behavior, not a second runtime
engine. These tests bind a deterministic mocked tool transcript to that shipped prompt contract:
no KiroCrew crew or GitHub issue is created by the suite.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
AGENTS = ROOT / "agents"


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


class FakeBootstrapTools:
    def __init__(self, crews=(), issues=()):
        self.crews = set(crews)
        self.issues = set(issues)
        self.calls = []
        self.next_issue = 100

    def agent_list(self):
        self.calls.append(("kirocrew agent list",))
        return sorted(self.crews)

    def agent_create(self, name, profile):
        self.calls.append(("kirocrew agent create", name, "--kiro-agent", profile))
        assert name.startswith("dlcyolo-rps-")
        assert name not in self.crews
        self.crews.add(name)

    def issue_list(self):
        self.calls.append(("gh issue list",))
        return set(self.issues)

    def issue_create(self, key, label):
        self.calls.append(("gh issue create", key, label))
        assert key not in self.issues
        assert label.startswith("dlc:")
        self.issues.add(key)
        self.next_issue += 1
        return self.next_issue


class SelfEnablementContractReplay:
    """Small reference replay of the state/tool effects required by the shipped prompts."""

    def __init__(self, tools):
        self.tools = tools

    @staticmethod
    def setup(pipeline, card, *, selected=None):
        card.setdefault("self_enablement_flow", []).append("setup")
        trust = pipeline.get("trust") or "assisted"
        if selected is None and trust != "autonomous":
            pipeline.update(trust="assisted", depth="standard", approach="simplified")
        elif selected:
            pipeline["approach"] = selected
        card.setdefault("decisions", []).append({
            "id": "setup-approach", "raised_by": "setup", "kind": "capability-gap",
            "chosen": pipeline["approach"], "confidence": "HIGH",
        })
        return pipeline["approach"]

    @staticmethod
    def intent(pipeline, card, *, classification="needs-research"):
        card["self_enablement_flow"].append("intent")
        mode = pipeline["approach"]
        card["intent_contract"] = {
            "version": 1, "status": "active", "research_required": mode == "enhanced",
            "outcomes": [{"id": "outcome-game", "enforcement": "required"}],
            "constraints": [], "acceptance_signals": ["playable-round"],
        }
        card["intent_card"] = mode == "enhanced"
        if mode == "enhanced" and classification == "needs-research":
            pipeline["steps"][0].setdefault("addenda", []).append({
                "crew": "existing-research", "when": "intent-needs-research",
                "writes": ["research_artifacts.intent"],
            })
        card["step_results"] = {"intent": {
            "summary": "resolved", "artifacts": ["intent-contract-v1"],
            "intent_coverage": ["outcome-game"], "validation": ["schema-complete"],
        }}
        card.setdefault("step_status", {})["intent"] = "done"
        card["event_outbox"] = [{
            "schema_version": 1, "step": "intent", "terminal_status": "completed",
            "delivery_status": "pending", "created_at": "2026-09-07T00:00:00Z",
        }]

    @staticmethod
    def elaborate_steps(pipeline, card):
        card["self_enablement_flow"].append("per-step")
        mode = pipeline["approach"]
        card["step_modes"] = {
            step["id"]: mode for step in pipeline["steps"]
            if step.get("type") == "agent"
        }

    def bootstrap(self, pipeline, card, plan):
        card["self_enablement_flow"].append("bootstrap")
        marker = card.setdefault("bootstrap", {
            "status": "pending", "crews_created": [], "issues_opened": [],
            "at": "2026-09-07T00:00:01Z",
        })
        if marker["status"] == "done":
            return "already-done"
        if (len(plan["crews"]) > 3 or plan["confidence"] != "HIGH"
                or plan.get("irreversible")):
            card.setdefault("decisions", []).append({
                "id": "bootstrap-safety", "raised_by": "bootstrap",
                "kind": "capability-gap", "status": "pending-human",
                "confidence": plan["confidence"],
            })
            card["step_status"]["bootstrap"] = "blocked"
            return "blocked"

        existing_crews = set(self.tools.agent_list())
        for crew in plan["crews"]:
            if crew["name"] not in existing_crews:
                self.tools.agent_create(crew["name"], crew["profile"])
                existing_crews.add(crew["name"])
            if crew["name"] not in marker["crews_created"]:
                marker["crews_created"].append(crew["name"])

        existing_issues = self.tools.issue_list()
        for ticket in plan["tickets"]:
            key = f"{card['id']}:{ticket['step']}"
            if key not in existing_issues:
                number = self.tools.issue_create(key, f"dlc:{ticket['step']}")
                existing_issues.add(key)
            else:
                number = ticket.get("existing_number", 99)
            if number not in marker["issues_opened"]:
                marker["issues_opened"].append(number)

        by_id = {step["id"]: step for step in pipeline["steps"]}
        for crew in plan["crews"]:
            step = by_id[crew["step"]]
            step.setdefault("agent", {})["crew"] = crew["name"]
            step["capability"] = crew["capability"]
            card.setdefault("decisions", []).append({
                "id": f"wire-{crew['step']}", "raised_by": "bootstrap",
                "kind": "capability-gap", "chosen": crew["name"],
                "rationale": crew["role"], "confidence": plan["confidence"],
            })
        marker["status"] = "done"
        return "done"


def _fixture():
    pipeline = {
        "id": "pl-rps", "repo": "owner/rps", "workspace": "default",
        "self_enabling": True, "trust": "autonomous", "depth": "deep",
        "approach": "enhanced",
        "steps": [
            {"id": "intent", "type": "agent", "agent": {"name": "intent-agent"}},
            {"id": "requirements", "type": "agent", "agent": {"name": "spec-agent"}},
            {"id": "implement", "type": "agent", "agent": {"name": "impl-agent"}},
        ],
    }
    card = {
        "id": "card-rps", "pipeline_id": "pl-rps", "raw_intent": {
            "text": "make a 3D rock paper scissors game", "captured_at": "2026-09-07T00:00:00Z",
        }, "step_status": {}, "decisions": [],
    }
    plan = {
        "confidence": "HIGH", "irreversible": False,
        "crews": [
            {"name": "dlcyolo-rps-research", "profile": "dlcyolo-readonly",
             "step": "intent", "capability": "readonly", "role": "research"},
            {"name": "dlcyolo-rps-spec", "profile": "dlcyolo-authoring",
             "step": "requirements", "capability": "authoring", "role": "specification"},
            {"name": "dlcyolo-rps-build", "profile": "dlcyolo-builder",
             "step": "implement", "capability": "builder", "role": "implementation"},
        ],
        "tickets": [{"step": "requirements"}, {"step": "implement"}],
    }
    return pipeline, card, plan


def test_unattended_enhanced_flow_replays_without_duplicate_crews_or_issues():
    pipeline, card, plan = _fixture()
    tools = FakeBootstrapTools(
        crews={"dlcyolo-rps-research"},
        issues={"card-rps:requirements"},
    )
    replay = SelfEnablementContractReplay(tools)

    assert replay.setup(pipeline, card) == "enhanced"
    replay.intent(pipeline, card)
    replay.elaborate_steps(pipeline, card)
    assert replay.bootstrap(pipeline, card, plan) == "done"
    first_calls = copy.deepcopy(tools.calls)
    assert replay.bootstrap(pipeline, card, plan) == "already-done"

    assert card["self_enablement_flow"][:4] == ["setup", "intent", "per-step", "bootstrap"]
    assert card["bootstrap"]["status"] == "done"
    assert len([call for call in tools.calls if call[0] == "kirocrew agent create"]) == 2
    assert len([call for call in tools.calls if call[0] == "gh issue create"]) == 1
    assert tools.calls == first_calls
    assert card["intent_card"] is True
    assert pipeline["steps"][0]["addenda"][0]["crew"] == "existing-research"
    assert card["step_status"]["intent"] == "done"
    assert card["event_outbox"][0]["delivery_status"] == "pending"
    assert {step["capability"] for step in pipeline["steps"]} == {
        "readonly", "authoring", "builder",
    }
    create_calls = [call for call in tools.calls if call[0] == "kirocrew agent create"]
    assert all(call[2] == "--kiro-agent" and call[3].startswith("dlcyolo-")
               for call in create_calls)


def test_no_answer_defaults_mid_simplified_and_intent_can_be_skipped():
    pipeline, card, _plan = _fixture()
    pipeline.pop("approach")
    pipeline.update(trust="assisted", depth="quick")
    replay = SelfEnablementContractReplay(FakeBootstrapTools())
    assert replay.setup(pipeline, card, selected=None) == "simplified"
    card.setdefault("trigger_history", []).append({"phase": "intent", "trigger": "skip"})
    replay.elaborate_steps(pipeline, card)
    assert (pipeline["trust"], pipeline["depth"]) == ("assisted", "standard")
    assert set(card["step_modes"].values()) == {"simplified"}
    assert "intent" not in card["step_status"]


@pytest.mark.parametrize("plan_patch", [
    {"confidence": "MEDIUM"},
    {"irreversible": True},
    {"crews": [
        {"name": f"dlcyolo-rps-role-{index}", "profile": "dlcyolo-readonly",
         "step": "intent", "capability": "readonly", "role": "research"}
        for index in range(4)
    ]},
])
def test_autonomous_low_confidence_irreversible_or_over_cap_blocks_without_tools(plan_patch):
    pipeline, card, plan = _fixture()
    plan.update(plan_patch)
    replay = SelfEnablementContractReplay(FakeBootstrapTools())
    replay.setup(pipeline, card)
    replay.intent(pipeline, card)
    replay.elaborate_steps(pipeline, card)
    assert replay.bootstrap(pipeline, card, plan) == "blocked"
    assert replay.tools.calls == []
    assert card["step_status"]["bootstrap"] == "blocked"
    assert card["decisions"][-1]["status"] == "pending-human"


def test_shipped_configs_bind_the_mocked_flow_to_real_tools_profiles_and_contracts():
    orchestrator = _load(AGENTS / "pipeline-orchestrator.json")
    intent = _load(AGENTS / "intent-agent.json")
    prompt = orchestrator["prompt"]
    for clause in (
        "SETUP -> INTENT (skippable) -> PER-STEP ELABORATION -> BOOTSTRAP",
        "DEFAULT MID (assisted+standard, simplified ladder)",
        "card.bootstrap marker",
        "before each create pre-check kirocrew agent list",
        "skip a ticket already opened for this card+step",
        "cap at <=3 newly-created crews",
        "confidence is not HIGH or the plan is irreversible/high-impact",
        "--kiro-agent <profile>",
        "step.agent.crew",
        "step.addenda[]",
    ):
        assert clause in prompt
    assert set(("shell", "kirocrew-core::spawn_run", "kirocrew-core::select_crew")) \
        <= set(orchestrator["allowedTools"])
    allowed = orchestrator["toolsSettings"]["shell"]["allowedCommands"]
    assert "^kirocrew agent (create|list|show) " in allowed
    assert "^gh (issue|label) (create|edit|list|view|comment) " in allowed

    assert {"kirocrew-core::ask_question", "kirocrew-core::spawn_run"} <= set(intent["allowedTools"])
    assert "kirocrew-cron::cron_trigger" not in intent["allowedTools"]
    assert "TERMINAL EVENT BRIDGE" in intent["prompt"]
    assert "event_outbox" in intent["prompt"]
    assert "do NOT call cron_trigger" in intent["prompt"]
    assert "existing roster crew or the default agent" in intent["prompt"].lower()
    assert "RESEARCH ADDENDA" in intent["prompt"]

    profiles = {
        "readonly": _load(AGENTS / "dlcyolo-readonly.json"),
        "authoring": _load(AGENTS / "dlcyolo-authoring.json"),
        "builder": _load(AGENTS / "dlcyolo-builder.json"),
        "coordinator": _load(AGENTS / "dlcyolo-coordinator.json"),
    }
    assert "web_search" in profiles["readonly"]["allowedTools"]
    assert "write" in profiles["authoring"]["allowedTools"]
    assert "shell" in profiles["builder"]["allowedTools"]
    assert "kirocrew-core::select_crew" in profiles["coordinator"]["allowedTools"]
    assert all("kirocrew-cron::cron_trigger" not in profile["allowedTools"]
               for profile in profiles.values())
