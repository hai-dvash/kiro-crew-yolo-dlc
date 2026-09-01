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


# spawn_list's live text listing: "<hexid>  [<status>] (<uptime>, ...) <task text>", one record
# per run — BUT the progress "(... Running: <cmd> ...)" field can contain EMBEDDED NEWLINES when
# the run is executing a multi-line shell command / heredoc (verified live: a running step whose
# command was a `python3 - <<'PY'` heredoc split the record across several physical lines). So we
# must NOT split-then-match line-by-line (that shreds such a record and drops the running row —
# the root cause of live_spawns.json freezing at runs=0 while a subagent was demonstrably
# running). Instead: find each RECORD START ("<hexid>  [status]") and take everything up to the
# next record start (or the trailing "Available agents:" footer) as ONE record, collapsing
# embedded newlines, then pull id/status/task from it. NOTE: spawn_list takes NO args and returns
# a plain string with NO structuredContent (kiro_crew/mcp_core.py). Text parsing is the only
# contract.
_REC_START_RE = re.compile(r"(?m)^\s*([0-9a-f]{6,})\s+\[([^\]]+)\]")
_REC_RE = re.compile(r"^\s*[0-9a-f]{6,}\s+\[[^\]]+\]\s*(?:\([^)]*\)\s*)?(.*)$", re.DOTALL)


def _parse_lines(text: str) -> list[dict]:
    """Parse spawn_list's human-readable listing into run dicts, ROBUST to a progress field that
    contains embedded newlines (a running multi-line command). Empty on no match."""
    text = text or ""
    # Drop the trailing "Available agents: ..." footer so it can't leak into the last record.
    foot = text.find("\nAvailable agents:")
    if foot != -1:
        text = text[:foot]
    starts = list(_REC_START_RE.finditer(text))
    out: list[dict] = []
    for i, m in enumerate(starts):
        seg = text[m.start(): (starts[i + 1].start() if i + 1 < len(starts) else len(text))]
        rid, status = m.group(1), m.group(2).strip()
        rm = _REC_RE.match(seg)
        # task = the tail after the (progress) group, with embedded newlines/whitespace collapsed
        task = " ".join((rm.group(1) if rm else "").split())
        out.append({"id": rid, "status": status, "task": task})
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
        # call_tool may hand back the tool's text DIRECTLY as a bare str (verified live:
        # ScriptContext.call_tool returns type=str for spawn_list) — NOT only the MCP envelope.
        # Handle the string case FIRST (parse the human-readable listing), else the older
        # list/dict/{content:[...]} shapes. Missing this branch made _extract return [] without
        # ever reaching _parse_lines — the true cause of live_spawns.json frozen at runs=0.
        if isinstance(r, str):
            try:
                parsed = json.loads(r)
                if isinstance(parsed, list):
                    return parsed
                if isinstance(parsed, dict):
                    return parsed.get("runs") or parsed.get("subagents") or []
            except (json.JSONDecodeError, TypeError):
                pass
            return _parse_lines(r)
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
