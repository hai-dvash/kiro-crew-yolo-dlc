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
import re
import time
from pathlib import Path

from kiro_crew.cron_script import Report, Skip


# spawn_list's live text listing: "<hexid>  [<status>] (<uptime>, ...) <task text>".
# Capture id, status, and the trailing task so the snapshot can match dlc-yolo runs and
# join on agent_id. Tolerant of extra spacing; the task is whatever follows the (...) group.
# NOTE: spawn_list takes NO args and returns a plain string ("\n".join lines) with NO
# structuredContent (verified in kiro_crew/mcp_core.py: inputSchema properties={}, handler
# emits f"{id}  [{status}]{err}{progress}{scope}  {task[:60]}"). Text parsing is the ONLY
# contract the tool offers — there is no JSON/structured mode to prefer.
_LINE_RE = re.compile(r"^\s*([0-9a-f]{6,})\s+\[([^\]]+)\]\s*(?:\([^)]*\))?\s*(.*)$")


def _parse_lines(text: str) -> list[dict]:
    """Parse spawn_list's human-readable listing into run dicts. Empty on no match."""
    out: list[dict] = []
    for line in (text or "").splitlines():
        m = _LINE_RE.match(line)
        if not m:
            continue
        out.append({"id": m.group(1), "status": m.group(2).strip(), "task": m.group(3).strip()})
    return out


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
                        text = part.get("text") or ""
                        # spawn_list returns a JSON list/dict OR (the live format) a
                        # human-readable listing: one run per line as
                        #   "<hexid>  [<status>] (<uptime>, ...) <task text>".
                        # Try JSON first; fall back to line parsing so we don't silently
                        # see 0 runs (the bug that froze live_spawns.json at runs=0 while a
                        # dlc-yolo subagent was demonstrably running).
                        try:
                            parsed = json.loads(text)
                            if isinstance(parsed, list):
                                return parsed
                            if isinstance(parsed, dict):
                                return parsed.get("runs") or parsed.get("subagents") or []
                        except (json.JSONDecodeError, TypeError):
                            pass
                        return _parse_lines(text)
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
