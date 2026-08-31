#!/usr/bin/env python3
"""DLC-YOLO sync & repair — idempotent post-sync deployment + cron reconcile.

WHY THIS EXISTS
---------------
`kirocrew app install`/`enable` reads the manifest ONCE. On this gateway version:
  • `app enable` on an already-enabled app is a no-op — it does NOT re-scan crons,
  • `disable`→`enable` can drop the crons without cleanly re-registering the SCRIPT
    cron (the CLI/MCP `cron add` cannot create a script cron — only the manifest scan
    can), and
  • the runtime cron script under ~/.kiro/crew/crons/ drifts from the repo after edits.

So an EDIT to the repo does not reliably reach the running gateway. This script closes
that gap deterministically and idempotently:

  1. DEPLOY   — copy crons/dlc_yolo_advance.py → ~/.kiro/crew/crons/ (the manifest
                references this runtime path; install does not copy it for you).
  2. RECONCILE— upsert the two DLC-YOLO cron jobs in ~/.kiro/crew/crons.json to match
                the app manifest (app-crons.json). SCRIPT cron for advance, AGENT cron
                (bound to pipeline-orchestrator) for backlog-intake.
  3. VERIFY    — compile-check the deployed script; report drift it repaired.

SAFETY
------
  • Backs up crons.json to crons.json.bak before writing.
  • UPSERT-ONLY on jobs named `dlc-yolo-*` — every other app's jobs are preserved
    byte-for-byte.
  • Idempotent: re-running changes nothing once in sync.
  • Never touches credentials, never force-pushes, never deletes another app's data.

USAGE
-----
    python3 scripts/setup-crons.py            # deploy + reconcile + verify
    python3 scripts/setup-crons.py --check     # report drift only, change nothing

Run it after editing the cron script or the manifest crons, or after a UI/skill sync.
"""

from __future__ import annotations

import json
import os
import py_compile
import shutil
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CREW = Path(os.path.expanduser("~/.kiro/crew"))
CRON_SRC = REPO / "crons" / "dlc_yolo_advance.py"
CRON_DST = CREW / "crons" / "dlc_yolo_advance.py"
CRONS_JSON = CREW / "crons.json"
APP_CRONS = CREW / "apps" / "dlc-yolo" / "app-crons.json"

# The two jobs DLC-YOLO owns. Names are the reconcile key; anything else is left alone.
ADVANCE_NAME = "dlc-yolo-advance"
BACKLOG_NAME = "dlc-yolo-backlog-intake"


def _log(msg: str) -> None:
    print(f"[dlc-yolo sync] {msg}")


def _job_template(name: str) -> dict:
    """A full crons.json v2 job record with safe defaults (matches the live schema)."""
    now = time.time()
    return {
        "id": name.replace("dlc-yolo-", "dlc")[:12],
        "name": name,
        "message": "",
        "schedule": {"kind": "every", "every_secs": 120, "at_ts": None, "cron_expr": None},
        "channel": None, "thread_ts": None,
        "enabled": True, "user_paused": False, "auto_paused": False,
        "last_run_ts": None, "last_status": None, "last_error": None,
        "created_ts": now, "delete_after_run": False, "last_result": None,
        "context_enabled": False, "agent_id": "", "approval_mode": "auto",
        "acked_items": [], "created_by": "dlc-yolo-setup",
        "silent": True, "session_key": "", "last_posted_hash": "",
        "consecutive_dupes": 0, "last_posted_at": 0.0,
        "last_failure_hash": "", "last_failure_at": 0.0, "consecutive_failures": 0,
        "skip_dates": [], "timezone": "", "persistent_session": True,
        "minimal_context": False, "hide_in_chat": True, "folder_id": "",
        "model": "", "agent_sequence": [], "env": {},
        "timeout_secs": 1800, "strict_schedule": False,
        "script": "", "command": "", "timeout": 0,
    }


