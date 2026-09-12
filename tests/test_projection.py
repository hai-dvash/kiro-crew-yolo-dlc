"""Master Priority 11 — replay-parity-gated ledger projection authority."""

from __future__ import annotations

import copy
import json
import os
from pathlib import Path

import pytest

import dlc_yolo_projection as projection

_NOW = "2026-09-06T03:00:00Z"


def _pipeline(*, pipeline_id="pl-1", workspace="default", repo="owner/repo"):
    return {
        "id": pipeline_id, "repo": repo, "workspace": workspace,
        "sot": "github", "trust": "assisted", "depth": "standard",
        "steps": [
            {"id": "requirements", "type": "agent", "capability": "authoring",
             "label": "dlc:requirements"},
            {"id": "gate-spec", "type": "gate", "reviews_step": "requirements",
             "label": "dlc:gate-spec"},
            {"id": "design", "type": "agent", "capability": "authoring",
             "label": "dlc:design"},
        ],
    }


def _state(state_factory, card_factory, *, workspace="default"):
    pipeline = _pipeline(workspace=workspace)
    card = card_factory(
        id="card-1", pipeline_id="pl-1", title="SECRET CARD TITLE",
        stage="gate-spec", lifecycle="pending", sot="local",
        source={"type": "github", "repo": "owner/repo", "issue": 42,
                "url": "https://example.invalid/private"},
        created_at="2026-09-06T02:00:00Z", updated_at="2026-09-06T02:10:00Z",
        step_status={"requirements": "advanced", "gate-spec": ""},
        pending_at={"requirements": "2026-09-06T02:00:00Z"},
        step_sessions={"requirements": {
            "cron_id": "cron-1", "slot_key": "slot-1", "session_key": "session-1",
            "agent": "dlcyolo-authoring", "at": "2026-09-06T02:00:00Z",
            "working_dir": "/private/worktrees/card-1", "retention": "held-for-gate",
            "retained_for_gate": "gate-spec", "retained_at": "2026-09-06T02:09:00Z",
            "writes_allowed": True,
        }},
        gate_review={
            "gate": "gate-spec", "producer_step": "requirements", "result_revision": 2,
            "status": "awaiting-review", "created_at": "2026-09-06T02:08:00Z",
            "review_ready_at": "2026-09-06T02:09:00Z",
            "bundle": {"summary": "SECRET BUNDLE SUMMARY"},
        },
        gate_commands=[{
            "id": "command-1", "gate": "gate-spec", "action": "approve",
            "actor": "SECRET COMMAND ACTOR", "status": "pending",
            "at": "2026-09-06T02:09:30Z",
        }],
        decisions=[{
            "id": "decision-1", "step": "requirements", "kind": "technical-fork",
            "question": "SECRET QUESTION", "chosen": "SECRET ANSWER",
            "status": "resolved", "resolved_at": "2026-09-06T02:05:00Z",
        }],
        interjection=[{
            "id": "interjection-1", "step": "gate-spec", "kind": "feedback",
            "text": "SECRET INTERJECTION", "status": "pending",
            "at": "2026-09-06T02:10:00Z", "result_revision": 2,
        }],
        worktree_lease={
            "lease_id": "lease-1", "path": "/private/worktrees/card-1",
            "repo_path": "/private/primary", "branch": "dlc/pl-1/card-1",
            "base_commit": "abc123", "owner_card": "card-1",
            "locked": True, "status": "active", "acquired_at": "2026-09-06T02:00:00Z",
        },
        artifacts={
            "requirements": "/private/results/requirements.md",
            "SECRET ARTIFACT KIND": "/private/results/secret.md",
        },
        commits=["ABCDEF1", "SECRET COMMIT MESSAGE"],
        validation=[{"id": "validation-1", "status": "passed", "passed": True,
                     "output": "SECRET VALIDATION OUTPUT"}],
    )
    return state_factory(cards=[card], pipelines=[pipeline]), card, pipeline


