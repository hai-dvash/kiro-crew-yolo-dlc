"""Master Priority 10 — secure GitHub webhook ingress regressions."""

from __future__ import annotations

import copy
import hashlib
import hmac
import json
from pathlib import Path
from unittest import mock

import pytest

import dlc_yolo_webhook as webhook

_SECRET = "priority10-test-secret"
_REPO = "owner/repo"
_NOW = "2026-09-06T01:00:00Z"


def _headers(body: bytes, *, delivery="delivery-1", event="issues", secret=_SECRET):
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return {
        "Content-Type": "application/json",
        "X-GitHub-Delivery": delivery,
        "X-GitHub-Event": event,
        "X-Hub-Signature-256": f"sha256={digest}",
    }


def _body(action="opened", *, issue=42, labels=None, author="payload-is-untrusted"):
    return json.dumps({
        "action": action,
        "repository": {"full_name": _REPO},
        "issue": {
            "number": issue,
            "title": "UNTRUSTED payload title",
            "body": "UNTRUSTED payload body",
            "user": {"login": author},
            "labels": [{"name": item} for item in (labels or [])],
        },
        "sender": {"login": "untrusted-sender"},
        **({"label": {"name": labels[-1]}} if action in {"labeled", "unlabeled"} and labels else {}),
    }, sort_keys=True, separators=(",", ":")).encode()


def _admit(action="opened", *, issue=42, labels=None, delivery="delivery-1"):
    raw = _body(action, issue=issue, labels=labels)
    status, reason, record = webhook.admit_delivery(
        raw, _headers(raw, delivery=delivery), _NOW,
        secret=_SECRET, repositories={_REPO},
    )
    assert (status, reason) == (202, "accepted")
    assert record is not None
    return record


@pytest.fixture(autouse=True)
def _configured(monkeypatch, tmp_path: Path):
    monkeypatch.setenv(webhook.SECRET_ENV, _SECRET)
    monkeypatch.setenv(webhook.REPOSITORIES_ENV, _REPO)
    monkeypatch.setenv(webhook.INBOX_ENV, str(tmp_path / "inbox.json"))


def test_signature_is_raw_body_sha256_only_and_constant_time_compatible():
    raw = _body()
    signature = _headers(raw)[webhook.SIGNATURE_HEADER]
    assert webhook.verify_github_signature(raw, signature, _SECRET) is True
    assert webhook.verify_github_signature(raw + b"\n", signature, _SECRET) is False
    sha1 = hmac.new(_SECRET.encode(), raw, hashlib.sha1).hexdigest()
    assert webhook.verify_github_signature(raw, f"sha1={sha1}", _SECRET) is False
    assert webhook.verify_github_signature(raw, "", _SECRET) is False


def test_nothing_is_parsed_before_hmac_and_body_is_bounded():
    malformed = b"{not-json"
    unsigned = {
        "Content-Type": "application/json",
        "X-GitHub-Delivery": "delivery-1",
        "X-GitHub-Event": "issues",
        "X-Hub-Signature-256": "sha256=" + "0" * 64,
    }
    assert webhook.admit_delivery(
        malformed, unsigned, _NOW, secret=_SECRET, repositories={_REPO})[:2] == (
            401, "signature-mismatch")
    signed = _headers(malformed)
    assert webhook.admit_delivery(
        malformed, signed, _NOW, secret=_SECRET, repositories={_REPO})[:2] == (
            400, "malformed-json")
    huge = b"x" * (webhook.MAX_BODY_BYTES + 1)
    assert webhook.admit_delivery(
        huge, {}, _NOW, secret=_SECRET, repositories={_REPO})[:2] == (
            413, "body-too-large")


def test_repository_event_action_and_content_type_allowlists_fail_closed():
    raw = _body("edited")
    assert webhook.admit_delivery(
        raw, _headers(raw), _NOW, secret=_SECRET, repositories={_REPO})[:2] == (
            403, "action-not-allowed")

    foreign = json.loads(_body())
    foreign["repository"]["full_name"] = "other/repo"
    foreign_raw = json.dumps(foreign, sort_keys=True, separators=(",", ":")).encode()
    assert webhook.admit_delivery(
        foreign_raw, _headers(foreign_raw), _NOW,
        secret=_SECRET, repositories={_REPO})[:2] == (
            403, "repository-not-allowed")

    headers = _headers(_body())
    headers["Content-Type"] = "text/plain"
    assert webhook.admit_delivery(
        _body(), headers, _NOW, secret=_SECRET, repositories={_REPO})[:2] == (
            415, "content-type-not-allowed")


