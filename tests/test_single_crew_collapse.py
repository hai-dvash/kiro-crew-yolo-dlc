"""Single-crew inline-collapse tests (single-crew-inline-collapse-spec §4). The deterministic
classifier decides, from stable facts, when a lone-crew step runs INLINE on the crew's own profile
(one session) vs stays a coordinator→crew delegation (fan-out). No LLM, no prompt dependence; the
collapsed profile is never wider than the coordinator it replaces.
"""

from __future__ import annotations

import dlc_yolo_advance as advance


def _step(sid="investigate", crew="dlcyolo-market", addenda=None, cap=None, force=False):
    step = {"id": sid, "type": "agent", "agent": {"name": f"{sid}-agent"}}
    if crew:
        step["agent"]["crew"] = crew
    if addenda:
        step["addenda"] = addenda
    if cap:
        step["capability"] = cap
    if force:
        step["force_delegate"] = True
    return step


def test_single_crew_fires_investigate_readonly():
    ok, crew, profile = advance._single_crew_inline({}, _step("investigate", crew="dlcyolo-market"))
    assert ok is True
    assert crew == "dlcyolo-market"
    assert profile == "dlcyolo-readonly"        # investigate role default, ≤ coordinator


def test_single_crew_implement_is_builder():
    ok, _, profile = advance._single_crew_inline({}, _step("implement", crew="c1"))
    assert ok is True and profile == "dlcyolo-builder"


def test_explicit_capability_wins():
    ok, _, profile = advance._single_crew_inline({}, _step("design", crew="c1", cap="authoring"))
    assert ok is True and profile == "dlcyolo-authoring"


def test_coordinator_capability_narrows_on_collapse():
    # a single-crew leaf never needs routing scope — coordinator narrows to authoring
    ok, _, profile = advance._single_crew_inline({}, _step("design", crew="c1", cap="coordinator"))
    assert ok is True and profile == "dlcyolo-authoring"


def test_addenda_stays_delegated():
    ok, crew, profile = advance._single_crew_inline({}, _step("design", crew="c1", addenda=["secure-design"]))
    assert ok is False


def test_fanout_topology_stays_delegated():
    card = {"topology": {"action": "fan-out"}}
    ok, _, _ = advance._single_crew_inline(card, _step("design", crew="c1"))
    assert ok is False


def test_force_delegate_stays_delegated():
    ok, _, _ = advance._single_crew_inline({}, _step("design", crew="c1", force=True))
    assert ok is False


def test_no_crew_is_not_single_crew():
    ok, _, _ = advance._single_crew_inline({}, _step("tasks", crew=None))
    assert ok is False
