"""DLC-YOLO secure GitHub webhook admission and durable delivery inbox.

The receiver verifies GitHub's HMAC over the raw body, reduces the payload to a
privacy-minimized record, seals that record with a second domain-separated HMAC,
and appends it to a bounded durable inbox.  The advance cron re-verifies the seal
before authoritative GitHub refetch.  The inbox is transport, never state authority.
"""

from __future__ import annotations

import fcntl
import hashlib
import hmac
import json
import os
import re
import stat
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Mapping

SCHEMA_VERSION = 1
CONFIG_SCHEMA_VERSION = 1
MAX_BODY_BYTES = 256 * 1024
READ_CHUNK_BYTES = 64 * 1024
MAX_PENDING = 256
MAX_PROCESSED = 4096
MAX_INBOX_BYTES = 4 * 1024 * 1024
MAX_CONFIG_BYTES = 16 * 1024
MAX_CONFIG_REPOSITORIES = 128
MIN_SECRET_BYTES = 32
MAX_SECRET_BYTES = 1024
MAX_ATTEMPTS = 64
PROCESS_BATCH = 32

SECRET_ENV = "DLC_YOLO_GITHUB_WEBHOOK_SECRET"
REPOSITORIES_ENV = "DLC_YOLO_GITHUB_WEBHOOK_REPOS"
PORT_ENV = "DLC_YOLO_GITHUB_WEBHOOK_PORT"
INBOX_ENV = "DLC_YOLO_WEBHOOK_INBOX"
CONFIG_FILENAME = "webhook-config.json"
SIGNATURE_HEADER = "X-Hub-Signature-256"
DELIVERY_HEADER = "X-GitHub-Delivery"
EVENT_HEADER = "X-GitHub-Event"
LOOPBACK_HOST = "127.0.0.1"
RECEIVER_PATH = "/github"

ISSUE_ACTIONS = frozenset({"opened", "reopened", "labeled", "unlabeled", "closed"})
LABEL_ACTIONS = frozenset({"created", "edited", "deleted"})
EVENT_ACTIONS = {"issues": ISSUE_ACTIONS, "label": LABEL_ACTIONS}
TERMINAL_RESULTS = frozenset({"applied", "ignored", "rejected", "dead-letter"})

_DELIVERY_RE = re.compile(r"^[A-Za-z0-9-]{1,100}$")
_REPO_RE = re.compile(r"^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$")
_SIGNATURE_RE = re.compile(r"^sha256=([0-9a-fA-F]{64})$")
_RECEIVED_AT_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
_RECEIPT_DOMAIN = b"dlc-yolo-github-webhook-receipt-v1\0"
_RECEIPT_FIELDS = (
    "schema_version", "delivery_id", "event", "action", "event_type",
    "repository", "issue_number", "label", "received_at", "payload_sha256",
)
_CONFIG_FIELDS = {
    "schema_version", "enabled", "port", "repositories", "inbox_path", "secret",
    "autosync",
}
_ENV_CONFIG_KEYS = (PORT_ENV, SECRET_ENV, REPOSITORIES_ENV, INBOX_ENV)


class InboxError(RuntimeError):
    """Durable webhook configuration or inbox state cannot be trusted."""


def _path_has_symlink(path: Path) -> bool:
    """Refuse every existing symlink component, including the leaf."""
    absolute = Path(os.path.abspath(os.path.expanduser(str(path))))
    current = Path(absolute.anchor)
    for part in absolute.parts[1:]:
        current /= part
        try:
            if stat.S_ISLNK(os.lstat(current).st_mode):
                return True
        except FileNotFoundError:
            continue
        except OSError:
            return True
    return False


def resolve_config_path(environ: Mapping[str, str] | None = None) -> Path:
    """Place the secret-bearing config beside the selected durable state authority."""
    env = os.environ if environ is None else environ
    state = str(env.get("DLC_YOLO_STATE") or "").strip()
    if state:
        state_path = Path(os.path.expanduser(state))
        if not state_path.is_absolute():
            raise InboxError("state-path-not-absolute")
        return state_path.parent / CONFIG_FILENAME
    return Path(os.path.expanduser("~/.dlc-yolo")) / CONFIG_FILENAME