def _projection_path(advance_mod, workspace="default"):
    ledger = advance_mod._ledger_path({"workspace": workspace})
    return projection.projection_paths(ledger)


def _record_and_reconcile(advance_mod, state, now=_NOW):
    advance_mod._record_ledger_observations(state, now)
    return advance_mod._reconcile_ledger_projections(state, now)


def test_state_projection_preserves_operational_continuity_without_prose_or_paths(
        advance_mod, state_factory, card_factory):
    state, _card, _pipeline_value = _state(state_factory, card_factory)

    projected = advance_mod._runtime_projections(state, _NOW)["default"]

    projection.validate_projection(projected, "default")
    [card] = projected["cards"]
    [run] = projected["runs"]
    assert card["stage"] == "gate-spec"
    assert card["sessions"]["requirements"]["session_key"] == "session-1"
    assert card["gate_review"]["status"] == "awaiting-review"
    assert card["worktree"]["lease_id"] == "lease-1"
    assert run["gate"]["retention"] == "held-for-gate"
    assert run["artifacts"][0]["ref_id"].startswith("ref-")
    assert run["commits"] == ["abcdef1"]
    serialized = json.dumps(projected, sort_keys=True)
    for forbidden in (
        "SECRET CARD TITLE", "SECRET BUNDLE SUMMARY", "SECRET QUESTION",
        "SECRET ANSWER", "SECRET INTERJECTION", "SECRET VALIDATION OUTPUT",
        "SECRET COMMAND ACTOR", "SECRET ARTIFACT KIND", "SECRET COMMIT MESSAGE",
        "/private/", "working_dir", "actual_path", "repo_path",
    ):
        assert forbidden not in serialized


def test_snapshot_event_is_deterministic_across_observation_times(
        advance_mod, state_factory, card_factory):
    state, *_ = _state(state_factory, card_factory)
    projected = advance_mod._runtime_projections(state, _NOW)["default"]
    first = projection.projection_event(projected, _NOW)
    second = projection.projection_event(projected, "2026-09-06T03:01:00Z")

    assert first["id"] == second["id"]
    assert first["data"] == second["data"]
    assert projection.dedup_bytes(first) == projection.dedup_bytes(second)


def test_exact_replay_parity_publishes_ledger_authoritative_projection(
        advance_mod, state_factory, card_factory):
    state, *_ = _state(state_factory, card_factory)

    results = _record_and_reconcile(advance_mod, state)

    assert results["default"]["authority_active"] is True
    authority_path, status_path = _projection_path(advance_mod)
    authority = json.loads(authority_path.read_text(encoding="utf-8"))
    status = json.loads(status_path.read_text(encoding="utf-8"))
    expected = advance_mod._runtime_projections(state, _NOW)["default"]
    assert authority["authority"] == "ledger-replay"
    assert authority["authority_scope"] == "privacy-minimized-operational-read-model"
    assert authority["parity"]["status"] == "verified"
    assert authority["projection_sha256"] == projection.projection_sha256(expected)
    assert authority["pipelines"] == expected["pipelines"]
    assert authority["cards"] == expected["cards"]
    assert authority["runs"] == expected["runs"]
    assert status["authority_active"] is True
    assert stat_mode(authority_path) == 0o600
    assert stat_mode(status_path) == 0o600


def stat_mode(path: Path) -> int:
    return path.stat().st_mode & 0o777


def test_unchanged_projection_deduplicates_and_replays_on_later_tick(
        advance_mod, state_factory, card_factory):
    state, *_ = _state(state_factory, card_factory)
    _record_and_reconcile(advance_mod, state)
    ledger = advance_mod._ledger_path({"workspace": "default"})
    first_events, _ = projection.read_ledger_events(ledger)
    first_projection_ids = [event["id"] for event in first_events
                            if event["type"] == projection.EVENT_TYPE]

    _record_and_reconcile(advance_mod, state, "2026-09-06T03:05:00Z")
    second_events, _ = projection.read_ledger_events(ledger)
    second_projection_ids = [event["id"] for event in second_events
                             if event["type"] == projection.EVENT_TYPE]

    assert second_projection_ids == first_projection_ids
    assert len(second_projection_ids) == 1