def test_normalized_record_is_minimal_sealed_and_contains_no_payload_prose():
    record = _admit(labels=["dlc:requirements"], delivery="privacy-1")
    assert webhook.verify_record(record, _SECRET) is True
    assert set(record) == {
        "schema_version", "delivery_id", "event", "action", "event_type",
        "repository", "issue_number", "label", "received_at", "payload_sha256",
        "receipt_hmac",
    }
    serialized = json.dumps(record)
    for forbidden in ("UNTRUSTED payload title", "UNTRUSTED payload body",
                      "untrusted-sender", "payload-is-untrusted"):
        assert forbidden not in serialized
    tampered = dict(record, issue_number=43)
    assert webhook.verify_record(tampered, _SECRET) is False

    malformed_time = dict(record, received_at="not-rfc3339")
    malformed_time["receipt_hmac"] = webhook.seal_record(malformed_time, _SECRET)
    assert webhook.verify_record(malformed_time, _SECRET) is False

    unexpected_label = dict(record, label="dlc:design")
    unexpected_label["receipt_hmac"] = webhook.seal_record(unexpected_label, _SECRET)
    assert webhook.verify_record(unexpected_label, _SECRET) is False

    labeled = _admit("labeled", labels=["dlc:requirements"], delivery="privacy-label-1")
    missing_label = dict(labeled, label=None)
    missing_label["receipt_hmac"] = webhook.seal_record(missing_label, _SECRET)
    assert webhook.verify_record(missing_label, _SECRET) is False


def test_ping_is_authenticated_but_not_queued():
    raw = json.dumps({"zen": "hello", "repository": {"full_name": _REPO}}).encode()
    status, reason, record = webhook.admit_delivery(
        raw, _headers(raw, event="ping"), _NOW,
        secret=_SECRET, repositories={_REPO})
    assert (status, reason, record) == (200, "pong", None)


def test_durable_inbox_deduplicates_refuses_overflow_and_finalizes(tmp_path, monkeypatch):
    path = tmp_path / "inbox.json"
    first = _admit(delivery="inbox-1")
    second = _admit(issue=43, delivery="inbox-2")
    monkeypatch.setattr(webhook, "MAX_PENDING", 1)

    assert webhook.enqueue_delivery(first, path) == {"status": "accepted", "depth": 1}
    assert webhook.enqueue_delivery(first, path) == {"status": "duplicate", "depth": 1}
    assert webhook.enqueue_delivery(second, path) == {"status": "full", "depth": 1}
    assert webhook.pending_deliveries(path) == [{**first, "attempts": 0}]

    assert webhook.finalize_deliveries(
        {"inbox-1": {"status": "retry", "reason": "gh-unavailable"}}, _NOW, path
    ) == {"pending": 1, "completed": 0}
    assert webhook.pending_deliveries(path)[0]["attempts"] == 1
    assert webhook.finalize_deliveries(
        {"inbox-1": {"status": "applied", "reason": "card-created"}}, _NOW, path
    ) == {"pending": 0, "completed": 1}
    assert webhook.enqueue_delivery(first, path)["status"] == "duplicate"
    assert webhook.inbox_status(path) == {
        "schema_version": 1, "pending": 0, "processed": 1,
    }


def test_corrupt_or_symlinked_inbox_fails_closed(tmp_path):
    corrupt = tmp_path / "inbox.json"
    corrupt.write_text("not-json", encoding="utf-8")
    with pytest.raises(webhook.InboxError, match="inbox-corrupt"):
        webhook.enqueue_delivery(_admit(delivery="corrupt-1"), corrupt)

    real = tmp_path / "real.json"
    real.write_text(json.dumps({"schema_version": 1, "pending": [], "processed": []}))
    link = tmp_path / "linked.json"
    link.symlink_to(real)
    with pytest.raises(webhook.InboxError, match="inbox-open-failed"):
        webhook.inbox_status(link)


def _pipeline():
    return {
        "id": "pl-1", "repo": _REPO, "trust": "assisted", "depth": "standard",
        "trusted_authors": ["trusted-user"],
        "steps": [
            {"id": "requirements", "type": "agent", "capability": "authoring"},
            {"id": "design", "type": "agent", "capability": "authoring"},
        ],
    }


def _gh_result(issue=42, *, author="trusted-user", state="OPEN", labels=None,
               title="Authoritative title"):
    payload = {
        "number": issue, "title": title,
        "url": f"https://github.com/{_REPO}/issues/{issue}",
        "state": state,
        "labels": [{"name": item} for item in (labels or [])],
        "author": {"login": author},
    }
    return mock.Mock(returncode=0, stdout=json.dumps(payload), stderr="")


def _cycle():
    return {
        "moved": [], "waiting_gates": [], "max_escalations": 2, "max_moves": 3,
        "escalations": 0, "moves": 0, "scheduler_dirty": False,
        "scheduler_control_changed": False, "webhook_results": {},
    }


