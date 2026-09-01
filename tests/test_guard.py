"""Tier 3 — DLC-YOLO OWNERSHIP GUARD unit tests (docs/unit-testing-spec.md).

Targets the security-critical author-trust guard in crons/dlc_yolo_advance.py:
  _owner_ok / _trusted_authors / _auth_user  +  the guard gate inside advance().

Harness (no external deps — stdlib unittest.mock only, pytest-mock is not installed):
  * a `kiro_crew.cron_script` sys.modules stub providing Report / Skip / Done
    exception classes, installed BEFORE the module under test is imported;
  * DLC_YOLO_STATE pointed at a per-test tmp file so no real ~/.dlc-yolo is touched;
  * subprocess.run patched to a fake CompletedProcess returning a chosen
    `gh issue view --json author` JSON payload.

Run:  python3 -m pytest tests/test_guard.py -q
"""

from __future__ import annotations

import importlib
import json
import subprocess
import sys
import types
from pathlib import Path

import pytest


# --------------------------------------------------------------------------- #
# kiro_crew.cron_script stub — installed before the module under test imports  #
# --------------------------------------------------------------------------- #
def _install_cron_script_stub() -> None:
    if "kiro_crew.cron_script" in sys.modules:
        return
    pkg = sys.modules.get("kiro_crew")
    if pkg is None:
        pkg = types.ModuleType("kiro_crew")
        pkg.__path__ = []  # mark as package
        sys.modules["kiro_crew"] = pkg
    cron_script = types.ModuleType("kiro_crew.cron_script")

    class Report(Exception):
        """deliver a message and keep the job running."""

    class Skip(Exception):
        """silent retry / no-op this cycle."""

    class Done(Exception):
        """deliver a message and remove the job."""

    cron_script.Report = Report
    cron_script.Skip = Skip
    cron_script.Done = Done
    sys.modules["kiro_crew.cron_script"] = cron_script
    pkg.cron_script = cron_script


_install_cron_script_stub()


# --------------------------------------------------------------------------- #
# Fixtures                                                                      #
# --------------------------------------------------------------------------- #
CRON_PATH = Path(__file__).resolve().parents[1] / "crons"


@pytest.fixture
def mod(tmp_path, monkeypatch):
    """Import dlc_yolo_advance fresh with DLC_YOLO_STATE -> a tmp file, and its
    module-level author caches cleared, so each test is isolated."""
    monkeypatch.setenv("DLC_YOLO_STATE", str(tmp_path / "state.json"))
    if str(CRON_PATH) not in sys.path:
        sys.path.insert(0, str(CRON_PATH))
    m = importlib.import_module("dlc_yolo_advance")
    m = importlib.reload(m)  # re-resolve STATE against the tmp env var
    # STATE is resolved at import time from the env var; assert we're pointed at tmp
    assert str(tmp_path) in str(m.STATE)
    m._AUTH_USER_CACHE.clear()
    m._ISSUE_AUTHOR_CACHE.clear()
    return m


class _FakeProc:
    def __init__(self, returncode=0, stdout=""):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = ""


def _author_json(login):
    return json.dumps({"author": {"login": login}})


@pytest.fixture
def mock_ctx():
    from unittest.mock import MagicMock
    ctx = MagicMock()
    ctx.call_tool = MagicMock()
    ctx.notify = MagicMock()
    return ctx


def _card(**over):
    card = {
        "id": "card-1",
        "title": "Test card",
        "stage": "requirements",
        "sot": "github",
        "source": {"type": "github", "repo": "owner/repo", "issue": 42},
        "step_status": {},
    }
    card.update(over)
    return card


def _state(cards, config=None, pipelines=None):
    return {
        "config": config or {"trust": "assisted", "depth": "standard"},
        "pipelines": pipelines or [],
        "cards": cards,
    }


