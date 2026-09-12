"""DLC-YOLO Priority 11 ledger replay and projection authority.

This module promotes only the privacy-minimized operational read model to
ledger-replay authority. Rich pipeline/control state, prompts, artifacts, and
active-session mutation remain in ``state.json``. A projection is published only
when replay exactly matches the independently derived state projection.
"""

from __future__ import annotations

import fcntl
import hashlib
import json
import os
import re
import stat
import tempfile
from pathlib import Path
from typing import Iterable

SCHEMA_VERSION = 1
EVENT_TYPE = "io.dlcyolo.projection.snapshot"
EVENT_SUBJECT = "runtime"
MAX_LEDGER_BYTES = 64 * 1024 * 1024
MAX_PROJECTION_BYTES = 2 * 1024 * 1024
MAX_LEDGER_EVENTS = 100_000
MAX_PIPELINES = 1024
MAX_CARDS = 8192
MAX_RUNS = 32_768

_EVENT_ID_RE = re.compile(r"^evt-[0-9a-f]{32}$")
_WINDOWS_ABSOLUTE_RE = re.compile(r"^[A-Za-z]:[\\/]")
_FORBIDDEN_KEYS = frozenset({
    "path", "actual_path", "repo_path", "working_dir", "working_directory", "cwd",
    "title", "body", "prompt", "text", "question", "answer", "summary",
    "description", "message", "notes", "content", "prose",
    "reason", "block_reason", "error_reason", "rejection_reason", "terminal_reason",
    "secret", "signature", "password", "credential", "authorization", "cookie", "headers",
    "raw_payload", "raw_body", "payload", "url", "uri", "sender", "author",
})