def test_authoritative_refetch_creates_card_and_ignores_payload_identity(
        advance_mod, mock_ctx, state_factory, monkeypatch):
    state = state_factory(cards=[], pipelines=[_pipeline()],
                          config={"trust": "assisted", "depth": "standard"})
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        labels=["dlc:requirements"]))
    record = _admit(labels=["dlc:requirements"], delivery="create-1")

    changed, status, reason, card_id = advance_mod._apply_github_webhook(
        mock_ctx, state, record, _NOW, _cycle())

    assert (changed, status, reason) == (True, "applied", "card-created")
    card = state["cards"][0]
    assert card["id"] == card_id
    assert card["title"] == "Authoritative title"
    assert card["stage"] == "requirements"
    assert card["pipeline_id"] == "pl-1"
    assert card["guard"]["passed"] is True
    assert card["guard"]["author"] == "trusted-user"


def test_untrusted_author_is_rejected_and_existing_card_is_guard_blocked(
        advance_mod, mock_ctx, state_factory, card_factory, monkeypatch):
    card = card_factory(
        pipeline_id="pl-1", stage="requirements", step_status={},
        source={"type": "github", "repo": _REPO, "issue": 42,
                "url": f"https://github.com/{_REPO}/issues/42"},
    )
    state = state_factory(cards=[card], pipelines=[_pipeline()])
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        author="foreign-user", labels=["dlc:requirements"]))

    changed, status, reason, _ = advance_mod._apply_github_webhook(
        mock_ctx, state, _admit(delivery="foreign-1"), _NOW, _cycle())

    assert (changed, status, reason) == (True, "rejected", "author-not-trusted")
    assert card["guard"]["passed"] is False
    assert card["step_status"]["requirements"] == "blocked"
    assert card["block_reason"]["requirements"] == "ownership guard failed"


def test_refetched_stage_change_moves_only_through_reconciler(
        advance_mod, mock_ctx, state_factory, card_factory, monkeypatch):
    card = card_factory(
        pipeline_id="pl-1", stage="requirements", step_status={},
        source={"type": "github", "repo": _REPO, "issue": 42,
                "url": f"https://github.com/{_REPO}/issues/42"},
    )
    state = state_factory(cards=[card], pipelines=[_pipeline()])
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        labels=["dlc:design"]))
    record = _admit("labeled", labels=["dlc:design"], delivery="move-1")
    cycle = _cycle()

    changed, status, reason, _ = advance_mod._apply_github_webhook(
        mock_ctx, state, record, _NOW, cycle)
    assert (changed, status, reason) == (True, "applied", "stage-change-queued")
    assert card["stage"] == "requirements"
    assert card["github_transition"]["target_step"] == "design"

    assert advance_mod._reconcile_github_transitions(
        mock_ctx, state, "2026-09-06T01:00:01Z", cycle) is True
    assert card["stage"] == "design"
    assert card["step_status"]["design"] == ""
    assert card["history"][-1]["agent"] == "github-webhook"
    assert "github_transition" not in card


def test_inflight_external_move_revokes_writes_and_retains_permit_until_terminal(
        advance_mod, mock_ctx, state_factory, card_factory, monkeypatch):
    card = card_factory(
        pipeline_id="pl-1", stage="requirements",
        step_status={"requirements": "pending"},
        pending_at={"requirements": _NOW},
        step_sessions={"requirements": {
            "cron_id": "job-live", "at": _NOW, "writes_allowed": True,
        }},
        source={"type": "github", "repo": _REPO, "issue": 42,
                "url": f"https://github.com/{_REPO}/issues/42"},
    )
    state = state_factory(cards=[card], pipelines=[_pipeline()])
    node, _ = advance_mod._scheduler_node(card, "requirements", _NOW)
    node.update({
        "status": "running", "permit_id": "permit-live",
        "permit_acquired_at": _NOW, "session_started_at": _NOW,
    })
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        labels=["dlc:design"]))
    record = _admit("labeled", labels=["dlc:design"], delivery="cancel-move-1")
    cycle = _cycle()
    advance_mod._apply_github_webhook(mock_ctx, state, record, _NOW, cycle)

    assert advance_mod._reconcile_github_transitions(
        mock_ctx, state, "2026-09-06T01:00:01Z", cycle) is True
    pointer = card["step_sessions"]["requirements"]
    assert pointer["writes_allowed"] is False
    assert pointer["cancel_requested_at"] == "2026-09-06T01:00:01Z"
    assert card["stage"] == "requirements"
    assert card["github_transition"]["status"] == "cancelling"

    advance_mod._scheduler_reconcile_nodes(state, "2026-09-06T01:00:02Z")
    advance_mod._scheduler_plan(state, "2026-09-06T01:00:02Z", cycle)
    assert node["status"] == "cancelling"
    assert node["permit_id"] == "permit-live"
    assert node["permit_release_status"] == "awaiting-terminal-host-cancel-unobservable"
    assert node in advance_mod._scheduler_active_nodes(state)
    mock_ctx.call_tool.assert_called_with(
        "kirocrew-cron", "cron_pause", {"job_id": "job-live"})