def test_parity_mismatch_preserves_last_known_good_authority(
        advance_mod, state_factory, card_factory):
    state, card, _ = _state(state_factory, card_factory)
    _record_and_reconcile(advance_mod, state)
    authority_path, status_path = _projection_path(advance_mod)
    last_good = authority_path.read_bytes()

    card["stage"] = "design"
    card["updated_at"] = "2026-09-06T03:06:00Z"
    result = advance_mod._reconcile_ledger_projections(
        state, "2026-09-06T03:06:00Z")["default"]

    assert result["authority_active"] is False
    assert result["reason"] == "replay-parity-mismatch"
    assert authority_path.read_bytes() == last_good
    status = json.loads(status_path.read_text(encoding="utf-8"))
    assert status["authority"] == "blocked-last-known-good-preserved"


def test_new_snapshot_restores_parity_after_state_change(
        advance_mod, state_factory, card_factory):
    state, card, _ = _state(state_factory, card_factory)
    _record_and_reconcile(advance_mod, state)
    authority_path, _ = _projection_path(advance_mod)
    old = authority_path.read_bytes()
    card["stage"] = "design"
    card["updated_at"] = "2026-09-06T03:06:00Z"

    result = _record_and_reconcile(
        advance_mod, state, "2026-09-06T03:06:00Z")["default"]

    assert result["authority_active"] is True
    assert authority_path.read_bytes() != old
    authority = json.loads(authority_path.read_text(encoding="utf-8"))
    assert authority["cards"][0]["stage"] == "design"


def test_malformed_ledger_blocks_authority_without_replacing_last_good(
        advance_mod, state_factory, card_factory):
    state, *_ = _state(state_factory, card_factory)
    _record_and_reconcile(advance_mod, state)
    ledger = advance_mod._ledger_path({"workspace": "default"})
    authority_path, _ = _projection_path(advance_mod)
    last_good = authority_path.read_bytes()
    with ledger.open("a", encoding="utf-8") as handle:
        handle.write("{malformed\n")

    result = advance_mod._reconcile_ledger_projections(
        state, "2026-09-06T03:07:00Z")["default"]

    assert result["authority_active"] is False
    assert result["reason"] == "ledger-malformed-line"
    assert authority_path.read_bytes() == last_good


def test_symlinked_ledger_fails_closed(tmp_path, advance_mod, state_factory, card_factory):
    state, *_ = _state(state_factory, card_factory)
    expected = advance_mod._runtime_projections(state, _NOW)["default"]
    real = tmp_path / "real-ledger.jsonl"
    event = projection.projection_event(expected, _NOW)
    real.write_text(json.dumps(event) + "\n", encoding="utf-8")
    linked = tmp_path / "linked-ledger.jsonl"
    linked.symlink_to(real)

    result = projection.reconcile_projection(linked, expected, _NOW)

    assert result["authority_active"] is False
    assert result["reason"] == "ledger-open-failed"
    authority_path, _ = projection.projection_paths(linked)
    assert not authority_path.exists()


def test_conflicting_duplicate_projection_event_blocks_replay(
        tmp_path, advance_mod, state_factory, card_factory):
    state, *_ = _state(state_factory, card_factory)
    expected = advance_mod._runtime_projections(state, _NOW)["default"]
    event = projection.projection_event(expected, _NOW)
    conflict = copy.deepcopy(event)
    conflict["data"]["projection"]["cards"][0]["stage"] = "design"
    ledger = tmp_path / "events.jsonl"
    ledger.write_text(
        json.dumps(event, sort_keys=True) + "\n" + json.dumps(conflict, sort_keys=True) + "\n",
        encoding="utf-8")

    result = projection.reconcile_projection(ledger, expected, _NOW)

    assert result["authority_active"] is False
    assert result["reason"] == "ledger-duplicate-conflict"


