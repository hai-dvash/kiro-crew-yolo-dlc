"""Cron-control parser tests (backend/crons.py).

The pause/resume control discovers DLC-YOLO's own jobs from `kirocrew cron list`
output (there is no --json), so the row parser is the load-bearing piece: it
must match the 3 app jobs whether registered bare or namespaced, read the
paused/active glyph, capture the real gateway-assigned id, and never touch a
foreign cron.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
crons = importlib.import_module("backend.crons")

_SAMPLE = (
    "  \u2705 bbf70a8d  kirocrew-snapshot-daily  (At 3:00 AM IDT)  Daily snapshot\n"
    "  \u23f8\ufe0f c4fb1c36  dlc-yolo/dlc-yolo-spawns  (every 30s)  \n"
    "  \u23f8\ufe0f 20d6b33f  dlc-yolo/dlc-yolo-backlog-intake  (every 200s)  Backlog\n"
    "  \u2705 f838bdf3d496  dlc-yolo-advance  (every 120s)  \n"
)


def test_parse_matches_only_dlc_jobs():
    jobs = crons._parse_jobs(_SAMPLE)
    # Two owned jobs only. A stray backlog-intake row (e.g. from a stale re-seed) is NO LONGER
    # owned — the parser ignores it, so the UI never manages a retired job.
    assert {j["basename"] for j in jobs} == {"dlc-yolo-spawns", "dlc-yolo-advance"}
    assert all("snapshot" not in j["name"] for j in jobs)
    assert all("backlog" not in j["name"] for j in jobs)


def test_parse_reads_real_ids_bare_and_namespaced():
    by = {j["basename"]: j for j in crons._parse_jobs(_SAMPLE)}
    assert by["dlc-yolo-advance"]["id"] == "f838bdf3d496"        # bare
    assert by["dlc-yolo-spawns"]["id"] == "c4fb1c36"             # namespaced
    assert by["dlc-yolo-spawns"]["name"] == "dlc-yolo/dlc-yolo-spawns"


def test_parse_reads_paused_glyph():
    by = {j["basename"]: j for j in crons._parse_jobs(_SAMPLE)}
    assert by["dlc-yolo-spawns"]["paused"] is True
    assert by["dlc-yolo-advance"]["paused"] is False


def test_retired_backlog_cron_is_not_owned():
    # explicit lock: the retired agent cron must never be matched/managed again.
    assert crons._matched_job("dlc-yolo-backlog-intake") is None
    assert crons._matched_job("dlc-yolo/dlc-yolo-backlog-intake") is None


def test_basename_matching_rejects_lookalikes():
    assert crons._matched_job("dlc-yolo-advance") == "dlc-yolo-advance"
    assert crons._matched_job("dlc-yolo/dlc-yolo-advance") == "dlc-yolo-advance"
    assert crons._matched_job("dlc-yolo-advance-2") is None      # not an exact basename
    assert crons._matched_job("some-other-app/job") is None


def test_empty_listing_yields_no_jobs():
    assert crons._parse_jobs("") == []
    assert crons._parse_jobs("no job rows here\n") == []