def test_stale_close_delivery_cannot_close_refetched_open_issue(
        advance_mod, mock_ctx, state_factory, card_factory, monkeypatch):
    card = card_factory(
        pipeline_id="pl-1", stage="requirements", step_status={},
        source={"type": "github", "repo": _REPO, "issue": 42},
    )
    state = state_factory(cards=[card], pipelines=[_pipeline()])
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        state="OPEN", labels=["dlc:requirements"]))

    changed, status, reason, _ = advance_mod._apply_github_webhook(
        mock_ctx, state, _admit("closed", delivery="stale-close-1"), _NOW, _cycle())
    assert (changed, status, reason) == (False, "ignored", "stale-closed-delivery")
    assert card["stage"] == "requirements"
    assert "github_transition" not in card


def test_rotated_secret_or_missing_allowlist_leaves_accepted_receipt_pending(
        advance_mod, monkeypatch):
    record = _admit(delivery="rotate-1")
    assert webhook.enqueue_delivery(record)["status"] == "accepted"

    monkeypatch.setenv(webhook.SECRET_ENV, "rotated-secret")
    assert advance_mod._github_webhook_events() == []
    pending = webhook.pending_deliveries()
    assert [item["delivery_id"] for item in pending] == ["rotate-1"]
    assert pending[0]["attempts"] == 0

    monkeypatch.setenv(webhook.SECRET_ENV, _SECRET)
    monkeypatch.delenv(webhook.REPOSITORIES_ENV)
    assert advance_mod._github_webhook_events() == []
    assert webhook.pending_deliveries()[0]["attempts"] == 0


def test_retry_cap_dead_letters_and_processed_history_is_bounded(tmp_path, monkeypatch):
    path = tmp_path / "bounded.json"
    monkeypatch.setattr(webhook, "MAX_ATTEMPTS", 2)
    monkeypatch.setattr(webhook, "MAX_PROCESSED", 2)
    for number in range(1, 4):
        delivery = f"bounded-{number}"
        assert webhook.enqueue_delivery(
            _admit(issue=number, delivery=delivery), path)["status"] == "accepted"
        if number == 1:
            assert webhook.finalize_deliveries(
                {delivery: {"status": "retry", "reason": "temporary"}}, _NOW, path
            )["completed"] == 0
            result = webhook.finalize_deliveries(
                {delivery: {"status": "retry", "reason": "temporary"}}, _NOW, path)
        else:
            result = webhook.finalize_deliveries(
                {delivery: {"status": "applied", "reason": "done"}}, _NOW, path)
        assert result["completed"] == 1

    store = json.loads(path.read_text(encoding="utf-8"))
    assert [item["delivery_id"] for item in store["processed"]] == [
        "bounded-2", "bounded-3"]
    assert all("receipt_hmac" not in item and "payload_sha256" not in item
               for item in store["processed"])


def test_explicit_inbox_path_must_be_absolute(monkeypatch):
    monkeypatch.setenv(webhook.INBOX_ENV, "relative/inbox.json")
    assert webhook.inbox_path_valid() is False
    with pytest.raises(webhook.InboxError, match="inbox-path-not-absolute"):
        webhook.resolve_inbox_path()


def test_exactly_one_pipeline_must_own_repository(
        advance_mod, mock_ctx, state_factory, monkeypatch):
    second = _pipeline()
    second["id"] = "pl-2"
    state = state_factory(cards=[], pipelines=[_pipeline(), second])
    gh = mock.Mock(return_value=_gh_result(labels=["dlc:requirements"]))
    monkeypatch.setattr(advance_mod.subprocess, "run", gh)

    result = advance_mod._apply_github_webhook(
        mock_ctx, state, _admit(delivery="ambiguous-pipeline-1"), _NOW, _cycle())

    assert result[:3] == (
        False, "rejected", "pipeline-repository-not-owned-or-ambiguous")
    assert state["cards"] == []
    gh.assert_not_called()


def test_authoritative_issue_identity_mismatch_is_terminal_rejection(
        advance_mod, mock_ctx, state_factory, monkeypatch):
    state = state_factory(cards=[], pipelines=[_pipeline()])
    monkeypatch.setattr(
        advance_mod.subprocess, "run",
        lambda *a, **k: _gh_result(issue=999, labels=["dlc:requirements"]),
    )

    result = advance_mod._apply_github_webhook(
        mock_ctx, state, _admit(delivery="mismatch-1"), _NOW, _cycle())

    assert result[:3] == (False, "rejected", "gh-refetch-mismatch")
    assert state["cards"] == []