def test_projection_digest_tampering_blocks_replay(
        tmp_path, advance_mod, state_factory, card_factory):
    state, *_ = _state(state_factory, card_factory)
    expected = advance_mod._runtime_projections(state, _NOW)["default"]
    event = projection.projection_event(expected, _NOW)
    event["data"]["projection_sha256"] = "0" * 64
    ledger = tmp_path / "events.jsonl"
    ledger.write_text(json.dumps(event) + "\n", encoding="utf-8")

    result = projection.reconcile_projection(ledger, expected, _NOW)

    assert result["authority_active"] is False
    assert result["reason"] == "projection-event-digest-mismatch"


def test_card_removal_is_replayed_by_new_complete_snapshot(
        advance_mod, state_factory, card_factory):
    state, *_ = _state(state_factory, card_factory)
    _record_and_reconcile(advance_mod, state)
    state["cards"] = []

    result = _record_and_reconcile(
        advance_mod, state, "2026-09-06T03:08:00Z")["default"]

    assert result["authority_active"] is True
    authority_path, _ = _projection_path(advance_mod)
    authority = json.loads(authority_path.read_text(encoding="utf-8"))
    assert authority["cards"] == []
    assert authority["runs"] == []


def test_workspaces_have_isolated_ledgers_and_authorities(
        advance_mod, state_factory, card_factory):
    default = _pipeline()
    secure = _pipeline(pipeline_id="pl-2", workspace="security/team", repo="owner/secure")
    card_a = card_factory(id="card-a", pipeline_id="pl-1", sot="local",
                          source={"type": "github", "repo": "owner/repo", "issue": 1})
    card_b = card_factory(id="card-b", pipeline_id="pl-2", sot="local",
                          source={"type": "github", "repo": "owner/secure", "issue": 2})
    state = state_factory(cards=[card_a, card_b], pipelines=[default, secure])

    results = _record_and_reconcile(advance_mod, state)

    assert set(results) == {"default", "security-team"}
    for workspace, card_id in (("default", "card-a"), ("security-team", "card-b")):
        authority_path, _ = _projection_path(advance_mod, workspace)
        authority = json.loads(authority_path.read_text(encoding="utf-8"))
        assert authority["authority"] == "ledger-replay"
        assert [card["id"] for card in authority["cards"]] == [card_id]


def test_privacy_validator_rejects_prose_and_absolute_paths():
    base = {"schema_version": 1, "workspace": "default",
            "pipelines": [], "cards": [], "runs": []}
    with_path = copy.deepcopy(base)
    with_path["cards"] = [{"id": "card-1", "path": "/private/card"}]
    with pytest.raises(projection.ProjectionError, match="projection-privacy-invalid"):
        projection.validate_projection(with_path)

    with_prose = copy.deepcopy(base)
    with_prose["cards"] = [{"id": "card-1", "title": "private title"}]
    with pytest.raises(projection.ProjectionError, match="projection-privacy-invalid"):
        projection.validate_projection(with_prose)


def test_projection_size_cap_fails_closed(monkeypatch):
    value = {"schema_version": 1, "workspace": "default",
             "pipelines": [], "cards": [], "runs": []}
    monkeypatch.setattr(projection, "MAX_PROJECTION_BYTES", 10)
    with pytest.raises(projection.ProjectionError, match="projection-too-large"):
        projection.validate_projection(value)


def test_advance_records_then_replays_projection_without_control_dependency(
        advance_mod, mock_ctx, state_factory, write_state, monkeypatch):
    state = state_factory(cards=[], pipelines=[])
    write_state(state)
    order = []
    monkeypatch.setattr(advance_mod, "_ensure_terminal_outbox", lambda *_a: False)
    monkeypatch.setattr(advance_mod, "_run_advance_passes", lambda *_a: False)
    monkeypatch.setattr(
        advance_mod, "_record_ledger_observations",
        lambda *_a: order.append("append") or 0)
    monkeypatch.setattr(
        advance_mod, "_reconcile_ledger_projections",
        lambda *_a: order.append("replay") or {})

    with pytest.raises(advance_mod.Skip):
        advance_mod.advance(mock_ctx)

    assert order == ["append", "replay"]


