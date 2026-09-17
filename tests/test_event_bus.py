"""Unit tests for the Priority 7 in-process local event bus."""

from __future__ import annotations

import pytest


class TestLocalEventBus:
    def test_priority_order_and_follow_on_cascade(self, advance_mod):
        state = {"seen": []}
        bus = advance_mod._LocalEventBus()

        def handle(state, event):
            state["seen"].append(event["data"]["name"])
            follow = []
            if event["data"]["name"] == "first":
                follow.append(advance_mod._local_event(
                    "record", {"name": "cascade"}, event_id="cascade", priority=20))
            return True, follow

        bus.register("record", 20, handle)
        bus.emit("record", {"name": "last"}, event_id="last", priority=40)
        bus.emit("record", {"name": "first"}, event_id="first", priority=10)

        assert bus.run(state) is True
        assert state["seen"] == ["first", "cascade", "last"]
        assert bus.dispatched == 3

    def test_duplicate_event_id_is_dispatched_once(self, advance_mod):
        state = {"count": 0}
        bus = advance_mod._LocalEventBus()

        def handle(state, _event):
            state["count"] += 1
            return True, []

        bus.register("once", 30, handle)
        assert bus.emit("once", event_id="evt-1") is True
        assert bus.emit("once", event_id="evt-1") is False
        assert bus.run(state) is True
        assert state["count"] == 1

    def test_unhandled_event_is_visible_but_not_a_state_change(self, advance_mod):
        bus = advance_mod._LocalEventBus()
        assert bus.emit("unknown", {"card_id": "card-1"}, event_id="unknown-1") is True

        assert bus.run({}) is False
        assert [event["type"] for event in bus.unhandled] == ["unknown"]

    def test_cascade_depth_is_bounded(self, advance_mod):
        bus = advance_mod._LocalEventBus(max_depth=1)

        def loop(_state, event):
            number = int(event["data"].get("number", 0)) + 1
            return False, [advance_mod._local_event(
                "loop", {"number": number}, event_id=f"loop-{number}")]

        bus.register("loop", 30, loop)
        bus.emit("loop", {"number": 0}, event_id="loop-0")

        with pytest.raises(RuntimeError, match="cascade depth exceeded"):
            bus.run({})

    def test_dispatch_count_is_bounded(self, advance_mod):
        bus = advance_mod._LocalEventBus(max_dispatches=1)
        bus.register("noop", 30, lambda _state, _event: (False, []))
        bus.emit("noop", event_id="one")
        bus.emit("noop", event_id="two")

        with pytest.raises(RuntimeError, match="dispatch cap exceeded"):
            bus.run({})


class TestWakeTelemetry:
    """Part I / IV.1 — observation-only trigger-vs-poll attribution. Never alters dispatch."""

    def test_driving_band_is_lowest_changed_band(self, advance_mod):
        # A terminal (band 30) event and a poll (band 50) event both change; the earliest-firing
        # changed band (30) is the driver, per the "trigger beat the poll" case we want to see.
        bus = advance_mod._LocalEventBus()
        bus.register("io.dlcyolo.step.completed", 30, lambda _s, _e: (True, []))
        bus.register("io.dlcyolo.state.observed", 50, lambda _s, _e: (True, []))
        bus.emit("io.dlcyolo.state.observed", event_id="poll", priority=50)
        bus.emit("io.dlcyolo.step.completed", event_id="term", priority=30)

        assert bus.run({}) is True
        assert bus.driving_band == 30
        assert bus.changes_by_band == {30: 1, 50: 1}

    def test_no_change_leaves_driving_band_none(self, advance_mod):
        bus = advance_mod._LocalEventBus()
        bus.register("io.dlcyolo.state.observed", 50, lambda _s, _e: (False, []))
        bus.emit("io.dlcyolo.state.observed", event_id="poll", priority=50)

        assert bus.run({}) is False
        assert bus.driving_band is None
        assert bus.changes_by_band == {}

    def test_max_depth_reached_tracks_cascade(self, advance_mod):
        bus = advance_mod._LocalEventBus()

        def once(_state, event):
            if event["data"].get("n", 0) < 2:
                return True, [advance_mod._local_event(
                    "step", {"n": event["data"].get("n", 0) + 1},
                    event_id=f"s{event['data'].get('n', 0) + 1}", priority=30)]
            return True, []

        bus.register("step", 30, once)
        bus.emit("step", {"n": 0}, event_id="s0", priority=30)
        assert bus.run({}) is True
        assert bus.max_depth_reached == 2

    def test_recorder_labels_terminal_trigger(self, advance_mod):
        bus = advance_mod._LocalEventBus()
        bus.driving_band = 30
        bus.changes_by_band = {30: 2}
        bus.dispatched = 4
        bus.max_depth_reached = 1
        state: dict = {}
        cycle = {"moved": ["card-1"], "passes_run": True}
        advance_mod._record_wake_telemetry(state, bus, cycle, "2026-09-18T00:00:00Z")

        tele = state["wake_telemetry"]
        assert tele["schema_version"] == advance_mod._WAKE_TELEMETRY_SCHEMA_VERSION
        assert tele["counts"] == {"terminal-trigger": 1}
        entry = tele["recent"][-1]
        assert entry["source"] == "terminal-trigger"
        assert entry["moves"] == 1
        assert entry["dispatched"] == 4
        assert entry["depth"] == 1
        assert entry["by_band"] == {"30": 2}

    def test_recorder_labels_poll_when_passes_ran_without_change(self, advance_mod):
        bus = advance_mod._LocalEventBus()  # driving_band stays None
        state: dict = {}
        advance_mod._record_wake_telemetry(
            state, bus, {"moved": [], "passes_run": True}, "2026-09-18T00:00:01Z")
        assert state["wake_telemetry"]["recent"][-1]["source"] == "poll"

    def test_recorder_labels_idle_when_nothing_ran(self, advance_mod):
        bus = advance_mod._LocalEventBus()
        state: dict = {}
        advance_mod._record_wake_telemetry(
            state, bus, {"moved": [], "passes_run": False}, "2026-09-18T00:00:02Z")
        assert state["wake_telemetry"]["recent"][-1]["source"] == "idle"

    def test_recent_window_is_bounded(self, advance_mod):
        state: dict = {}
        for i in range(advance_mod._WAKE_TELEMETRY_WINDOW + 25):
            bus = advance_mod._LocalEventBus()
            bus.driving_band = 50
            advance_mod._record_wake_telemetry(
                state, bus, {"moved": [], "passes_run": True}, f"2026-09-18T00:{i:02d}:00Z")
        tele = state["wake_telemetry"]
        assert len(tele["recent"]) == advance_mod._WAKE_TELEMETRY_WINDOW
        # counts is cumulative and NOT truncated by the window
        assert tele["counts"]["poll"] == advance_mod._WAKE_TELEMETRY_WINDOW + 25

    def test_telemetry_never_enters_projection(self, advance_mod):
        # wake_telemetry is a top-level state key; the projection top-level builder is a strict
        # allowlist, so it is excluded by construction. Assert the serialized projection is clean.
        state = {
            "wake_telemetry": {
                "schema_version": 1, "counts": {"poll": 3},
                "recent": [{"at": "2026-09-18T00:00:00Z", "source": "poll"}],
            },
            "pipelines": [], "cards": [],
        }
        projections = advance_mod._runtime_projections(state, "2026-09-18T00:00:00Z")
        serialized = __import__("json").dumps(projections)
        assert "wake_telemetry" not in serialized
        assert "terminal-trigger" not in serialized