def _run_advance(mod, state, ctx):
    """Persist `state`, run advance(ctx), swallow the terminal Skip/Report, and
    return the reloaded state so transitions can be asserted."""
    mod._save(state)
    try:
        mod.advance(ctx)
    except (mod.Skip if hasattr(mod, "Skip") else Exception):
        pass
    except Exception as e:  # Report/Skip from the stub
        name = type(e).__name__
        if name not in ("Report", "Skip", "Done"):
            raise
    return mod._load()


# --------------------------------------------------------------------------- #
# _trusted_authors resolution: card > pipeline > config > [auth user]          #
# --------------------------------------------------------------------------- #
def test_trusted_authors_card_over_pipeline_over_config(mod):
    card = _card(trusted_authors=["carol"])
    pl = {"trusted_authors": ["bob"]}
    state = _state([card], config={"trusted_authors": ["alice"]})
    assert mod._trusted_authors(state, card, pl) == ["carol"]


def test_trusted_authors_pipeline_over_config(mod):
    card = _card()
    pl = {"trusted_authors": ["bob"]}
    state = _state([card], config={"trusted_authors": ["alice"]})
    assert mod._trusted_authors(state, card, pl) == ["bob"]


def test_trusted_authors_config_fallback(mod):
    card = _card()
    state = _state([card], config={"trusted_authors": ["alice"]})
    assert mod._trusted_authors(state, card, None) == ["alice"]


def test_trusted_authors_empty_config_falls_back_to_auth_user(mod, monkeypatch):
    """Empty config must NOT mean allow-all — it resolves to the gh-auth user only."""
    monkeypatch.setattr(mod, "_auth_user", lambda: "haid")
    card = _card()
    state = _state([card], config={})
    assert mod._trusted_authors(state, card, None) == ["haid"]


def test_trusted_authors_no_auth_user_is_empty_not_allow_all(mod, monkeypatch):
    monkeypatch.setattr(mod, "_auth_user", lambda: None)
    card = _card()
    state = _state([card], config={})
    assert mod._trusted_authors(state, card, None) == []  # empty -> guard fails closed


# --------------------------------------------------------------------------- #
# _auth_user                                                                    #
# --------------------------------------------------------------------------- #
def test_auth_user_parses_login_and_caches(mod, monkeypatch):
    calls = []

    def fake_run(cmd, **kw):
        calls.append(cmd)
        return _FakeProc(returncode=0, stdout="haid\n")

    monkeypatch.setattr(subprocess, "run", fake_run)
    assert mod._auth_user() == "haid"
    assert mod._auth_user() == "haid"  # cached
    assert len(calls) == 1  # only one gh api user call


def test_auth_user_nonzero_returns_none(mod, monkeypatch):
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: _FakeProc(returncode=1, stdout=""))
    assert mod._auth_user() is None


# --------------------------------------------------------------------------- #
# _owner_ok — the core guard                                                    #
# --------------------------------------------------------------------------- #
def test_owner_ok_author_trusted_true(mod, monkeypatch):
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: _FakeProc(0, _author_json("alice")))
    card = _card(trusted_authors=["alice"])
    state = _state([card])
    assert mod._owner_ok(state, card, None) is True


def test_owner_ok_author_not_trusted_false(mod, monkeypatch):
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: _FakeProc(0, _author_json("mallory")))
    card = _card(trusted_authors=["alice"])
    state = _state([card])
    assert mod._owner_ok(state, card, None) is False


def test_owner_ok_gh_nonzero_fails_closed(mod, monkeypatch):
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: _FakeProc(returncode=1, stdout=""))
    card = _card(trusted_authors=["alice"])
    state = _state([card])
    assert mod._owner_ok(state, card, None) is False


def test_owner_ok_subprocess_raises_fails_closed(mod, monkeypatch):
    def boom(cmd, **kw):
        raise OSError("gh not found")

    monkeypatch.setattr(subprocess, "run", boom)
    card = _card(trusted_authors=["alice"])
    state = _state([card])
    assert mod._owner_ok(state, card, None) is False


