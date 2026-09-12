"""Per-pipeline sync_mode + poll-reconcile throttle tests (2.1).

sync_mode tunes how eagerly the always-on advance cron does a pipeline's
PERIODIC GitHub reconciliation; it never disables the safety-net poll, and a
verified webhook receipt (the _reconcile_github_transitions path) is never
throttled. These tests pin the resolution cascade and the staleness throttle,
including the auto-safety fallback to poll when the receiver is not enabled.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import dlc_yolo_advance as advance


def _iso(dt: datetime) -> str:
    return dt.isoformat(timespec="seconds").replace("+00:00", "Z")


def test_sync_mode_resolution_cascade():
    state = {"config": {"sync_mode": "webhook"}}
    # config default
    assert advance._eff_sync_mode(state, {}, None) == "webhook"
    # pipeline overrides config
    assert advance._eff_sync_mode(state, {}, {"sync_mode": "poll"}) == "poll"
    # card overrides pipeline
    assert advance._eff_sync_mode(state, {"sync_mode": "poll"}, {"sync_mode": "webhook"}) == "poll"
    # unknown value -> poll
    assert advance._eff_sync_mode({"config": {"sync_mode": "bogus"}}, {}, None) == "poll"
    # nothing set -> poll
    assert advance._eff_sync_mode({}, {}, None) == "poll"


def test_poll_mode_always_reconciles():
    state = {"config": {}}
    pl = {"id": "pl-1", "sync_mode": "poll"}
    assert advance._should_poll_reconcile(state, pl, _iso(datetime.now(timezone.utc))) is True


def test_webhook_mode_auto_safety_when_receiver_disabled(monkeypatch):
    monkeypatch.setattr(advance._github_webhook, "receiver_enabled", lambda: False)
    state = {"config": {}}
    pl = {"id": "pl-1", "sync_mode": "webhook"}
    # receiver down -> behave as poll (never starve a pipeline with no fast path)
    assert advance._should_poll_reconcile(state, pl, _iso(datetime.now(timezone.utc))) is True


def test_webhook_mode_throttles_within_window(monkeypatch):
    monkeypatch.setattr(advance._github_webhook, "receiver_enabled", lambda: True)
    now = datetime.now(timezone.utc)
    state = {"config": {}}
    pl = {"id": "pl-1", "sync_mode": "webhook",
          "_last_poll_reconcile_at": _iso(now - timedelta(seconds=60))}
    # 60s elapsed, default window 900s -> throttled (skip)
    assert advance._should_poll_reconcile(state, pl, _iso(now)) is False


def test_webhook_mode_reconciles_after_window(monkeypatch):
    monkeypatch.setattr(advance._github_webhook, "receiver_enabled", lambda: True)
    now = datetime.now(timezone.utc)
    state = {"config": {}}
    pl = {"id": "pl-1", "sync_mode": "webhook",
          "_last_poll_reconcile_at": _iso(now - timedelta(seconds=1000))}
    # >900s elapsed -> reconcile and stamp
    assert advance._should_poll_reconcile(state, pl, _iso(now)) is True
    assert pl["_last_poll_reconcile_at"] == _iso(now)


def test_webhook_mode_first_cycle_stamps_and_reconciles(monkeypatch):
    monkeypatch.setattr(advance._github_webhook, "receiver_enabled", lambda: True)
    now = _iso(datetime.now(timezone.utc))
    state = {"config": {}}
    pl = {"id": "pl-1", "sync_mode": "webhook"}  # no _last_poll_reconcile_at
    assert advance._should_poll_reconcile(state, pl, now) is True
    assert pl["_last_poll_reconcile_at"] == now


def test_custom_reconcile_interval(monkeypatch):
    monkeypatch.setattr(advance._github_webhook, "receiver_enabled", lambda: True)
    now = datetime.now(timezone.utc)
    state = {"config": {}}
    pl = {"id": "pl-1", "sync_mode": "webhook", "webhook_reconcile_interval_secs": 30,
          "_last_poll_reconcile_at": _iso(now - timedelta(seconds=45))}
    # 45s elapsed, custom window 30s -> reconcile
    assert advance._should_poll_reconcile(state, pl, _iso(now)) is True