def test_existing_card_cannot_borrow_pipeline_ownership(
        advance_mod, mock_ctx, state_factory, card_factory, monkeypatch):
    card = card_factory(
        pipeline_id="different-pipeline", sot="github",
        source={"type": "github", "repo": _REPO, "issue": 42},
    )
    state = state_factory(cards=[card], pipelines=[_pipeline()])
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        labels=["dlc:requirements"]))

    result = advance_mod._apply_github_webhook(
        mock_ctx, state, _admit(delivery="borrow-1"), _NOW, _cycle())

    assert result[:3] == (False, "rejected", "card-pipeline-mismatch")


def test_move_cap_keeps_external_transition_queued(
        advance_mod, mock_ctx, state_factory, card_factory):
    card = card_factory(
        pipeline_id="pl-1", stage="requirements", step_status={},
        github_transition={
            "schema_version": 1, "authority": "github-webhook-refetch",
            "delivery_id": "cap-1", "kind": "stage", "from_step": "requirements",
            "target_step": "design", "reason": "authoritative-stage-label",
            "requested_at": _NOW, "status": "pending",
        },
    )
    state = state_factory(cards=[card], pipelines=[_pipeline()])
    cycle = _cycle()
    cycle["moves"] = cycle["max_moves"]

    assert advance_mod._reconcile_github_transitions(
        mock_ctx, state, _NOW, cycle) is True
    assert card["stage"] == "requirements"
    assert card["github_transition"]["status"] == "queued-move-cap"


def test_multiple_deliveries_collapse_to_latest_authoritative_stage(
        advance_mod, mock_ctx, state_factory, card_factory, monkeypatch):
    card = card_factory(
        pipeline_id="pl-1", stage="requirements", step_status={},
        source={"type": "github", "repo": _REPO, "issue": 42},
    )
    state = state_factory(cards=[card], pipelines=[_pipeline()])
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        labels=["dlc:design"]))
    cycle = _cycle()

    first = _admit("labeled", labels=["dlc:requirements"], delivery="collapse-1")
    second = _admit("unlabeled", labels=["dlc:requirements"], delivery="collapse-2")
    assert advance_mod._apply_github_webhook(
        mock_ctx, state, first, _NOW, cycle)[2] == "stage-change-queued"
    assert advance_mod._apply_github_webhook(
        mock_ctx, state, second, _NOW, cycle)[2] == "stage-change-queued"
    assert card["github_transition"]["delivery_id"] == "collapse-2"
    assert card["github_transition_history"][-1]["status"] == "superseded"

    advance_mod._reconcile_github_transitions(
        mock_ctx, state, "2026-09-06T01:00:01Z", cycle)
    assert card["stage"] == "design"
    assert cycle["moves"] == 1


def test_state_save_precedes_ack_and_failed_ack_replays_idempotently(
        advance_mod, mock_ctx, monkeypatch):
    initial = {
        "config": {"trust": "assisted", "depth": "standard"},
        "pipelines": [_pipeline()],
        "cards": [],
    }
    durable_state = {"value": copy.deepcopy(initial)}
    order = []

    monkeypatch.setattr(advance_mod, "_bootstrap", lambda: None)
    monkeypatch.setattr(advance_mod, "_load", lambda: copy.deepcopy(durable_state["value"]))

    def _save(current):
        durable_state["value"] = copy.deepcopy(current)
        order.append("state-save")

    monkeypatch.setattr(advance_mod, "_save", _save)
    monkeypatch.setattr(advance_mod, "_ensure_terminal_outbox", lambda *_a: False)
    monkeypatch.setattr(advance_mod, "_run_advance_passes", lambda *_a: False)
    monkeypatch.setattr(advance_mod, "_record_ledger_observations", lambda *_a: 0)
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        labels=["dlc:requirements"]))

    record = _admit(labels=["dlc:requirements"], delivery="transaction-1")
    assert webhook.enqueue_delivery(record)["status"] == "accepted"
    original_finalize = advance_mod._github_webhook.finalize_deliveries

    def _failed_ack(*_args, **_kwargs):
        order.append("ack-failed")
        raise advance_mod._github_webhook.InboxError("simulated-ack-failure")

    monkeypatch.setattr(
        advance_mod._github_webhook, "finalize_deliveries", _failed_ack)
    with pytest.raises(advance_mod.Report):
        advance_mod.advance(mock_ctx)

    assert order[-2:] == ["state-save", "ack-failed"]
    assert len(durable_state["value"]["cards"]) == 1
    assert len(durable_state["value"]["github_webhook_history"]) == 1
    assert webhook.inbox_status()["pending"] == 1

    def _successful_ack(results, now):
        assert order[-1] == "state-save"
        order.append("ack-succeeded")
        return original_finalize(results, now)

    monkeypatch.setattr(
        advance_mod._github_webhook, "finalize_deliveries", _successful_ack)
    with pytest.raises(advance_mod.Report):
        advance_mod.advance(mock_ctx)

    assert order[-2:] == ["state-save", "ack-succeeded"]
    assert len(durable_state["value"]["cards"]) == 1
    assert len(durable_state["value"]["github_webhook_history"]) == 1
    assert webhook.inbox_status() == {"schema_version": 1, "pending": 0, "processed": 1}