def _normalize_repositories(value: object, *, required: bool) -> list[str]:
    if not isinstance(value, list) or len(value) > MAX_CONFIG_REPOSITORIES:
        raise InboxError("config-repositories-invalid")
    normalized: dict[str, str] = {}
    for item in value:
        if not isinstance(item, str):
            raise InboxError("config-repository-invalid")
        repo = item.strip()
        if repo != item or _REPO_RE.fullmatch(repo) is None:
            raise InboxError("config-repository-invalid")
        normalized.setdefault(repo.casefold(), repo)
    if required and not normalized:
        raise InboxError("config-repositories-empty")
    return [normalized[key] for key in sorted(normalized)]


def validate_webhook_config(value: object, *, existing_secret: str = "") -> dict:
    """Validate and canonicalize the secret-bearing UI-managed configuration."""
    if not isinstance(value, dict):
        raise InboxError("config-not-object")
    allowed_input = {"enabled", "port", "repositories", "inbox_path", "secret", "autosync"}
    if not set(value).issubset(allowed_input):
        raise InboxError("config-fields-invalid")
    enabled = value.get("enabled")
    if not isinstance(enabled, bool):
        raise InboxError("config-enabled-invalid")
    autosync = value.get("autosync", False)
    if not isinstance(autosync, bool):
        raise InboxError("config-autosync-invalid")
    port = value.get("port")
    if not isinstance(port, int) or isinstance(port, bool) or not 1024 <= port <= 65535:
        raise InboxError("config-port-invalid")
    repositories = _normalize_repositories(
        value.get("repositories"), required=enabled,
    )
    inbox = value.get("inbox_path")
    if inbox in (None, ""):
        inbox = None
    elif (not isinstance(inbox, str) or inbox != inbox.strip()
          or "\x00" in inbox or "\n" in inbox or "\r" in inbox
          or len(inbox.encode("utf-8")) > 4096
          or not Path(os.path.expanduser(inbox)).is_absolute()):
        raise InboxError("config-inbox-path-invalid")
    supplied_secret = value.get("secret")
    secret = existing_secret if supplied_secret is None else supplied_secret
    if not isinstance(secret, str):
        raise InboxError("config-secret-invalid")
    secret_size = len(secret.encode("utf-8"))
    if ("\x00" in secret or "\n" in secret or "\r" in secret
            or secret_size > MAX_SECRET_BYTES
            or (enabled and secret_size < MIN_SECRET_BYTES)):
        raise InboxError("config-secret-invalid")
    return {
        "schema_version": CONFIG_SCHEMA_VERSION,
        "enabled": enabled,
        "port": port,
        "repositories": repositories,
        "inbox_path": inbox,
        "secret": secret,
        "autosync": autosync,
    }


