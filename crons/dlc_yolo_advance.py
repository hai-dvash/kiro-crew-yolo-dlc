"""DLC-YOLO — deterministic pipeline advance (zero-token script cron).

Registered as:  script='~/.kiro/crew/crons/dlc_yolo_advance.py:advance'

This is the pipeline's poll loop. It is DELIBERATELY not an LLM agent turn: moving
a card between steps is pure bookkeeping (read state → find next step → move the
`dlc:<step>` label → write state). The only real reasoning lives in the step AGENTS
(spec/design/impl/review), which are spawned ON DEMAND, and in the human gates. So this
script:

  • advances cards whose current agent-step is marked done (card.step_status[step]=="done"),
  • auto-approves gate steps only under trust=autonomous,
  • fires the orchestrator (one spawn) ONLY for a card that has landed on an agent step
    with no work started yet — i.e. escalation is on-demand, not every cycle,
  • stays SILENT on empty cycles (raise Skip), and notifies only on a real signal
    (a gate is waiting for a human).

Effort / scope / ambiguity are NOT judged here — the step agents attribute effort and
flag scope growth when they produce their artifact (see the skill's "Step Review
Contract"); this loop only reads the numbers they already wrote.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

from kiro_crew.cron_script import Report, Skip


def _resolve_state_path() -> Path:
    """Resolve the state.json location, in priority order:

    1. DLC_YOLO_STATE env var (explicit, stageable per environment/platform),
    2. ~/.dlc-yolo/state.json (durable persistence — THE state home; when this can be
       created it is the SOLE tier: no /tmp mirror, so no split-brain is possible),
    3. /tmp/dlc-yolo/state.json (last-resort SCRATCH only — used just when the durable
       home dir genuinely cannot be created; /tmp is otherwise for truly-ephemeral
       artifacts, NOT for saving the pipeline).

    The tiers are MUTUALLY EXCLUSIVE for state — you get persistence OR /tmp, never both.
    The UI mirrors this exact order (see resolveStatePath in App.tsx).
    """
    env = os.environ.get("DLC_YOLO_STATE")
    if env:
        return Path(os.path.expanduser(env))
    home = Path(os.path.expanduser("~/.dlc-yolo/state.json"))
    try:
        home.parent.mkdir(parents=True, exist_ok=True)
        return home
    except OSError:
        return Path("/tmp/dlc-yolo/state.json")


STATE = _resolve_state_path()

# A "pending" step whose spawn is older than this is treated as a DEAD spawn and reclaimed
# (re-escalated once more). Sized to a few cron ticks so a genuinely in-flight spawn is never
# re-stormed, but a killed/crashed one doesn't wedge the card forever. See event-driven spec §4.
PENDING_STALE_SECS = 600

# Max times the loop will re-escalate a step that ended in `error` (retriable failure) before
# giving up and treating it as `blocked` (awaits a human). Bounds a crash-looping step.
MAX_STEP_RETRIES = 3

DEFAULT_STEP_IDS = [
    "intake", "requirements", "gate-spec", "design", "tasks",
    "gate-impl", "implement", "review", "gate-review", "pr", "done",
]


def _bootstrap() -> None:
    """Ensure the resolved state file exists. STATE is a SINGLE tier: persistence
    (~/.dlc-yolo) when it can be created (the norm), else /tmp as a last-resort scratch
    fallback — never both. The UI's /api/file-write cannot CREATE files, so the cron is the
    bootstrapper.

    One-time PROMOTION: if the durable file is missing/empty but a LEGACY /tmp state has real
    data (pipelines/cards) — the historical layout before persistence existed — seed the
    durable file FROM /tmp so that work is not orphaned. This is the only time /tmp feeds
    persistence; thereafter persistence is authoritative and /tmp is ignored for state."""
    def _content(p: Path) -> dict | None:
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None

    cur = _content(STATE)
    cur_has = bool(cur and ((cur.get("pipelines")) or (cur.get("cards"))))
    if cur_has:
        return  # persistence already holds real work — authoritative, never clobber

    seed = {"config": {"trust": "assisted", "depth": "standard"}, "pipelines": [], "cards": []}
    # promote a legacy /tmp board ONLY when the durable tier is the resolved STATE (i.e. we
    # are on persistence, not already on /tmp) and /tmp actually has data.
    legacy = Path("/tmp/dlc-yolo/state.json")
    if STATE != legacy:
        tmp_state = _content(legacy)
        if tmp_state and ((tmp_state.get("pipelines")) or (tmp_state.get("cards"))):
            seed = tmp_state  # promote historical work into persistence
    try:
        STATE.parent.mkdir(parents=True, exist_ok=True)
        STATE.write_text(json.dumps(seed, indent=2), encoding="utf-8")
    except OSError:
        pass


def _load() -> dict:
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _save(state: dict) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, indent=2), encoding="utf-8")
    os.replace(tmp, STATE)


def _pipeline_for(state: dict, card: dict) -> dict | None:
    pls = state.get("pipelines") or []
    by_id = next((p for p in pls if p.get("id") == card.get("pipeline_id")), None)
    if by_id:
        return by_id
    repo = (card.get("source") or {}).get("repo")
    return next((p for p in pls if p.get("repo") == repo), None)


def _ladder(pl: dict | None) -> list[str]:
    steps = (pl or {}).get("steps") or []
    ids = [s.get("id") for s in steps if s.get("id")]
    if not ids:
        ids = DEFAULT_STEP_IDS
    # bracket with intake…done
    out = ["intake"] + [s for s in ids if s not in ("intake", "done")] + ["done"]
    seen: set[str] = set()
    return [s for s in out if not (s in seen or seen.add(s))]


def _step_def(pl: dict | None, step_id: str) -> dict:
    for s in (pl or {}).get("steps") or []:
        if s.get("id") == step_id:
            return s
    return {"id": step_id, "type": "gate" if str(step_id).startswith("gate-") else "agent"}


def _eff_trust(state: dict, card: dict, step: dict, pl: dict | None) -> str:
    return (card.get("trust") or step.get("trust") or (pl or {}).get("trust")
            or (state.get("config") or {}).get("trust") or "assisted")


def _eff_depth(state: dict, card: dict, step: dict, pl: dict | None) -> str:
    """Effective depth for a step: card -> step -> pipeline -> config (mirror of _eff_trust).
    The cron only PASSES depth into the escalation seed; the fan-out BUDGET (crew/child-card cap)
    is enforced prompt-side by the orchestrator (depth-budget-spec), not by this script."""
    return (card.get("depth") or step.get("depth") or (pl or {}).get("depth")
            or (state.get("config") or {}).get("depth") or "standard")


# Depth defaults for the fan-out budget (depth-budget-spec §2). Depth SETS the scale; a card/
# pipeline may override. "unlimited" = no cap; a MISSING field falls back to the depth default
# (missing ≠ unlimited — a deliberate spec rule). effort_ceiling is in the S/M/L/XL points
# currency (S=1/M=3/L=5/XL=8) the spec-agent already emits into effort.scope.
_DEPTH_BUDGET_DEFAULTS = {
    "quick":    {"max_child_cards": 0, "effort_ceiling": 3},
    "standard": {"max_child_cards": 3, "effort_ceiling": 15},
    "deep":     {"max_child_cards": 8, "effort_ceiling": 40},
}


def _resolve_budget(state: dict, card: dict, pl: dict | None) -> dict:
    """Resolve a card's effective fan-out budget: card.budget -> pipeline.budget -> depth default
    (depth-budget-spec §5). Per FIELD resolution, so a card that overrides only max_child_cards
    still inherits effort_ceiling from the pipeline/depth. A value of "unlimited" (either field)
    means NO cap for that field; a MISSING field falls back to the depth default (never unlimited).
    Returns {max_child_cards, effort_ceiling} where each is an int cap or the string "unlimited"."""
    depth = (card.get("depth") or (pl or {}).get("depth")
             or (state.get("config") or {}).get("depth") or "standard")
    default = _DEPTH_BUDGET_DEFAULTS.get(depth, _DEPTH_BUDGET_DEFAULTS["standard"])
    card_b = card.get("budget") if isinstance(card.get("budget"), dict) else {}
    pl_b = (pl or {}).get("budget") if isinstance((pl or {}).get("budget"), dict) else {}

    def _field(name: str):
        for src in (card_b, pl_b):
            if name in src and src[name] is not None:
                return src[name]
        return default[name]

    return {"max_child_cards": _field("max_child_cards"), "effort_ceiling": _field("effort_ceiling")}


def _resolve_capability(card: dict, step: dict) -> str:
    """Resolve the step's capability PROFILE agent name (persistent-step-agent-sessions-spec §5).

    Order: explicit card.capability -> step.capability -> a deterministic role default. A one-off
    step.capability_template (or card) wins outright if set. Maps a bare capability keyword to its
    dlcyolo-<profile> kiro-agent. GUARD: 'coordinator' (crew-routing) is granted ONLY to a step that
    actually dispatches (step.agent.crew or step.addenda[] set); a producing step defaults to
    'authoring' — never silently over-grant coordinator. The rich derive-from-prior-scope / compose
    / gate-a-widening decision stays the ORCHESTRATOR's; the script only needs a safe default so the
    spawned agent has enough tools (the agent can raise a capability-gap decision if it needs more)."""
    tmpl = card.get("capability_template") or step.get("capability_template")
    if tmpl:
        return str(tmpl)
    cap = card.get("capability") or step.get("capability")
    agent = step.get("agent") or {}
    dispatches = bool(agent.get("crew") or step.get("addenda"))
    sid = str(step.get("id") or "")
    # A DECOMPOSING step (intent/requirements) needs coordinator authority (gh child-ticket
    # creation + child_tickets handoff) EVEN WITHOUT a crew — decomposition is pipeline work.
    decomposes = sid in ("intent", "requirements")
    # A CODE-WRITING step (implement) needs BUILDER scope (write src/test + general shell to run
    # the toolchain: tsc/build/tests). Defaulting it to 'authoring' (results-only write, git-only
    # shell) makes it correctly self-BLOCK with a capability-gap (PRODUCE-OR-BLOCK) — the cause of
    # the implement stall. 'tasks' stays authoring (it writes a tasks.md doc, not code).
    builds = sid in ("implement",)
    if not cap:
        # role default: code-writing -> builder; dispatching/decomposing -> coordinator;
        # plain producing (requirements-doc/design-doc/tasks-doc/review) -> authoring.
        if builds:
            cap = "builder"
        elif dispatches or decomposes:
            cap = "coordinator"
        else:
            cap = "authoring"
    # guard: never grant coordinator to a step that neither dispatches nor decomposes.
    if cap == "coordinator" and not (dispatches or decomposes):
        cap = "authoring"
    valid = {"readonly", "authoring", "builder", "coordinator"}
    if cap not in valid:
        cap = "authoring"
    return f"dlcyolo-{cap}"


def _is_gate(step: dict) -> bool:
    return step.get("type") == "gate" or str(step.get("id", "")).startswith("gate-")


def _slug_step(step_id: str) -> str:
    """Sanitize a step id for use in a `dlc:<id>` GitHub label. Strips anything
    that isn't alnum/-/_/. and any leading '-' so a crafted step id can never
    smuggle a leading '--flag' into the gh command line (M2)."""
    s = "".join(c for c in str(step_id) if c.isalnum() or c in "-_.")
    return s.lstrip("-") or "step"


def _spawn_agent_id(res) -> str | None:
    """Extract the spawned agent_id from a spawn_run tool result (first-class-sessions §3).

    The MCP result is typically an envelope {content:[{type:'text', text:'<json>'}]}, not a
    bare dict — so unwrap defensively (same pattern as dlc_yolo_spawns.py). Returns the agent
    id / session key if found, else None. Never raises: a missing id just means no deep-link
    this run, so the escalation is unaffected."""
    def _from_dict(d: dict) -> str | None:
        for k in ("agent_id", "id", "session_key", "session_id"):
            v = d.get(k)
            if isinstance(v, str) and v:
                return v
        return None
    try:
        # call_tool may hand back the tool's text DIRECTLY as a bare str (verified: spawn_run/
        # spawn_list return a bare human-readable str, NOT the {content:[...]} envelope). Handle
        # the string case FIRST: JSON, else the first hex token (the new agent id leads the line).
        # Without this branch the dict-only guard below fell straight to None and step_sessions was
        # never written — the true cause of step_sessions empty on every escalation (mirrors the
        # sibling dlc_yolo_spawns.py::_extract bare-str fix).
        if isinstance(res, str):
            try:
                parsed = json.loads(res)
                if isinstance(parsed, dict):
                    hit = _from_dict(parsed)
                    if hit:
                        return hit
            except (json.JSONDecodeError, TypeError):
                pass
            m = re.search(r"\b([0-9a-f]{6,12})\b", res)
            return m.group(1) if m else None
        if isinstance(res, dict):
            hit = _from_dict(res)
            if hit:
                return hit
            content = res.get("content")
            if isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        text = part.get("text") or ""
                        # spawn_run's result may be JSON with an id/agent_id, OR (the live
                        # format) a human-readable confirmation line that LEADS WITH the new
                        # agent's hex id — same listing shape as spawn_list. Try JSON first,
                        # then fall back to the first hex token so step_sessions actually gets
                        # a pointer (the bug that left step_sessions empty on every escalation).
                        try:
                            parsed = json.loads(text)
                            if isinstance(parsed, dict):
                                hit = _from_dict(parsed)
                                if hit:
                                    return hit
                        except (json.JSONDecodeError, TypeError):
                            pass
                        m = re.search(r"\b([0-9a-f]{6,12})\b", text)
                        if m:
                            return m.group(1)
    except Exception:
        return None
    return None


def _cron_job_id(res) -> str | None:
    """Extract the cron job id from a cron_add tool result.

    STEP=SESSION-AS-SLOT (first-class-sessions §3, revised): an agent step is escalated by
    registering a one-shot agent cron whose FIRST RUN materializes an OPENABLE dashboard slot
    `cron-<job.id>` bound to the step's capability-profile agent (evidence: slack/gateway.py
    inject → dashboard/cron_inject.py get_or_create_slot(name=f"cron-{job.id}") +
    linked_session_key=f"cron:{job.id}"). We persist that JOB ID on the card so the UI can
    re-focus the slot by slot_key `cron-<id>` — a slot_key the dashboard router actually opens,
    unlike a bare spawn_run agent_id which has no slot. cron_add returns a human line that LEADS
    with the hex id: "Added job: <id> (<name>) ...". Same defensive unwrap as _spawn_agent_id;
    never raises (a missing id just means no deep-link this run)."""
    def _from_dict(d: dict) -> str | None:
        for k in ("id", "job_id"):
            v = d.get(k)
            if isinstance(v, str) and v:
                return v
        return None
    try:
        if isinstance(res, str):
            try:
                parsed = json.loads(res)
                if isinstance(parsed, dict):
                    hit = _from_dict(parsed)
                    if hit:
                        return hit
            except (json.JSONDecodeError, TypeError):
                pass
            m = re.search(r"\b([0-9a-f]{6,12})\b", res)
            return m.group(1) if m else None
        if isinstance(res, dict):
            hit = _from_dict(res)
            if hit:
                return hit
            content = res.get("content")
            if isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        text = part.get("text") or ""
                        try:
                            parsed = json.loads(text)
                            if isinstance(parsed, dict):
                                hit = _from_dict(parsed)
                                if hit:
                                    return hit
                        except (json.JSONDecodeError, TypeError):
                            pass
                        m = re.search(r"\b([0-9a-f]{6,12})\b", text)
                        if m:
                            return m.group(1)
    except Exception:
        return None
    return None


def _current_dlc_labels(repo: str, issue: int) -> list[str]:
    """Best-effort: read the issue's existing dlc:* labels so we can remove them."""
    try:
        out = subprocess.run(
            ["gh", "issue", "view", str(issue), "--repo", repo, "--json", "labels"],
            capture_output=True, timeout=20, text=True)
        if out.returncode != 0:
            return []
        labels = (json.loads(out.stdout or "{}") or {}).get("labels") or []
        return [l.get("name") for l in labels
                if str(l.get("name", "")).startswith("dlc:")]
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError):
        return []


