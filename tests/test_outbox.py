"""Priority 7 transactional terminal-outbox contracts."""

from __future__ import annotations

import json

import pytest

from kiro_crew.cron_script import Report


def _terminal_state(state_factory, card_factory, *, status="done", outbox=None):
    pipeline = {
        "id": "pl-1", "repo": "owner/repo", "workspace": "default",
        "steps": [
            {"id": "requirements", "type": "agent"},
            {"id": "gate-spec", "type": "gate"},
        ],
    }
    card = card_factory(
        title="private card prose must not leak",
        stage="requirements",
        step_status={"requirements": status},
        pending_at={"requirements": "2026-09-05T00:00:00Z"},
        step_sessions={"requirements": {
            "cron_id": "job-1", "session_key": "cron:job-1",
            "at": "2026-09-05T00:00:00Z",
        }},
        result_bundles={"requirements": {"summary": "private result prose"}},
    )
    if outbox is not None:
        card["event_outbox"] = outbox
    return state_factory(cards=[card], pipelines=[pipeline]), card


class TestTerminalOutbox:
    def test_polling_recovers_missing_terminal_marker(
            self, advance_mod, state_factory, card_factory):
        state, card = _terminal_state(state_factory, card_factory)

        assert advance_mod._ensure_terminal_outbox(state, "2026-09-05T00:01:00Z") is True

        [record] = card["event_outbox"]
        assert record["schema_version"] == 1
        assert record["type"] == "io.dlcyolo.step.completed"
        assert record["terminal_status"] == "completed"
        assert record["delivery_status"] == "pending"
        assert record["id"].startswith("evt-")
        assert advance_mod._ensure_terminal_outbox(
            state, "2026-09-05T00:02:00Z") is False

    def test_provisional_marker_is_canonicalized_without_duplication(
            self, advance_mod, state_factory, card_factory):
        provisional = {
            "schema_version": 1,
            "step": "requirements",
            "terminal_status": "completed",
            "delivery_status": "pending",
            "created_at": "2026-09-05T00:00:30Z",
            "trigger_requested_at": "2026-09-05T00:00:31Z",
        }
        state, card = _terminal_state(
            state_factory, card_factory, outbox=[provisional])

        assert advance_mod._ensure_terminal_outbox(state, "2026-09-05T00:01:00Z") is True

        [record] = card["event_outbox"]
        assert record is provisional
        assert record["id"].startswith("evt-")
        assert record["subject"] == "requirements"
        assert record["created_at"] == "2026-09-05T00:00:30Z"
        assert record["trigger_requested_at"] == "2026-09-05T00:00:31Z"

    def test_nonterminal_and_mismatched_markers_are_rejected(
            self, advance_mod, state_factory, card_factory):
        bad = {
            "schema_version": 1,
            "id": "evt-forged",
            "type": "io.dlcyolo.step.completed",
            "source": "/dlc-yolo/pipelines/pl-1/cards/card-1",
            "subject": "requirements",
            "run_id": "run-forged",
            "terminal_status": "blocked",
            "delivery_status": "pending",
        }
        state, card = _terminal_state(
            state_factory, card_factory, status="pending", outbox=[bad])

        assert advance_mod._ensure_terminal_outbox(state, "2026-09-05T00:01:00Z") is True
        assert card["event_outbox"] == []
        assert advance_mod._pending_outbox_events(state) == []

    def test_consumed_event_is_not_replayed(
            self, advance_mod, state_factory, card_factory):
        state, card = _terminal_state(state_factory, card_factory)
        now = "2026-09-05T00:01:00Z"
        advance_mod._ensure_terminal_outbox(state, now)
        [event] = advance_mod._pending_outbox_events(state)

        assert advance_mod._mark_outbox_consumed(
            state, event["id"], now, handler="terminal-step") is True
        assert advance_mod._mark_outbox_consumed(
            state, event["id"], now, handler="terminal-step") is False
        assert advance_mod._pending_outbox_events(state) == []
        assert card["event_outbox"][0]["consumed_by"] == "terminal-step"
        assert advance_mod._ensure_terminal_outbox(state, "2026-09-05T00:02:00Z") is False

    def test_consumed_history_is_bounded_but_current_receipt_is_retained(
            self, advance_mod, state_factory, card_factory):
        state, card = _terminal_state(state_factory, card_factory)
        now = "2026-09-05T00:01:00Z"
        advance_mod._ensure_terminal_outbox(state, now)
        current = card["event_outbox"][0]
        current.update({"delivery_status": "consumed", "consumed_at": now,
                        "consumed_by": "terminal-step"})
        source = current["source"]
        old = []
        for index in range(advance_mod._OUTBOX_RETAIN_CONSUMED + 7):
            subject = f"old-step-{index}"
            run_id = f"run-old-{index}"
            event_type = "io.dlcyolo.step.completed"
            old.append({
                "schema_version": 1,
                "id": advance_mod._ledger_event_id(
                    source, event_type, subject, {"run_id": run_id}),
                "type": event_type, "source": source, "subject": subject,
                "time": now, "correlation_id": card["id"], "run_id": run_id,
                "terminal_status": "completed", "observed_status": "done",
                "delivery_status": "consumed", "created_at": now,
                "detected_at": now, "consumed_at": now,
                "consumed_by": "terminal-step",
            })
        card["event_outbox"].extend(old)

        assert advance_mod._ensure_terminal_outbox(state, "2026-09-05T00:02:00Z") is True
        consumed = card["event_outbox"]
        assert current in consumed
        assert len(consumed) == advance_mod._OUTBOX_RETAIN_CONSUMED + 1
        assert consumed[-1]["run_id"] == old[-1]["run_id"]

    def test_marker_contains_no_card_or_result_prose(
            self, advance_mod, state_factory, card_factory):
        state, card = _terminal_state(state_factory, card_factory, status="blocked")
        advance_mod._ensure_terminal_outbox(state, "2026-09-05T00:01:00Z")

        encoded = json.dumps(card["event_outbox"], sort_keys=True)
        assert "private card prose" not in encoded
        assert "private result prose" not in encoded
        assert "io.dlcyolo.step.blocked" in encoded


    def test_dispatch_bound_failure_retains_pending_marker_for_poll_replay(
            self, advance_mod, mock_ctx, state_factory, card_factory,
            write_state, read_state, monkeypatch):
        state, _ = _terminal_state(state_factory, card_factory)
        write_state(state)

        def overflow(_self, _state):
            raise RuntimeError("local event dispatch cap exceeded (1)")

        monkeypatch.setattr(advance_mod._LocalEventBus, "run", overflow)
        with pytest.raises(Report, match="event bridge blocked"):
            advance_mod.advance(mock_ctx)

        recovered = read_state()
        card = recovered["cards"][0]
        [record] = card["event_outbox"]
        assert card["stage"] == "requirements"
        assert card["step_status"]["requirements"] == "done"
        assert record["delivery_status"] == "pending"
        assert recovered["event_dispatch_error"]["pending_event_ids"] == [record["id"]]


    def test_outbox_and_audit_ledger_share_terminal_event_identity(
            self, advance_mod, state_factory, card_factory):
        state, card = _terminal_state(state_factory, card_factory)
        now = "2026-09-05T00:01:00Z"
        advance_mod._ensure_terminal_outbox(state, now)
        marker = card["event_outbox"][0]
        terminal, _ = advance_mod._terminal_ledger_event(
            state, card, state["pipelines"][0], "requirements", "done", now)
        observed = [event for _path, event in advance_mod._collect_ledger_events(state, now)
                    if event["type"] == "io.dlcyolo.step.completed"]

        assert marker["id"] == terminal["id"]
        assert [event["id"] for event in observed] == [marker["id"]]
