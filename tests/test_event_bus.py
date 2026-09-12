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