def test_projection_failure_never_changes_authoritative_control_state(
        advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state, monkeypatch):
    state = state_factory(cards=[card_factory(sot="local")], pipelines=[_pipeline()])
    before = copy.deepcopy(state)
    write_state(state)
    monkeypatch.setattr(advance_mod, "_ensure_terminal_outbox", lambda *_a: False)
    monkeypatch.setattr(advance_mod, "_run_advance_passes", lambda *_a: False)
    monkeypatch.setattr(advance_mod, "_record_ledger_observations", lambda *_a: 0)
    monkeypatch.setattr(
        advance_mod, "_reconcile_ledger_projections",
        lambda *_a: (_ for _ in ()).throw(projection.ProjectionError("simulated")))

    with pytest.raises(advance_mod.Skip):
        advance_mod.advance(mock_ctx)

    assert read_state() == before


def test_ledger_append_is_0600_no_follow_and_projection_idempotent(
        tmp_path, advance_mod):
    ledger = tmp_path / "events.jsonl"
    value = {"schema_version": 1, "workspace": "default",
             "pipelines": [], "cards": [], "runs": []}
    first = projection.projection_event(value, _NOW)
    later = projection.projection_event(value, "2026-09-06T03:10:00Z")

    assert advance_mod._append_ledger_events(ledger, [first]) == 1
    assert advance_mod._append_ledger_events(ledger, [later]) == 0
    assert stat_mode(ledger) == 0o600

    real = tmp_path / "real.jsonl"
    real.write_text("", encoding="utf-8")
    linked = tmp_path / "linked.jsonl"
    linked.symlink_to(real)
    with pytest.raises(OSError):
        advance_mod._append_ledger_events(linked, [first])


def test_append_rejects_conflicting_projection_before_writing_batch(
        tmp_path, advance_mod):
    ledger = tmp_path / "events.jsonl"
    base = {"schema_version": 1, "workspace": "default",
            "pipelines": [], "cards": [], "runs": []}
    first = projection.projection_event(base, _NOW)
    advance_mod._append_ledger_events(ledger, [first])
    before = ledger.read_bytes()
    conflict = copy.deepcopy(first)
    conflict["data"]["projection_sha256"] = "f" * 64
    unrelated = advance_mod._ledger_event(
        "/dlc-yolo/pipelines/pl/cards/card", "io.dlcyolo.test.observed", "test",
        _NOW, {"value": 1}, "card", {"value": 1})

    with pytest.raises(projection.ProjectionError, match="ledger-duplicate-conflict"):
        advance_mod._append_ledger_events(ledger, [unrelated, conflict])

    assert ledger.read_bytes() == before


def test_distinct_workspace_names_cannot_share_projection_authority(
        advance_mod, state_factory):
    first = _pipeline(pipeline_id="pl-1", workspace="security/team", repo="owner/one")
    second = _pipeline(pipeline_id="pl-2", workspace="security-team", repo="owner/two")
    state = state_factory(cards=[], pipelines=[first, second])

    with pytest.raises(
            projection.ProjectionError, match="projection-workspace-token-collision"):
        advance_mod._runtime_projections(state, _NOW)