def test_owner_ok_subprocess_timeout_fails_closed(mod, monkeypatch):
    def boom(cmd, **kw):
        raise subprocess.TimeoutExpired(cmd, 20)

    monkeypatch.setattr(subprocess, "run", boom)
    card = _card(trusted_authors=["alice"])
    state = _state([card])
    assert mod._owner_ok(state, card, None) is False


def test_owner_ok_sot_local_true_no_gh(mod, monkeypatch):
    called = []
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: called.append(cmd) or _FakeProc(0, ""))
    card = _card(sot="local")
    state = _state([card])
    assert mod._owner_ok(state, card, None) is True
    assert called == []  # never invoked gh for a local card


def test_owner_ok_no_trusted_set_fails_closed(mod, monkeypatch):
    """No configured trusted authors and no gh-auth user -> cannot resolve -> False."""
    monkeypatch.setattr(mod, "_auth_user", lambda: None)
    called = []
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: called.append(cmd) or _FakeProc(0, ""))
    card = _card()  # no trusted_authors anywhere
    state = _state([card], config={})
    assert mod._owner_ok(state, card, None) is False
    assert called == []  # short-circuits before the gh call


def test_owner_ok_missing_repo_or_issue_fails_closed(mod, monkeypatch):
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: _FakeProc(0, _author_json("alice")))
    card = _card(trusted_authors=["alice"], source={"type": "github"})  # no repo/issue
    state = _state([card])
    assert mod._owner_ok(state, card, None) is False


# --------------------------------------------------------------------------- #
# author cache — 2nd card same (repo,issue) must not re-invoke subprocess       #
# --------------------------------------------------------------------------- #
def test_owner_ok_author_cache_avoids_second_gh_call(mod, monkeypatch):
    calls = []

    def fake_run(cmd, **kw):
        calls.append(cmd)
        return _FakeProc(0, _author_json("alice"))

    monkeypatch.setattr(subprocess, "run", fake_run)
    c1 = _card(id="card-1", trusted_authors=["alice"])
    c2 = _card(id="card-2", trusted_authors=["alice"])  # same repo+issue
    state = _state([c1, c2])
    assert mod._owner_ok(state, c1, None) is True
    assert mod._owner_ok(state, c2, None) is True
    assert len(calls) == 1  # cached (repo,issue) author -> one gh call total


# --------------------------------------------------------------------------- #
# advance() guard gate — end-to-end state transitions                          #
# --------------------------------------------------------------------------- #
def test_advance_untrusted_author_blocks_card(mod, monkeypatch, mock_ctx):
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: _FakeProc(0, _author_json("mallory")))
    card = _card(trusted_authors=["alice"])
    out = _run_advance(mod, _state([card]), mock_ctx)
    c = out["cards"][0]
    assert c["guard"]["passed"] is False
    assert c["step_status"]["requirements"] == "blocked"
    assert c["block_reason"]["requirements"] == "ownership guard failed"
    # a blocked-by-guard card must never be escalated
    mock_ctx.call_tool.assert_not_called()


def test_advance_gh_nonzero_blocks_card_fail_closed(mod, monkeypatch, mock_ctx):
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: _FakeProc(returncode=1, stdout=""))
    card = _card(trusted_authors=["alice"])
    out = _run_advance(mod, _state([card]), mock_ctx)
    c = out["cards"][0]
    assert c["guard"]["passed"] is False
    assert c["step_status"]["requirements"] == "blocked"


def test_advance_subprocess_raises_blocks_card_fail_closed(mod, monkeypatch, mock_ctx):
    def boom(cmd, **kw):
        raise OSError("gh missing")

    monkeypatch.setattr(subprocess, "run", boom)
    card = _card(trusted_authors=["alice"])
    out = _run_advance(mod, _state([card]), mock_ctx)
    c = out["cards"][0]
    assert c["guard"]["passed"] is False
    assert c["step_status"]["requirements"] == "blocked"


