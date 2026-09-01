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
from datetime import datetime, timedelta, timezone

import pytest

from kiro_crew.cron_script import Report, Skip  # resolved via conftest stub-or-real


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
    def test_none_status_fires_one_spawn_and_sets_pending(self, advance_mod, mock_ctx,
                                                          state_factory, card_factory,
                                                          write_state, read_state):
        card = card_factory(stage="requirements", step_status={})
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert mock_ctx.call_tool.call_count == 1
        args = mock_ctx.call_tool.call_args
        assert args.args[0] == "kirocrew-core"
        assert args.args[1] == "spawn_run"
        out = read_state()["cards"][0]
        assert out["step_status"]["requirements"] == "pending"
        assert "requirements" in out["pending_at"]

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

    def test_autonomous_gate_advances(self, advance_mod, mock_ctx, state_factory,
                                      card_factory, write_state, read_state):
        card = card_factory(stage="gate-spec", step_status={}, trust="autonomous")
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "design"  # ...gate-spec -> design

    def test_approved_gate_advances_even_assisted(self, advance_mod, mock_ctx, state_factory,
                                                  card_factory, write_state, read_state):
        card = card_factory(stage="gate-spec", step_status={"gate-spec": "approved"})
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["stage"] == "design"


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
