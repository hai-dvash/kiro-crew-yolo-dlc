"""DLC-YOLO cron control (app-managed pause/resume of the app's own crons).

Lets an operator take DLC-YOLO's automation offline from the UI — e.g. a
webhook-only deployment that wants no polling, or pausing all automation during
maintenance — and bring it back, without leaving the dashboard.

Boundaries:
* Acts ONLY on DLC-YOLO's own three jobs, matched by basename
  (``dlc-yolo-advance`` / ``dlc-yolo-spawns`` / ``dlc-yolo-backlog-intake``),
  whether registered bare (setup-crons) or namespaced (``dlc-yolo/...`` via the
  manifest scan). It never touches another app's or a user's cron.
* Discovers each job's REAL current id from ``kirocrew cron list`` — ids are
  gateway-assigned and the name format is mixed, so nothing is assumed/hashed.
* Runs the sanctioned ``kirocrew cron {list,pause,resume}`` CLI via
  ``create_subprocess_exec`` (no shell, no user argv), mirroring the crew-route
  editor's pattern.
"""

from __future__ import annotations

import asyncio
import re
import shutil

CLI_TIMEOUT_SECONDS = 15

# The three app-owned job basenames. A registered name is either bare
# (``dlc-yolo-advance``) or namespaced (``dlc-yolo/dlc-yolo-advance``); matching
# on the basename covers both. Ordered longest-first so 'dlc-yolo-backlog-intake'
# is tested before any shorter prefix could mis-match.
_JOB_BASENAMES = (
    "dlc-yolo-backlog-intake",
    "dlc-yolo-advance",
    "dlc-yolo-spawns",
)

# A job row: "  <glyph> <id>  <name>  (<schedule>) ...". Paused rows use ⏸,
# active rows ✅. Capture id + name; tolerate the trailing description/schedule.
_ROW_RE = re.compile(r"^\s*(?P<glyph>\S+)\s+(?P<id>[A-Za-z0-9/_-]{4,})\s+(?P<name>\S+)\s")
_PAUSED_GLYPHS = ("⏸️", "⏸")


async def _run_cron_cli(arguments: list[str]) -> tuple[int, str]:
    executable = shutil.which("kirocrew")
    if not executable:
        raise FileNotFoundError("kirocrew")
    proc = await asyncio.create_subprocess_exec(
        executable, "cron", *arguments,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=CLI_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise
    # stdout carries the job rows / result line; stderr may carry unrelated
    # config-loader warnings, so parse stdout only.
    return proc.returncode or 0, stdout.decode("utf-8", "replace")


def _basename(name: str) -> str:
    return name.rsplit("/", 1)[-1]


def _matched_job(name: str) -> str | None:
    base = _basename(name)
    for job in _JOB_BASENAMES:
        if base == job:
            return job
    return None


def _parse_jobs(listing: str) -> list[dict]:
    """Extract the DLC-YOLO jobs (id, name, basename, paused) from cron-list output."""
    jobs: list[dict] = []
    for line in listing.splitlines():
        match = _ROW_RE.match(line)
        if not match:
            continue
        name = match.group("name")
        basename = _matched_job(name)
        if basename is None:
            continue
        jobs.append({
            "id": match.group("id"),
            "name": name,
            "basename": basename,
            "paused": match.group("glyph") in _PAUSED_GLYPHS,
        })
    return jobs


async def crons_status() -> dict:
    """List DLC-YOLO's own jobs with paused/active state."""
    try:
        code, out = await _run_cron_cli(["list"])
    except FileNotFoundError:
        return {"available": False, "error": "kirocrew-cli-unavailable", "jobs": []}
    except (OSError, asyncio.TimeoutError):
        return {"available": False, "error": "cron-list-failed", "jobs": []}
    if code != 0:
        return {"available": False, "error": "cron-list-failed", "jobs": []}
    jobs = _parse_jobs(out)
    return {
        "available": True,
        "jobs": jobs,
        "all_paused": bool(jobs) and all(j["paused"] for j in jobs),
        "any_active": any(not j["paused"] for j in jobs),
    }


async def _apply(verb: str) -> dict:
    """Pause/resume every matched DLC-YOLO job by its real id; report per-job."""
    status = await crons_status()
    if not status["available"]:
        return {"available": False, "error": status.get("error"), "results": []}
    results = []
    for job in status["jobs"]:
        try:
            code, _out = await _run_cron_cli([verb, job["id"]])
            results.append({"id": job["id"], "name": job["name"],
                            "ok": code == 0})
        except (FileNotFoundError, OSError, asyncio.TimeoutError):
            results.append({"id": job["id"], "name": job["name"], "ok": False})
    # Return the refreshed status so the UI reflects reality, not intent.
    refreshed = await crons_status()
    refreshed["results"] = results
    return refreshed


async def pause_crons() -> dict:
    return await _apply("pause")


async def resume_crons() -> dict:
    return await _apply("resume")
