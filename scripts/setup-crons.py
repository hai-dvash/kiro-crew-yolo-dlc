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

import hashlib
import json
import os
import py_compile
import re
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

# The jobs DLC-YOLO owns. Names are the reconcile key; anything else is left alone.
ADVANCE_NAME = "dlc-yolo-advance"
BACKLOG_NAME = "dlc-yolo-backlog-intake"
SPAWNS_NAME = "dlc-yolo-spawns"
SPAWNS_SRC = REPO / "crons" / "dlc_yolo_spawns.py"
SPAWNS_DST = CREW / "crons" / "dlc_yolo_spawns.py"


def _log(msg: str) -> None:
    print(f"[dlc-yolo sync] {msg}")


def _job_id(name: str) -> str:
    """A DETERMINISTIC 12-char lowercase-hex id for a job name.

    The gateway's cron-trigger/remove CLI validates ids against ^[a-f0-9]{6,12}$
    (see kiro_crew/cron_trigger.py _JOB_ID_RE). The old scheme —
    name.replace("dlc-yolo-", "dlc")[:12] — produced ids like 'dlcadvance' /
    'dlcspawns' that contain non-hex letters, so `kirocrew cron trigger`/`remove`
    REJECTED them as "Invalid job ID format". Derive a stable hex id from the name
    instead: deterministic (re-runs reconcile the SAME job, no duplicates) AND
    format-valid (so the job is manually triggerable/removable)."""
    return hashlib.sha1(name.encode("utf-8")).hexdigest()[:12]


def _job_template(name: str) -> dict:
    """A full crons.json v2 job record with safe defaults (matches the live schema)."""
    now = time.time()
    return {
        "id": _job_id(name),
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
    every_advance, every_backlog = 120, 200
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

    spawns = _job_template(SPAWNS_NAME)
    spawns["schedule"]["every_secs"] = 30
    spawns["script"] = "~/.kiro/crew/crons/dlc_yolo_spawns.py:snapshot"
    return [advance, backlog, spawns]


def deploy_script(check: bool) -> bool:
    """Copy the cron script(s) to their runtime location if missing or stale. Returns True if changed."""
    changed = False
    for src, dst in [(CRON_SRC, CRON_DST), (SPAWNS_SRC, SPAWNS_DST)]:
        if not src.exists():
            _log(f"WARN: repo cron script not found at {src}")
            continue
        need = (not dst.exists()) or (dst.read_bytes() != src.read_bytes())
        if not need:
            _log(f"cron script already up to date: {dst.name}")
            continue
        if check:
            _log(f"DRIFT: {dst.name} differs from repo (would redeploy)")
            changed = True
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        py_compile.compile(str(dst), doraise=True)
        _log(f"deployed cron script → {dst} (compiles OK)")
        changed = True
    return changed


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

    def _match(nm: str) -> dict | None:
        """Find the existing job for a desired BARE name, matching EITHER the bare name OR the
        app-NAMESPACED form 'dlc-yolo/<name>'. A gateway restart / `kirocrew app enable` re-scans
        the manifest and registers these crons app-namespaced (dlc-yolo/dlc-yolo-advance), while
        setup-crons.py's desired names are bare (dlc-yolo-advance). Matching only the bare name made
        each mechanism think the other's job was missing → it re-added its own → DUPLICATE crons
        (6 where 3 belong, racing). Prefer the NAMESPACED record when both exist: the gateway
        re-creates it on every restart, so it is the durable one to keep — reconcile it in place and
        let the bare duplicate be pruned below."""
        ns = None
        bare = None
        for j in jobs:
            jn = j.get("name") or ""
            if jn == nm:
                bare = j
            elif jn.endswith("/" + nm) or jn.split("/")[-1] == nm:
                ns = j
        return ns or bare

    # Prune exact-duplicate bare records when a namespaced twin exists for the same desired job
    # (the residue of the historic bare-vs-namespaced split) so we converge on ONE per job.
    desired_bare = set(desired.keys())
    kept: list[dict] = []
    seen_leaf: set[str] = set()
    for j in jobs:
        jn = j.get("name") or ""
        leaf = jn.split("/")[-1]
        if leaf in desired_bare:
            namespaced = "/" in jn
            key = leaf + ("|ns" if namespaced else "|bare")
            # if a namespaced twin for this leaf exists anywhere, drop the bare one
            has_ns_twin = any((oj.get("name") or "").endswith("/" + leaf) for oj in jobs)
            if not namespaced and has_ns_twin:
                if not check:
                    _log(f"pruned duplicate bare cron '{jn}' (namespaced twin kept)")
                changed = True
                continue
            if key in seen_leaf:
                continue  # collapse accidental same-form dupes
            seen_leaf.add(key)
        kept.append(j)
    jobs = kept

    for name, want in desired.items():
        cur = _match(name)
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
        # The mute flags (silent/hide_in_chat) must be part of drift detection too:
        # the update branch below is the ONLY writer of these flags, so if they were
        # excluded here a job that matches on script/message/agent/schedule/id but has
        # silent:false in the live store would report "already in sync" and NEVER get
        # muted — exactly why backlog-intake's silent:true stayed manifest-only across
        # sessions. Compare against the desired template's boolean defaults.
        flag_drift = any(bool(cur.get(f, False)) != bool(want.get(f, False))
                         for f in ("silent", "hide_in_chat"))
        sched_drift = (cur.get("schedule", {}).get("every_secs")
                       != want["schedule"]["every_secs"])
        # ID REPAIR: the gateway's cron trigger/remove CLI validates ids against
        # ^[a-f0-9]{6,12}$ (cron_trigger._JOB_ID_RE). An older setup wrote non-hex ids
        # (e.g. 'dlcadvance') that the CLI rejects as "Invalid job ID format". If the
        # current id is non-conformant, rewrite it to the deterministic hex id so the
        # job becomes manually triggerable/removable. Leave a valid id untouched.
        id_drift = not re.fullmatch(r"[a-f0-9]{6,12}", str(cur.get("id", "")))
        if drift or sched_drift or id_drift or flag_drift:
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
                if id_drift:
                    cur["id"] = want["id"]
                    _log(f"repaired non-hex id for cron '{name}' → {want['id']}")
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
