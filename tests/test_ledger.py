"""Priority 2 structured ledger observation tests.

The ledger is append-only audit data beside state.json. These tests prove that observing facts
never changes card control flow and that unknown runtime provenance remains explicitly unknown.
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

import pytest

from kiro_crew.cron_script import Report, Skip


def _run(advance_mod, mock_ctx, write_state, state):
    write_state(state)
    with pytest.raises((Skip, Report)) as raised:
        advance_mod.advance(mock_ctx)
    return raised.value


def _pipeline(workspace: str = "default") -> dict:
    return {
        "id": "pl-1", "repo": "owner/repo", "workspace": workspace,
        "trust": "assisted", "depth": "standard",
        "steps": [
            {"id": "requirements", "type": "agent", "capability": "builder",
             "skills": ["pipeline-workflow"],
             "agent": {"tools": ["read", "write"], "crew": "spec-crew"},
             "addenda": [{"id": "security", "crew": "security-crew"}]},
            {"id": "gate-spec", "type": "gate", "reviews_step": "requirements"},
            {"id": "design", "type": "agent", "capability": "authoring"},
        ],
    }


def _valid_events(path: Path) -> list[dict]:
    events = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(item, dict):
            events.append(item)
    return events


class TestLedgerStorage:
    def test_workspace_path_is_scoped_below_state_base(self, advance_mod, state_path):
        path = advance_mod._ledger_path(_pipeline("security/team"))
        assert path == (state_path.parent / "workspaces" / "security-team" /
                        "data" / "ledger" / "events.jsonl")
        assert path.is_relative_to(state_path.parent)

    def test_append_deduplicates_source_and_id_and_preserves_bad_lines(
            self, advance_mod, state_path):
        path = state_path.parent / "workspaces/default/data/ledger/events.jsonl"
        path.parent.mkdir(parents=True)
        path.write_text("{malformed legacy line\n", encoding="utf-8")
        event = advance_mod._ledger_event(
            "/dlc-yolo/pipelines/pl-1/cards/card-1",
            "io.dlcyolo.step.dispatched", "requirements", "2026-09-05T00:00:00Z",
            {"run_id": "run-1"}, "card-1", {"run_id": "run-1"})

        assert advance_mod._append_ledger_events(path, [event, event]) == 1
        assert advance_mod._append_ledger_events(path, [event]) == 0
        assert _valid_events(path) == [event]
        assert path.read_text(encoding="utf-8").startswith("{malformed legacy line\n")


class TestLedgerProjection:
    @staticmethod
    def _observed_state(advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        card = card_factory(
            stage="requirements", step_status={"requirements": "pending"},
            pending_at={"requirements": "2026-09-05T00:00:00Z"},
            step_sessions={"requirements": {
                "cron_id": "job-1", "slot_key": "cron-job-1",
                "session_key": "cron:job-1", "agent": "dlcyolo-builder",
                "at": "2026-09-05T00:00:00Z", "kept": True,
            }},
            runtime_handshakes={"requirements": {
                "tools": ["read", "write", "shell"],
                "skills": ["pipeline-workflow"],
                "model": "model-observed", "provider": "provider-observed",
                "model_version": "v1", "reasoning_effort": "high",
                "network_scope": "disabled",
            }},
            worktree_lease={
                "lease_id": "lease-1", "path": "/worktrees/card-1",
                "branch": "dlc/card-1", "base_commit": "abc123",
                "status": "active", "locked": True,
                "acquired_at": "2026-09-05T00:00:00Z",
            },
            intent_contract={"outcomes": [{"id": "I-1", "text": "private intent"}]},
            decisions=[{"id": "D-1", "kind": "technical-fork",
                        "question": "SECRET QUESTION", "chosen": "a"}],
            interjection=[{"id": "I-1", "step": "requirements", "kind": "feedback",
                           "text": "SECRET INTERJECTION", "status": "pending"}],
            artifacts={"requirements": "/results/requirements.md"},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        return state, card, pipeline

    def test_cloud_events_include_truthful_structured_run_provenance(
            self, advance_mod, state_factory, card_factory):
        state, card, _ = self._observed_state(advance_mod, state_factory, card_factory)
        before = deepcopy(state)
        records = advance_mod._collect_ledger_events(state, "2026-09-05T00:01:00Z")
        assert state == before  # observer never writes authoritative state

        events = [event for _, event in records]
        assert {event["type"] for event in events} >= {
            "io.dlcyolo.envelope.resolved",
            "io.dlcyolo.step.dispatched",
            "io.dlcyolo.routing.observed",
            "io.dlcyolo.worktree.acquired",
        }
        assert all({"specversion", "id", "source", "type", "subject", "time",
                    "correlationid", "datacontenttype", "data"} <= set(event)
                   for event in events)
        assert all(event["specversion"] == "1.0" for event in events)

        routed = next(event for event in events
                      if event["type"] == "io.dlcyolo.routing.observed")
        data = routed["data"]
        assert data["schema_version"] == 1
        assert data["routing"]["model"] == {
            "requested": None, "requested_class": "decision-grade",
            "applied": "model-observed",
            "provider": "provider-observed", "version": "v1",
            "resolution_status": "observed",
        }
        assert data["routing"]["reasoning_effort"]["applied"] == "high"
        assert data["capabilities"]["tools"]["actual"] == ["read", "write", "shell"]
        assert data["capabilities"]["skills"]["loaded"] == ["pipeline-workflow"]
        assert data["worktree"]["lease_id"] == "lease-1"
        acquired = next(event for event in events
                        if event["type"] == "io.dlcyolo.worktree.acquired")
        assert acquired["data"]["worktree"]["lease_id"] == "lease-1"
        assert "path" not in acquired["data"]["worktree"]
        assert "repo_path" not in acquired["data"]["worktree"]
        serialized = json.dumps(events)
        assert "SECRET QUESTION" not in serialized
        assert "SECRET INTERJECTION" not in serialized
        assert "private intent" not in serialized
        assert card["execution_envelope"]["id"] in serialized

    @pytest.mark.parametrize(
        ("status", "timestamp_field", "event_type", "locked"),
        [
            ("quarantined", "quarantined_at",
             "io.dlcyolo.worktree.quarantined", True),
            ("released", "released_at", "io.dlcyolo.worktree.released", False),
        ],
    )
    def test_worktree_terminal_lifecycle_events_are_path_free(
            self, advance_mod, state_factory, card_factory,
            status, timestamp_field, event_type, locked):
        state, card, _ = self._observed_state(advance_mod, state_factory, card_factory)
        card["worktree_lease"].update({
            "status": status,
            "locked": locked,
            timestamp_field: "2026-09-05T00:02:00Z",
            "reason_code": "dirty-worktree" if status == "quarantined" else None,
            "dirty_entry_count": 2 if status == "quarantined" else 0,
            "repo_path": "/primary/private-checkout",
        })

        events = [event for _, event in advance_mod._collect_ledger_events(
            state, "2026-09-05T00:03:00Z")]
        lifecycle = next(event for event in events if event["type"] == event_type)
        worktree = lifecycle["data"]["worktree"]
        assert worktree["status"] == status
        assert worktree["locked"] is locked
        assert "path" not in worktree
        assert "repo_path" not in worktree
        assert "/worktrees/card-1" not in json.dumps(lifecycle)
        assert "/primary/private-checkout" not in json.dumps(lifecycle)

    def test_unknown_model_tools_skills_and_worktree_are_not_fabricated(
            self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        card = card_factory(
            stage="requirements", step_status={"requirements": "pending"},
            pending_at={"requirements": "2026-09-05T00:00:00Z"},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        events = [event for _, event in
                  advance_mod._collect_ledger_events(state, "2026-09-05T00:01:00Z")]
        routed = next(event for event in events
                      if event["type"] == "io.dlcyolo.routing.observed")
        data = routed["data"]
        assert data["routing"]["model"]["applied"] is None
        assert data["routing"]["model"]["resolution_status"] == "unobservable"
        assert data["routing"]["reasoning_effort"]["applied"] is None
        assert data["capabilities"]["tools"]["actual"] == []
        assert data["capabilities"]["tools"]["status"] == "unobservable"
        assert data["capabilities"]["skills"]["loaded"] == []
        assert data["worktree"]["lease_id"] is None
        assert data["worktree"]["observation_status"] == "unobservable"

    def test_nested_handshake_projects_assigned_effective_and_requested_applied_separately(
            self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        card = card_factory(
            stage="requirements", step_status={"requirements": "pending"},
            pending_at={"requirements": "2026-09-05T00:00:00Z"},
            step_sessions={"requirements": {
                "session_key": "cron:job-nested", "slot_key": "cron-job-nested",
                "agent": "dlcyolo-coordinator", "assigned_agent": "dlcyolo-coordinator",
                "at": "2026-09-05T00:00:00Z",
            }},
            runtime_handshakes={"requirements": {
                "schema_version": 1, "step": "requirements",
                "assignment": {
                    "assigned_profile": "dlcyolo-coordinator",
                    "effective_profile": "dlcyolo-builder",
                    "effective_status": "observed", "profile_matches": False,
                },
                "capabilities": {
                    "tools": {
                        "profile_declared": ["kirocrew-core::select_crew"],
                        "step_declared": ["read"],
                        "required": ["kirocrew-core::select_crew"],
                        "actual": ["read", "kirocrew-core::select_crew"],
                        "status": "observed",
                    },
                    "skills": {
                        "profile_declared": ["skill://pipeline-workflow"],
                        "step_declared": ["pipeline-workflow"],
                        "required": ["pipeline-workflow"],
                        "actual": ["pipeline-workflow"], "status": "observed",
                    },
                },
                "routing": {
                    "model": {"requested": "auto", "applied": "model-concrete",
                              "provider": "provider-x", "version": "v2"},
                    "reasoning_effort": {"requested": "high", "applied": "medium"},
                },
                "scope": {
                    "network": {"declared": "restricted", "actual": "disabled",
                                "status": "observed"},
                    "write": {"declared": {"owned_repository": "owner/repo"},
                              "actual": "/worktrees/card-1", "status": "observed"},
                },
                "delegation": {
                    "required": True, "fallback_policy": "delegated-or-blocked",
                    "outcome": "delegated", "child_run_ids": ["child-1"],
                },
            }},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")

        run = advance_mod._run_projection(
            state, card, pipeline, "requirements",
            card["step_sessions"]["requirements"], card["execution_envelope"],
            "pending", "2026-09-05T00:01:00Z")

        assert run["assignment"]["requested_profile"] == "dlcyolo-coordinator"
        assert run["assignment"]["applied_profile"] == "dlcyolo-builder"
        assert run["assignment"]["application_status"] == "observed"
        assert run["assignment"]["profile_matches"] is False
        assert run["assignment"]["execution_mode"] == "delegated"
        assert run["capabilities"]["tools"]["actual"] == [
            "read", "kirocrew-core::select_crew"]
        assert run["capabilities"]["skills"]["loaded"] == ["pipeline-workflow"]
        assert run["capabilities"]["network"]["actual"] == "disabled"
        assert run["routing"]["model"]["requested"] is None
        assert run["routing"]["model"]["applied"] == "model-concrete"
        assert run["routing"]["model"]["resolution_status"] == "observed"
        assert run["routing"]["reasoning_effort"] == {
            "requested": "high", "applied": "medium", "resolution_status": "mismatch"}

    def test_done_to_advanced_reconciliation_keeps_one_terminal_event_identity(
            self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        card = card_factory(
            stage="requirements", step_status={"requirements": "done"},
            pending_at={"requirements": "2026-09-05T00:00:00Z"},
            step_sessions={"requirements": {
                "session_key": "cron:job-1", "slot_key": "cron-job-1",
                "agent": "dlcyolo-builder", "at": "2026-09-05T00:00:00Z",
            }},
            updated_at="2026-09-05T00:02:00Z",
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        first = [event for _, event in
                 advance_mod._collect_ledger_events(state, "2026-09-05T00:02:00Z")
                 if event["type"] == "io.dlcyolo.step.completed"]
        assert len(first) == 1
        assert first[0]["data"]["run"]["terminal"]["status"] == "done"

        card["step_status"]["requirements"] = "advanced"
        card["history"] = [{"from": "requirements", "to": "gate-spec",
                            "at": "2026-09-05T00:03:00Z"}]
        second = [event for _, event in
                  advance_mod._collect_ledger_events(state, "2026-09-05T00:03:00Z")
                  if event["type"] == "io.dlcyolo.step.completed"]
        assert len(second) == 1
        assert second[0]["id"] == first[0]["id"]
        assert second[0]["data"]["run"]["terminal"]["status"] == "advanced"

    def test_retention_release_and_successor_receipt_are_observed(
            self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        card = card_factory(
            stage="design",
            step_status={"requirements": "advanced", "gate-spec": "advanced",
                         "design": "pending"},
            pending_at={"requirements": "2026-09-05T00:00:00Z",
                        "design": "2026-09-05T00:05:00Z"},
            step_sessions={"requirements": {
                "session_key": "cron:producer", "slot_key": "cron-producer",
                "agent": "dlcyolo-builder", "at": "2026-09-05T00:00:00Z",
                "retention": "released", "retained_for_gate": "gate-spec",
                "retained_at": "2026-09-05T00:02:00Z", "release_after": "design",
                "retention_released_at": "2026-09-05T00:06:00Z",
            }},
            successor_receipts={"gate-spec": {
                "producer_step": "requirements", "successor_step": "design",
                "received_at": "2026-09-05T00:05:30Z",
            }},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        events = [event for _, event in
                  advance_mod._collect_ledger_events(state, "2026-09-05T00:07:00Z")]
        retained = next(event for event in events
                        if event["type"] == "io.dlcyolo.session.retained")
        released = next(event for event in events
                        if event["type"] == "io.dlcyolo.session.released")
        assert retained["data"]["retention"] == "held-for-gate"
        assert released["data"]["retention"] == "released"
        assert released["data"]["successor_receipt"]["successor_step"] == "design"
        assert released["causationid"] == retained["id"]

    def test_gate_wait_and_revision_specific_decision_record_duration(
            self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        card = card_factory(
            stage="gate-spec", step_status={"requirements": "advanced"},
            history=[{"from": "requirements", "to": "gate-spec",
                      "at": "2026-09-05T00:01:00Z"}],
            gate_review={"result_revision": 3, "status": "awaiting-review"},
            step_sessions={"requirements": {
                "slot_key": "cron-producer", "session_key": "cron:producer",
                "retention": "held-for-gate", "retained_for_gate": "gate-spec",
                "retained_at": "2026-09-05T00:01:00Z",
            }},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        waiting = [event for _, event in
                   advance_mod._collect_ledger_events(state, "2026-09-05T00:02:00Z")
                   if event["type"] == "io.dlcyolo.gate.waiting"]
        assert len(waiting) == 1
        assert waiting[0]["data"]["producer_step"] == "requirements"
        assert waiting[0]["data"]["result_revision"] == 3

        card["step_status"]["gate-spec"] = "approved"
        card["gate_history"] = [{
            "gate": "gate-spec", "decision": "approved", "actor": "user",
            "result_revision": 3, "command_id": "ui-approve-3",
            "at": "2026-09-05T00:02:00Z",
        }]
        decided = [event for _, event in
                   advance_mod._collect_ledger_events(state, "2026-09-05T00:02:00Z")
                   if event["type"] == "io.dlcyolo.gate.approved"]
        assert len(decided) == 1
        assert decided[0]["data"]["target_revision"] == 3
        assert decided[0]["data"]["gate_wait_ms"] == 60_000
    def test_gate_interjection_emits_revision_and_handled_facts_without_text(
            self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        card = card_factory(
            stage="gate-spec", step_status={"requirements": "advanced"},
            history=[{"from": "requirements", "to": "gate-spec",
                      "at": "2026-09-05T00:01:00Z"}],
            interjection=[{
                "id": "ui-revise-3", "at": "2026-09-05T00:02:00Z",
                "step": "gate-spec", "kind": "feedback", "by": "user",
                "text": "SENSITIVE REVISION TEXT", "result_revision": 3,
                "status": "handled", "handled_by_run_id": "run-revision-4",
                "handled_at": "2026-09-05T00:03:00Z",
            }],
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        events = [event for _, event in
                  advance_mod._collect_ledger_events(state, "2026-09-05T00:04:00Z")]
        raised = next(event for event in events
                      if event["type"] == "io.dlcyolo.interjection.raised")
        revision = next(event for event in events
                        if event["type"] == "io.dlcyolo.gate.revision-requested")
        handled = next(event for event in events
                       if event["type"] == "io.dlcyolo.interjection.handled")
        assert raised["data"]["base_result_revision"] == 3
        assert raised["data"]["content_ref"].endswith("/ui-revise-3")
        assert revision["causationid"] == raised["id"]
        assert handled["causationid"] == raised["id"]
        assert handled["data"]["handled_by_run_id"] == "run-revision-4"
        assert "SENSITIVE REVISION TEXT" not in json.dumps(events)

    def test_autonomous_gate_crossing_without_ui_history_is_still_observed(
            self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        card = card_factory(
            stage="design",
            step_status={"requirements": "advanced", "gate-spec": "advanced"},
            history=[
                {"from": "requirements", "to": "gate-spec",
                 "at": "2026-09-05T00:01:00Z"},
                {"from": "gate-spec", "to": "design",
                 "at": "2026-09-05T00:02:00Z", "agent": "advance-cron"},
            ],
            gate_history=[],
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        approved = [event for _, event in
                    advance_mod._collect_ledger_events(state, "2026-09-05T00:03:00Z")
                    if event["type"] == "io.dlcyolo.gate.approved"]
        assert len(approved) == 1
        assert approved[0]["data"]["actor"] == "advance-cron"
        assert approved[0]["data"]["observed_from_transition"] is True
        assert approved[0]["data"]["gate_wait_ms"] == 60_000
    def test_gate_result_readiness_rejected_command_and_replacement_are_durable_facts(
            self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        card = card_factory(
            stage="gate-spec", step_status={"requirements": "advanced"},
            gate_review={
                "gate": "gate-spec", "producer_step": "requirements",
                "envelope_id": "env-9", "result_revision": 9,
                "status": "awaiting-review", "created_at": "2026-09-05T00:01:00Z",
                "review_ready_at": "2026-09-05T00:02:00Z",
                "bundle": {
                    "summary": "SENSITIVE SUMMARY",
                    "artifacts": [{"id": "artifact-9", "path": "/results/r9.md"}],
                    "card_topology": {"action": "keep-unified", "children": []},
                },
            },
            gate_commands=[{
                "id": "stale-8", "gate": "gate-spec", "action": "approve",
                "expected_revision": 8, "actor": "user", "at": "2026-09-05T00:02:00Z",
                "status": "rejected", "rejection_reason": "revision-mismatch",
                "processed_at": "2026-09-05T00:02:01Z", "text": "SECRET COMMAND TEXT",
            }],
            session_replacements=[{
                "producer_step": "requirements", "gate": "gate-spec",
                "base_result_revision": 8,
                "replacement_for": {"session_key": "cron:gone", "cron_id": "gone"},
                "replacement": {"session_key": "cron:new", "cron_id": "new"},
                "continuity_loss": "retained-session-unavailable",
                "at": "2026-09-05T00:02:02Z",
            }],
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        events = [event for _, event in
                  advance_mod._collect_ledger_events(state, "2026-09-05T00:03:00Z")]
        by_type = {event["type"]: event for event in events}

        assert by_type["io.dlcyolo.step.result-published"]["data"]["result_revision"] == 9
        assert by_type["io.dlcyolo.gate.review-ready"]["causationid"] == \
            by_type["io.dlcyolo.step.result-published"]["id"]
        assert by_type["io.dlcyolo.gate.command-rejected"]["data"]["rejection_reason"] == \
            "revision-mismatch"
        assert by_type["io.dlcyolo.session.replaced"]["data"]["replacement"]["cron_id"] == "new"
        serialized = json.dumps(events)
        assert "SENSITIVE SUMMARY" not in serialized
        assert "SECRET COMMAND TEXT" not in serialized
    def test_priority5_events_reference_sensitive_state_without_emitting_prose(
            self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        pipeline["depth"] = "deep"
        card = card_factory(
            stage="requirements", step_status={"requirements": "blocked"},
            raw_intent={"text": "SECRET RAW INTENT", "source_ref": "session://s/m"},
            raw_intent_mutation_attempts=[{
                "fingerprint": "sha256-attempt", "at": "2026-09-05T00:00:10Z"}],
            intent_contract={
                "version": 2, "status": "active", "raw_prompt_ref": "session://s/m",
                "created_at": "2026-09-05T00:00:00Z", "research_required": True,
                "outcomes": [{"id": "I-1", "text": "SECRET OUTCOME", "enforcement": "required"}],
            },
            decisions=[{
                "id": "D-1", "step": "requirements", "kind": "intent-fidelity",
                "question": "SECRET QUESTION", "chosen": "SECRET ANSWER",
                "at": "2026-09-05T00:01:00Z", "resolved_at": "2026-09-05T00:02:00Z",
            }],
            research_artifacts={"requirements": [{
                "id": "RS-1", "question": "SECRET QUERY", "completed_at": "2026-09-05T00:03:00Z",
                "findings": [{"id": "F-1", "claim": "SECRET CLAIM", "source_ids": ["S-1"]}],
                "sources": [{"id": "S-1", "url": "https://private.example/secret",
                             "title": "SECRET TITLE", "accessed_at": "2026-09-05T00:02:30Z",
                             "source_type": "primary"}],
            }]},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:30Z")
        envelope_id = card["execution_envelope"]["id"]
        card["intent_fidelity"] = [{
            "step": "requirements", "envelope_id": envelope_id,
            "status": "drifted", "missing_intent_ids": ["I-1"],
            "at": "2026-09-05T00:04:00Z",
        }]

        events = [event for _, event in
                  advance_mod._collect_ledger_events(state, "2026-09-05T00:05:00Z")]
        event_types = {event["type"] for event in events}
        assert {
            "io.dlcyolo.intent.normalized", "io.dlcyolo.intent.drifted",
            "io.dlcyolo.intent.integrity-violation",
            "io.dlcyolo.question.raised", "io.dlcyolo.question.resolved",
            "io.dlcyolo.research.completed",
        } <= event_types
        research = next(event for event in events
                        if event["type"] == "io.dlcyolo.research.completed")
        assert research["data"]["finding_ids"] == ["F-1"]
        assert research["data"]["source_ids"] == ["S-1"]
        assert research["data"]["artifact_ref"].endswith("/requirements/0")
        serialized = json.dumps(events)
        for secret in (
                "SECRET RAW INTENT", "SECRET OUTCOME", "SECRET QUESTION", "SECRET ANSWER",
                "SECRET QUERY", "SECRET CLAIM", "SECRET TITLE", "private.example"):
            assert secret not in serialized

    def test_required_research_budget_conflict_emits_envelope_infeasible(
            self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        card = card_factory(
            stage="requirements",
            budget={"compute": {"max_research_passes": 0}},
            intent_contract={"version": 1, "research_required": True, "outcomes": []},
        )
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-05T00:00:00Z")
        events = [event for _, event in
                  advance_mod._collect_ledger_events(state, "2026-09-05T00:01:00Z")]
        infeasible = next(event for event in events
                          if event["type"] == "io.dlcyolo.envelope.infeasible")
        assert infeasible["data"]["reason_codes"] == [
            "required research exceeds max_research_passes=0"]


class TestLedgerRuntimeIntegration:
    def test_dispatch_writes_ledger_beside_state_without_adding_state_authority(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state):
        mock_ctx.call_tool.return_value = {"id": "job-ledger"}
        pipeline = _pipeline("default")
        pipeline["steps"][0]["capability"] = "coordinator"
        card = card_factory(stage="requirements", step_status={})
        _run(advance_mod, mock_ctx, write_state,
             state_factory(cards=[card], pipelines=[pipeline]))

        out = read_state()["cards"][0]
        assert out["step_status"]["requirements"] == "pending"
        assert "ledger" not in out
        path = advance_mod._ledger_path(pipeline)
        events = _valid_events(path)
        assert {event["type"] for event in events} >= {
            "io.dlcyolo.envelope.resolved",
            "io.dlcyolo.step.dispatched",
            "io.dlcyolo.routing.observed",
        }
        count = len(events)
        assert advance_mod._record_ledger_observations(
            read_state(), "2026-09-05T00:10:00Z") == 0
        assert len(_valid_events(path)) == count

    def test_ledger_failure_is_fail_open_and_does_not_change_dispatch(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state, monkeypatch):
        def _broken(*_args, **_kwargs):
            raise OSError("ledger unavailable")

        monkeypatch.setattr(advance_mod, "_record_ledger_observations", _broken)
        card = card_factory(stage="requirements", step_status={})
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"]["requirements"] == "pending"
        assert any(call.args[:2] == ("kirocrew-cron", "cron_add")
                   for call in mock_ctx.call_tool.call_args_list)
