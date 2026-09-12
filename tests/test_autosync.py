"""Regression tests for the quick-tunnel GitHub-hook auto-sync (backend/autosync.py)
and the ``autosync`` webhook-config field.

The auto-sync heals a rotating Cloudflare quick-tunnel URL by re-pointing the
allowlisted repos' GitHub webhooks to the new ``…trycloudflare.com/github``. Its
whole safety story is containment, so these tests pin the containment guards, not
just the happy path:

  * only a hook ALREADY on a quick-tunnel host is rewritten;
  * a hand-set stable URL is never PATCHed;
  * an already-current hook is a no-op (no PATCH);
  * a non-quick "new" URL is refused (can't broadcast a stable base);
  * the config field validates as a bool, defaults False, and a pre-existing
    config missing the key still reads (forward-compat).
"""

from __future__ import annotations

import asyncio
import importlib.util
import json
import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parent.parent


def _load(name: str, rel: str):
    spec = importlib.util.spec_from_file_location(name, _ROOT / rel)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


autosync = _load("_test_autosync", "backend/autosync.py")


def _gh_returning(hooks: list, *, patch_ok: bool = True, forbid_patch: bool = False):
    """Fake gh runner: list returns ``hooks``; PATCH records + returns code."""
    calls: list[list[str]] = []

    async def gh(args: list[str]):
        calls.append(args)
        if "-X" in args and "PATCH" in args:
            if forbid_patch:
                raise AssertionError(f"PATCH must not be issued: {args}")
            return (0 if patch_ok else 1), ""
        # list hooks
        return 0, json.dumps(hooks)

    gh.calls = calls  # type: ignore[attr-defined]
    return gh


def _run(coro):
    return asyncio.run(coro)


def test_updates_only_quick_tunnel_hook():
    hooks = [
        {"id": 1, "config": {"url": "https://old.trycloudflare.com/github"}},
        {"id": 2, "config": {"url": "https://stable.example.com/other"}},
    ]
    gh = _gh_returning(hooks)
    out = _run(autosync.autosync_hooks("https://new.trycloudflare.com", ["o/r"], gh))
    assert out["payload_url"] == "https://new.trycloudflare.com/github"
    res = out["results"][0]
    assert res["action"] == "updated"
    assert res["hook_id"] == 1
    assert res["to"] == "https://new.trycloudflare.com/github"
    # exactly one PATCH, to hook 1
    patches = [c for c in gh.calls if "-X" in c]
    assert len(patches) == 1 and "repos/o/r/hooks/1" in patches[0]


def test_stable_hook_never_patched():
    hooks = [{"id": 9, "config": {"url": "https://dlc.mydomain.com/github"}}]
    gh = _gh_returning(hooks, forbid_patch=True)
    out = _run(autosync.autosync_hooks("https://new.trycloudflare.com", ["o/r"], gh))
    assert out["results"][0]["action"] == "skipped-stable"


def test_idempotent_noop_when_already_current():
    hooks = [{"id": 1, "config": {"url": "https://new.trycloudflare.com/github"}}]
    gh = _gh_returning(hooks, forbid_patch=True)
    out = _run(autosync.autosync_hooks("https://new.trycloudflare.com", ["o/r"], gh))
    assert out["results"][0]["action"] == "noop"


def test_no_hook_at_all():
    gh = _gh_returning([], forbid_patch=True)
    out = _run(autosync.autosync_hooks("https://new.trycloudflare.com", ["o/r"], gh))
    assert out["results"][0]["action"] == "no-hook"


def test_refuses_non_quick_new_url():
    gh = _gh_returning([{"id": 1, "config": {"url": "https://old.trycloudflare.com/github"}}],
                       forbid_patch=True)
    out = _run(autosync.autosync_hooks("https://stable.mydomain.com", ["o/r"], gh))
    assert out.get("error") == "new-url-not-quick-tunnel"
    assert out["results"] == []


def test_bad_repo_string_errors_that_entry():
    gh = _gh_returning([], forbid_patch=True)
    out = _run(autosync.autosync_hooks("https://x.trycloudflare.com", ["norepo"], gh))
    assert out["results"][0]["action"] == "error"


def test_patch_failure_reported_not_raised():
    hooks = [{"id": 1, "config": {"url": "https://old.trycloudflare.com/github"}}]
    gh = _gh_returning(hooks, patch_ok=False)
    out = _run(autosync.autosync_hooks("https://new.trycloudflare.com", ["o/r"], gh))
    assert out["results"][0]["action"] == "error"
    assert out["results"][0]["error"] == "patch-failed"


# --- webhook config autosync field ---------------------------------------

webhook = _load("_test_webhook_cfg", "crons/dlc_yolo_webhook.py")


def test_config_autosync_defaults_false():
    c = webhook.validate_webhook_config({
        "enabled": False, "port": 8765, "repositories": [], "inbox_path": None, "secret": "",
    })
    assert c["autosync"] is False
    assert set(c) == webhook._CONFIG_FIELDS


def test_config_autosync_accepts_true():
    c = webhook.validate_webhook_config({
        "enabled": False, "port": 8765, "repositories": [], "inbox_path": None,
        "secret": "", "autosync": True,
    })
    assert c["autosync"] is True


def test_config_autosync_rejects_non_bool():
    with pytest.raises(webhook.InboxError):
        webhook.validate_webhook_config({
            "enabled": False, "port": 8765, "repositories": [], "inbox_path": None,
            "secret": "", "autosync": "yes",
        })


def test_legacy_config_without_autosync_still_reads(tmp_path, monkeypatch):
    """A config written before ``autosync`` existed must still load (default False),
    not fail the exact-schema guard."""
    import os
    import stat
    cfg = tmp_path / webhook.CONFIG_FILENAME
    legacy = {
        "schema_version": webhook.CONFIG_SCHEMA_VERSION,
        "enabled": False, "port": 8765, "repositories": [], "inbox_path": None, "secret": "",
    }
    cfg.write_text(json.dumps(legacy))
    os.chmod(cfg, 0o600)
    monkeypatch.setenv("DLC_YOLO_STATE", str(tmp_path / "state.json"))
    out = webhook.read_webhook_config(dict(os.environ))
    assert out is not None and out["autosync"] is False
