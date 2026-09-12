"""Regression: a non-mutating agent step must NOT require a worktree lease just
because the pipeline has ``results_in_repo`` set, when ``repo_path`` is unset.

Root cause of the pl-rps3d wedge: ``investigate`` (a crew-dispatching step ->
``coordinator`` capability) was treated as worktree-requiring because
``results_in_repo=True``, then ``_ensure_worktree_lease`` failed on the
unconfigured ``repo_path`` and the card was blocked forever at ``investigate``.
A read/dispatch step must be able to proceed and get a session regardless; only
a step that actually mutates the repo (``builder``, or authoring/coordinator
with a REAL ``repo_path`` to mirror results into) needs a lease.
"""

from __future__ import annotations

import dlc_yolo_advance as advance


def _investigate_step():
    # investigate dispatches a crew -> resolves to coordinator capability.
    return {"id": "investigate", "type": "agent",
            "agent": {"name": "investigate-agent", "crew": "dlcyolo-x-market"}}


def _implement_step():
    return {"id": "implement", "type": "agent", "agent": {"name": "impl-agent"}}


def test_investigate_not_wedged_when_results_in_repo_but_no_repo_path():
    card = {"id": "c1", "stage": "investigate"}
    step = _investigate_step()
    pl = {"id": "pl-x", "results_in_repo": True, "repo_path": None}
    # THE FIX: no repo_path -> no worktree requirement -> the step can escalate.
    assert advance._step_requires_worktree(card, step, pl) is False


def test_investigate_requires_worktree_once_repo_path_is_set():
    card = {"id": "c1", "stage": "investigate"}
    step = _investigate_step()
    pl = {"id": "pl-x", "results_in_repo": True, "repo_path": "/abs/checkout"}
    # With a real checkout, results mirroring genuinely needs a lease.
    assert advance._step_requires_worktree(card, step, pl) is True


def test_investigate_no_worktree_when_results_in_repo_off():
    card = {"id": "c1", "stage": "investigate"}
    step = _investigate_step()
    pl = {"id": "pl-x", "results_in_repo": False, "repo_path": "/abs/checkout"}
    assert advance._step_requires_worktree(card, step, pl) is False


def test_builder_always_requires_worktree_even_without_repo_path():
    # A code-writing step must still require a lease (it self-blocks with a clear
    # reason when repo_path is missing — it genuinely cannot write code without one).
    card = {"id": "c1", "stage": "implement"}
    step = _implement_step()
    pl = {"id": "pl-x", "results_in_repo": False, "repo_path": None}
    assert advance._step_requires_worktree(card, step, pl) is True


def test_explicit_requires_worktree_flag_wins():
    card = {"id": "c1", "requires_worktree": True}
    step = _investigate_step()
    pl = {"id": "pl-x", "results_in_repo": False, "repo_path": None}
    assert advance._step_requires_worktree(card, step, pl) is True