def _desired_jobs() -> list[dict]:
    """Build the two desired job records from the manifest (app-crons.json) if present,
    else from known defaults. Script cron for advance, agent cron for backlog."""
    every_advance, every_backlog = 120, 900
    backlog_msg = (
        "Backlog back-feed. Collect the distinct owned repos from state.json cards' "
        "source.repo. For each repo, list open issues labeled dlc-backlog "
        "(gh issue list --repo <repo> --label dlc-backlog --state open --json "
        "number,title,url). For any such issue that does NOT already have a card "
        "(match on source.issue/url), create a new card at stage 'intake' inheriting "
        "config.trust/config.depth, linked to that issue. Only READ issues and CREATE "
        "intake cards — never advance or execute here. Persist state."
    )
    # Prefer the manifest's declared values if we can read them.
    try:
        declared = json.loads(APP_CRONS.read_text(encoding="utf-8"))
        for d in declared:
            nm = (d.get("name") or "").split("/")[-1]
            if nm == ADVANCE_NAME and d.get("every"):
                every_advance = int(d["every"])
            elif nm == BACKLOG_NAME:
                if d.get("every"):
                    every_backlog = int(d["every"])
                if d.get("message"):
                    backlog_msg = d["message"]
    except (OSError, json.JSONDecodeError, ValueError):
        pass  # fall back to defaults

    advance = _job_template(ADVANCE_NAME)
    advance["schedule"]["every_secs"] = every_advance
    advance["script"] = "~/.kiro/crew/crons/dlc_yolo_advance.py:advance"

    backlog = _job_template(BACKLOG_NAME)
    backlog["schedule"]["every_secs"] = every_backlog
    backlog["message"] = backlog_msg
    backlog["agent_id"] = "pipeline-orchestrator"
    return [advance, backlog]


def deploy_script(check: bool) -> bool:
    """Copy the cron script to its runtime location if missing or stale. Returns True if changed."""
    if not CRON_SRC.exists():
        _log(f"WARN: repo cron script not found at {CRON_SRC}")
        return False
    need = (not CRON_DST.exists()) or (
        CRON_DST.read_bytes() != CRON_SRC.read_bytes()
    )
    if not need:
        _log("cron script already up to date")
        return False
    if check:
        _log("DRIFT: cron script differs from repo (would redeploy)")
        return True
    CRON_DST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(CRON_SRC, CRON_DST)
    py_compile.compile(str(CRON_DST), doraise=True)
    _log(f"deployed cron script → {CRON_DST} (compiles OK)")
    return True


def reconcile_crons(check: bool) -> bool:
    """Upsert the two dlc-yolo jobs in crons.json by name. Other apps' jobs untouched.
    Returns True if changed."""
    try:
        store = json.loads(CRONS_JSON.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        store = {"version": 2, "jobs": []}
    jobs = store.get("jobs") or []
    desired = {j["name"]: j for j in _desired_jobs()}

    changed = False
    by_name = {j.get("name"): j for j in jobs}
    for name, want in desired.items():
        cur = by_name.get(name)
        if cur is None:
            if check:
                _log(f"DRIFT: cron '{name}' missing (would add)")
            else:
                # preserve id if a stale one existed under a different record
                jobs.append(want)
                _log(f"added cron '{name}' ({'script' if want['script'] else 'agent'})")
            changed = True
            continue
        # Reconcile only the fields we own; preserve runtime stats (last_run_ts etc.).
        fields = ["script", "message", "agent_id"]
        drift = any(cur.get(f, "") != want.get(f, "") for f in fields)
        sched_drift = (cur.get("schedule", {}).get("every_secs")
                       != want["schedule"]["every_secs"])
        if drift or sched_drift:
            if check:
                _log(f"DRIFT: cron '{name}' fields differ (would update)")
            else:
                cur["script"] = want["script"]
                cur["message"] = want["message"]
                cur["agent_id"] = want["agent_id"]
                cur.setdefault("schedule", {})["every_secs"] = want["schedule"]["every_secs"]
                cur["enabled"] = True
                cur["approval_mode"] = "auto"
                cur["silent"] = True
                cur["hide_in_chat"] = True
                _log(f"updated cron '{name}'")
            changed = True
        else:
            _log(f"cron '{name}' already in sync")

    if changed and not check:
        if CRONS_JSON.exists():
            shutil.copy2(CRONS_JSON, CRONS_JSON.with_suffix(".json.bak"))
        store["jobs"] = jobs
        CRONS_JSON.write_text(json.dumps(store, indent=2), encoding="utf-8")
        _log(f"wrote {CRONS_JSON} (backup at crons.json.bak)")
    return changed


def main() -> int:
    check = "--check" in sys.argv
    _log("checking for drift (no changes will be made)" if check else "deploying + reconciling")
    if not CREW.exists():
        _log(f"ERROR: KiroCrew dir not found at {CREW}")
        return 2
    d1 = deploy_script(check)
    d2 = reconcile_crons(check)
    if check:
        print()
        _log("DRIFT DETECTED — re-run without --check to repair" if (d1 or d2)
             else "everything in sync ✅")
        return 1 if (d1 or d2) else 0
    _log("done ✅  (verify: kirocrew cron list — advance=[script], backlog=[agent])")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
