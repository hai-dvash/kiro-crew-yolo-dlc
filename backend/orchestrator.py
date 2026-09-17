"""DLC-YOLO orchestrator-session trigger (app backend side).

first-class-sessions-spec §4: a user can open an inspectable pipeline-level
orchestrator session on demand. The backend does NOT mint the session itself —
only the advance cron can register a proper openable cron-backed slot (the
`silent:False` slot-minting rule). So this writes a bounded
``card.orchestrator_trigger = {status:'requested'}`` request into ``state.json``
and best-effort wakes the advance job; the cron's
``_process_orchestrator_triggers`` pass spawns the persistent session and records
``card.orchestrator_session``. This keeps the control model async — the backend
never blocks on the spawn.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

_STATE_POINTER = Path(os.path.expanduser("~/.dlc-yolo/.statepath"))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _resolve_state_path() -> Path:
    """Mirror the cron's resolution: DLC_YOLO_STATE (absolute) -> .statepath -> ~/.dlc-yolo."""
    env = str(os.environ.get("DLC_YOLO_STATE") or "").strip()
    if env:
        p = Path(os.path.expanduser(env))
        if p.is_absolute():
            return p
    try:
        pointer = json.loads(_STATE_POINTER.read_text("utf-8"))
        cand = str(pointer.get("path") or "").strip()
        if cand:
            cp = Path(cand)
            if cp.is_absolute() and cp.exists():
                return cp
    except (OSError, ValueError):
        pass
    return Path(os.path.expanduser("~/.dlc-yolo/state.json"))


def _advance_job_id() -> str:
    return hashlib.sha1(b"dlc-yolo-advance").hexdigest()[:12]


async def _wake_advance() -> None:
    executable = shutil.which("kirocrew")
    if not executable:
        return
    try:
        proc = await asyncio.create_subprocess_exec(
            executable, "cron", "trigger", _advance_job_id(),
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.wait(), timeout=10)
    except (OSError, asyncio.TimeoutError):
        pass


def _write_trigger(card_id: str) -> dict:
    path = _resolve_state_path()
    try:
        state = json.loads(path.read_text("utf-8"))
    except (OSError, ValueError):
        return {"ok": False, "error": "state-unreadable"}
    cards = state.get("cards")
    if not isinstance(cards, list):
        return {"ok": False, "error": "no-cards"}
    target = next((c for c in cards if isinstance(c, dict) and c.get("id") == card_id), None)
    if target is None:
        return {"ok": False, "error": "card-not-found"}
    # Single orchestrator: the live session lives on the PIPELINE, not the card (the card holds only
    # a back-ref {pipeline_id, session_key, ref} with no cron_id/slot_key). Resolve the pipeline
    # session for the already-open short-circuit; derive slot_key (cron-<id>) from session_key
    # (cron:<id>) when the pipeline object doesn't carry it.
    pipelines = state.get("pipelines") if isinstance(state.get("pipelines"), list) else []
    pl = next((p for p in pipelines if isinstance(p, dict) and p.get("id") == target.get("pipeline_id")), None)
    existing = (pl or {}).get("orchestrator_session") if isinstance(pl, dict) else None
    if isinstance(existing, dict) and existing.get("cron_id") and not existing.get("released"):
        sk = existing.get("session_key") or ""
        return {"ok": True, "status": "already-open",
                "session_key": sk,
                "slot_key": existing.get("slot_key") or (sk.replace("cron:", "cron-") if sk else None)}
    target["orchestrator_trigger"] = {"status": "requested", "at": _now()}
    # Atomic, fsync'd write beside the state file (mirror the cron's durability).
    tmp_fd, tmp_name = tempfile.mkstemp(dir=str(path.parent), prefix=".state-", suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as fh:
            json.dump(state, fh, indent=2)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_name, path)
    except OSError:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        return {"ok": False, "error": "state-write-failed"}
    return {"ok": True, "status": "requested"}


async def trigger_orchestrator(card_id: str) -> dict:
    """Request an orchestrator session for a card; the cron mints it on its next wake."""
    if not isinstance(card_id, str) or not card_id or len(card_id) > 200:
        return {"ok": False, "error": "card-id-invalid"}
    result = await asyncio.to_thread(_write_trigger, card_id)
    if result.get("ok") and result.get("status") == "requested":
        asyncio.create_task(_wake_advance())
    return result
