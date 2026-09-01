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
    def test_none_status_fires_one_escalation_and_sets_pending(self, advance_mod, mock_ctx,
                                                              state_factory, card_factory,
                                                              write_state, read_state):
        # Session-as-slot: escalation registers a one-shot AGENT CRON (cron_add) bound to the
        # step's capability profile — NOT a slot-less spawn_run — so the step gets an openable
        # dashboard slot. The mock cron_add returns a MagicMock (no id), so step_sessions may be
        # unrecorded; the contract asserted here is the CALL + the pending transition.
        card = card_factory(stage="requirements", step_status={})
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert mock_ctx.call_tool.call_count == 1
        args = mock_ctx.call_tool.call_args
        assert args.args[0] == "kirocrew-cron"
        assert args.args[1] == "cron_add"
        payload = args.args[2]
        assert payload.get("agent", "").startswith("dlcyolo-")   # bound to a capability profile
        assert payload.get("delay") == 1                          # one-shot, fires immediately (>=1)
        assert payload.get("hide_in_chat") is False              # so the slot actually appears
        assert payload.get("silent") is False                     # MUST be False — silent routes to the
        #                                                           non-creator gateway branch; the openable
        #                                                           slot is only minted on the non-silent path
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


# =========================================================================== #
# TIER 2b — BUDGET GUARD (depth-budget-spec §2/§4; system-model §5 #1)
# =========================================================================== #
class TestBudgetGuard:
    def test_child_count_over_cap_blocks_parent(self, advance_mod, mock_ctx, state_factory,
                                                card_factory, write_state, read_state):
        # standard depth default cap = 3; 4 children -> breach -> non-destructive block.
        card = card_factory(
            stage="design", depth="standard",
            child_tickets=[{"issue": i, "status": "open"} for i in range(4)],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"]["design"] == "blocked"
        assert out["block_reason"]["design"].startswith("budget:")
        # children are NEVER deleted
        assert len(out["child_tickets"]) == 4

    def test_unlimited_budget_never_blocks(self, advance_mod, mock_ctx, state_factory,
                                           card_factory, write_state, read_state):
        card = card_factory(
            stage="design", depth="deep",
            budget={"max_child_cards": "unlimited", "effort_ceiling": "unlimited"},
            child_tickets=[{"issue": i, "status": "open"} for i in range(20)],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"].get("design") != "blocked"

    def test_under_cap_no_block(self, advance_mod, mock_ctx, state_factory, card_factory,
                                write_state, read_state):
        card = card_factory(
            stage="design", depth="standard",
            child_tickets=[{"issue": 1, "status": "open"}, {"issue": 2, "status": "open"}],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"].get("design") != "blocked"

    def test_effort_ceiling_from_computed_scope_blocks(self, advance_mod, mock_ctx, state_factory,
                                                       card_factory, write_state, read_state):
        # deep ceiling = 40; scope sums to 50 -> breach (computed spent, no effort.spent needed).
        card = card_factory(
            stage="design", depth="deep",
            child_tickets=[{"issue": 1, "status": "open"}],
            effort={"scope": {"requirements": 20, "design": 30}},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"]["design"] == "blocked"
        assert "effort" in out["block_reason"]["design"]

    def test_no_children_not_evaluated(self, advance_mod, mock_ctx, state_factory, card_factory,
                                       write_state, read_state):
        # a childless card can't breach a FAN-OUT budget — it is skipped, not blocked.
        card = card_factory(stage="design", depth="quick",
                            step_status={"design": "done"})
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out["step_status"].get("design") != "blocked"


# =========================================================================== #
# TIER 2c — STEP-CRON CLEANUP (session-as-slot bookkeeping)
# =========================================================================== #
class TestStepCronCleanup:
    def test_terminal_step_removes_cron_and_clears_id(self, advance_mod, mock_ctx, state_factory,
                                                      card_factory, write_state, read_state):
        card = card_factory(
            stage="design",
            step_status={"requirements": "advanced", "design": "done"},
            step_sessions={"requirements": {"cron_id": "abc123", "slot_key": "cron-abc123",
                                            "kept": True}},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        # cron_remove was called for the finished step's one-shot job
        calls = [c for c in mock_ctx.call_tool.call_args_list
                 if c.args[:2] == ("kirocrew-cron", "cron_remove")]
        assert len(calls) == 1
        assert calls[0].args[2] == {"job_id": "abc123"}
        ptr = read_state()["cards"][0]["step_sessions"]["requirements"]
        assert "cron_id" not in ptr           # cleared
        assert ptr["slot_key"] == "cron-abc123"  # slot_key retained for UI/history
        assert "retired_at" in ptr

    def test_pending_step_cron_not_removed(self, advance_mod, mock_ctx, state_factory,
                                           card_factory, write_state, read_state):
        # a still-pending step keeps its cron (not terminal) — no cleanup.
        card = card_factory(
            stage="requirements",
            step_status={"requirements": "pending"},
            pending_at={"requirements": _iso(_now())},
            step_sessions={"requirements": {"cron_id": "live99", "kept": True}},
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        removes = [c for c in mock_ctx.call_tool.call_args_list
                   if c.args[:2] == ("kirocrew-cron", "cron_remove")]
        assert len(removes) == 0
        assert read_state()["cards"][0]["step_sessions"]["requirements"]["cron_id"] == "live99"


# =========================================================================== #
# TIER 2d — OWNERSHIP GUARD @ RESOLVE (ownership-guard-spec §3/§6)
# =========================================================================== #
class TestResolveGuard:
    def test_guarded_card_not_retired_when_author_untrusted(self, advance_mod, mock_ctx,
                                                            state_factory, card_factory,
                                                            write_state, read_state, monkeypatch):
        # SECURITY OUTCOME (ownership-guard §6): a github-sot card whose author fails the guard
        # is NEVER resolved/retired. In practice the TOP-OF-LOOP guard catches it first — it
        # guard-blocks the card and skips before the terminal/retire block — so the card is not
        # retired (lifecycle never flips to 'retired'). The resolve-boundary re-check is
        # defense-in-depth behind that. Assert the outcome that matters: not retired + guarded.
        monkeypatch.setattr(advance_mod, "_owner_ok", lambda *a, **k: False)
        card = card_factory(stage="done", sot="github")
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        out = read_state()["cards"][0]
        assert out.get("lifecycle") != "retired"          # never resolved
        assert out.get("guard", {}).get("passed") is False  # guard-blocked, visible

    def test_trusted_card_retires_at_terminal(self, advance_mod, mock_ctx, state_factory,
                                              card_factory, write_state, read_state, monkeypatch):
        monkeypatch.setattr(advance_mod, "_owner_ok", lambda *a, **k: True)
        card = card_factory(stage="done", sot="github")
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[card]))
        assert read_state()["cards"][0]["lifecycle"] == "retired"


# =========================================================================== #
# TIER 2e — PARENT_TICKET SELF-HEAL (§5 gap #4 — harden writers)
# =========================================================================== #
class TestParentTicketSelfHeal:
    def test_bare_int_parent_ticket_normalized_to_dict(self, advance_mod, mock_ctx, state_factory,
                                                       card_factory, write_state, read_state):
        parent = card_factory(stage="requirements",
                              step_status={"requirements": "pending"},
                              pending_at={"requirements": _iso(_now())},
                              source={"type": "github", "repo": "owner/repo", "issue": 41,
                                      "url": "https://x/41"})
        child = card_factory(stage="requirements",
                             step_status={"requirements": "pending"},
                             pending_at={"requirements": _iso(_now())},
                             parent_ticket=41)  # bare int (malformed writer)
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[parent, child]))
        out = {c["id"]: c for c in read_state()["cards"]}
        healed = out[child["id"]]["parent_ticket"]
        assert isinstance(healed, dict)
        assert healed["issue"] == 41
        assert healed["card_id"] == parent["id"]
        assert healed["url"] == "https://x/41"

    def test_dict_parent_ticket_untouched(self, advance_mod, mock_ctx, state_factory,
                                          card_factory, write_state, read_state):
        pt = {"issue": 9, "card_id": "card-parent", "url": "u"}
        child = card_factory(stage="requirements",
                             step_status={"requirements": "pending"},
                             pending_at={"requirements": _iso(_now())},
                             parent_ticket=dict(pt))
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[child]))
        assert read_state()["cards"][0]["parent_ticket"] == pt


