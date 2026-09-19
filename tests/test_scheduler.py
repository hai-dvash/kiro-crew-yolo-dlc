"""Master Priority 9 — bounded DAG scheduler regressions."""

from __future__ import annotations


def _cycle(max_escalations=2, max_moves=3):
    return {
        "moved": [], "waiting_gates": [],
        "max_escalations": max_escalations, "max_moves": max_moves,
        "escalations": 0, "moves": 0,
        "scheduler_dirty": False, "scheduler_control_changed": False,
    }


def _node(card):
    store = card["execution_schedule"]
    return store["nodes"][store["current_node_id"]]


def _pipeline(pipeline_id="pl-1", limit=2):
    return {
        "id": pipeline_id,
        "repo": f"owner/{pipeline_id}",
        "trust": "assisted",
        "depth": "standard",
        "scheduler": {"max_parallel_runs": limit},
        "steps": [
            {"id": "requirements", "type": "agent", "capability": "authoring"},
            {"id": "integrate", "type": "agent", "capability": "authoring",
             "scheduler": {"concurrency_class": "exclusive"}},
        ],
    }


class TestReadySet:
    def test_dependency_cycle_fails_closed_without_dispatch(
            self, advance_mod, state_factory, card_factory):
        first = card_factory(id="card-a", depends_on=["card-b"])
        second = card_factory(id="card-b", depends_on=["card-a"])
        state = state_factory(cards=[first, second], pipelines=[_pipeline()])

        selected, changed = advance_mod._scheduler_plan(
            state, "2026-09-06T00:00:00Z", _cycle())

        assert changed is True
        assert selected == set()
        assert _node(first)["status"] == "blocked"
        assert _node(second)["status"] == "blocked"
        assert _node(first)["wait_reasons"] == ["dependency-cycle"]

    def test_priority_then_oldest_ready_then_critical_path(self, advance_mod, state_factory,
                                                            card_factory):
        low = card_factory(id="card-low", scheduler={"priority": 90})
        high = card_factory(id="card-high", scheduler={"priority": 10})
        state = state_factory(cards=[low, high], pipelines=[_pipeline(limit=2)])

        selected, _ = advance_mod._scheduler_plan(
            state, "2026-09-06T00:00:00Z", _cycle(max_escalations=1))

        assert selected == {advance_mod._scheduler_node_id(high, "requirements")}
        assert _node(high)["status"] == "permit-acquired"
        assert _node(low)["status"] == "queued"
        assert "cycle-dispatch-cap" in _node(low)["wait_reasons"]

    def test_failed_dispatch_archives_permit_and_reacquires_fresh_timestamp(
            self, advance_mod, state_factory, card_factory):
        card = card_factory(id="card-retry")
        state = state_factory(cards=[card], pipelines=[_pipeline(limit=1)])
        node_id = advance_mod._scheduler_node_id(card, "requirements")

        selected, _ = advance_mod._scheduler_plan(
            state, "2026-09-06T00:00:00Z", _cycle(max_escalations=1))
        assert selected == {node_id}
        first_permit = _node(card)["permit_id"]

        assert advance_mod._scheduler_mark_dispatch_failed(
            card, node_id, "2026-09-06T00:00:01Z", "test-dispatch-failed") is True
        node = _node(card)
        assert node["status"] == "queued"
        assert "permit_id" not in node
        assert "permit_acquired_at" not in node
        assert node["permit_attempt_count"] == 1
        assert node["permit_attempts"] == [{
            "attempt": 1,
            "permit_id": first_permit,
            "acquired_at": "2026-09-06T00:00:00Z",
            "released_at": "2026-09-06T00:00:01Z",
            "release_reason": "dispatch-not-started",
            "dispatch_error": "test-dispatch-failed",
        }]

        selected, _ = advance_mod._scheduler_plan(
            state, "2026-09-06T00:00:02Z", _cycle(max_escalations=1))
        assert selected == {node_id}
        assert node["permit_acquired_at"] == "2026-09-06T00:00:02Z"
        assert node["permit_id"] != first_permit
        assert "permit_released_at" not in node
        assert "permit_release_reason" not in node

    def test_required_dependency_waits_then_becomes_ready(self, advance_mod, state_factory,
                                                           card_factory):
        prerequisite = card_factory(id="card-prereq", step_status={"requirements": "pending"},
                                    pending_at={"requirements": "2026-09-06T00:00:00Z"})
        dependent = card_factory(id="card-dependent", depends_on=["card-prereq"])
        state = state_factory(cards=[prerequisite, dependent], pipelines=[_pipeline(limit=2)])
        selected, _ = advance_mod._scheduler_plan(
            state, "2026-09-06T00:01:00Z", _cycle())
        assert advance_mod._scheduler_node_id(dependent, "requirements") not in selected
        assert _node(dependent)["status"] == "dependency-wait"

        prerequisite["stage"] = "done"
        prerequisite["lifecycle"] = "retired"
        selected, _ = advance_mod._scheduler_plan(
            state, "2026-09-06T00:02:00Z", _cycle())
        assert advance_mod._scheduler_node_id(dependent, "requirements") in selected

    def test_pipeline_semaphore_and_distinct_pipeline_parallelism(
            self, advance_mod, state_factory, card_factory):
        one = card_factory(id="card-one", pipeline_id="pl-a",
                           source={"repo": "owner/pl-a", "issue": 1})
        two = card_factory(id="card-two", pipeline_id="pl-a",
                           source={"repo": "owner/pl-a", "issue": 2})
        three = card_factory(id="card-three", pipeline_id="pl-b",
                             source={"repo": "owner/pl-b", "issue": 3})
        state = state_factory(
            cards=[one, two, three],
            pipelines=[_pipeline("pl-a", 1), _pipeline("pl-b", 1)],
            config={"trust": "assisted", "depth": "standard",
                    "scheduler": {"max_parallel_runs": 2}},
        )

        selected, _ = advance_mod._scheduler_plan(
            state, "2026-09-06T00:00:00Z", _cycle(max_escalations=3))

        assert len(selected) == 2
        assert sum(advance_mod._scheduler_node_id(card, "requirements") in selected
                   for card in (one, two)) == 1
        assert advance_mod._scheduler_node_id(three, "requirements") in selected

    def test_overlapping_write_set_is_mutexed(self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline(limit=2)
        pipeline["steps"][0]["scheduler"] = {
            "concurrency_class": "card-worktree", "write_set": ["worktree:/shared"]}
        first = card_factory(id="card-first")
        second = card_factory(id="card-second")
        state = state_factory(cards=[first, second], pipelines=[pipeline])

        selected, _ = advance_mod._scheduler_plan(
            state, "2026-09-06T00:00:00Z", _cycle())

        assert len(selected) == 1
        queued = second if _node(second)["status"] == "queued" else first
        assert "write-set-mutex" in _node(queued)["wait_reasons"]

    def test_full_runner_dispatches_two_and_queues_third(
            self, advance_mod, mock_ctx, state_factory, card_factory, write_state, read_state):
        mock_ctx.call_tool.side_effect = [
            {"id": "job-one"}, {"id": "job-two"},
        ]
        cards = [card_factory(id=f"card-{index}") for index in range(3)]
        write_state(state_factory(cards=cards, pipelines=[_pipeline(limit=2)]))

        try:
            advance_mod.advance(mock_ctx)
        except Exception:
            pass

        out = read_state()
        statuses = [_node(card)["status"] for card in out["cards"]]
        assert statuses.count("running") == 2
        assert statuses.count("queued") == 1
        assert len([call for call in mock_ctx.call_tool.call_args_list
                    if call.args[:2] == ("kirocrew-cron", "cron_add")]) == 2
        assert all(card.get("step_sessions", {}).get("requirements", {}).get("schedule_node_id")
                   for card in out["cards"] if _node(card)["status"] == "running")


class TestPhaseDag:
    def test_generated_graph_has_grounding_passes_and_synthesis(self, advance_mod,
                                                                state_factory, card_factory):
        pipeline = _pipeline()
        pipeline["steps"][0]["agent"] = {"crew": "primary"}
        pipeline["steps"][0]["addenda"] = [{"crew": "security"}]
        card = card_factory()
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")

        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-06T00:00:00Z")
        graph = card["execution_envelope"]["scheduler"]["phase_dag"]

        assert graph["source"] == "pass-allocation"
        assert graph["errors"] == []
        assert graph["nodes"][0]["id"] == "grounding"
        assert graph["nodes"][-1]["id"] == "synthesis"
        assert {node.get("target_id") for node in graph["nodes"]} >= {"primary", "security", None}
        assert graph["max_parallel_runs"] == 2

    def test_explicit_cycle_is_envelope_infeasible(self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        pipeline["steps"][0]["pass_dag"] = {"nodes": [
            {"id": "a", "depends_on": ["b"]},
            {"id": "b", "depends_on": ["a"]},
        ]}
        card = card_factory()
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")

        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-06T00:00:00Z")
        envelope = card["execution_envelope"]

        assert "pass-dag-cycle" in envelope["scheduler"]["phase_dag"]["errors"]
        assert any("phase scheduler: pass-dag-cycle" in reason
                   for reason in envelope["observations"]["infeasibilities"])

    def test_required_fan_in_and_parallel_limit_are_terminally_enforced(
            self, advance_mod, state_factory, card_factory):
        pipeline = _pipeline()
        pipeline["steps"][0]["pass_dag"] = {"nodes": [
            {"id": "a", "required": True},
            {"id": "b", "required": True},
            {"id": "s", "depends_on": ["a", "b"], "required": True},
        ]}
        card = card_factory(step_status={"requirements": "done"})
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-06T00:00:00Z")
        envelope = card["execution_envelope"]
        card["step_results"] = {"requirements": {
            "envelope_id": envelope["id"], "status": "completed",
            "bundle": {"summary": "result", "artifacts": [{"ref": "result.md"}]},
        }}
        card["pass_schedule"] = {"requirements": {"nodes": {
            "a": {"id": "a", "status": "completed", "started_at": "2026-09-06T00:00:00Z",
                  "terminal_at": "2026-09-06T00:00:10Z"},
            "b": {"id": "b", "status": "completed", "started_at": "2026-09-06T00:00:00Z",
                  "terminal_at": "2026-09-06T00:00:10Z"},
            "s": {"id": "s", "status": "running", "started_at": "2026-09-06T00:00:11Z"},
        }}}

        assessment = advance_mod._result_scope_assessment(card, pipeline, "requirements")
        assert "required phase node s" in assessment["required_missing"]

    def test_terminal_status_nodes_count_complete(
            self, advance_mod, state_factory, card_factory):
        """A phase node the agent recorded status='terminal' (the vocabulary the code's own
        terminal_at/reconcile helpers use) MUST satisfy the completion check — otherwise an
        otherwise-successful crew step self-blocks on 'result scope: required phase node ...'
        purely on a status-word mismatch. Also: a node with only terminal_at (unknown status)
        is complete (defensive)."""
        pipeline = _pipeline()
        pipeline["steps"][0]["pass_dag"] = {"nodes": [
            {"id": "grounding", "required": True},
            {"id": "crew-x", "required": True},
            {"id": "synthesis", "depends_on": ["grounding", "crew-x"], "required": True},
        ]}
        card = card_factory(step_status={"requirements": "done"})
        state = state_factory(cards=[card], pipelines=[pipeline])
        step = advance_mod._step_def(pipeline, "requirements")
        advance_mod._ensure_execution_envelope(
            state, card, step, pipeline, "2026-09-06T00:00:00Z")
        envelope = card["execution_envelope"]
        card["step_results"] = {"requirements": {
            "envelope_id": envelope["id"], "status": "completed",
            "bundle": {"summary": "result", "artifacts": [{"ref": "result.md"}]},
        }}
        card["pass_schedule"] = {"requirements": {"nodes": {
            # status='terminal' — the exact word the agent records
            "grounding": {"id": "grounding", "status": "terminal",
                          "terminal_at": "2026-09-06T00:00:10Z"},
            "crew-x": {"id": "crew-x", "status": "terminal",
                       "terminal_at": "2026-09-06T00:00:20Z"},
            # unknown status but a terminal_at timestamp — must still count (defensive)
            "synthesis": {"id": "synthesis", "status": "wrapped-up",
                          "terminal_at": "2026-09-06T00:00:30Z"},
        }}}

        assessment = advance_mod._result_scope_assessment(card, pipeline, "requirements")
        assert assessment["required_missing"] == [], assessment["required_missing"]


class TestTopologyAndCancellation:
    def test_fan_in_waits_for_every_required_child_then_activates_integration(
            self, advance_mod, mock_ctx, state_factory, card_factory):
        pipeline = _pipeline()
        parent = card_factory(
            id="parent", stage="requirements", step_status={"requirements": "advanced"},
            decomposed={"status": "waiting-fan-in"},
            topology={
                "schema_version": 1, "action": "fan-out", "authority": "orchestrator",
                "status": "waiting-fan-in", "integration_owner": "parent",
                "integration_step": "integrate",
            },
            child_tickets=[
                {"card_id": "child-a", "issue": 1, "required": True},
                {"card_id": "child-b", "issue": 2, "required": True},
            ],
        )
        child_a = card_factory(id="child-a", stage="done", lifecycle="retired")
        child_b = card_factory(id="child-b", stage="requirements",
                               step_status={"requirements": "pending"})
        state = state_factory(cards=[parent, child_a, child_b], pipelines=[pipeline])

        assert advance_mod._scheduler_reconcile_topology(
            mock_ctx, state, "2026-09-06T00:00:00Z", _cycle()) is True
        assert parent["stage"] == "requirements"
        assert parent["topology"]["status"] == "waiting-fan-in"

        child_b["stage"] = "done"
        child_b["lifecycle"] = "retired"
        cycle = _cycle()
        assert advance_mod._scheduler_reconcile_topology(
            mock_ctx, state, "2026-09-06T00:01:00Z", cycle) is True
        assert parent["stage"] == "integrate"
        assert "decomposed" not in parent
        assert parent["topology"]["status"] == "integration-ready"
        assert cycle["moves"] == 1

    def test_optional_failed_child_needs_omission_rationale(
            self, advance_mod, mock_ctx, state_factory, card_factory):
        pipeline = _pipeline()
        parent = card_factory(
            id="parent", decomposed={"status": "waiting-fan-in"},
            topology={"schema_version": 1, "action": "fan-in", "authority": "orchestrator",
                      "integration_step": "integrate"},
            child_tickets=[{"card_id": "optional", "required": False}],
        )
        optional = card_factory(id="optional", step_status={"requirements": "blocked"})
        state = state_factory(cards=[parent, optional], pipelines=[pipeline])

        advance_mod._scheduler_reconcile_topology(
            mock_ctx, state, "2026-09-06T00:00:00Z", _cycle())
        assert parent["topology"]["status"] == "blocked-optional-omission-rationale"

        parent["child_tickets"][0]["waiver_reason"] = "non-critical experiment omitted"
        advance_mod._scheduler_reconcile_topology(
            mock_ctx, state, "2026-09-06T00:01:00Z", _cycle())
        assert parent["stage"] == "integrate"

    def test_cancel_signal_revokes_writes_without_claiming_turn_kill(
            self, advance_mod, mock_ctx, state_factory, card_factory):
        card = card_factory(
            lifecycle="cancelled", step_status={"requirements": "pending"},
            step_sessions={"requirements": {"cron_id": "job-live", "writes_allowed": True}},
        )
        state = state_factory(cards=[card], pipelines=[_pipeline()])
        node, _ = advance_mod._scheduler_node(
            card, "requirements", "2026-09-06T00:00:00Z")
        node["status"] = "running"

        assert advance_mod._scheduler_reconcile_cancellations(
            mock_ctx, state, "2026-09-06T00:01:00Z") is True

        pointer = card["step_sessions"]["requirements"]
        assert pointer["writes_allowed"] is False
        assert pointer["cancel_requested_at"] == "2026-09-06T00:01:00Z"
        assert node["status"] == "cancelling"
        assert node["permit_release_status"] == "awaiting-terminal-host-cancel-unobservable"
        mock_ctx.call_tool.assert_called_once_with(
            "kirocrew-cron", "cron_pause", {"job_id": "job-live"})

    def test_cancelled_node_releases_permit_only_after_terminal_observation(
            self, advance_mod, mock_ctx, state_factory, card_factory):
        card = card_factory(
            lifecycle="cancelled", step_status={"requirements": "pending"},
            pending_at={"requirements": "2026-09-06T00:00:00Z"},
            step_sessions={"requirements": {
                "cron_id": "job-live", "writes_allowed": True,
                "at": "2026-09-06T00:00:00Z",
            }},
        )
        state = state_factory(cards=[card], pipelines=[_pipeline()])
        node, _ = advance_mod._scheduler_node(
            card, "requirements", "2026-09-06T00:00:00Z")
        node.update({
            "status": "running", "permit_id": "permit-live",
            "permit_acquired_at": "2026-09-06T00:00:00Z",
        })

        advance_mod._scheduler_reconcile_cancellations(
            mock_ctx, state, "2026-09-06T00:01:00Z")
        advance_mod._scheduler_plan(state, "2026-09-06T00:01:01Z", _cycle())
        assert node["status"] == "cancelling"
        assert node["permit_release_status"] == "awaiting-terminal-host-cancel-unobservable"
        assert node in advance_mod._scheduler_active_nodes(state)
        assert "permit_released_at" not in node

        card["step_status"]["requirements"] = "done"
        advance_mod._scheduler_plan(state, "2026-09-06T00:02:00Z", _cycle())
        assert node["status"] == "cancelled"
        assert node["permit_id"] == "permit-live"
        assert node["permit_release_status"] == "released-terminal-cancelled"
        assert node["permit_release_reason"] == "terminal-cancelled"
        assert node["permit_released_at"] == "2026-09-06T00:02:00Z"
        assert node not in advance_mod._scheduler_active_nodes(state)

    def test_cancelling_node_ages_out_to_terminal_when_host_never_observes(
            self, advance_mod, mock_ctx, state_factory, card_factory):
        # ROOT-1 regression: a cancel requested while the step was `pending` parks the node at
        # `cancelling` waiting for a terminal host observation the host cannot emit. Without a bound
        # this is IMMORTAL (the card-rps3d-pimp wedge) — the node never releases its permit/lease.
        # After PENDING_STALE_SECS past cancel_requested_at with no terminal, the in-flight turn is
        # provably gone and the node must finalize to `cancelled` + released, freeing the slot.
        card = card_factory(
            lifecycle="cancelled", step_status={"requirements": "pending"},
            pending_at={"requirements": "2026-09-06T00:00:00Z"},
            step_sessions={"requirements": {
                "cron_id": "job-live", "writes_allowed": True,
                "cancel_requested_at": "2026-09-06T00:01:00Z",
            }},
        )
        state = state_factory(cards=[card], pipelines=[_pipeline()])
        node, _ = advance_mod._scheduler_node(card, "requirements", "2026-09-06T00:00:00Z")
        node.update({"status": "cancelling", "permit_id": "permit-live",
                     "permit_acquired_at": "2026-09-06T00:00:00Z"})

        # 5 minutes after cancel: still within the window → stays cancelling (immortal-by-design)
        advance_mod._scheduler_plan(state, "2026-09-06T00:06:00Z", _cycle())
        assert node["status"] == "cancelling"
        assert node in advance_mod._scheduler_active_nodes(state)

        # 11 minutes after cancel (> PENDING_STALE_SECS=600): ages out to terminal, permit released
        advance_mod._scheduler_plan(state, "2026-09-06T00:12:00Z", _cycle())
        assert node["status"] == "cancelled"
        assert node["permit_release_status"] == "released-terminal-cancelled"
        assert node["permit_release_reason"] == "terminal-cancelled-stale"
        assert "permit_released_at" in node
        assert node not in advance_mod._scheduler_active_nodes(state)


class TestSchedulerMetrics:
    def test_derives_only_observed_durations(self, advance_mod, state_factory, card_factory):
        card = card_factory(
            step_status={"requirements": "done"},
            event_outbox=[{
                "subject": "requirements", "time": "2026-09-06T00:00:30Z",
                "consumed_at": "2026-09-06T00:00:35Z",
            }],
        )
        state = state_factory(cards=[card], pipelines=[_pipeline()])
        node, _ = advance_mod._scheduler_node(
            card, "requirements", "2026-09-06T00:00:00Z")
        node.update({
            "status": "running", "ready_at": "2026-09-06T00:00:00Z",
            "queued_at": "2026-09-06T00:00:05Z",
            "permit_acquired_at": "2026-09-06T00:00:10Z",
            "session_started_at": "2026-09-06T00:00:15Z",
        })

        assert advance_mod._scheduler_reconcile_nodes(
            state, "2026-09-06T00:00:40Z") is True

        assert node["metrics"]["queue_ms"] == 5000
        assert node["metrics"]["permit_wait_ms"] == 5000
        assert node["metrics"]["startup_ms"] == 5000
        assert node["metrics"]["run_ms"] == 15000
        assert node["metrics"]["event_reaction_ms"] == 5000
        assert "first_output_ms" not in node["metrics"]