def test_webhook_ledger_projection_contains_only_minimized_observation(
        advance_mod, state_factory):
    state = state_factory(cards=[], pipelines=[_pipeline()])
    state["github_webhook_history"] = [{
        "schema_version": 1, "delivery_id": "ledger-1", "event": "issues",
        "action": "opened", "repository": _REPO, "issue_number": 42,
        "card_id": "card-gh-safe", "status": "applied", "reason": "card-created",
        "received_at": _NOW, "processed_at": _NOW,
    }]

    projected = [event for _path, event in advance_mod._collect_ledger_events(state, _NOW)
                 if event.get("type") == "io.dlcyolo.github.webhook.applied"]
    assert len(projected) == 1
    serialized = json.dumps(projected[0])
    assert "ledger-1" in serialized
    for forbidden in ("payload", "signature", "receipt_hmac", "secret", "issue body"):
        assert forbidden not in serialized.lower()


def test_opened_without_stage_label_creates_intake_card(
        advance_mod, mock_ctx, state_factory, monkeypatch):
    state = state_factory(cards=[], pipelines=[_pipeline()])
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(labels=[]))

    result = advance_mod._apply_github_webhook(
        mock_ctx, state, _admit("opened", delivery="intake-default-1"), _NOW, _cycle())

    assert result[:3] == (True, "applied", "card-created")
    assert state["cards"][0]["stage"] == "intake"


def test_closed_issue_queues_then_applies_safe_terminal_transition(
        advance_mod, mock_ctx, state_factory, card_factory, monkeypatch):
    card = card_factory(
        pipeline_id="pl-1", stage="requirements", step_status={},
        source={"type": "github", "repo": _REPO, "issue": 42},
    )
    state = state_factory(cards=[card], pipelines=[_pipeline()])
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        state="CLOSED", labels=["dlc:requirements"]))
    cycle = _cycle()

    result = advance_mod._apply_github_webhook(
        mock_ctx, state, _admit("closed", delivery="close-1"), _NOW, cycle)
    assert result[:3] == (True, "applied", "close-queued")
    assert card["stage"] == "requirements"

    advance_mod._reconcile_github_transitions(
        mock_ctx, state, "2026-09-06T01:00:01Z", cycle)
    assert card["stage"] == "done"
    assert card["lifecycle"] == "cancelled"
    assert card["github_state"] == "closed"
    assert card["history"][-1]["agent"] == "github-webhook"


def test_reopened_done_issue_without_label_returns_to_intake(
        advance_mod, mock_ctx, state_factory, card_factory, monkeypatch):
    card = card_factory(
        pipeline_id="pl-1", stage="done", lifecycle="cancelled", step_status={},
        source={"type": "github", "repo": _REPO, "issue": 42},
    )
    state = state_factory(cards=[card], pipelines=[_pipeline()])
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        state="OPEN", labels=[]))
    cycle = _cycle()

    result = advance_mod._apply_github_webhook(
        mock_ctx, state, _admit("reopened", delivery="reopen-1"), _NOW, cycle)
    assert result[:3] == (True, "applied", "reopen-queued")
    advance_mod._reconcile_github_transitions(
        mock_ctx, state, "2026-09-06T01:00:01Z", cycle)
    assert card["stage"] == "intake"
    assert card["lifecycle"] == "ingested"
    assert card["github_state"] == "open"


