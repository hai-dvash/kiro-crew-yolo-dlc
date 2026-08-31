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


def _resolve_state_path() -> Path:
    """Resolve the state.json location, in priority order:

    1. DLC_YOLO_STATE env var (explicit, stageable per environment/platform),
    2. ~/.dlc-yolo/state.json (durable persistence — THE state home; when this can be
       created it is the SOLE tier: no /tmp mirror, so no split-brain is possible),
    3. /tmp/dlc-yolo/state.json (last-resort SCRATCH only — used just when the durable
       home dir genuinely cannot be created; /tmp is otherwise for truly-ephemeral
       artifacts, NOT for saving the pipeline).

    The tiers are MUTUALLY EXCLUSIVE for state — you get persistence OR /tmp, never both.
    The UI mirrors this exact order (see resolveStatePath in App.tsx).
    """
    env = os.environ.get("DLC_YOLO_STATE")
    if env:
        return Path(os.path.expanduser(env))
    home = Path(os.path.expanduser("~/.dlc-yolo/state.json"))
    try:
        home.parent.mkdir(parents=True, exist_ok=True)
        return home
    except OSError:
        return Path("/tmp/dlc-yolo/state.json")


STATE = _resolve_state_path()

DEFAULT_STEP_IDS = [
    "intake", "requirements", "gate-spec", "design", "tasks",
    "gate-impl", "implement", "review", "gate-review", "pr", "done",
]


def _bootstrap() -> None:
    """Ensure the resolved state file exists. STATE is a SINGLE tier: persistence
    (~/.dlc-yolo) when it can be created (the norm), else /tmp as a last-resort scratch
    fallback — never both. The UI's /api/file-write cannot CREATE files, so the cron is the
    bootstrapper.

    One-time PROMOTION: if the durable file is missing/empty but a LEGACY /tmp state has real
    data (pipelines/cards) — the historical layout before persistence existed — seed the
    durable file FROM /tmp so that work is not orphaned. This is the only time /tmp feeds
    persistence; thereafter persistence is authoritative and /tmp is ignored for state."""
    def _content(p: Path) -> dict | None:
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None

    cur = _content(STATE)
    cur_has = bool(cur and ((cur.get("pipelines")) or (cur.get("cards"))))
    if cur_has:
        return  # persistence already holds real work — authoritative, never clobber

    seed = {"config": {"trust": "assisted", "depth": "standard"}, "pipelines": [], "cards": []}
    # promote a legacy /tmp board ONLY when the durable tier is the resolved STATE (i.e. we
    # are on persistence, not already on /tmp) and /tmp actually has data.
    legacy = Path("/tmp/dlc-yolo/state.json")
    if STATE != legacy:
        tmp_state = _content(legacy)
        if tmp_state and ((tmp_state.get("pipelines")) or (tmp_state.get("cards"))):
            seed = tmp_state  # promote historical work into persistence
    try:
        STATE.parent.mkdir(parents=True, exist_ok=True)
        STATE.write_text(json.dumps(seed, indent=2), encoding="utf-8")
    except OSError:
        pass


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


def _slug_step(step_id: str) -> str:
    """Sanitize a step id for use in a `dlc:<id>` GitHub label. Strips anything
    that isn't alnum/-/_/. and any leading '-' so a crafted step id can never
    smuggle a leading '--flag' into the gh command line (M2)."""
    s = "".join(c for c in str(step_id) if c.isalnum() or c in "-_.")
    return s.lstrip("-") or "step"


def _current_dlc_labels(repo: str, issue: int) -> list[str]:
    """Best-effort: read the issue's existing dlc:* labels so we can remove them."""
    try:
        out = subprocess.run(
            ["gh", "issue", "view", str(issue), "--repo", repo, "--json", "labels"],
            capture_output=True, timeout=20, text=True)
        if out.returncode != 0:
            return []
        labels = (json.loads(out.stdout or "{}") or {}).get("labels") or []
        return [l.get("name") for l in labels
                if str(l.get("name", "")).startswith("dlc:")]
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError):
        return []


def _move_label(card: dict, new_step: str) -> None:
    """Move the dlc:<step> label on the card's GitHub issue (best-effort, sot=github):
    remove any existing dlc:* labels, then add the single new one, so the issue's
    label set is the unambiguous source of truth for the card's stage."""
    if card.get("sot") != "github":
        return
    src = card.get("source") or {}
    repo, issue = src.get("repo"), src.get("issue")
    if not (repo and issue):
        return
    new_label = f"dlc:{_slug_step(new_step)}"
    try:
        subprocess.run(["gh", "label", "create", new_label, "--repo", repo,
                        "--color", "6366f1", "--description", "DLC-YOLO stage"],
                       capture_output=True, timeout=20)
        # remove any existing dlc:* labels (except the target), then add the new one
        stale = [l for l in _current_dlc_labels(repo, issue) if l != new_label]
        edit = ["gh", "issue", "edit", str(issue), "--repo", repo,
                "--add-label", new_label]
        for l in stale:
            edit += ["--remove-label", l]
        subprocess.run(edit, capture_output=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        pass  # local-only fall-through; re-sync happens when gh returns


def advance(ctx):
    from datetime import datetime, timezone

    _bootstrap()
    state = _load()
    cards = state.get("cards") or []
    if not cards:
        raise Skip()

    now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    moved: list[str] = []
    waiting_gates: list[str] = []
    changed = False
    # Per-cycle work caps — a cron run has a hard ~30s budget, and each escalation is a
    # slow spawn_run while each label-move is up to 3 `gh` calls (which HANG to their 20s
    # timeout when a card's repo doesn't resolve). Without a cap, a board with many pending
    # or fixture cards blows the budget and the whole cycle times out. Cap both; remaining
    # work is picked up on the next tick (idempotent — the loop re-scans every 120s).
    MAX_ESCALATIONS = 2
    MAX_MOVES = 3
    escalations = 0
    moves = 0

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
                # Capped per cycle so a large pending board can't time out the run.
                if (status in (None, "", "pending") and trust != "manual"
                        and escalations < MAX_ESCALATIONS):
                    try:
                        ctx.call_tool("kirocrew-core", "spawn_run", {
                            "task": (f"Run pipeline step '{stage}' for DLC-YOLO card "
                                     f"{card.get('id')} in repo {(card.get('source') or {}).get('repo')}. "
                                     f"Follow the pipeline-workflow skill; when the step's work is "
                                     f"complete set card.step_status['{stage}']='done' in "
                                     f"the DLC-YOLO state file at {STATE}. Stay within the card's owned repo."),
                            "agent": "pipeline-orchestrator",
                        })
                        card.setdefault("step_status", {})[stage] = "pending"
                        escalations += 1
                        changed = True
                    except Exception:
                        pass
                continue

        # perform the move — capped per cycle (label-moves do slow `gh` calls that hang on
        # non-resolving repos). Over the cap, leave the card for the next tick.
        if moves >= MAX_MOVES:
            continue
        nxt = ladder[idx + 1]
        card["stage"] = nxt
        card["updated_at"] = now
        card.setdefault("history", []).append(
            {"from": stage, "to": nxt, "at": now, "agent": "advance-cron"})
        card.setdefault("step_status", {})[stage] = "advanced"
        _move_label(card, nxt)
        moves += 1
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
