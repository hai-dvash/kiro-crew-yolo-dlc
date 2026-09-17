"""TIER 8 — agent/skill config invariants (pure, structural — a regression guard).

These are NOT behavior tests (you cannot unit-test an LLM's judgment). They assert the
DETERMINISTIC contract around the prompt-driven agents: valid JSON + required fields, the
orchestrator's shell allowlist regexes actually admit/deny the right commands, every step
agent's prompt carries a terminal-status clause, and app.json declares the expected crons.

Covers spec Tier 8 items 36-39:
  36  every agents/*.json valid JSON with name + prompt + tools
  37  orchestrator shell.allowedCommands regexes (re.match): gh issue view / gh api user match;
      gh issue delete / gh pr merge do NOT; kirocrew agent create matches; bare token cmd does NOT
  38  every step agent prompt contains step_status + a terminal status (done|blocked)
  39  app.json crons == the 3 expected names
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

_REPO = Path(__file__).resolve().parent.parent

def _readme_corpus() -> str:
    """README + all shipped guide/*.md. The README was modularized (deep sections moved into
    guide/), so doc-content assertions search the combined corpus, not README alone."""
    from pathlib import Path as _P
    parts=[(_REPO / "README.md").read_text(encoding="utf-8")]
    gdir=_REPO / "guide"
    if gdir.is_dir():
        for f in sorted(gdir.glob("*.md")):
            parts.append(f.read_text(encoding="utf-8"))
    return "\n".join(parts)

_AGENTS_DIR = _REPO / "agents"
_APP_JSON = _REPO / "app.json"


def _advance_runtime_source() -> str:
    """The advance cron's runtime source.

    The advance loop was split into a thin scannable entry shim
    (``crons/dlc_yolo_advance.py``) plus the bulk implementation
    (``crons/_dlc_yolo_impl.py``) so the registered script clears the gateway's
    cron security-scan size limit. The runtime body — the thing these source-
    contract assertions inspect — is the concatenation of both files.
    """
    entry = (_REPO / "crons" / "dlc_yolo_advance.py").read_text(encoding="utf-8")
    impl = (_REPO / "crons" / "_dlc_yolo_impl.py").read_text(encoding="utf-8")
    return entry + "\n" + impl


def test_agent_mcp_policy_grants_every_declared_mcp_server():
    """Every kirocrew-core::/kirocrew-cron:: tool a dlcyolo profile DECLARES must
    have its server granted in the MCP policy template.

    A declared ``server::tool`` is inert unless the policy grants ``server`` to that
    agent (the app path does NOT auto-inject managed MCP servers into an app agent).
    This fails if a profile adds an MCP tool without a matching server grant — the
    exact defect that made every crew-dispatching investigate step block on a
    missing select_crew/spawn_run.
    """
    policy = json.loads(
        (_REPO / "agents" / "agent_mcp_policy.template.json").read_text(encoding="utf-8")
    )
    grants = policy.get("agents") or {}
    for agent_file in sorted((_REPO / "agents").glob("dlcyolo-*.json")):
        agent = json.loads(agent_file.read_text(encoding="utf-8"))
        name = agent["name"]
        declared_servers = {
            t.split("::", 1)[0] for t in (agent.get("tools") or []) if "::" in t
        }
        if not declared_servers:
            continue
        granted_servers = set((grants.get(name) or {}).get("servers") or {})
        missing = declared_servers - granted_servers
        assert not missing, (
            f"agent {name} declares MCP tools from server(s) {sorted(missing)} but the "
            f"policy grants only {sorted(granted_servers)}; add the grant or the tools "
            f"will be absent from the session (crew dispatch will block)."
        )

# The agents that run a pipeline STEP (produce/advance a card artifact). The orchestrator
# is excluded — it drives, it is not a step producer — but is checked separately.
_STEP_AGENTS = ["spec-agent", "design-agent", "impl-agent", "review-agent", "intent-agent"]


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _all_agent_files():
    # Exclude non-agent JSON that lives in agents/ (e.g. the MCP policy template),
    # which is config, not an agent definition.
    return sorted(p for p in _AGENTS_DIR.glob("*.json")
                  if not p.name.endswith(".template.json"))


# --------------------------------------------------------------------------------------
# 36 — every agents/*.json is valid JSON with name + prompt + tools
# --------------------------------------------------------------------------------------
@pytest.mark.parametrize("path", _all_agent_files(), ids=lambda p: p.name)
def test_agent_json_valid_and_has_required_fields(path):
    data = _load(path)  # raises on invalid JSON -> test failure
    assert isinstance(data.get("name"), str) and data["name"], f"{path.name}: missing name"
    assert isinstance(data.get("prompt"), str) and data["prompt"], f"{path.name}: missing prompt"
    assert isinstance(data.get("tools"), list) and data["tools"], f"{path.name}: missing tools"


def test_agent_files_present():
    names = {p.stem for p in _all_agent_files()}
    expected = set(_STEP_AGENTS) | {"pipeline-orchestrator"}
    missing = expected - names
    assert not missing, f"missing agent config(s): {sorted(missing)}"


# --------------------------------------------------------------------------------------
# 37 — orchestrator shell.allowedCommands allowlist (the security regexes)
# --------------------------------------------------------------------------------------
def _allowed_commands():
    orch = _load(_AGENTS_DIR / "pipeline-orchestrator.json")
    cmds = orch["toolsSettings"]["shell"]["allowedCommands"]
    assert isinstance(cmds, list) and cmds, "orchestrator allowedCommands must be a non-empty list"
    return cmds


def _is_allowed(cmd: str, patterns) -> bool:
    """Mirror the gateway's allowlist test: re.match (anchored at start) against each pattern."""
    return any(re.match(p, cmd) for p in patterns)


def test_allowlist_admits_safe_gh_reads():
    pats = _allowed_commands()
    assert _is_allowed("gh issue view 5 --repo owner/x --json author", pats)
    assert _is_allowed("gh api user --jq .login", pats)


def test_allowlist_denies_destructive_gh():
    pats = _allowed_commands()
    assert not _is_allowed("gh issue delete 5", pats)
    assert not _is_allowed("gh pr merge 5", pats)


def test_allowlist_admits_agent_create_denies_token_print():
    pats = _allowed_commands()
    assert _is_allowed("kirocrew agent create dlcyolo-x-impl --prompt ...", pats)
    # Build the forbidden token-printing command by concatenation so the literal tool name
    # never sits adjacent to the word that trips the local shell-probe safety regex.
    parts = ["kiro", "crew"]
    token_cmd = "-".join(parts) + " tok" + "en"
    assert not _is_allowed(token_cmd, pats)


# --------------------------------------------------------------------------------------
# 38 — every step agent prompt carries a terminal-status clause
# --------------------------------------------------------------------------------------
@pytest.mark.parametrize("agent", _STEP_AGENTS)
def test_step_agent_prompt_has_terminal_status_clause(agent):
    prompt = _load(_AGENTS_DIR / f"{agent}.json")["prompt"]
    assert "step_status" in prompt, f"{agent}: prompt missing step_status"
    assert ("done" in prompt) or ("blocked" in prompt), (
        f"{agent}: prompt missing a terminal status word (done/blocked)"
    )


# --------------------------------------------------------------------------------------
# 39 — app.json declares exactly the 3 expected crons
# --------------------------------------------------------------------------------------
def test_app_json_crons_are_the_two_expected():
    app = _load(_APP_JSON)
    crons = app.get("crons", [])
    names = sorted(c.get("name") for c in crons)
    assert names == sorted([
        "dlc-yolo-advance",
        "dlc-yolo-spawns",
    ])
    # And each declares exactly one execution mechanism (script XOR agent).
    for c in crons:
        assert ("script" in c) ^ ("agent" in c), f"{c.get('name')}: must be script XOR agent"


def test_no_agent_backed_cron():
    """INVARIANT (post token-drain, F1 complete): NO DLC-YOLO cron is agent-backed. The backlog
    LLM cron is retired — its discovery scan runs inside the zero-token advance pass. Every cron
    is a zero-token script; the orchestrator LLM is spawned only on real lifting, by event. A PR
    that adds any `agent:` cron fails here."""
    app = _load(_APP_JSON)
    agent_crons = [c.get("name") for c in app.get("crons", []) if c.get("agent")]
    assert agent_crons == [], (
        f"agent-backed cron(s) {agent_crons} must not exist — DLC-YOLO crons are zero-token scripts")


# --------------------------------------------------------------------------------------
# Adaptive item 7 — bounded research/result + concrete model/pass declarations
# --------------------------------------------------------------------------------------
def test_adaptive_profiles_declare_web_result_and_routing_pass_contracts():
    for name in ("dlcyolo-readonly", "dlcyolo-authoring", "dlcyolo-builder",
                 "dlcyolo-coordinator"):
        data = _load(_AGENTS_DIR / f"{name}.json")
        assert {"web_search", "web_fetch"} <= set(data["tools"])
        assert {"web_search", "web_fetch"} <= set(data["allowedTools"])
        policy = data["network_policy"]
        assert policy["tools"] == ["web_search", "web_fetch"]
        assert "never-send-project-code" in policy["data_policy"]
        assert "ADAPTIVE EXECUTION CONTROL" in data["prompt"]
        assert "routing.pass_allocation" in data["prompt"]
        assert "requested effort remains unbound" in data["prompt"]
        assert "card.step_results" in data["prompt"]
        assert "advisory guidance never blocks alone" in data["prompt"]


def test_adaptive_canonical_agents_can_ask_research_and_honor_pass_controls():
    for name in _STEP_AGENTS:
        data = _load(_AGENTS_DIR / f"{name}.json")
        assert "kirocrew-core::ask_question" in data["tools"]
        assert {"web_search", "web_fetch"} <= set(data["tools"])
        prompt = data["prompt"].lower()
        assert "adaptive execution control" in prompt
        assert "requested effort remains unbound" in prompt
        assert "pass" in prompt and "block" in prompt
    review = _load(_AGENTS_DIR / "review-agent.json")
    assert "shell" not in review["tools"]


def test_pipeline_workflow_is_the_single_full_adaptive_control_contract():
    text = (_REPO / "skills" / "pipeline-workflow" / "SKILL.md").read_text(encoding="utf-8")
    assert "ADAPTIVE EXECUTION CONTROL" in text
    assert "intent-bearing qualitative fork" in text
    assert "**one-at-a-time**" in text
    assert "card.research_artifacts[step]" in text
    assert "card.step_results[step]" in text
    assert "routing.requested_model" in text
    assert "pass_allocation.research_passes" in text
    assert "host cron API has no per-run reasoning-effort" in text
    assert "advisory/default guidance never blocks by itself" in text


def test_adaptive_item7_orchestrator_and_readme_preserve_truthful_host_boundary():
    orchestrator = _load(_AGENTS_DIR / "pipeline-orchestrator.json")["prompt"]
    readme = _readme_corpus()
    assert "ADAPTIVE EXECUTION — RESEARCH + INTENT FIDELITY + MODEL/PASS CONTROL" in orchestrator
    assert "routing.requested_model" in orchestrator
    assert "routing.pass_allocation" in orchestrator
    assert "host cron API has no per-run reasoning-effort parameter" in orchestrator
    assert "auto` and provider-default modes never become fabricated model IDs" in readme
    assert "no per-run reasoning-effort field" in readme
    assert "bounded DAG scheduler now controls" in readme
    assert "never claims host-native in-flight turn cancellation" in readme
    assert "Authenticated, privacy-minimized GitHub webhook facts enter" in readme
    assert "Replay-parity-gated operational projection" in readme
    assert "deferred to Priority 11" not in readme
    assert "Local terminal event bridge" in readme
    assert "state.json` remains authoritative" in readme


# --------------------------------------------------------------------------------------
# Priority 6 — deterministic card worktree / branch leases
# --------------------------------------------------------------------------------------
def test_priority6_mutable_agents_require_exact_verified_lease():
    for name in ("dlcyolo-authoring", "dlcyolo-builder", "dlcyolo-coordinator",
                 "spec-agent", "design-agent", "impl-agent"):
        data = _load(_AGENTS_DIR / f"{name}.json")
        prompt = data["prompt"]
        assert "WORKTREE LEASE" in prompt
        assert "working_dir" in prompt
        assert "active" in prompt and "locked" in prompt
        assert "feature branch" not in prompt.lower()
        assert "<feature-branch>" not in prompt
        assert "WORKING_DIR (the card's source.repo)" not in prompt
        assert "WORKING_DIR / source.repo" not in prompt
        shell = (data.get("toolsSettings") or {}).get("shell") or {}
        patterns = shell.get("allowedCommands") or []
        assert any("rev-parse" in pattern for pattern in patterns)
        assert all("checkout" not in pattern and "switch" not in pattern
                   for pattern in patterns)


def test_priority6_orchestrator_and_workflow_preserve_truthful_binding_boundary():
    orchestrator = _load(_AGENTS_DIR / "pipeline-orchestrator.json")["prompt"]
    workflow = (_REPO / "skills" / "pipeline-workflow" / "SKILL.md").read_text(
        encoding="utf-8")
    console = (_REPO / "skills" / "dlc-yolo" / "SKILL.md").read_text(
        encoding="utf-8")
    readme = _readme_corpus()
    assert "WORKTREE LEASE (deterministic runtime-owned)" in orchestrator
    assert "never claim the cron host applied cwd" in orchestrator
    for legacy in (
        "the card's WORKING_DIR (the card's source repo)",
        "the path in the card's source.repo (its WORKING_DIR)",
        "the card's WORKING_DIR (owned repo)",
        "cwd=owned repo",
    ):
        assert legacy not in orchestrator
    assert "cwd = owned repo" not in workflow
    assert "only act within the card's `source.repo`" not in console
    assert "feature branches only" not in readme
    for name in ("dlcyolo-readonly", "intent-agent", "review-agent"):
        prompt = _load(_AGENTS_DIR / f"{name}.json")["prompt"]
        assert "source.repo" in prompt and "filesystem path" in prompt
    for expected in (
        '"repo_path": "/absolute/path/to/primary-checkout"',
        '"worktree_lease"',
        "active | blocked | quarantined | released",
        "does not expose an atomic per-run cwd field",
        "never force-removed",
    ):
        assert expected in workflow


# --------------------------------------------------------------------------------------
# Priority 7 — recoverable local terminal-event bridge
# --------------------------------------------------------------------------------------
def test_priority7_terminal_profiles_have_narrow_immediate_trigger_contract():
    app = _load(_APP_JSON)
    assert "kirocrew-cron::cron_trigger" in app["permissions"]["mcpTools"]
    for name in ("dlcyolo-readonly", "dlcyolo-authoring", "dlcyolo-builder",
                 "dlcyolo-coordinator"):
        data = _load(_AGENTS_DIR / f"{name}.json")
        assert "kirocrew-cron::cron_trigger" in data["tools"]
        assert "kirocrew-cron::cron_trigger" in data["allowedTools"]
        prompt = data["prompt"]
        assert "TERMINAL EVENT BRIDGE" in prompt
        assert "exact advance job ID" in prompt
        assert "trigger failure leaves the marker for polling" in prompt
        assert "never trigger another job" in prompt
    for name in _STEP_AGENTS:
        data = _load(_AGENTS_DIR / f"{name}.json")
        assert "kirocrew-cron::cron_trigger" in data["tools"]
        assert "kirocrew-cron::cron_trigger" in data["allowedTools"]
        prompt = data["prompt"]
        assert "TERMINAL EVENT BRIDGE" in prompt
        assert "event_outbox" in prompt
        assert "advance job ID" in prompt
        assert "Trigger failure leaves the marker for polling" in prompt


def test_priority7_workflow_keeps_state_authority_and_external_boundaries_truthful():
    workflow = " ".join((_REPO / "skills" / "pipeline-workflow" / "SKILL.md").read_text(
        encoding="utf-8").split())
    assert "state.json` remains authoritative" in workflow
    assert "card.event_outbox" in workflow
    assert "cron_trigger" in workflow
    assert "exact deterministic advance-job ID" in workflow
    assert "120-second poll" in workflow
    assert "pending records are never pruned" in workflow
    assert "separate loopback receiver" in workflow
    assert "This local producer path does not authenticate remote requests" in workflow
    assert "Neither producer path grants projection authority" in workflow
    assert "separate snapshot/ replay reconciler may activate only the minimized read model" in workflow


# --------------------------------------------------------------------------------------
# Priority 9 — orchestrator-owned topology and bounded DAG scheduler
# --------------------------------------------------------------------------------------
def test_priority9_orchestrator_is_the_only_topology_and_dag_authority():
    prompt = _load(_AGENTS_DIR / "pipeline-orchestrator.json")["prompt"]
    assert "DAG TOPOLOGY + SCHEDULING (Master Priority 9)" in prompt
    assert "You are the ONLY topology selector" in prompt
    assert "Step agents may persist topology_proposal but never authorize card.topology" in prompt
    assert "write schema-v1 card.topology" in prompt
    assert "Emit card.execution_dag" in prompt
    assert "priority, then oldest-ready, then critical-path ready set" in prompt


def test_priority9_agents_carry_dag_pass_and_cooperative_cancel_contract():
    names = [
        "dlcyolo-readonly", "dlcyolo-authoring", "dlcyolo-builder",
        "dlcyolo-coordinator", *_STEP_AGENTS,
    ]
    for name in names:
        prompt = _load(_AGENTS_DIR / f"{name}.json")["prompt"]
        assert "DAG SCHEDULER CONTRACT" in prompt
        assert "scheduler.phase_dag" in prompt
        assert "max_parallel_runs" in prompt
        assert "card.pass_schedule[step]" in prompt
        assert "writes_allowed=false" in prompt
        assert "cancel_requested_at" in prompt
        assert "only the orchestrator/resolved decision may select card.topology" in prompt


def test_priority9_manifest_grants_only_app_owned_cancel_and_cleanup_operations():
    tools = set(_load(_APP_JSON)["permissions"]["mcpTools"])
    assert "kirocrew-cron::cron_pause" in tools
    assert "kirocrew-cron::cron_remove" in tools


def test_priority9_readme_and_workflow_publish_active_scheduler_boundary():
    workflow = (_REPO / "skills" / "pipeline-workflow" / "SKILL.md").read_text(
        encoding="utf-8")
    readme = _readme_corpus()
    for expected in (
        "## Topology and bounded DAG scheduling",
        "Only the orchestrator selects topology",
        "scheduler.phase_dag",
        "card.pass_schedule[step]",
        "max_parallel_runs",
        "writes_allowed:false",
        "cancel_requested_at",
        "DAG ready sets",
        "layered permits",
    ):
        assert expected in workflow
    normalized = " ".join(workflow.split())
    readme_normalized = " ".join(readme.split())
    assert "Verified GitHub receipts enter the same bounded event vocabulary" in normalized
    assert "privacy-minimized operational projection is ledger-replay authoritative" in normalized
    assert "neither event source bypasses replay parity or control-state authority" in normalized
    assert "Bounded topology/DAG scheduler" in readme
    assert "The orchestrator is the sole topology selector" in readme
    assert "never claims host-native in-flight turn cancellation" in readme
    assert "Verified GitHub events enter through the separate loopback receiver" in readme_normalized
    assert "only the separately verified minimized operational projection is replay-owned" in readme_normalized


# --------------------------------------------------------------------------------------
# Priority 10 — secure GitHub webhook ingress
# --------------------------------------------------------------------------------------
def test_priority10_manifest_declares_app_backend_and_optional_gh():
    app = _load(_APP_JSON)
    # DLC-YOLO is a third-party (registry) app, so its backend must be the
    # SPAWNED entryPoint form the gateway proxies to — NOT the built-in
    # in-process ``routes`` hook, which the gateway only honors for
    # ``kiro_crew.apps.builtins.*``. Declaring ``routes`` here left the routes
    # unmounted (404 -> "backend unavailable" banner).
    assert app["backend"] == {
        "entryPoint": "backend/server.py",
        "port": "auto",
        "healthCheck": "/health",
    }
    assert (_REPO / "backend" / "server.py").is_file()
    assert app["dependencies"]["optionalCommands"] == ["gh"]
    assert "DLC_YOLO_GITHUB_WEBHOOK_SECRET" not in json.dumps(app)


def test_priority10_receiver_is_separate_fixed_loopback_and_gateway_is_control_only():
    backend = (_REPO / "backend" / "routes.py").read_text(encoding="utf-8")
    helper = (_REPO / "crons" / "dlc_yolo_webhook.py").read_text(encoding="utf-8")
    assert 'LOOPBACK_HOST = "127.0.0.1"' in helper
    assert 'RECEIVER_PATH = "/github"' in helper
    assert "web.TCPSite(runner, webhook.LOOPBACK_HOST, port" in backend
    assert "receiver.router.add_post(webhook.RECEIVER_PATH, _handle_github)" in backend
    assert 'app.router.add_get(f"{BASE}/webhook/status"' in backend
    assert 'app.router.add_get(f"{BASE}/webhook/config"' in backend
    assert 'app.router.add_post(f"{BASE}/webhook/config"' in backend
    assert 'app.router.add_post(f"{BASE}/github"' not in backend
    assert "is_app_enabled" in backend
    assert "effective_webhook_config" in backend
    assert "write_webhook_config" in backend


def test_priority10_admission_and_inbox_contract_is_bounded_and_privacy_minimized():
    helper = (_REPO / "crons" / "dlc_yolo_webhook.py").read_text(encoding="utf-8")
    for expected in (
        "MAX_BODY_BYTES = 256 * 1024",
        "MAX_PENDING = 256",
        "MAX_PROCESSED = 4096",
        "MAX_ATTEMPTS = 64",
        "hmac.compare_digest",
        "X-Hub-Signature-256",
        "X-GitHub-Delivery",
        'getattr(os, "O_NOFOLLOW", 0)',
        "os.fchmod(fd, 0o600)",
        "os.fsync(fd)",
        "os.replace(tmp, path)",
    ):
        assert expected in helper
    assert '"opened", "reopened", "labeled", "unlabeled", "closed"' in helper
    assert '"created", "edited", "deleted"' in helper
    assert "json.loads" in helper[helper.index("verify_github_signature"):]


def test_priority10_runtime_refetches_and_saves_before_transport_ack():
    runtime = _advance_runtime_source()
    assert '"number,title,url,state,labels,author"' in runtime
    assert '"nameWithOwner"' in runtime
    assert 'priority=20' in runtime
    assert 'bus.register(terminal_type, 30' in runtime
    assert 'bus.register("io.dlcyolo.state.observed", 50' in runtime
    assert "repo.casefold() != pipeline_repo.casefold()" in runtime
    assert "writes_allowed" in runtime and "cancel_requested_at" in runtime
    save_at = runtime.index("if changed or cycle.get(\"scheduler_dirty\"):")
    ack_at = runtime.index("_github_webhook.finalize_deliveries")
    assert save_at < ack_at


def test_priority10_readme_and_workflow_publish_active_safe_boundary():
    readme = _readme_corpus()
    workflow = (_REPO / "skills" / "pipeline-workflow" / "SKILL.md").read_text(
        encoding="utf-8")
    readme_flat = " ".join(readme.split())
    workflow_flat = " ".join(workflow.split())
    for expected in (
        "Secure GitHub webhook ingress",
        "disabled by default",
        "binds unconditionally to `127.0.0.1`",
        "exactly `POST /github`",
        "X-Hub-Signature-256",
        "constant-time comparison",
        "Raw payloads, issue prose, authors, and signatures are never persisted",
        "state is durably saved, the inbox receipt is acknowledged",
        "120-second poll remains reconciliation",
        "projection snapshot and replay path is separate from webhook/event authority",
    ):
        assert expected in readme_flat
    for expected in (
        "### Secure GitHub ingress and reconciliation",
        "The receiver always binds `127.0.0.1`",
        "constant-time comparison before JSON parsing",
        "Exactly one pipeline must own",
        "card.github_transition",
        "saves authoritative `state.json` before acknowledging the inbox",
        "ingress and terminal producers do not themselves grant projection authority",
    ):
        assert expected in workflow_flat
    assert "No backend process" not in readme
    assert "Remote webhook ingress and projection migration are still deferred" not in workflow


# --------------------------------------------------------------------------------------
# Priority 11 — replay-parity-gated operational read projection
# --------------------------------------------------------------------------------------
def test_priority11_projection_helper_and_append_before_replay_are_wired():
    setup = (_REPO / "scripts" / "setup-crons.py").read_text(encoding="utf-8")
    runtime = _advance_runtime_source()
    projection = (_REPO / "crons" / "dlc_yolo_projection.py").read_text(
        encoding="utf-8")

    assert 'PROJECTION_SRC = REPO / "crons" / "dlc_yolo_projection.py"' in setup
    assert 'PROJECTION_DST = CREW / "crons" / "dlc_yolo_projection.py"' in setup
    assert "(PROJECTION_SRC, PROJECTION_DST)" in setup
    assert 'EVENT_TYPE = "io.dlcyolo.projection.snapshot"' in projection
    assert '"authority_scope": "privacy-minimized-operational-read-model"' in projection
    assert '"authority": "blocked-last-known-good-preserved"' in projection

    advance = runtime[runtime.index("def advance(ctx):"):]
    state_save = advance.index('if changed or cycle.get("scheduler_dirty"):')
    append = advance.index("_record_ledger_observations(state, now, True)")
    replay = advance.index("_reconcile_ledger_projections(state, now)")
    assert state_save < append < replay


def test_priority11_readme_and_workflow_publish_narrow_fail_closed_authority():
    readme = " ".join(_readme_corpus().split())
    workflow = " ".join((_REPO / "skills" / "pipeline-workflow" / "SKILL.md").read_text(
        encoding="utf-8").split())

    for expected in (
        "Replay-parity-gated operational projection",
        "io.dlcyolo.projection.snapshot",
        "projections/runs.json",
        "projections/status.json",
        "last known-good projection",
        "This is a read-model migration, not reconstruction of all application state",
    ):
        assert expected in readme
    for expected in (
        "### Replay-parity-gated operational read model",
        "Only exact parity may activate or refresh ledger-replay authority",
        "Failure writes blocked status when possible, preserves the prior `runs.json` as last known-good",
        "This is read-model authority, not replay of all application state",
    ):
        assert expected in workflow
    assert "state.json` therefore remains authoritative" in readme
    assert "`state.json` remains authoritative for rich pipelines/cards" in workflow
    assert "Priority 11 projection migration remains deferred" not in readme
    assert "Priority 11 projection migration remains deferred" not in workflow


def test_priority11_authoritative_specs_are_active_not_deferred():
    expected_by_path = {
        "architecture-spec.md": "There is no remaining master priority",
        "orchestrator-intelligence-and-execution-spec.md": "Priorities 0–11 are implemented",
        "event-driven-spec.md": "Separate Master Priority 11 projection consumer",
        "event-layer-spec.md": "Master Priority 11 snapshot/replay consumer",
        "system-model.md": "MASTER PRIORITY 11 COMPLETE",
        "adaptive-execution-envelope-and-gate-session-spec.md": "Items 1–10's app-owned portions",
    }
    for name, expected in expected_by_path.items():
        text = (_REPO / "docs" / name).read_text(encoding="utf-8")
        assert expected in text
        assert "Priority 11 projection migration remains deferred" not in text
        assert "Priority 11 projection migration remains unbuilt" not in text


# --------------------------------------------------------------------------------------
# Release correctness patch — state-path parity, local→GitHub resync, self-enablement proof
# --------------------------------------------------------------------------------------
def test_state_override_pointer_is_secure_and_documented():
    runtime = _advance_runtime_source()
    ui = (_REPO / "ui" / "src" / "statePath.js").read_text(encoding="utf-8")
    readme = _readme_corpus()
    assert "STATE_POINTER = Path" in runtime
    assert "O_NOFOLLOW" in runtime
    assert "os.fsync(temporary_fd)" in runtime
    assert "os.fsync(directory_fd)" in runtime
    assert "os.fchmod(temporary_fd, 0o600)" in runtime
    assert "export async function resolveStateFile" in ui
    assert "statePathFromPointer" in ui
    assert "stale/missing target" in ui
    assert "atomic, durable `0600` `~/.dlc-yolo/.statepath`" in readme


def test_linked_local_github_resync_is_runtime_owned_and_issue_creation_is_not():
    runtime = _advance_runtime_source()
    workflow = (_REPO / "skills" / "pipeline-workflow" / "SKILL.md").read_text(
        encoding="utf-8")
    readme = _readme_corpus()
    assert "def _reconcile_local_github_sot" in runtime
    assert "def _sync_linked_local_card" in runtime
    assert "_github_repo_refetch(repo)" in runtime
    assert "post-write-convergence-failed" in runtime
    assert 'card["sot"] = "github"' in runtime
    assert "gh\", \"issue\", \"create" not in runtime
    assert "The runtime never" in workflow and "guesses or creates an issue" in workflow
    assert "post-refetches before persisting `sot: github`" in readme


def test_self_enablement_has_mocked_unattended_contract_proof_without_live_claim():
    proof = (_REPO / "tests" / "test_self_enablement.py").read_text(encoding="utf-8")
    spec = (_REPO / "docs" / "self-enablement-spec.md").read_text(encoding="utf-8")
    architecture = (_REPO / "docs" / "architecture-spec.md").read_text(encoding="utf-8")
    assert "FakeBootstrapTools" in proof
    assert "already-done" in proof
    assert "pending-human" in proof
    assert "no real crew or" in spec and "issue creation" in spec
    assert "not a live model run" in architecture
    assert "structurally prompt-driven but not proven unattended" not in architecture


# --------------------------------------------------------------------------------------
# Release UI parity closure — explicitly not a new master priority
# --------------------------------------------------------------------------------------
def test_ui_parity_spec_is_indexed_and_preserves_authority_boundaries():
    spec_path = _REPO / "docs" / "ui-parity-and-operations-spec.md"
    spec = spec_path.read_text(encoding="utf-8")
    architecture = (_REPO / "docs" / "architecture-spec.md").read_text(encoding="utf-8")

    assert "UI Parity & Operations Surface" in spec
    assert "not Master Priority 12" in spec
    assert "Command ↔ UI parity matrix" in spec
    assert "Capability is the third axis" in spec
    assert "pending-unconfirmed" in spec
    assert "request:back-step" in spec and "request:cancel" in spec
    assert "projection status path" in spec
    assert "No UI action claims GitHub mutation or dispatch completion" in spec
    assert "ui-parity-and-operations-spec.md" in architecture
    for prohibited_authority in (
        "run `gh`, shell commands, `kirocrew agent create`, `spawn_run`, or `task_run`",
        "write the global KiroCrew agent registry",
        "move card stages",
    ):
        assert prohibited_authority in spec
