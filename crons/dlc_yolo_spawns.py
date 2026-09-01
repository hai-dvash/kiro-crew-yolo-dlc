"""DLC-YOLO — live spawn snapshot (zero-token script cron).

Registered as:  script='~/.kiro/crew/crons/dlc_yolo_spawns.py:snapshot'

Per docs/persistence-interjection-spec.md §6.5 (live subagents pane): the UI cannot poll the
`spawn_list` MCP tool itself (that is an agent action, and the app has no backend). So this
zero-token script cron polls `spawn_list` on a short interval and writes a small `live_spawns`
snapshot next to the state file; the UI reads that snapshot (a plain file) and MERGES it with
its state-derived run rows. This makes "dead vs in-flight" OBSERVABLE: a step that is `pending`
in state but has NO matching live spawn is a confirmed-dead spawn (reclaim immediately), vs a
`pending` WITH a live entry that is genuinely running.

Read-only observability — it never drives the pipeline. It writes ONLY the snapshot file, never
state.json. Resolves the durable-first base like the advance cron (persistence-authoritative).
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

from kiro_crew.cron_script import Report, Skip


def _base() -> Path:
    env = os.environ.get("DLC_YOLO_STATE")
    if env:
        return Path(os.path.expanduser(env)).parent
    home = Path(os.path.expanduser("~/.dlc-yolo"))
    try:
        home.mkdir(parents=True, exist_ok=True)
        return home
    except OSError:
        return Path("/tmp/dlc-yolo")


SNAPSHOT = _base() / "live_spawns.json"


def snapshot(ctx):
    """Poll spawn_list, write a compact snapshot for the UI. Silent on no change."""
    try:
        res = ctx.call_tool("kirocrew-core", "spawn_list", {})
    except Exception:
        raise Skip()  # tool unavailable this cycle — leave the last snapshot as-is

    # Normalize whatever spawn_list returns into a compact list the UI can read. The MCP tool
    # result is typically an envelope {content:[{type:'text', text:'<json>'}]} — NOT a bare
    # list or {runs:[]} — so unwrap defensively before the shape checks (C1: without this the
    # cron always saw 0 runs and the live pane never showed anything).
    def _extract(r):
        if isinstance(r, list):
            return r
        if isinstance(r, dict):
            for k in ("runs", "subagents", "agents", "structuredContent"):
                v = r.get(k)
                if isinstance(v, list):
                    return v
            content = r.get("content")
            if isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        try:
                            parsed = json.loads(part.get("text") or "")
                        except (json.JSONDecodeError, TypeError):
                            continue
                        if isinstance(parsed, list):
                            return parsed
                        if isinstance(parsed, dict):
                            return parsed.get("runs") or parsed.get("subagents") or []
        return []

    runs = []
    items = _extract(res)
    for it in items or []:
        if not isinstance(it, dict):
            continue
        task = str(it.get("task") or it.get("prompt") or "")
        hay = (task + " " + str(it.get("agent") or it.get("agent_name") or "")).lower()
        if not ("dlc-yolo" in hay or "card-" in hay or "dlcyolo-" in hay):
            continue
        runs.append({
            "id": it.get("agent_id") or it.get("id") or "",
            "task": task[:200],
            "started": it.get("started_at") or it.get("start_ts") or None,
            "status": it.get("status") or "running",
        })

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    payload = {"at": now, "runs": runs}

    # Only rewrite if the (id, status) signature changed — order-independent, and INCLUDES
    # status so a running->error/finished transition is not skipped (M2). Missing/unreadable
    # prev falls through to a write (guarantees a first snapshot).
    def _sig(rs):
        return sorted(((r.get("id") or ""), (r.get("status") or "")) for r in rs)
    try:
        prev = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
        if _sig(prev.get("runs", [])) == _sig(runs):
            raise Skip()
    except (OSError, json.JSONDecodeError):
        pass

    try:
        SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
        tmp = SNAPSHOT.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        os.replace(tmp, SNAPSHOT)
    except OSError:
        raise Skip()

    raise Report(f"live spawns: {len(runs)}")