_AUTH_USER_CACHE: dict = {}
_ISSUE_AUTHOR_CACHE: dict = {}  # (repo, issue) -> login|None ; avoids a gh call per card per cycle


def _auth_user() -> str | None:
    """The gh-authenticated login (cached). Default trusted author when none configured."""
    if "u" in _AUTH_USER_CACHE:
        return _AUTH_USER_CACHE["u"]
    u = None
    try:
        out = subprocess.run(["gh", "api", "user", "--jq", ".login"],
                             capture_output=True, timeout=20, text=True)
        if out.returncode == 0:
            u = (out.stdout or "").strip() or None
    except (OSError, subprocess.SubprocessError):
        u = None
    _AUTH_USER_CACHE["u"] = u
    return u


def _trusted_authors(state: dict, card: dict, pl: dict | None) -> list[str]:
    """Resolve trusted_authors: card -> pipeline -> global config -> [gh-auth user].
    Empty/unset NEVER means allow-all — it means the authenticated user only."""
    for src in (card, pl or {}, state.get("config") or {}):
        ta = src.get("trusted_authors")
        if ta:
            return list(ta)
    u = _auth_user()
    return [u] if u else []


def _owner_ok(state: dict, card: dict, pl: dict | None) -> bool:
    """OWNERSHIP GUARD (ownership-guard-spec): a card may be acted on only if its source issue
    was opened by a trusted author. Repo-owned is assumed (cards are created against owned repos);
    the author check is the un-forgeable part. FAIL CLOSED — if the author can't be verified
    (no gh / no issue), return False so write/terminal actions (escalate/advance/resolve) do NOT
    proceed on an unverified issue. sot=local cards (no issue yet) are allowed to run locally."""
    src = card.get("source") or {}
    if card.get("sot") != "github":
        return True  # local-only card, no GitHub issue to verify yet
    repo, issue = src.get("repo"), src.get("issue")
    if not (repo and issue):
        return False
    trusted = _trusted_authors(state, card, pl)
    if not trusted:
        return False  # cannot resolve a trusted set -> fail closed
    key = (repo, str(issue))
    if key in _ISSUE_AUTHOR_CACHE:
        author = _ISSUE_AUTHOR_CACHE[key]
        return author in trusted if author else False
    try:
        out = subprocess.run(
            ["gh", "issue", "view", str(issue), "--repo", repo, "--json", "author"],
            capture_output=True, timeout=20, text=True)
        if out.returncode != 0:
            _ISSUE_AUTHOR_CACHE[key] = None
            return False  # unverifiable -> fail closed
        author = ((json.loads(out.stdout or "{}") or {}).get("author") or {}).get("login")
        _ISSUE_AUTHOR_CACHE[key] = author
        return author in trusted
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError):
        return False  # fail closed (do not cache — transient, retry next tick)


