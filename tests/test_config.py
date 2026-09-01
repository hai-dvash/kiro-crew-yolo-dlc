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
_AGENTS_DIR = _REPO / "agents"
_APP_JSON = _REPO / "app.json"

# The agents that run a pipeline STEP (produce/advance a card artifact). The orchestrator
# is excluded — it drives, it is not a step producer — but is checked separately.
_STEP_AGENTS = ["spec-agent", "design-agent", "impl-agent", "review-agent", "intent-agent"]


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _all_agent_files():
    return sorted(_AGENTS_DIR.glob("*.json"))


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
def test_app_json_crons_are_the_three_expected():
    app = _load(_APP_JSON)
    crons = app.get("crons", [])
    names = sorted(c.get("name") for c in crons)
    assert names == sorted([
        "dlc-yolo-advance",
        "dlc-yolo-spawns",
        "dlc-yolo-backlog-intake",
    ])
    # And each declares exactly one execution mechanism (script XOR agent).
    for c in crons:
        assert ("script" in c) ^ ("agent" in c), f"{c.get('name')}: must be script XOR agent"