@pytest.mark.parametrize(
    ("labels", "expected"),
    [([], "missing"), (["dlc:not-a-step"], "unknown"),
     (["dlc:requirements", "dlc:design"], "ambiguous")],
)
def test_unresolved_external_stage_labels_hold_existing_card(
        advance_mod, mock_ctx, state_factory, card_factory, monkeypatch, labels, expected):
    card = card_factory(
        pipeline_id="pl-1", stage="requirements", step_status={},
        source={"type": "github", "repo": _REPO, "issue": 42},
    )
    state = state_factory(cards=[card], pipelines=[_pipeline()])
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        labels=labels))
    cycle = _cycle()
    action = "unlabeled" if not labels else "labeled"
    payload_labels = [labels[-1]] if labels else ["dlc:requirements"]

    result = advance_mod._apply_github_webhook(
        mock_ctx, state,
        _admit(action, labels=payload_labels, delivery=f"hold-{expected}-1"),
        _NOW, cycle)
    assert result[:3] == (True, "applied", f"stage-hold-{expected}")
    advance_mod._reconcile_github_transitions(
        mock_ctx, state, "2026-09-06T01:00:01Z", cycle)
    assert card["stage"] == "requirements"
    assert card["step_status"]["requirements"] == "blocked"
    assert card["github_stage"]["status"] == expected


def test_unknown_stage_label_cannot_create_new_card(
        advance_mod, mock_ctx, state_factory, monkeypatch):
    state = state_factory(cards=[], pipelines=[_pipeline()])
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        labels=["dlc:not-a-step"]))

    result = advance_mod._apply_github_webhook(
        mock_ctx, state,
        _admit("labeled", labels=["dlc:not-a-step"], delivery="unknown-new-1"),
        _NOW, _cycle())

    assert result[:3] == (False, "rejected", "stage-label-unknown")
    assert state["cards"] == []


def test_repository_label_event_requires_authoritative_repo_refetch(
        advance_mod, mock_ctx, state_factory, monkeypatch):
    raw = json.dumps({
        "action": "edited", "repository": {"full_name": _REPO},
        "label": {"name": "dlc:design"},
    }, sort_keys=True, separators=(",", ":")).encode()
    status, reason, record = webhook.admit_delivery(
        raw, _headers(raw, delivery="repo-label-1", event="label"), _NOW,
        secret=_SECRET, repositories={_REPO})
    assert (status, reason) == (202, "accepted")
    monkeypatch.setattr(
        advance_mod.subprocess, "run",
        lambda *a, **k: mock.Mock(
            returncode=0, stdout=json.dumps({"nameWithOwner": _REPO}), stderr=""),
    )
    state = state_factory(cards=[], pipelines=[_pipeline()])

    result = advance_mod._apply_github_webhook(
        mock_ctx, state, record, _NOW, _cycle())

    assert result[:3] == (False, "ignored", "repository-label-refetched")
    assert state["cards"] == []


def test_transient_gh_failure_requests_retry_without_card_mutation(
        advance_mod, mock_ctx, state_factory, monkeypatch):
    state = state_factory(cards=[], pipelines=[_pipeline()])
    monkeypatch.setattr(
        advance_mod.subprocess, "run",
        lambda *a, **k: mock.Mock(returncode=1, stdout="", stderr="offline"),
    )

    result = advance_mod._apply_github_webhook(
        mock_ctx, state, _admit(delivery="retry-gh-1"), _NOW, _cycle())

    assert result[:3] == (False, "retry", "gh-refetch-failed")
    assert state["cards"] == []


def test_owner_guard_requires_exact_repo_and_casefolded_trusted_login(
        advance_mod, state_factory, card_factory, monkeypatch):
    pipeline = _pipeline()
    pipeline["trusted_authors"] = ["TRUSTED-USER"]
    exact = card_factory(
        pipeline_id="pl-1", sot="github",
        source={"type": "github", "repo": "OWNER/REPO", "issue": 42},
    )
    wrong = copy.deepcopy(exact)
    wrong["source"]["repo"] = "owner/other"
    state = state_factory(cards=[exact, wrong], pipelines=[pipeline])
    advance_mod._ISSUE_AUTHOR_CACHE.clear()
    monkeypatch.setattr(
        advance_mod.subprocess, "run",
        lambda *a, **k: mock.Mock(
            returncode=0, stdout=json.dumps({"author": {"login": "trusted-user"}}),
            stderr=""),
    )

    assert advance_mod._owner_ok(state, exact, pipeline) is True
    assert advance_mod._owner_ok(state, wrong, pipeline) is False


def test_content_type_and_event_allowlists_are_exact():
    raw = _body()
    jsonp = _headers(raw)
    jsonp["Content-Type"] = "application/jsonp"
    assert webhook.admit_delivery(
        raw, jsonp, _NOW, secret=_SECRET, repositories={_REPO})[:2] == (
            415, "content-type-not-allowed")

    charset = _headers(raw, delivery="charset-1")
    charset["Content-Type"] = "application/json; charset=utf-8"
    assert webhook.admit_delivery(
        raw, charset, _NOW, secret=_SECRET, repositories={_REPO})[:2] == (
            202, "accepted")

    upper_event = _headers(raw, delivery="event-case-1")
    upper_event["X-GitHub-Event"] = "Issues"
    assert webhook.admit_delivery(
        raw, upper_event, _NOW, secret=_SECRET, repositories={_REPO})[:2] == (
            403, "event-not-allowed")


