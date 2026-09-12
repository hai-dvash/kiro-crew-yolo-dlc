"""Deterministic linked-card local→GitHub source-of-truth convergence."""

from __future__ import annotations

import copy
import json


class _Proc:
    def __init__(self, returncode=0, payload=None):
        self.returncode = returncode
        self.stdout = json.dumps(payload or {})
        self.stderr = ""


def _pipeline(*, pipeline_id="pl-1", sot="local"):
    return {
        "id": pipeline_id,
        "repo": "owner/repo",
        "workspace": "default",
        "sot": sot,
        "trust": "autonomous",
        "depth": "standard",
        "trusted_authors": ["trusted-user"],
        "steps": [{"id": "requirements", "type": "agent"}],
    }


def _card(*, card_id="card-1", issue=42, author="trusted-user"):
    return {
        "id": card_id,
        "title": f"Card {card_id}",
        "pipeline_id": "pl-1",
        "stage": "requirements",
        "sot": "local",
        "trusted_authors": [author],
        "source": {"type": "github", "repo": "owner/repo", "issue": issue},
        "step_status": {},
    }


def _cycle(max_moves=3):
    return {
        "moved": [], "waiting_gates": [], "max_moves": max_moves,
        "max_escalations": 2, "moves": 0, "escalations": 0,
    }


def _issue_payload(issue, labels, author="trusted-user", state="OPEN"):
    return {
        "number": issue,
        "title": f"Issue {issue}",
        "url": f"https://github.test/owner/repo/issues/{issue}",
        "state": state,
        "labels": [{"name": label} for label in labels],
        "author": {"login": author},
    }


def test_linked_local_card_converges_exact_label_then_replays_idempotently(
        advance_mod, monkeypatch):
    card = _card()
    pipeline = _pipeline()
    state = {"config": {}, "pipelines": [pipeline], "cards": [card]}
    labels = {42: ["dlc:obsolete", "triage"]}
    calls = []

    def fake_run(command, **_kwargs):
        calls.append(command)
        if command[:3] == ["gh", "repo", "view"]:
            return _Proc(payload={"nameWithOwner": "owner/repo"})
        if command[:3] == ["gh", "issue", "view"]:
            issue = int(command[3])
            return _Proc(payload=_issue_payload(issue, labels[issue]))
        if command[:3] == ["gh", "label", "create"]:
            return _Proc()
        if command[:3] == ["gh", "issue", "edit"]:
            issue = int(command[3])
            labels[issue] = ["dlc:requirements", "triage"]
            return _Proc()
        raise AssertionError(command)

    monkeypatch.setattr(advance_mod.subprocess, "run", fake_run)
    cycle = _cycle()
    assert advance_mod._reconcile_local_github_sot(
        state, "2026-09-07T00:00:00Z", cycle) is True

    assert card["sot"] == "github"
    assert card["source"]["url"].endswith("/42")
    assert card["guard"]["passed"] is True
    assert card["github_sync"]["status"] == "converged"
    assert pipeline["sot"] == "github"
    assert cycle["moves"] == 1
    edit = next(command for command in calls if command[:3] == ["gh", "issue", "edit"])
    assert edit[edit.index("--add-label") + 1] == "dlc:requirements"
    assert edit[edit.index("--remove-label") + 1] == "dlc:obsolete"

    calls.clear()
    assert advance_mod._reconcile_local_github_sot(
        state, "2026-09-07T00:01:00Z", _cycle()) is False
    assert calls == []


def test_unavailable_or_untrusted_issue_stays_local_without_write(
        advance_mod, monkeypatch):
    for mode in ("unavailable", "untrusted"):
        card = _card()
        state = {"config": {}, "pipelines": [_pipeline()], "cards": [card]}
        before = copy.deepcopy(state)
        calls = []

        def fake_run(command, **_kwargs):
            calls.append(command)
            if command[:3] == ["gh", "repo", "view"]:
                if mode == "unavailable":
                    return _Proc(returncode=1)
                return _Proc(payload={"nameWithOwner": "owner/repo"})
            if command[:3] == ["gh", "issue", "view"]:
                return _Proc(payload=_issue_payload(42, [], author="mallory"))
            raise AssertionError(f"unexpected mutation for {mode}: {command}")

        monkeypatch.setattr(advance_mod.subprocess, "run", fake_run)
        assert advance_mod._reconcile_local_github_sot(
            state, "2026-09-07T00:00:00Z", _cycle()) is False
        assert state == before
        assert not any(command[:3] in (["gh", "label", "create"],
                                       ["gh", "issue", "edit"])
                       for command in calls)