def test_privacy_validator_rejects_aliases_unc_paths_and_non_json_values():
    base = {"schema_version": 1, "workspace": "default",
            "pipelines": [], "cards": [], "runs": []}
    for field, value in (
        ("artifact_path", "relative/private.txt"),
        ("block_reason", "private prose"),
        ("access_token", "private-token"),
        ("url", "https://example.invalid/private"),
    ):
        candidate = copy.deepcopy(base)
        candidate["cards"] = [{"id": "card-1", field: value}]
        with pytest.raises(projection.ProjectionError, match="projection-privacy-invalid"):
            projection.validate_projection(candidate)

    unc = copy.deepcopy(base)
    unc["cards"] = [{"id": "card-1", "branch": r"\\server\private"}]
    with pytest.raises(projection.ProjectionError, match="projection-privacy-invalid"):
        projection.validate_projection(unc)

    non_finite = copy.deepcopy(base)
    non_finite["cards"] = [{"id": "card-1", "score": float("nan")}]
    with pytest.raises(projection.ProjectionError, match="projection-json-invalid"):
        projection.validate_projection(non_finite)


def test_physical_duplicate_records_count_toward_ledger_event_cap(
        tmp_path, monkeypatch):
    value = {"schema_version": 1, "workspace": "default",
             "pipelines": [], "cards": [], "runs": []}
    event = projection.projection_event(value, _NOW)
    ledger = tmp_path / "events.jsonl"
    line = json.dumps(event, sort_keys=True) + "\n"
    ledger.write_text(line + line, encoding="utf-8")
    monkeypatch.setattr(projection, "MAX_LEDGER_EVENTS", 1)

    with pytest.raises(projection.ProjectionError, match="ledger-event-cap"):
        projection.read_ledger_events(ledger)


def test_append_size_preflight_preserves_existing_ledger(
        tmp_path, advance_mod, monkeypatch):
    ledger = tmp_path / "events.jsonl"
    base = {"schema_version": 1, "workspace": "default",
            "pipelines": [], "cards": [], "runs": []}
    first = projection.projection_event(base, _NOW)
    advance_mod._append_ledger_events(ledger, [first])
    before = ledger.read_bytes()
    changed = copy.deepcopy(base)
    changed["cards"] = [{"id": "card-1"}]
    second = projection.projection_event(changed, "2026-09-06T03:11:00Z")
    second_size = len(projection.canonical_bytes(second)) + 1
    monkeypatch.setattr(projection, "MAX_LEDGER_BYTES", len(before) + second_size - 1)

    with pytest.raises(projection.ProjectionError, match="ledger-too-large"):
        advance_mod._append_ledger_events(ledger, [second])

    assert ledger.read_bytes() == before


def test_symlinked_projection_directory_fails_closed(tmp_path):
    value = {"schema_version": 1, "workspace": "default",
             "pipelines": [], "cards": [], "runs": []}
    ledger = tmp_path / "events.jsonl"
    ledger.write_text(json.dumps(projection.projection_event(value, _NOW)) + "\n",
                      encoding="utf-8")
    outside = tmp_path / "outside"
    outside.mkdir()
    (tmp_path / "projections").symlink_to(outside, target_is_directory=True)

    result = projection.reconcile_projection(ledger, value, _NOW)

    assert result["authority_active"] is False
    assert result["reason"] == "authority-directory-not-directory"
    assert list(outside.iterdir()) == []


def test_durable_append_failure_skips_replay_without_control_mutation(
        advance_mod, mock_ctx, state_factory, write_state, read_state, monkeypatch):
    state = state_factory(cards=[], pipelines=[])
    write_state(state)
    calls = []
    monkeypatch.setattr(advance_mod, "_ensure_terminal_outbox", lambda *_a: False)
    monkeypatch.setattr(advance_mod, "_run_advance_passes", lambda *_a: False)

    def fail_append(*args):
        calls.append(("append", args[2]))
        raise projection.ProjectionError("ledger-too-large")

    monkeypatch.setattr(advance_mod, "_record_ledger_observations", fail_append)
    monkeypatch.setattr(
        advance_mod, "_reconcile_ledger_projections",
        lambda *_a: calls.append(("replay", True)) or {})

    with pytest.raises(advance_mod.Skip):
        advance_mod.advance(mock_ctx)

    assert calls == [("append", True)]
    assert read_state() == state