def test_backlog_label_never_creates_or_moves_normal_card(
        advance_mod, mock_ctx, state_factory, card_factory, monkeypatch):
    monkeypatch.setattr(advance_mod.subprocess, "run", lambda *a, **k: _gh_result(
        labels=["dlc-backlog"]))
    empty = state_factory(cards=[], pipelines=[_pipeline()])
    result = advance_mod._apply_github_webhook(
        mock_ctx, empty,
        _admit("labeled", labels=["dlc-backlog"], delivery="backlog-new-1"),
        _NOW, _cycle())
    assert result[:3] == (False, "ignored", "no-card-action")
    assert empty["cards"] == []

    card = card_factory(
        pipeline_id="pl-1", stage="requirements", step_status={},
        source={"type": "github", "repo": _REPO, "issue": 42},
    )
    existing = state_factory(cards=[card], pipelines=[_pipeline()])
    result = advance_mod._apply_github_webhook(
        mock_ctx, existing,
        _admit("labeled", labels=["dlc-backlog"], delivery="backlog-existing-1"),
        _NOW, _cycle())
    assert result[:3] == (True, "ignored", "backlog-label")
    assert card["stage"] == "requirements"
    assert "github_transition" not in card


def test_queued_transition_rechecks_pipeline_ownership_before_move(
        advance_mod, mock_ctx, state_factory, card_factory):
    card = card_factory(
        pipeline_id="pl-1", stage="requirements", step_status={},
        source={"type": "github", "repo": _REPO, "issue": 42},
        github_transition={
            "schema_version": 1, "authority": "github-webhook-refetch",
            "delivery_id": "ownership-drift-1", "kind": "stage",
            "from_step": "requirements", "target_step": "design",
            "reason": "authoritative-stage-label", "requested_at": _NOW,
            "status": "pending",
        },
    )
    state = state_factory(cards=[card], pipelines=[])

    assert advance_mod._reconcile_github_transitions(
        mock_ctx, state, _NOW, _cycle()) is True
    assert card["stage"] == "requirements"
    assert "github_transition" not in card
    assert card["github_transition_history"][-1]["status"] == (
        "rejected-pipeline-ownership")


def test_ui_managed_configuration_is_bounded_atomic_and_fail_closed(tmp_path):
    env = {"DLC_YOLO_STATE": str(tmp_path / "state.json")}
    canonical = webhook.write_webhook_config({
        "enabled": True,
        "port": 9876,
        "repositories": ["owner/repo", "OWNER/REPO"],
        "inbox_path": str(tmp_path / "inbox.json"),
        "secret": "x" * 32,
    }, env)

    path = webhook.resolve_config_path(env)
    assert canonical["repositories"] == ["owner/repo"]
    assert path.stat().st_mode & 0o777 == 0o600
    assert webhook.receiver_enabled(env) is True
    assert webhook.receiver_port(env) == 9876
    assert webhook.allowed_repositories(env) == {"owner/repo"}
    assert webhook.webhook_secret(env) == "x" * 32
    assert webhook.resolve_inbox_path(env) == tmp_path / "inbox.json"


def test_environment_configuration_precedes_ui_storage(tmp_path):
    base = {"DLC_YOLO_STATE": str(tmp_path / "state.json")}
    webhook.write_webhook_config({
        "enabled": True,
        "port": 9876,
        "repositories": ["ui/repo"],
        "inbox_path": None,
        "secret": "u" * 32,
    }, base)
    env = {
        **base,
        webhook.PORT_ENV: "9988",
        webhook.REPOSITORIES_ENV: "env/repo",
        webhook.SECRET_ENV: "environment-secret",
    }

    effective = webhook.effective_webhook_config(env)

    assert effective["source"] == "environment"
    assert webhook.receiver_port(env) == 9988
    assert webhook.allowed_repositories(env) == {"env/repo"}
    assert webhook.webhook_secret(env) == "environment-secret"


def test_symlinked_ui_configuration_is_refused(tmp_path):
    env = {"DLC_YOLO_STATE": str(tmp_path / "state.json")}
    target = tmp_path / "foreign.json"
    target.write_text("{}", encoding="utf-8")
    webhook.resolve_config_path(env).symlink_to(target)

    with pytest.raises(webhook.InboxError, match="config-symlink-refused"):
        webhook.read_webhook_config(env)
    with pytest.raises(webhook.InboxError, match="config-symlink-refused"):
        webhook.write_webhook_config({
            "enabled": False,
            "port": 9876,
            "repositories": [],
            "inbox_path": None,
            "secret": "",
        }, env)