def test_ambiguous_owner_and_unlinked_card_never_probe_or_create_issue(
        advance_mod, monkeypatch):
    calls = []
    monkeypatch.setattr(
        advance_mod.subprocess, "run",
        lambda command, **_kwargs: calls.append(command) or _Proc(),
    )
    ambiguous = {
        "config": {},
        "pipelines": [_pipeline(), _pipeline(pipeline_id="pl-2")],
        "cards": [_card()],
    }
    assert advance_mod._reconcile_local_github_sot(
        ambiguous, "2026-09-07T00:00:00Z", _cycle()) is False

    unlinked = _card()
    unlinked["source"].pop("issue")
    state = {"config": {}, "pipelines": [_pipeline()], "cards": [unlinked]}
    assert advance_mod._reconcile_local_github_sot(
        state, "2026-09-07T00:00:00Z", _cycle()) is False
    assert calls == []


def test_post_write_refetch_must_prove_exact_convergence(
        advance_mod, monkeypatch):
    card = _card()
    state = {"config": {}, "pipelines": [_pipeline()], "cards": [card]}
    issue_reads = 0

    def fake_run(command, **_kwargs):
        nonlocal issue_reads
        if command[:3] == ["gh", "repo", "view"]:
            return _Proc(payload={"nameWithOwner": "owner/repo"})
        if command[:3] == ["gh", "issue", "view"]:
            issue_reads += 1
            # The edit reports success, but authority still contains a conflicting label.
            labels = ["dlc:old"] if issue_reads == 1 else ["dlc:requirements", "dlc:old"]
            return _Proc(payload=_issue_payload(42, labels))
        if command[:3] in (["gh", "label", "create"], ["gh", "issue", "edit"]):
            return _Proc()
        raise AssertionError(command)

    monkeypatch.setattr(advance_mod.subprocess, "run", fake_run)
    before = copy.deepcopy(state)
    assert advance_mod._reconcile_local_github_sot(
        state, "2026-09-07T00:00:00Z", _cycle()) is False
    assert state == before


def test_resync_uses_existing_move_cap_and_leaves_remainder_for_next_poll(
        advance_mod, monkeypatch):
    cards = [_card(card_id=f"card-{issue}", issue=issue) for issue in range(1, 5)]
    pipeline = _pipeline()
    state = {"config": {}, "pipelines": [pipeline], "cards": cards}

    def fake_run(command, **_kwargs):
        if command[:3] == ["gh", "repo", "view"]:
            return _Proc(payload={"nameWithOwner": "owner/repo"})
        if command[:3] == ["gh", "issue", "view"]:
            issue = int(command[3])
            return _Proc(payload=_issue_payload(issue, ["dlc:requirements"]))
        raise AssertionError(command)

    monkeypatch.setattr(advance_mod.subprocess, "run", fake_run)
    cycle = _cycle(max_moves=3)
    assert advance_mod._reconcile_local_github_sot(
        state, "2026-09-07T00:00:00Z", cycle) is True
    assert [card["sot"] for card in cards] == ["github", "github", "github", "local"]
    assert cycle["moves"] == 3
    assert pipeline["sot"] == "local"


def test_resync_does_not_exceed_move_budget_consumed_by_earlier_events(
        advance_mod, monkeypatch):
    card = _card()
    state = {"config": {}, "pipelines": [_pipeline()], "cards": [card]}
    calls = []
    monkeypatch.setattr(
        advance_mod.subprocess, "run",
        lambda command, **_kwargs: calls.append(command) or _Proc(),
    )
    cycle = _cycle(max_moves=3)
    cycle["moves"] = 3
    assert advance_mod._reconcile_local_github_sot(
        state, "2026-09-07T00:00:00Z", cycle) is False
    assert card["sot"] == "local"
    assert calls == []


def test_closed_issue_cannot_be_relabelled_as_active_local_stage(
        advance_mod, monkeypatch):
    card = _card()
    state = {"config": {}, "pipelines": [_pipeline()], "cards": [card]}
    calls = []

    def fake_run(command, **_kwargs):
        calls.append(command)
        if command[:3] == ["gh", "repo", "view"]:
            return _Proc(payload={"nameWithOwner": "owner/repo"})
        if command[:3] == ["gh", "issue", "view"]:
            return _Proc(payload=_issue_payload(42, [], state="CLOSED"))
        raise AssertionError(f"closed issue must not be mutated: {command}")

    monkeypatch.setattr(advance_mod.subprocess, "run", fake_run)
    before = copy.deepcopy(state)
    assert advance_mod._reconcile_local_github_sot(
        state, "2026-09-07T00:00:00Z", _cycle()) is False
    assert state == before
    assert not any(command[:3] in (["gh", "label", "create"],
                                   ["gh", "issue", "edit"])
                   for command in calls)