def read_webhook_config(environ: Mapping[str, str] | None = None) -> dict | None:
    """Read a bounded, exact-schema, mode-0600 UI-managed config without following links."""
    path = resolve_config_path(environ)
    if _path_has_symlink(path):
        raise InboxError("config-symlink-refused")
    flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(path, flags)
    except FileNotFoundError:
        return None
    except OSError as exc:
        raise InboxError(f"config-open-failed:{type(exc).__name__}") from exc
    try:
        info = os.fstat(fd)
        if (not stat.S_ISREG(info.st_mode) or info.st_size > MAX_CONFIG_BYTES
                or stat.S_IMODE(info.st_mode) & 0o077):
            raise InboxError("config-not-secure-regular-file")
        raw = bytearray()
        while len(raw) <= MAX_CONFIG_BYTES:
            chunk = os.read(fd, min(READ_CHUNK_BYTES, MAX_CONFIG_BYTES + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > MAX_CONFIG_BYTES:
            raise InboxError("config-too-large")
    finally:
        os.close(fd)
    try:
        parsed = json.loads(bytes(raw).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InboxError("config-corrupt") from exc
    if not isinstance(parsed, dict) or parsed.get("schema_version") != CONFIG_SCHEMA_VERSION:
        raise InboxError("config-schema-invalid")
    # Forward-compatible: a config written before ``autosync`` existed is missing
    # exactly that key. Default it to False rather than rejecting the whole file
    # (which would break every pre-existing install). Any OTHER key drift is still
    # a hard schema error.
    keys = set(parsed)
    if keys != _CONFIG_FIELDS and keys != (_CONFIG_FIELDS - {"autosync"}):
        raise InboxError("config-schema-invalid")
    reconstructed = {key: parsed.get(key) for key in _CONFIG_FIELDS if key != "schema_version"}
    # Legacy config predates autosync: a missing key means "off", not invalid.
    if "autosync" not in parsed:
        reconstructed["autosync"] = False
    canonical = validate_webhook_config(reconstructed)
    return canonical


def write_webhook_config(config: object,
                         environ: Mapping[str, str] | None = None) -> dict:
    """Publish canonical configuration as an atomic, durable mode-0600 file."""
    candidate = config
    if isinstance(config, dict) and "schema_version" in config:
        if config.get("schema_version") != CONFIG_SCHEMA_VERSION or set(config) != _CONFIG_FIELDS:
            raise InboxError("config-schema-invalid")
        candidate = {key: value for key, value in config.items() if key != "schema_version"}
    canonical = validate_webhook_config(candidate)
    path = resolve_config_path(environ)
    if _path_has_symlink(path):
        raise InboxError("config-symlink-refused")
    try:
        path.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
    except OSError as exc:
        raise InboxError(f"config-parent-failed:{type(exc).__name__}") from exc
    if _path_has_symlink(path.parent) or _path_has_symlink(path):
        raise InboxError("config-symlink-refused")
    payload = json.dumps(
        canonical, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
    ).encode("utf-8")
    if len(payload) > MAX_CONFIG_BYTES:
        raise InboxError("config-write-too-large")
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        os.fchmod(fd, 0o600)
        view = memoryview(payload)
        while view:
            written = os.write(fd, view)
            if written <= 0:
                raise InboxError("config-short-write")
            view = view[written:]
        os.fsync(fd)
        os.close(fd)
        fd = -1
        if _path_has_symlink(path):
            raise InboxError("config-symlink-refused")
        os.replace(tmp, path)
        dir_fd = os.open(path.parent, os.O_RDONLY | getattr(os, "O_CLOEXEC", 0))
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
    except BaseException:
        if fd >= 0:
            os.close(fd)
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
    return canonical


def _parse_port(raw: object) -> int | None:
    try:
        port = int(str(raw).strip())
    except (TypeError, ValueError):
        return None
    return port if 1024 <= port <= 65535 else None


def _parse_repository_csv(raw: object) -> list[str]:
    normalized: dict[str, str] = {}
    for item in str(raw or "").split(","):
        repo = item.strip()
        if repo and _REPO_RE.fullmatch(repo):
            normalized.setdefault(repo.casefold(), repo)
    return [normalized[key] for key in sorted(normalized)]


def environment_managed(environ: Mapping[str, str] | None = None) -> bool:
    env = os.environ if environ is None else environ
    return any(key in env for key in _ENV_CONFIG_KEYS)


def effective_webhook_config(environ: Mapping[str, str] | None = None) -> dict:
    """Resolve one source atomically: gateway environment wins over UI storage."""
    env = os.environ if environ is None else environ
    if environment_managed(env):
        raw_port = str(env.get(PORT_ENV) or "").strip()
        inbox = str(env.get(INBOX_ENV) or "").strip() or None
        return {
            "source": "environment",
            "editable": False,
            "enabled": bool(raw_port),
            "port": _parse_port(raw_port),
            "repositories": _parse_repository_csv(env.get(REPOSITORIES_ENV)),
            "inbox_path": inbox,
            "inbox_path_valid": not inbox or Path(os.path.expanduser(inbox)).is_absolute(),
            "secret": str(env.get(SECRET_ENV) or ""),
            "autosync": False,
            "error": None,
        }
    try:
        stored = read_webhook_config(env)
    except InboxError as exc:
        return {
            "source": "invalid", "editable": False, "enabled": False,
            "port": None, "repositories": [], "inbox_path": None,
            "inbox_path_valid": False, "secret": "", "autosync": False, "error": str(exc),
        }
    if stored is None:
        return {
            "source": "none", "editable": True, "enabled": False,
            "port": None, "repositories": [], "inbox_path": None,
            "inbox_path_valid": True, "secret": "", "autosync": False, "error": None,
        }
    return {
        "source": "ui", "editable": True,
        **{key: stored[key] for key in ("enabled", "port", "repositories", "inbox_path", "secret", "autosync")},
        "inbox_path_valid": True, "error": None,
    }


def webhook_secret(environ: Mapping[str, str] | None = None) -> str:
    return str(effective_webhook_config(environ).get("secret") or "")


def allowed_repositories(environ: Mapping[str, str] | None = None) -> set[str]:
    return {
        str(item).casefold()
        for item in effective_webhook_config(environ).get("repositories", [])
    }


def receiver_port(environ: Mapping[str, str] | None = None) -> int | None:
    return effective_webhook_config(environ).get("port")


def receiver_enabled(environ: Mapping[str, str] | None = None) -> bool:
    return bool(effective_webhook_config(environ).get("enabled"))


def inbox_path_valid(environ: Mapping[str, str] | None = None) -> bool:
    return bool(effective_webhook_config(environ).get("inbox_path_valid"))


def resolve_inbox_path(environ: Mapping[str, str] | None = None) -> Path:
    env = os.environ if environ is None else environ
    config = effective_webhook_config(env)
    explicit = str(config.get("inbox_path") or "").strip()
    if explicit:
        path = Path(os.path.expanduser(explicit))
        if not path.is_absolute():
            raise InboxError("inbox-path-not-absolute")
        return path
    state = str(env.get("DLC_YOLO_STATE") or "").strip()
    if state:
        state_path = Path(os.path.expanduser(state))
        if not state_path.is_absolute():
            raise InboxError("state-path-not-absolute")
        return state_path.parent / "github-webhook-inbox.json"
    home = Path(os.path.expanduser("~/.dlc-yolo"))
    try:
        home.mkdir(parents=True, exist_ok=True)
        return home / "github-webhook-inbox.json"
    except OSError:
        return Path("/tmp/dlc-yolo/github-webhook-inbox.json")


def _header(headers: Mapping[str, str], name: str) -> str:
    direct = headers.get(name)
    if direct is not None:
        return str(direct).strip()
    wanted = name.casefold()
    for key, value in headers.items():
        if str(key).casefold() == wanted:
            return str(value).strip()
    return ""


def verify_github_signature(raw_body: bytes, provided: str, secret: str | None = None) -> bool:
    key = webhook_secret() if secret is None else secret
    match = _SIGNATURE_RE.fullmatch(str(provided or "").strip())
    if not key or match is None:
        return False
    expected = hmac.new(key.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, match.group(1).lower())


def _receipt_projection(record: Mapping[str, object]) -> dict:
    return {key: record.get(key) for key in _RECEIPT_FIELDS}


def _receipt_bytes(record: Mapping[str, object]) -> bytes:
    canonical = json.dumps(
        _receipt_projection(record), sort_keys=True, separators=(",", ":"), ensure_ascii=True,
    ).encode("utf-8")
    return _RECEIPT_DOMAIN + canonical


def seal_record(record: Mapping[str, object], secret: str | None = None) -> str:
    key = webhook_secret() if secret is None else secret
    if not key:
        return ""
    return hmac.new(key.encode("utf-8"), _receipt_bytes(record), hashlib.sha256).hexdigest()


def verify_record(record: object, secret: str | None = None) -> bool:
    if not isinstance(record, dict) or record.get("schema_version") != SCHEMA_VERSION:
        return False
    delivery = record.get("delivery_id")
    repo = record.get("repository")
    event = record.get("event")
    action = record.get("action")
    issue = record.get("issue_number")
    label = record.get("label")
    received_at = record.get("received_at")
    expected_type = f"io.dlcyolo.github.{event}.{action}"
    if record.get("event_type") != expected_type:
        return False
    if (not isinstance(received_at, str) or _RECEIVED_AT_RE.fullmatch(received_at) is None
            or not isinstance(record.get("payload_sha256"), str)
            or re.fullmatch(r"[0-9a-f]{64}", record["payload_sha256"]) is None):
        return False
    if not isinstance(delivery, str) or _DELIVERY_RE.fullmatch(delivery) is None:
        return False
    if not isinstance(repo, str) or _REPO_RE.fullmatch(repo) is None:
        return False
    if event not in EVENT_ACTIONS or action not in EVENT_ACTIONS[event]:
        return False
    if event == "issues" and (not isinstance(issue, int) or isinstance(issue, bool) or issue <= 0):
        return False
    if event == "label" and issue is not None:
        return False
    label_required = event == "label" or action in {"labeled", "unlabeled"}
    if label_required:
        if (not isinstance(label, str) or not label.strip()
                or label != label.strip() or len(label) > 100):
            return False
    elif label is not None:
        return False
    receipt = record.get("receipt_hmac")
    expected = seal_record(record, secret)
    return bool(expected and isinstance(receipt, str)
                and hmac.compare_digest(expected, receipt.lower()))


def admit_delivery(raw_body: bytes, headers: Mapping[str, str], now: str,
                   *, secret: str | None = None,
                   repositories: set[str] | None = None) -> tuple[int, str, dict | None]:
    """Authenticate and normalize one GitHub delivery without persisting it.

    Returns ``(http_status, reason, record)``. A verified ping has no record and
    returns 200; a queueable event returns 202. Nothing is JSON-decoded before
    the raw-body HMAC succeeds.
    """
    if len(raw_body) > MAX_BODY_BYTES:
        return 413, "body-too-large", None
    key = webhook_secret() if secret is None else secret
    allowed = allowed_repositories() if repositories is None else {
        item.casefold() for item in repositories
    }
    if not key or not allowed:
        return 503, "receiver-not-configured", None

    delivery_id = _header(headers, DELIVERY_HEADER)
    event = _header(headers, EVENT_HEADER)
    signature = _header(headers, SIGNATURE_HEADER)
    content_type = _header(headers, "Content-Type").lower()
    media_type = content_type.split(";", 1)[0].strip()
    if media_type != "application/json":
        return 415, "content-type-not-allowed", None
    if _DELIVERY_RE.fullmatch(delivery_id) is None:
        return 400, "invalid-delivery-id", None
    if event not in {*EVENT_ACTIONS, "ping"}:
        return 403, "event-not-allowed", None
    if not verify_github_signature(raw_body, signature, key):
        return 401, "signature-mismatch", None

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return 400, "malformed-json", None
    if not isinstance(payload, dict):
        return 400, "payload-not-object", None
    repository = payload.get("repository")
    repository = repository if isinstance(repository, dict) else {}
    repo = repository.get("full_name")
    if not isinstance(repo, str) or _REPO_RE.fullmatch(repo) is None:
        return 400, "invalid-repository", None
    if repo.casefold() not in allowed:
        return 403, "repository-not-allowed", None
    if event == "ping":
        return 200, "pong", None

    action = payload.get("action")
    if not isinstance(action, str) or action not in EVENT_ACTIONS[event]:
        return 403, "action-not-allowed", None

    issue_number: int | None = None
    label_name: str | None = None
    if event == "issues":
        issue = payload.get("issue")
        issue = issue if isinstance(issue, dict) else {}
        number = issue.get("number")
        if not isinstance(number, int) or isinstance(number, bool) or number <= 0:
            return 400, "invalid-issue-number", None
        issue_number = number
        if action in {"labeled", "unlabeled"}:
            label = payload.get("label")
            label = label if isinstance(label, dict) else {}
            name = label.get("name")
            if not isinstance(name, str) or not name.strip() or len(name) > 100:
                return 400, "invalid-label", None
            label_name = name.strip()
    else:
        label = payload.get("label")
        label = label if isinstance(label, dict) else {}
        name = label.get("name")
        if not isinstance(name, str) or not name.strip() or len(name) > 100:
            return 400, "invalid-label", None
        label_name = name.strip()

    record = {
        "schema_version": SCHEMA_VERSION,
        "delivery_id": delivery_id,
        "event": event,
        "action": action,
        "event_type": f"io.dlcyolo.github.{event}.{action}",
        "repository": repo,
        "issue_number": issue_number,
        "label": label_name,
        "received_at": now,
        "payload_sha256": hashlib.sha256(raw_body).hexdigest(),
    }
    record["receipt_hmac"] = seal_record(record, key)
    return 202, "accepted", record


def _empty_store() -> dict:
    return {"schema_version": SCHEMA_VERSION, "pending": [], "processed": []}


def _load_store(path: Path) -> dict:
    try:
        flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
        fd = os.open(path, flags)
    except FileNotFoundError:
        return _empty_store()
    except OSError as exc:
        raise InboxError(f"inbox-open-failed:{type(exc).__name__}") from exc
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_INBOX_BYTES:
            raise InboxError("inbox-not-regular-or-too-large")
        raw = bytearray()
        while len(raw) <= MAX_INBOX_BYTES:
            chunk = os.read(fd, min(READ_CHUNK_BYTES, MAX_INBOX_BYTES + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > MAX_INBOX_BYTES:
            raise InboxError("inbox-too-large")
    finally:
        os.close(fd)
    try:
        store = json.loads(bytes(raw).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InboxError("inbox-corrupt") from exc
    if (not isinstance(store, dict) or store.get("schema_version") != SCHEMA_VERSION
            or not isinstance(store.get("pending"), list)
            or not isinstance(store.get("processed"), list)):
        raise InboxError("inbox-schema-invalid")
    return store


def _atomic_write(path: Path, store: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(store, sort_keys=True, separators=(",", ":")).encode("utf-8")
    if len(payload) > MAX_INBOX_BYTES:
        raise InboxError("inbox-write-too-large")
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        os.fchmod(fd, 0o600)
        view = memoryview(payload)
        while view:
            written = os.write(fd, view)
            if written <= 0:
                raise InboxError("inbox-short-write")
            view = view[written:]
        os.fsync(fd)
        os.close(fd)
        fd = -1
        os.replace(tmp, path)
        try:
            dir_fd = os.open(path.parent, os.O_RDONLY | getattr(os, "O_CLOEXEC", 0))
            try:
                os.fsync(dir_fd)
            finally:
                os.close(dir_fd)
        except OSError:
            pass
    except BaseException:
        if fd >= 0:
            os.close(fd)
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


@contextmanager
def _locked_store(path: Path) -> Iterator[dict]:
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = path.with_name(path.name + ".lock")
    flags = os.O_CREAT | os.O_RDWR | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(lock_path, flags, 0o600)
    except OSError as exc:
        raise InboxError(f"inbox-lock-failed:{type(exc).__name__}") from exc
    try:
        os.fchmod(fd, 0o600)
        fcntl.flock(fd, fcntl.LOCK_EX)
        store = _load_store(path)
        yield store
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)


def enqueue_delivery(record: dict, path: Path | None = None) -> dict:
    target = resolve_inbox_path() if path is None else path
    if not verify_record(record):
        raise InboxError("record-receipt-invalid")
    delivery_id = record["delivery_id"]
    with _locked_store(target) as store:
        known = {
            item.get("delivery_id") for group in (store["pending"], store["processed"])
            for item in group if isinstance(item, dict)
        }
        if delivery_id in known:
            return {"status": "duplicate", "depth": len(store["pending"])}
        if len(store["pending"]) >= MAX_PENDING:
            return {"status": "full", "depth": len(store["pending"])}
        queued = dict(record)
        queued["attempts"] = 0
        store["pending"].append(queued)
        _atomic_write(target, store)
        return {"status": "accepted", "depth": len(store["pending"])}


def pending_deliveries(path: Path | None = None, limit: int = PROCESS_BATCH) -> list[dict]:
    target = resolve_inbox_path() if path is None else path
    bounded = max(0, min(int(limit), PROCESS_BATCH))
    with _locked_store(target) as store:
        return [dict(item) for item in store["pending"][:bounded] if isinstance(item, dict)]


def finalize_deliveries(results: Mapping[str, Mapping[str, str]], now: str,
                        path: Path | None = None) -> dict:
    """Atomically acknowledge terminal results and retain retries.

    ``retry`` leaves a delivery pending and increments its bounded attempt count.
    Every other recognized result moves it to the bounded processed receipt list.
    """
    target = resolve_inbox_path() if path is None else path
    with _locked_store(target) as store:
        kept: list[dict] = []
        completed: list[dict] = []
        for item in store["pending"]:
            if not isinstance(item, dict):
                continue
            delivery_id = item.get("delivery_id")
            result = results.get(str(delivery_id))
            if not isinstance(result, Mapping):
                kept.append(item)
                continue
            status_value = str(result.get("status") or "retry")
            reason = str(result.get("reason") or "")[:160]
            if status_value == "retry":
                attempts = int(item.get("attempts") or 0) + 1
                if attempts < MAX_ATTEMPTS:
                    item["attempts"] = attempts
                    item["last_attempt_at"] = now
                    item["last_error"] = reason
                    kept.append(item)
                    continue
                status_value = "dead-letter"
                reason = reason or "retry-cap"
            if status_value not in TERMINAL_RESULTS:
                status_value = "rejected"
                reason = "invalid-consumer-result"
            completed.append({
                "delivery_id": delivery_id,
                "event": item.get("event"),
                "action": item.get("action"),
                "repository": item.get("repository"),
                "issue_number": item.get("issue_number"),
                "status": status_value,
                "reason": reason,
                "processed_at": now,
            })
        store["pending"] = kept
        if completed:
            store["processed"].extend(completed)
            store["processed"] = store["processed"][-MAX_PROCESSED:]
        _atomic_write(target, store)
        return {"pending": len(kept), "completed": len(completed)}


def inbox_status(path: Path | None = None) -> dict:
    target = resolve_inbox_path() if path is None else path
    with _locked_store(target) as store:
        return {
            "schema_version": SCHEMA_VERSION,
            "pending": len(store["pending"]),
            "processed": len(store["processed"]),
        }