def _move_label(card: dict, new_step: str) -> None:
    """Move the dlc:<step> label on the card's GitHub issue (best-effort, sot=github):
    remove any existing dlc:* labels, then add the single new one, so the issue's
    label set is the unambiguous source of truth for the card's stage."""
    if card.get("sot") != "github":
        return
    src = card.get("source") or {}
    repo, issue = src.get("repo"), src.get("issue")
    if not (repo and issue):
        return
    new_label = f"dlc:{_slug_step(new_step)}"
    try:
        subprocess.run(["gh", "label", "create", new_label, "--repo", repo,
                        "--color", "6366f1", "--description", "DLC-YOLO stage"],
                       capture_output=True, timeout=20)
        # remove any existing dlc:* labels (except the target), then add the new one
        stale = [l for l in _current_dlc_labels(repo, issue) if l != new_label]
        edit = ["gh", "issue", "edit", str(issue), "--repo", repo,
                "--add-label", new_label]
        for l in stale:
            edit += ["--remove-label", l]
        subprocess.run(edit, capture_output=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        pass  # local-only fall-through; re-sync happens when gh returns


def advance(ctx):
    from datetime import datetime, timezone

    _bootstrap()
    state = _load()
    cards = state.get("cards") or []
    if not cards:
        raise Skip()

    now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    moved: list[str] = []
    waiting_gates: list[str] = []
    changed = False
    # Per-cycle work caps — a cron run has a hard ~30s budget, and each escalation is a
    # slow spawn_run while each label-move is up to 3 `gh` calls (which HANG to their 20s
    # timeout when a card's repo doesn't resolve). Without a cap, a board with many pending
    # or fixture cards blows the budget and the whole cycle times out. Cap both; remaining
    # work is picked up on the next tick (idempotent — the loop re-scans every 120s).
    MAX_ESCALATIONS = 2
    MAX_MOVES = 3
    escalations = 0
    moves = 0

    # RC#2 — deterministic CONSUMED-flip (card-lifecycle-spec: no-retire-until-consumed). The
    # `consumed` transition on a parent's child_tickets[] was previously assigned to "the
    # orchestrator/successor" — but the escalation spawns a capability-PROFILE agent with NO
    # cross-card scope, so nobody ever set it and parents could never retire. The advance cron is
    # the right owner: it is a zero-token bookkeeping loop that already sees ALL cards + owns the
    # retire gate, and marking consumed is pure state bookkeeping (not agent reasoning). Rule: once
    # a CHILD card (one carrying parent_ticket) has been INGESTED — it has ANY step_status, i.e. a
    # successor step genuinely picked it up — flip the matching entry in its parent's
    # child_tickets[] to `consumed`. Idempotent (skips entries already consumed).
    _by_id = {c.get("id"): c for c in cards if c.get("id")}
    for child in cards:
        pt = child.get("parent_ticket")
        # parent_ticket may be a dict {card_id,issue,url} OR — from older/looser writers — a bare
        # issue number (int) or a string. Normalize defensively; a non-dict here previously crashed
        # the whole loop with "'int' object has no attribute 'get'" and auto-paused the cron.
        if isinstance(pt, dict):
            parent_id = pt.get("card_id")
            parent_issue = pt.get("issue")
        elif isinstance(pt, int):
            parent_id, parent_issue = None, pt
        else:
            continue
        if not (parent_id or parent_issue):
            continue
        ingested = bool(child.get("step_status"))  # any step recorded => a successor took it up
        if not ingested:
            continue
        parent = _by_id.get(parent_id) if parent_id else None
        if parent is None and parent_issue is not None:
            # resolve parent by its source issue number when only that was recorded
            parent = next((c for c in cards
                           if (c.get("source") or {}).get("issue") == parent_issue), None)
        if not parent:
            continue
        cid = child.get("id")
        cissue = (child.get("source") or {}).get("issue")
        for entry in (parent.get("child_tickets") or []):
            if not isinstance(entry, dict):
                continue
            match = (entry.get("card_id") == cid) or (cissue and entry.get("issue") == cissue)
            if match and entry.get("status") != "consumed":
                entry["status"] = "consumed"
                changed = True

    # STEP-CRON CLEANUP (session-as-slot bookkeeping — sibling of the consumed-flip pass). Each
    # agent step is now escalated as a one-shot AGENT CRON (see the escalation block) so it gets an
    # OPENABLE dashboard slot `cron-<id>`. Those `dlc-step-*` jobs must not accumulate in crons.json
    # once their work is finished. This zero-reasoning pass removes the cron for any step whose
    # step_status has reached a TERMINAL/at-rest value (done | advanced | blocked) while its pointer
    # still carries a live cron_id, then clears cron_id (retaining slot_key/session_key on the
    # pointer so the UI/history can still reference the — now archived — session). 'error' is NOT
    # cleaned: it is retriable and may be re-triggered by the reclaim path. Idempotent (skips
    # pointers already cleared); fully guarded so a cron-remove failure never breaks the loop.
    for card in cards:
        sess = card.get("step_sessions")
        if not isinstance(sess, dict):
            continue
        st = card.get("step_status") or {}
        for step, ptr in sess.items():
            if not isinstance(ptr, dict):
                continue
            jid = ptr.get("cron_id")
            if jid and st.get(step) in ("done", "advanced", "blocked"):
                try:
                    ctx.call_tool("kirocrew-cron", "cron_remove", {"job_id": jid})
                except Exception:
                    pass  # best-effort; leaving a stale one-shot job is harmless, retry next tick
                ptr.pop("cron_id", None)
                ptr["retired_at"] = now
                changed = True

    # BUDGET GUARD (depth-budget-spec §2/§4 — closes system-model §5 gap #1: budget was prompt-only
    # with NO deterministic actor, so a prompt regression silently un-capped fan-out). The advance
    # cron is the right owner (same as RC#2): a zero-token pass that already sees ALL cards. Per
    # PARENT card (one carrying child_tickets) it checks two ceilings, resolved card->pipeline->
    # depth-default (_resolve_budget; "unlimited" = no cap, missing = depth default):
    #   • max_child_cards vs len(child_tickets)   — hard, deterministic (real data the cron owns)
    #   • effort_ceiling  vs sum(effort.scope[*])  — the spec's `spent` = sum of realized per-phase
    #     scope; agents write effort.scope[phase] (spec/impl prompts) but NOBODY writes effort.spent,
    #     so we COMPUTE it here. Best-effort: only enforced when scope data exists (absent scope =
    #     nothing to measure, skip — we do NOT fake a ceiling on missing data).
    # On breach the action is NON-DESTRUCTIVE and gate-worthy (spec: "exceeding the ceiling is
    # itself a gate-worthy event"; "not a suggestion"): mark the parent's CURRENT stage `blocked`
    # with a budget block_reason so it surfaces to a human (even under autonomous — an overspend is
    # exactly the "pause on a blocker" case). We NEVER delete child cards (created work is real).
    # Idempotent: skip a stage already carrying a budget block_reason.
    for card in cards:
        kids = card.get("child_tickets")
        if not isinstance(kids, list) or not kids:
            continue  # only parents that actually fanned out can breach a fan-out budget
        pl = _pipeline_for(state, card)
        bud = _resolve_budget(state, card, pl)
        stage = card.get("stage")
        breach = None

        mcc = bud.get("max_child_cards")
        if isinstance(mcc, int) and len(kids) > mcc:
            breach = f"fan-out {len(kids)} child cards exceeds max_child_cards={mcc}"

        if breach is None:
            ceil = bud.get("effort_ceiling")
            scope = (card.get("effort") or {}).get("scope")
            if isinstance(ceil, int) and isinstance(scope, dict) and scope:
                try:
                    spent = sum(v for v in scope.values() if isinstance(v, (int, float)))
                except Exception:
                    spent = 0
                if spent > ceil:
                    breach = f"effort spent {spent}pts exceeds effort_ceiling={ceil}pts"

        if breach:
            existing = (card.get("block_reason") or {}).get(stage, "")
            if not str(existing).startswith("budget:"):
                card.setdefault("step_status", {})[stage] = "blocked"
                card.setdefault("block_reason", {})[stage] = f"budget: {breach} — human decision needed (raise budget, park, or back-step)"
                changed = True

    for card in cards:
        pl = _pipeline_for(state, card)
        ladder = _ladder(pl)
        stage = card.get("stage")
        if stage not in ladder:
            continue
        # OWNERSHIP GUARD (ownership-guard-spec): never escalate/advance/resolve a card whose
        # source issue is not authored by a trusted owner. Fail closed. A failing card is
        # flagged guard-blocked (visible) and SKIPPED this cycle — but we do NOT overwrite an
        # existing terminal/approved status (done/approved/advanced), so a transient gh outage
        # can't wedge a card that already legitimately progressed; it just pauses further action.
        if not _owner_ok(state, card, pl):
            if (card.get("guard") or {}).get("passed") is not False:
                card["guard"] = {"passed": False,
                                 "reason": "ownership guard: issue author not trusted / unverifiable",
                                 "at": now}
                st = (card.get("step_status") or {}).get(stage)
                if st not in ("done", "approved", "advanced"):
                    card.setdefault("step_status", {})[stage] = "blocked"
                    card.setdefault("block_reason", {})[stage] = "ownership guard failed"
                changed = True
            continue
        elif (card.get("guard") or {}).get("passed") is False:
            # previously blocked, now passes (e.g. author added to trusted_authors) — clear it,
            # and clear a guard-set 'blocked' so the card can resume (leave other statuses alone).
            card["guard"] = {"passed": True, "at": now}
            if (card.get("block_reason") or {}).get(stage) == "ownership guard failed":
                card.get("step_status", {}).pop(stage, None)
                card.get("block_reason", {}).pop(stage, None)
            changed = True
        idx = ladder.index(stage)
        if idx >= len(ladder) - 1:
            # Terminal stage. NO-RETIRE-UNTIL-CONSUMED guard (card-lifecycle spec §2): a card
            # is only 'retired' (removable) when every child ticket it handed off has been
            # 'consumed' by its successor. Otherwise it stays live (handed-off) so no work is
            # dropped if a successor never picked up. The loop only marks lifecycle here; it
            # does not delete — retirement/removal is the UI's or a reaper's job, gated on this.
            #
            # OWNERSHIP GUARD @ RESOLVE (ownership-guard-spec §3/§6-2/§6-6: RESOLVE is the STRICTEST
            # gate, re-checked AT THE POINT OF ACTION, not only at intake). Reaching the terminal
            # stage + retiring IS this system's "resolve" (the card is declared done/removable). The
            # top-of-loop guard already gates every advance, but we re-verify HERE so a card can never
            # be flipped to 'retired' unless the guard passes AT THIS MOMENT — fail closed (a trust-set
            # change or a now-unverifiable author holds the card at 'handed-off'/blocked rather than
            # silently resolving it). Note: the ACTUAL gh issue-close / pr-merge is NOT performed by
            # this cron (the orchestrator's shell allowlist forbids `gh pr merge`/`gh issue close` — no
            # code actor closes/merges; that stays a human action on GitHub), so gating the retire
            # transition is the deterministic resolve-protection available here.
            if not _owner_ok(state, card, pl):
                card["guard"] = {"passed": False,
                                 "reason": "ownership guard @ resolve: author not trusted / unverifiable — retire withheld",
                                 "at": now}
                if card.get("lifecycle") != "handed-off":
                    card["lifecycle"] = "handed-off"
                    card["updated_at"] = now
                    changed = True
                continue  # do NOT resolve/retire a guard-failing card
            children = card.get("child_tickets") or []
            all_consumed = all((c.get("status") == "consumed") for c in children) if children else True
            new_lc = "retired" if all_consumed else "handed-off"
            if card.get("lifecycle") != new_lc:
                card["lifecycle"] = new_lc
                card["updated_at"] = now
                changed = True
            continue  # done (terminal)
        step = _step_def(pl, stage)
        trust = _eff_trust(state, card, step, pl)
        status = (card.get("step_status") or {}).get(stage)

        if _is_gate(step):
            # gates only auto-advance under autonomous; otherwise wait for a human
            if trust == "autonomous" or status == "approved":
                pass  # advance below
            else:
                waiting_gates.append(f"{card.get('title', card.get('id'))} @ {stage}")
                continue
        else:
            # agent step: advance only when its work is marked "done" by the step run.
            # TERMINAL-STATUS CONTRACT (event-driven spec §5): a step run must end in a
            # terminal status — done | blocked | error — never a dangling "pending".
            #   done     → advance (handled above by `status != "done"` being false)
            #   pending  → a spawn is IN FLIGHT; leave it unless stale (dead spawn) → reclaim
            #   blocked  → cannot proceed without a human (missing capability / needs a
            #              decision); do NOT advance, do NOT re-escalate — it waits for an
            #              interjection to clear it. Surface once.
            #   error    → retriable failure; re-escalate after staleness, bounded by
            #              MAX_STEP_RETRIES; over the cap → treat as blocked.
            if status != "done":
                # blocked: hand to a human; the loop neither advances nor re-fires it.
                if status == "blocked":
                    waiting_gates.append(
                        f"{card.get('title', card.get('id'))} @ {stage} (blocked: "
                        f"{(card.get('block_reason') or {}).get(stage, 'needs attention')})")
                    continue

                pending_at = (card.get("pending_at") or {}).get(stage)
                stale = False
                if status in ("pending", "error") and pending_at:
                    try:
                        t = datetime.fromisoformat(str(pending_at).replace("Z", "+00:00"))
                        stale = (datetime.now(timezone.utc) - t).total_seconds() >= PENDING_STALE_SECS
                    except (ValueError, TypeError):
                        stale = False

                # error over the retry cap → escalate no more; mark blocked for a human.
                retries = (card.get("retry_count") or {}).get(stage, 0)
                if status == "error" and retries >= MAX_STEP_RETRIES:
                    card.setdefault("step_status", {})[stage] = "blocked"
                    card.setdefault("block_reason", {})[stage] = (
                        f"exceeded {MAX_STEP_RETRIES} retries")
                    changed = True
                    continue

                # eligible to (re-)escalate: never started, OR a stale dead pending, OR a
                # retriable error within the cap that has aged past the staleness window.
                eligible = status in (None, "") or (stale and status in ("pending", "error"))
                if (eligible and trust != "manual"
                        and escalations < MAX_ESCALATIONS):
                    try:
                        # RECLAIM (persistent-step-agent-sessions-spec §4/§9-4, revised for
                        # session-as-slot): if this is a STALE re-escalation and the step has a KEPT
                        # cron-backed session pointer, RESUME that same session by re-triggering its
                        # cron job (cron_trigger fires the existing job → same `cron:<id>` session,
                        # keeping accumulated context + the openable slot) rather than registering a
                        # fresh job (which would orphan the old slot). Fall through to a fresh launch
                        # only if there is no kept pointer or the trigger is unavailable.
                        prior = (card.get("step_sessions") or {}).get(stage) or {}
                        prior_cron = prior.get("cron_id") if prior.get("kept") else None
                        if stale and status in ("pending", "error") and prior_cron:
                            try:
                                ctx.call_tool("kirocrew-cron", "cron_trigger", {"job_id": prior_cron})
                                card.setdefault("step_status", {})[stage] = "pending"
                                card.setdefault("pending_at", {})[stage] = now
                                if status == "error":
                                    card.setdefault("retry_count", {})[stage] = retries + 1
                                escalations += 1
                                changed = True
                                continue  # re-triggered the kept cron session; no fresh launch this cycle
                            except Exception:
                                pass  # trigger unavailable → fall through to a fresh profiled launch
                        # PERSISTENT SCOPED STEP-AGENT (persistent-step-agent-sessions-spec §5):
                        # escalate the step as its resolved CAPABILITY PROFILE (so the spawned
                        # agent inherits that profile's tools — a coordinator-profiled agent HOLDS
                        # select_crew/spawn_run and dispatches crews/addenda FROM WITHIN itself),
                        # with keep=true so it persists (spawn_continue/spawn_steer → interjectable),
                        # carrying the card's effective trust + depth in the seed.
                        profile = _resolve_capability(card, step)
                        depth = _eff_depth(state, card, step, pl)
                        crew = (((step or {}).get("agent") or {}).get("crew"))
                        # SEAM 1 (spec §10): the step agent WAS spawned as its profile and HOLDS the
                        # routing tools for a dispatching step — instruct it to route from within,
                        # NOT the old "you probably can't, so blocked" premise. Only a genuine
                        # profile/tool gap raises a capability-gap decision (never fake, never
                        # silently downgrade).
                        crew_line = (
                            f" This step is crew-assigned ('{crew}'): you were spawned as '{profile}'"
                            f" and HOLD select_crew/spawn_run — run that crew (and any matching"
                            f" step.addenda[]) FROM WITHIN this session, bounded by the depth budget."
                            f" Only if your resolved profile genuinely lacks a needed tool, raise a"
                            f" capability-gap decision — never fake a crew run or silently downgrade."
                            if crew else "")
                        # DECOMPOSITION directive (persistent-step-agent ↔ depth-budget seam): the
                        # decompose-into-child-cards logic lives in the ORCHESTRATOR prompt, but under
                        # Spec C the spec/intent step is run by a capability PROFILE agent (not
                        # pipeline-orchestrator), so it would never see that instruction. Inject it
                        # here for the decomposing steps so the (coordinator-profiled) runner both HAS
                        # the authority and IS TOLD to fan out. 'unlimited' budget = no cap.
                        decomp_line = (
                            f" DECOMPOSE: this is a spec/intent step — under the depth budget"
                            f" (depth={depth}; pipeline.budget, where 'unlimited' means NO cap and"
                            f" NEVER gate/wedge on budget), break the idea into features and OPEN A"
                            f" CHILD CARD per feature (gh issue create + dlc:<first-step> label; record"
                            f" in the parent's child_tickets[] and set each child's parent_ticket)"
                            f" instead of piling everything on one card — quick keeps one card, deeper"
                            f" fans out. You hold coordinator tools; if you resolved to a non-coordinator"
                            f" profile, raise a capability-gap decision rather than skipping decomposition."
                            if stage in ("intent", "requirements") else "")
                        # BRANCH DISCIPLINE (branch-per-CARD, not branch-per-step): all of a card's
                        # results_in_repo commits must land on ONE card-scoped branch so the card
                        # yields ONE PR — not a branch+PR per step (the sprawl seen when each step
                        # invented feat/card-<id>-<step>). Use card.target_branch if pinned, else the
                        # deterministic dlc/<card-id>. Create/switch to it, don't open a per-step branch.
                        _tb = card.get("target_branch") or f"dlc/{card.get('id')}"
                        branch_line = (
                            f" BRANCH: commit ALL results_in_repo output for this card to the SINGLE"
                            f" card branch '{_tb}' (git checkout -B {_tb} once, reuse it every step) —"
                            f" NEVER create a per-step branch; this card must produce ONE PR, not one"
                            f" per step. Push only that branch by name.")
                        _seed = (f"Run pipeline step '{stage}' for DLC-YOLO card "
                                 f"{card.get('id')} in repo {(card.get('source') or {}).get('repo')}. "
                                 f"Effective modes — trust={trust}, depth={depth}, capability={profile}."
                                 f"{crew_line}{decomp_line}{branch_line} "
                                 f"Follow the pipeline-workflow skill and PRODUCE the step's "
                                 f"artifact (code where applicable), spawning crews/addenda from "
                                 f"WITHIN this session bounded by depth's fan-out budget. Honor "
                                 f"trust for the phase trigger and your end-of-step GATE "
                                 f"(autonomous → auto-approve; assisted/manual → park the gate "
                                 f"for a human, don't force it). You MUST end by writing a "
                                 f"TERMINAL status to card.step_status['{stage}'] in the DLC-YOLO "
                                 f"state file at {STATE}: 'done' if the artifact was genuinely "
                                 f"produced, 'blocked' (+ block_reason) if it needs a human/decision, "
                                 f"or 'error' (+ error_reason) on a retriable failure — NEVER leave "
                                 f"it 'pending'. Write state via the file API / native write tool, "
                                 f"NOT inline shell. Stay within the card's owned repo.")
                        # STEP = SESSION-AS-SLOT (first-class-sessions §3, revised). We escalate the
                        # step by registering a ONE-SHOT AGENT CRON (delay=0) bound to the step's
                        # capability PROFILE, INSTEAD of a slot-less spawn_run. Why: a spawn_run
                        # subagent is a background run with only an agent_id and NO dashboard slot —
                        # nothing the UI can open (confirmed: the dashboard opens a chat by slot_key +
                        # navigate('/chat'), never by a spawn_run agent_id). An agent cron's first run
                        # materializes an OPENABLE slot `cron-<job.id>` bound to that agent and linked
                        # to session `cron:<job.id>` (slack/gateway.py inject → dashboard/cron_inject.py
                        # get_or_create_slot). So the step-agent becomes a real, openable, conversational
                        # session — watchable + interjectable — while the loop stays NON-BLOCKING (this
                        # fire-and-forgets the registration, records pending, and moves on; completion is
                        # still read from the TERMINAL step_status the run writes to state.json). The
                        # step-agent, being a full agent session (NOT a subagent), can still spawn its
                        # crews/addenda from within (no-nesting applies only to spawn_run subagents).
                        # keep=persistent so `cron:<id>` is stable/openable; hide_in_chat=false so the
                        # slot actually appears; silent so it doesn't spam Slack; approval_mode=auto so
                        # the escalated step isn't wedged on tool prompts (same intent as spawn_run keep).
                        # A deterministic cleanup pass retires the one-shot job once the step is terminal.
                        spawn_res = ctx.call_tool("kirocrew-cron", "cron_add", {
                            "name": f"dlc-step-{card.get('id')}-{stage}",
                            "message": _seed,
                            "agent": profile,
                            "delay": 0,
                            "persistent_session": True,
                            "hide_in_chat": False,
                            "silent": True,
                            "approval_mode": "auto",
                        })
                        card.setdefault("step_status", {})[stage] = "pending"
                        card.setdefault("pending_at", {})[stage] = now
                        # FIRST-CLASS SESSIONS (first-class-sessions-spec §3, revised): record a pointer
                        # to the step's OPENABLE cron-backed session. We persist the CRON JOB ID (the
                        # id the dashboard slot/session derive from), plus the derived openable
                        # slot_key `cron-<id>` and session_key `cron:<id>` so the UI re-focuses the slot
                        # directly (no agent_id→slot bridge needed — that bridge does not exist). kept:true
                        # marks it continuable; a later interjection resumes session `cron:<id>`.
                        # Best-effort — a missing id just means no deep-link this run; never blocks.
                        _jid = _cron_job_id(spawn_res)
                        if _jid:
                            card.setdefault("step_sessions", {})[stage] = {
                                "cron_id": _jid, "slot_key": f"cron-{_jid}", "session_key": f"cron:{_jid}",
                                "name": f"dlc-yolo · {card.get('title', card.get('id'))} · {stage}",
                                "agent": profile, "at": now, "kept": True}
                        if status == "error":
                            card.setdefault("retry_count", {})[stage] = retries + 1
                        escalations += 1
                        changed = True
                    except Exception:
                        pass
                continue

        # perform the move — capped per cycle (label-moves do slow `gh` calls that hang on
        # non-resolving repos). Over the cap, leave the card for the next tick.
        if moves >= MAX_MOVES:
            continue
        nxt = ladder[idx + 1]
        card["stage"] = nxt
        card["updated_at"] = now
        card.setdefault("history", []).append(
            {"from": stage, "to": nxt, "at": now, "agent": "advance-cron"})
        card.setdefault("step_status", {})[stage] = "advanced"
        _move_label(card, nxt)
        moves += 1
        moved.append(f"{card.get('title', card.get('id'))}: {stage} → {nxt}")
        changed = True

    if changed:
        _save(state)

    # Notify only on a REAL, CHANGED signal: a gate/blocked card is waiting for a human. Dedup on
    # the waiting-set signature persisted in state — a card parked at a gate (or blocked) must NOT
    # re-notify every 120s cycle forever (that was the "stuck loop" notification spam). Only notify
    # when the set of waiting items CHANGES (a new one appears); a steady-state wait stays silent.
    prev_sig = state.get("_notified_waiting")
    cur_sig = sorted(waiting_gates)
    if waiting_gates and cur_sig != prev_sig:
        ctx.notify("⏸️ DLC-YOLO gates awaiting approval:\n- " + "\n- ".join(waiting_gates))
    # Persist the waiting signature ONLY when it MEANINGFULLY changed. Treat a missing key as an
    # empty set so a genuinely quiet no-op cycle (no gates, never any recorded) stays SILENT →
    # Skip, instead of writing `[]` over `None` and spuriously reporting "advanced: no moves"
    # every cycle. Normalize both sides to a list before comparing.
    if cur_sig != (prev_sig or []):
        state["_notified_waiting"] = cur_sig
        _save(state)
        changed = True

    if not changed and not waiting_gates:
        raise Skip()  # silent: nothing happened this cycle

    raise Report("advanced: " + ("; ".join(moved) if moved else "no moves") +
                 (f" | {len(waiting_gates)} gate(s) waiting" if waiting_gates else ""))