# =========================================================================== #
# TIER 2f — CHILD INGESTION + DECOMPOSE FORM-CHANGE (fan-out completeness)
# =========================================================================== #
class TestChildIngestion:
    def test_child_ticket_card_id_null_becomes_driven_card(self, advance_mod, mock_ctx,
                                                           state_factory, card_factory,
                                                           write_state, read_state):
        # a mid-ladder parent with an un-carded child_ticket -> a real child card is created,
        # card_id back-filled, parent marked decomposed.
        parent = card_factory(
            stage="requirements",
            step_status={"requirements": "advanced"},
            child_tickets=[{"issue": 43, "url": "u43", "feature": "f1", "status": "handed-off",
                            "card_id": None}],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[parent]))
        out = read_state()["cards"]
        p = next(c for c in out if c["id"] == parent["id"])
        assert p.get("decomposed")                                   # parent form-changed
        entry = p["child_tickets"][0]
        assert entry["card_id"] is not None                          # back-filled
        child = next(c for c in out if c["id"] == entry["card_id"])
        assert (child["source"] or {}).get("issue") == 43            # driven card exists
        assert child["parent_ticket"]["card_id"] == parent["id"]     # links back
        assert child["stage"]                                        # has a start stage

    def test_decomposed_parent_does_not_run_its_ladder(self, advance_mod, mock_ctx, state_factory,
                                                       card_factory, write_state, read_state):
        # an already-decomposed parent at an agent step is NOT escalated (no cron_add for it).
        parent = card_factory(
            stage="requirements", step_status={},
            decomposed={"at": "x", "children": [43]},
            child_tickets=[{"issue": 43, "card_id": "card-child-43", "status": "open"}],
        )
        child = card_factory(id="card-child-43", stage="requirements", step_status={},
                             source={"type": "github", "repo": "owner/repo", "issue": 43})
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[parent, child]))
        # the parent must not have been escalated; only the child (if any) drives.
        add_calls = [c for c in mock_ctx.call_tool.call_args_list
                     if c.args[:2] == ("kirocrew-cron", "cron_add")
                     and parent["id"] in str(c.args[2])]
        assert len(add_calls) == 0

    def test_consumed_child_ticket_not_re_ingested(self, advance_mod, mock_ctx, state_factory,
                                                   card_factory, write_state, read_state):
        # a consumed child_ticket on a mid-ladder parent creates no new card + no decompose.
        parent = card_factory(
            stage="requirements", step_status={"requirements": "advanced"},
            child_tickets=[{"issue": 44, "status": "consumed", "card_id": None}],
        )
        _run(advance_mod, mock_ctx, write_state, state_factory(cards=[parent]))
        out = read_state()["cards"]
        assert not any((c.get("source") or {}).get("issue") == 44 for c in out)  # no card made
        p = next(c for c in out if c["id"] == parent["id"])
        assert not p.get("decomposed")