def test_advance_local_card_not_guard_blocked(mod, monkeypatch, mock_ctx):
    """sot=local -> guard passes, card is not blocked by the guard (it escalates instead)."""
    called = []
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: called.append(cmd) or _FakeProc(0, ""))
    card = _card(sot="local")
    out = _run_advance(mod, _state([card]), mock_ctx)
    c = out["cards"][0]
    # not guard-blocked
    assert c.get("guard", {}).get("passed") is not False
    assert (c.get("block_reason") or {}).get("requirements") != "ownership guard failed"


def test_advance_guard_does_not_overwrite_done(mod, monkeypatch, mock_ctx):
    """OFFLINE-WEDGE REGRESSION: a transient gh outage must NOT clobber a step that
    already legitimately reached a terminal status (done/approved/advanced)."""
    for terminal in ("done", "approved", "advanced"):
        monkeypatch.setattr(subprocess, "run",
                            lambda cmd, **kw: _FakeProc(returncode=1, stdout=""))
        card = _card(trusted_authors=["alice"], step_status={"requirements": terminal})
        out = _run_advance(mod, _state([card]), mock_ctx)
        c = out["cards"][0]
        # guard is flagged failed, but the existing terminal status is preserved
        assert c["guard"]["passed"] is False, terminal
        assert c["step_status"]["requirements"] == terminal, terminal
        assert (c.get("block_reason") or {}).get("requirements") != "ownership guard failed", terminal


def test_advance_guard_clears_when_author_later_trusted(mod, monkeypatch, mock_ctx):
    """A card previously guard-blocked (guard.passed=False + guard-set 'blocked') must
    have both cleared once the author becomes trusted."""
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: _FakeProc(0, _author_json("alice")))
    card = _card(
        trusted_authors=["alice"],
        guard={"passed": False, "reason": "prev", "at": "2020-01-01T00:00:00Z"},
        step_status={"requirements": "blocked"},
        block_reason={"requirements": "ownership guard failed"},
    )
    out = _run_advance(mod, _state([card]), mock_ctx)
    c = out["cards"][0]
    assert c["guard"]["passed"] is True
    # the guard-set 'blocked' + block_reason were cleared, so the card can resume
    assert (c.get("step_status") or {}).get("requirements") != "blocked"
    assert (c.get("block_reason") or {}).get("requirements") != "ownership guard failed"


def test_advance_guard_clear_preserves_nonguard_block(mod, monkeypatch, mock_ctx):
    """Clearing the guard must leave a NON-guard block_reason (a real human block) alone."""
    monkeypatch.setattr(subprocess, "run",
                        lambda cmd, **kw: _FakeProc(0, _author_json("alice")))
    card = _card(
        trusted_authors=["alice"],
        guard={"passed": False, "reason": "prev", "at": "2020-01-01T00:00:00Z"},
        step_status={"requirements": "blocked"},
        block_reason={"requirements": "needs a data-model decision"},
    )
    out = _run_advance(mod, _state([card]), mock_ctx)
    c = out["cards"][0]
    assert c["guard"]["passed"] is True
    # a real (non-guard) block must survive the guard-clear
    assert c["step_status"]["requirements"] == "blocked"
    assert c["block_reason"]["requirements"] == "needs a data-model decision"


def test_owner_ok_transient_exception_not_cached_retries(mod, monkeypatch):
    """A subprocess exception (transient) must NOT be cached: the next tick re-invokes
    gh and can succeed. (A gh returncode!=0 caches None; an exception does not.)"""
    seq = [OSError("gh flaky"), _author_json("alice")]

    def flaky(cmd, **kw):
        item = seq.pop(0)
        if isinstance(item, Exception):
            raise item
        return _FakeProc(0, item)

    monkeypatch.setattr(subprocess, "run", flaky)
    card = _card(trusted_authors=["alice"])
    state = _state([card])
    assert mod._owner_ok(state, card, None) is False   # transient failure -> fail closed
    assert mod._owner_ok(state, card, None) is True     # retried, not cached from the failure


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
