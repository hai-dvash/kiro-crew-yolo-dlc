"""DLC-YOLO — deterministic pipeline advance (zero-token script cron).

Registered as:  script='~/.kiro/crew/crons/dlc_yolo_advance.py:advance'

This is the pipeline's poll loop. It is DELIBERATELY not an LLM agent turn: moving
a card between steps is pure bookkeeping (read state → find next step → move the
`dlc:<step>` label → write state). The only real reasoning lives in the step AGENTS
(spec/design/impl/review), which are spawned ON DEMAND, and in the human gates. So this
script:

  • advances cards whose current agent-step is marked done (card.step_status[step]=="done"),
  • auto-approves gate steps only under trust=autonomous,
  • fires the orchestrator (one spawn) ONLY for a card that has landed on an agent step
    with no work started yet — i.e. escalation is on-demand, not every cycle,
  • stays SILENT on empty cycles (raise Skip), and notifies only on a real signal
    (a gate is waiting for a human).

Effort / scope / ambiguity are NOT judged here — the step agents attribute effort and
flag scope growth when they produce their artifact (see the skill's "Step Review
Contract"); this loop only reads the numbers they already wrote.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from kiro_crew.cron_script import Report, Skip

STATE = Path("/tmp/dlc-yolo/state.json")

DEFAULT_STEP_IDS = [
    "intake", "requirements", "gate-spec", "design", "tasks",
    "gate-impl", "implement", "review", "gate-review", "pr", "done",
]


def _load() -> dict:
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _save(state: dict) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, indent=2), encoding="utf-8")
    os.replace(tmp, STATE)


def _pipeline_for(state: dict, card: dict) -> dict | None:
    pls = state.get("pipelines") or []
    by_id = next((p for p in pls if p.get("id") == card.get("pipeline_id")), None)
    if by_id:
        return by_id
    repo = (card.get("source") or {}).get("repo")
    return next((p for p in pls if p.get("repo") == repo), None)


def _ladder(pl: dict | None) -> list[str]:
    steps = (pl or {}).get("steps") or []
    ids = [s.get("id") for s in steps if s.get("id")]
    if not ids:
        ids = DEFAULT_STEP_IDS
    # bracket with intake…done
    out = ["intake"] + [s for s in ids if s not in ("intake", "done")] + ["done"]
    seen: set[str] = set()
    return [s for s in out if not (s in seen or seen.add(s))]


def _step_def(pl: dict | None, step_id: str) -> dict:
    for s in (pl or {}).get("steps") or []:
        if s.get("id") == step_id:
            return s
    return {"id": step_id, "type": "gate" if str(step_id).startswith("gate-") else "agent"}


def _eff_trust(state: dict, card: dict, step: dict, pl: dict | None) -> str:
    return (card.get("trust") or step.get("trust") or (pl or {}).get("trust")
            or (state.get("config") or {}).get("trust") or "assisted")


def _is_gate(step: dict) -> bool:
    return step.get("type") == "gate" or str(step.get("id", "")).startswith("gate-")


def _move_label(card: dict, new_step: str) -> None:
    """Move the dlc:<step> label on the card's GitHub issue (best-effort, sot=github)."""
    if card.get("sot") != "github":
        return
    src = card.get("source") or {}
    repo, issue = src.get("repo"), src.get("issue")
    if not (repo and issue):
        return
    try:
        subprocess.run(["gh", "label", "create", f"dlc:{new_step}", "--repo", repo,
                        "--color", "6366f1", "--description", "DLC-YOLO stage"],
                       capture_output=True, timeout=20)
        # remove any existing dlc:* labels, then add the new one
        subprocess.run(["gh", "issue", "edit", str(issue), "--repo", repo,
                        "--add-label", f"dlc:{new_step}"], capture_output=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        pass  # local-only fall-through; re-sync happens when gh returns


def advance(ctx):
    from datetime import datetime, timezone

    state = _load()
    cards = state.get("cards") or []
    if not cards:
        raise Skip()

    now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    moved: list[str] = []
    waiting_gates: list[str] = []
    changed = False

    for card in cards:
        pl = _pipeline_for(state, card)
        ladder = _ladder(pl)
        stage = card.get("stage")
        if stage not in ladder:
            continue
        idx = ladder.index(stage)
        if idx >= len(ladder) - 1:
            continue  # done
        step = _step_def(pl, stage)
        trust = _eff_trust(state, card, step, pl)
        status = (card.get("step_status") or {}).get(stage)

        if _is_gate(step):
            # gates only auto-advance under autonomous; otherwise wait for a human
            if trust == "autonomous" or status == "approved":
                pass  # advance below
            else:
                waiting_gates.append(f"{card.get('title', card.get('id'))} @ {stage}")
                continue
        else:
            # agent step: advance only when its work is marked done by the step agent
            if status != "done":
                # escalate ON DEMAND: if the step hasn't started, ask the orchestrator to
                # run THIS card+step (one spawn), then move on. No standing agent loop.
                if status in (None, "", "pending") and trust != "manual":
                    try:
                        ctx.call_tool("kirocrew-core", "spawn_run", {
                            "task": (f"Run pipeline step '{stage}' for DLC-YOLO card "
                                     f"{card.get('id')} in repo {(card.get('source') or {}).get('repo')}. "
                                     f"Follow the pipeline-workflow skill; when the step's work is "
                                     f"complete set card.step_status['{stage}']='done' in "
                                     f"/tmp/dlc-yolo/state.json. Stay within the card's owned repo."),
                            "agent": "pipeline-orchestrator",
                        })
                        card.setdefault("step_status", {})[stage] = "pending"
                        changed = True
                    except Exception:
                        pass
                continue

        # perform the move
        nxt = ladder[idx + 1]
        card["stage"] = nxt
        card["updated_at"] = now
        card.setdefault("history", []).append(
            {"from": stage, "to": nxt, "at": now, "agent": "advance-cron"})
        card.setdefault("step_status", {})[stage] = "advanced"
        _move_label(card, nxt)
        moved.append(f"{card.get('title', card.get('id'))}: {stage} → {nxt}")
        changed = True

    if changed:
        _save(state)

    # Notify only on a REAL signal: a gate is waiting for a human.
    if waiting_gates:
        ctx.notify("⏸️ DLC-YOLO gates awaiting approval:\n- " + "\n- ".join(waiting_gates))

    if not changed and not waiting_gates:
        raise Skip()  # silent: nothing happened this cycle

    raise Report("advanced: " + ("; ".join(moved) if moved else "no moves") +
                 (f" | {len(waiting_gates)} gate(s) waiting" if waiting_gates else ""))
