"""F1 regression tests (event-driven-backlog-intake-spec): the zero-token backlog discovery scan
that replaced the LLM cron. It lists open dlc-backlog issues, authoritatively refetches, applies the
fail-closed trusted-author guard, and creates intake cards — READ + CREATE only, bounded, no LLM.
"""

from __future__ import annotations

from unittest import mock

import dlc_yolo_advance as advance


def _state(**over):
    s = {"config": {"trust": "assisted", "depth": "standard"},
         "pipelines": [{"id": "pl1", "repo": "o/r", "trusted_authors": ["alice"]}],
         "cards": []}
    s.update(over)
    return s


def _run(state, issues, snapshot):
    with mock.patch.object(advance, "_backlog_list_issues", return_value=issues), \
         mock.patch.object(advance, "_github_issue_snapshot", return_value=(snapshot, None)):
        return advance._process_backlog_intake(mock.MagicMock(), state, "t1")


def test_creates_intake_card_for_trusted_open_issue():
    state = _state()
    changed = _run(state, [{"number": 42}],
                   {"state": "OPEN", "title": "Parked idea", "url": "u", "author": "alice"})
    assert changed
    card = state["cards"][0]
    assert card["stage"] == "intake"
    assert card["source"] == {"type": "github", "repo": "o/r", "issue": 42, "url": "u"}
    assert card["guard"]["passed"] is True and card["guard"]["author"] == "alice"
    assert card["backlog_origin"]["label"] == "dlc-backlog"


def test_skips_issue_that_already_has_a_card():
    state = _state(cards=[{"id": "c-existing", "source": {"repo": "o/r", "issue": 42}}])
    changed = _run(state, [{"number": 42}],
                   {"state": "OPEN", "title": "x", "url": "u", "author": "alice"})
    assert changed is False
    assert len(state["cards"]) == 1


def test_fail_closed_on_untrusted_author():
    state = _state()
    changed = _run(state, [{"number": 7}],
                   {"state": "OPEN", "title": "x", "url": "u", "author": "mallory"})
    assert changed is False
    assert state["cards"] == []


def test_respects_backlog_intake_opt_out():
    state = _state(pipelines=[{"id": "pl1", "repo": "o/r", "trusted_authors": ["alice"], "backlog_intake": False}])
    changed = _run(state, [{"number": 42}],
                   {"state": "OPEN", "title": "x", "url": "u", "author": "alice"})
    assert changed is False
    assert state["cards"] == []


def test_skips_closed_issue():
    state = _state()
    changed = _run(state, [{"number": 9}],
                   {"state": "CLOSED", "title": "x", "url": "u", "author": "alice"})
    assert changed is False


def test_empty_trusted_set_is_fail_closed():
    # no trusted_authors on pipeline/config and _auth_user returns nothing → deny
    state = {"config": {}, "pipelines": [{"id": "pl1", "repo": "o/r"}], "cards": []}
    with mock.patch.object(advance, "_auth_user", return_value=""):
        changed = _run(state, [{"number": 1}],
                       {"state": "OPEN", "title": "x", "url": "u", "author": "alice"})
    assert changed is False
    assert state["cards"] == []
