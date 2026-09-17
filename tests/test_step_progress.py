"""Regression tests for the live-ish per-step progress trail (step-progress-trail-spec).

card.step_progress[step] is the MISSING MIDDLE between "nothing" (cron slots emit no live
chat_chunk) and the terminal card.step_summaries[step]. The step agent appends bounded
checkpoint lines DURING its run; _bound_step_progress normalizes them (rolling cap, per-note
length, monotonic-safe) and DROPS the trail at terminal (the summary supersedes). It is
presentation-only: never control-authoritative, never in the parity-minimized projection.
"""

from __future__ import annotations

import dlc_yolo_advance as advance


def _card(**over):
    c = {"id": "c1", "step_status": {}, "updated_at": "2026-09-17T00:00:00Z"}
    c.update(over)
    return c


def _trail(*notes):
    return {
        "schema_version": 1,
        "step": "investigate",
        "lines": [{"seq": i + 1, "at": "2026-09-17T00:00:00Z", "phase": "p", "note": n}
                  for i, n in enumerate(notes)],
    }


def test_rolling_cap_keeps_last_n_lines():
    notes = [f"line {i}" for i in range(20)]
    card = _card(step_status={"investigate": "pending"},
                 step_progress={"investigate": _trail(*notes)})
    state = {"cards": [card]}
    assert advance._bound_step_progress(state, "t") is True
    lines = card["step_progress"]["investigate"]["lines"]
    assert len(lines) == advance._STEP_PROGRESS_MAX_LINES
    # kept the TAIL, not the head
    assert lines[-1]["note"] == "line 19"
    assert lines[0]["note"] == f"line {20 - advance._STEP_PROGRESS_MAX_LINES}"


def test_note_and_phase_are_length_bounded():
    long_note = "x" * 400
    long_phase = "y" * 100
    card = _card(step_status={"investigate": "pending"},
                 step_progress={"investigate": {
                     "lines": [{"seq": 1, "at": "2026-09-17T00:00:00Z",
                                "phase": long_phase, "note": long_note}]}})
    state = {"cards": [card]}
    assert advance._bound_step_progress(state, "t") is True
    line = card["step_progress"]["investigate"]["lines"][0]
    assert len(line["note"]) <= advance._STEP_PROGRESS_NOTE_MAX
    assert len(line["phase"]) <= advance._STEP_PROGRESS_PHASE_MAX


def test_trail_dropped_at_terminal_done():
    card = _card(step_status={"investigate": "done"},
                 step_progress={"investigate": _trail("grounded", "verdict")})
    state = {"cards": [card]}
    assert advance._bound_step_progress(state, "t") is True
    assert "investigate" not in card["step_progress"]


def test_trail_dropped_at_terminal_blocked_and_error():
    card = _card(step_status={"design": "blocked", "implement": "error"},
                 step_progress={"design": _trail("a"), "implement": _trail("b")})
    state = {"cards": [card]}
    assert advance._bound_step_progress(state, "t") is True
    assert card["step_progress"] == {}


def test_trail_survives_while_pending():
    card = _card(step_status={"investigate": "pending"},
                 step_progress={"investigate": _trail("still working")})
    state = {"cards": [card]}
    # Already within bounds and non-terminal → nothing to change, trail stays.
    advance._bound_step_progress(state, "t")
    assert "investigate" in card["step_progress"]
    assert card["step_progress"]["investigate"]["lines"][0]["note"] == "still working"


def test_malformed_lines_are_normalized_away():
    card = _card(step_status={"investigate": "pending"},
                 step_progress={"investigate": {"lines": ["not a dict", {"seq": 1, "note": "ok"}]}})
    state = {"cards": [card]}
    assert advance._bound_step_progress(state, "t") is True
    lines = card["step_progress"]["investigate"]["lines"]
    assert len(lines) == 1 and lines[0]["note"] == "ok"


def test_non_dict_entry_pruned():
    card = _card(step_status={"investigate": "pending"},
                 step_progress={"investigate": "garbage"})
    state = {"cards": [card]}
    assert advance._bound_step_progress(state, "t") is True
    assert "investigate" not in card["step_progress"]


def test_progress_trail_never_enters_projection():
    """The parity-minimized projection is an explicit allowlist — free-form trail prose must
    not leak into it (step-progress-trail-spec §7)."""
    card = _card(
        id="c1", pipeline_id="pl1", stage="investigate",
        step_status={"investigate": "pending"},
        step_progress={"investigate": _trail("secret-ish internal note")},
        source={"type": "github", "repo": "o/r", "issue": 32},
    )
    projection, _runs = advance._projection_card(card, None, "t")
    assert "step_progress" not in projection
    # And no trail prose smuggled anywhere in the serialized projection.
    import json
    assert "secret-ish internal note" not in json.dumps(projection)


def test_no_progress_is_noop():
    card = _card(step_status={"investigate": "pending"})
    state = {"cards": [card]}
    assert advance._bound_step_progress(state, "t") is False