class ProjectionError(RuntimeError):
    """A ledger cannot safely become or refresh projection authority."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def canonical_bytes(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False,
    ).encode("utf-8")


def projection_sha256(projection: dict) -> str:
    try:
        return hashlib.sha256(canonical_bytes(projection)).hexdigest()
    except (TypeError, ValueError) as exc:
        raise ProjectionError("projection-json-invalid") from exc


def _contains_forbidden(value: object, *, key: str | None = None) -> bool:
    if key is not None:
        normalized_key = key.casefold().replace("-", "_")
        if (normalized_key in _FORBIDDEN_KEYS
                or normalized_key.endswith("_path")
                or normalized_key.endswith("_secret")
                or normalized_key.endswith("_token")):
            return True
    if isinstance(value, dict):
        return any(_contains_forbidden(item, key=str(item_key))
                   for item_key, item in value.items())
    if isinstance(value, list):
        return any(_contains_forbidden(item) for item in value)
    if isinstance(value, str):
        return (value.startswith(("/", "~/", "file://", "\\\\"))
                or _WINDOWS_ABSOLUTE_RE.match(value) is not None)
    return False


def dedup_bytes(event: dict) -> bytes:
    """Canonical duplicate content; projection observation time is non-authoritative."""
    try:
        if event.get("type") == EVENT_TYPE:
            normalized = dict(event)
            normalized.pop("time", None)
            return canonical_bytes(normalized)
        return canonical_bytes(event)
    except (TypeError, ValueError) as exc:
        raise ProjectionError("ledger-event-not-json") from exc


def _unique_strings(items: object, key: str) -> bool:
    if not isinstance(items, list):
        return False
    seen: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            return False
        identity = item.get(key)
        if not isinstance(identity, str) or not identity or identity in seen:
            return False
        seen.add(identity)
    return True


def validate_projection(projection: object, workspace: str | None = None) -> dict:
    if not isinstance(projection, dict) or projection.get("schema_version") != SCHEMA_VERSION:
        raise ProjectionError("projection-schema-invalid")
    actual_workspace = projection.get("workspace")
    if not isinstance(actual_workspace, str) or not actual_workspace:
        raise ProjectionError("projection-workspace-invalid")
    if workspace is not None and actual_workspace != workspace:
        raise ProjectionError("projection-workspace-mismatch")
    pipelines = projection.get("pipelines")
    cards = projection.get("cards")
    runs = projection.get("runs")
    if not _unique_strings(pipelines, "id") or len(pipelines) > MAX_PIPELINES:
        raise ProjectionError("projection-pipelines-invalid")
    if not _unique_strings(cards, "id") or len(cards) > MAX_CARDS:
        raise ProjectionError("projection-cards-invalid")
    if not _unique_strings(runs, "run_id") or len(runs) > MAX_RUNS:
        raise ProjectionError("projection-runs-invalid")
    if _contains_forbidden(projection):
        raise ProjectionError("projection-privacy-invalid")
    try:
        projection_size = len(canonical_bytes(projection))
    except (TypeError, ValueError) as exc:
        raise ProjectionError("projection-json-invalid") from exc
    if projection_size > MAX_PROJECTION_BYTES:
        raise ProjectionError("projection-too-large")
    return projection


def projection_source(workspace: str) -> str:
    return f"/dlc-yolo/workspaces/{workspace}/projection"


def _event_id(source: str, digest: str) -> str:
    fact = {"projection_sha256": digest}
    canonical = canonical_bytes([source, EVENT_TYPE, EVENT_SUBJECT, fact])
    return "evt-" + hashlib.sha256(canonical).hexdigest()[:32]


def projection_event(projection: dict, now: str) -> dict:
    projection = validate_projection(projection)
    workspace = projection["workspace"]
    digest = projection_sha256(projection)
    source = projection_source(workspace)
    return {
        "specversion": "1.0",
        "id": _event_id(source, digest),
        "source": source,
        "type": EVENT_TYPE,
        "subject": EVENT_SUBJECT,
        "time": now,
        "correlationid": f"workspace:{workspace}",
        "datacontenttype": "application/json",
        "data": {
            "schema_version": SCHEMA_VERSION,
            "projection_sha256": digest,
            "projection": projection,
        },
    }


def _read_bounded(path: Path) -> bytes:
    flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(path, flags)
    except FileNotFoundError as exc:
        raise ProjectionError("ledger-missing") from exc
    except OSError as exc:
        raise ProjectionError("ledger-open-failed") from exc
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode):
            raise ProjectionError("ledger-not-regular")
        if info.st_size > MAX_LEDGER_BYTES:
            raise ProjectionError("ledger-too-large")
        fcntl.flock(fd, fcntl.LOCK_SH)
        raw = bytearray()
        while len(raw) <= MAX_LEDGER_BYTES:
            chunk = os.read(fd, min(64 * 1024, MAX_LEDGER_BYTES + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > MAX_LEDGER_BYTES:
            raise ProjectionError("ledger-too-large")
        return bytes(raw)
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)


def read_ledger_events(path: Path) -> tuple[list[dict], dict]:
    raw = _read_bounded(path)
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ProjectionError("ledger-encoding-invalid") from exc
    events: list[dict] = []
    seen: dict[tuple[str, str], bytes] = {}
    duplicate_count = 0
    record_count = 0
    for line_number, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        record_count += 1
        if record_count > MAX_LEDGER_EVENTS:
            raise ProjectionError("ledger-event-cap")
        try:
            event = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ProjectionError("ledger-malformed-line") from exc
        if (not isinstance(event, dict) or event.get("specversion") != "1.0"
                or not isinstance(event.get("source"), str)
                or not str(event.get("source")).startswith("/dlc-yolo/")
                or not isinstance(event.get("id"), str)
                or _EVENT_ID_RE.fullmatch(event["id"]) is None
                or not isinstance(event.get("type"), str)
                or not str(event.get("type")).startswith("io.dlcyolo.")
                or not isinstance(event.get("data"), dict)):
            raise ProjectionError("ledger-event-invalid")
        key = (event["source"], event["id"])
        encoded = dedup_bytes(event)
        prior = seen.get(key)
        if prior is not None:
            if prior != encoded:
                raise ProjectionError("ledger-duplicate-conflict")
            duplicate_count += 1
            continue
        seen[key] = encoded
        events.append(event)
    return events, {
        "line_count": len(text.splitlines()),
        "record_count": record_count,
        "event_count": len(events),
        "duplicate_count": duplicate_count,
    }


def replay_projection(events: Iterable[dict], workspace: str) -> tuple[dict, dict]:
    expected_source = projection_source(workspace)
    selected: tuple[dict, dict] | None = None
    projection_events = 0
    for event in events:
        if event.get("type") != EVENT_TYPE:
            continue
        if (event.get("source") != expected_source
                or event.get("subject") != EVENT_SUBJECT):
            raise ProjectionError("projection-event-scope-invalid")
        data = event.get("data")
        projection = data.get("projection") if isinstance(data, dict) else None
        digest = data.get("projection_sha256") if isinstance(data, dict) else None
        projection = validate_projection(projection, workspace)
        actual_digest = projection_sha256(projection)
        if not isinstance(digest, str) or digest != actual_digest:
            raise ProjectionError("projection-event-digest-mismatch")
        if event.get("id") != _event_id(expected_source, actual_digest):
            raise ProjectionError("projection-event-id-mismatch")
        projection_events += 1
        selected = (projection, event)
    if selected is None:
        raise ProjectionError("projection-event-missing")
    projection, event = selected
    return projection, {
        "projection_event_count": projection_events,
        "source_event_id": event["id"],
        "source_event_time": event.get("time"),
    }


def projection_paths(ledger_path: Path) -> tuple[Path, Path]:
    base = ledger_path.parent / "projections"
    return base / "runs.json", base / "status.json"


def _atomic_write(path: Path, value: dict) -> None:
    payload = json.dumps(value, indent=2, sort_keys=True).encode("utf-8")
    if len(payload) > MAX_PROJECTION_BYTES:
        raise ProjectionError("authority-file-too-large")
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        parent_info = path.parent.lstat()
    except OSError as exc:
        raise ProjectionError("authority-directory-invalid") from exc
    if stat.S_ISLNK(parent_info.st_mode) or not stat.S_ISDIR(parent_info.st_mode):
        raise ProjectionError("authority-directory-not-directory")
    try:
        existing = path.lstat()
    except FileNotFoundError:
        existing = None
    except OSError as exc:
        raise ProjectionError("authority-path-invalid") from exc
    if existing is not None and (not stat.S_ISREG(existing.st_mode) or stat.S_ISLNK(existing.st_mode)):
        raise ProjectionError("authority-path-not-regular")
    fd, temporary = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        os.fchmod(fd, 0o600)
        view = memoryview(payload)
        while view:
            written = os.write(fd, view)
            if written <= 0:
                raise ProjectionError("authority-short-write")
            view = view[written:]
        os.fsync(fd)
        os.close(fd)
        fd = -1
        os.replace(temporary, path)
        directory = os.open(
            path.parent,
            os.O_RDONLY | getattr(os, "O_CLOEXEC", 0)
            | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_DIRECTORY", 0),
        )
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    except BaseException:
        if fd >= 0:
            os.close(fd)
        try:
            os.unlink(temporary)
        except OSError:
            pass
        raise


def reconcile_projection(ledger_path: Path, expected: dict, now: str) -> dict:
    """Publish replay authority only after exact state-derived/replay parity.

    ``runs.json`` is last-known-good: a failed parity check writes status only and
    never replaces it. The caller may treat errors as observation failures; this
    function never mutates control state.
    """
    expected = validate_projection(expected)
    workspace = expected["workspace"]
    expected_digest = projection_sha256(expected)
    authority_path, status_path = projection_paths(ledger_path)
    try:
        events, reading = read_ledger_events(ledger_path)
        replayed, replay = replay_projection(events, workspace)
        replay_digest = projection_sha256(replayed)
        if replay_digest != expected_digest or replayed != expected:
            raise ProjectionError("replay-parity-mismatch")
        authority = {
            "schema_version": SCHEMA_VERSION,
            "authority": "ledger-replay",
            "authority_scope": "privacy-minimized-operational-read-model",
            "workspace": workspace,
            "projection_sha256": replay_digest,
            "generated_at": now,
            "parity": {
                "status": "verified",
                "state_projection_sha256": expected_digest,
                "replay_projection_sha256": replay_digest,
                "source_event_id": replay["source_event_id"],
                "ledger_event_count": reading["event_count"],
                "projection_event_count": replay["projection_event_count"],
            },
            "pipelines": replayed["pipelines"],
            "cards": replayed["cards"],
            "runs": replayed["runs"],
        }
        _atomic_write(authority_path, authority)
        status = {
            "schema_version": SCHEMA_VERSION,
            "workspace": workspace,
            "authority": "ledger-replay",
            "authority_active": True,
            "parity_status": "verified",
            "projection_sha256": replay_digest,
            "checked_at": now,
            "source_event_id": replay["source_event_id"],
        }
        _atomic_write(status_path, status)
        return status
    except (ProjectionError, OSError) as exc:
        reason = exc.code if isinstance(exc, ProjectionError) else "projection-storage-failed"
        status = {
            "schema_version": SCHEMA_VERSION,
            "workspace": workspace,
            "authority": "blocked-last-known-good-preserved",
            "authority_active": False,
            "parity_status": "blocked",
            "reason": reason,
            "state_projection_sha256": expected_digest,
            "checked_at": now,
        }
        try:
            _atomic_write(status_path, status)
        except (ProjectionError, OSError):
            pass
        return status
