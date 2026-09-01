---
description: SDLC Pipeline workflow orchestration — stage definitions, gate logic, and state transitions.
always: true
---

# SDLC Pipeline Workflow

## Roles & lanes (single orchestrator — single-orchestrator-role-lanes-spec)

Three non-overlapping lanes; nothing spans two:

- **`/dlc-yolo` command = the human CONSOLE.** Captures/sharpens intent, presents the SETUP form,
  files the issue + records the card, HANDS OFF to the orchestrator, and relays gates/questions ↔
  human (writing answers/interjections to `state.json`). It does NOT run intent/bootstrap/
  step-dispatch — it INVOKES the orchestrator, it does not BECOME it.
- **`pipeline-orchestrator` = the SINGLE brain.** Owns SETUP-enactment, intent dispatch, bootstrap
  (crew create), per-step dispatch, capability/trust/depth resolution, decision-gate deliberation,
  back-step/fan-out, label moves, post-gate routing, ownership guard — in ONE place. Invoked by
  BOTH the command and the advance cron (same agent, same logic, no duplicate implementation).
- **step-agents (investigate/spec/design/impl/review/custom) = ONE narrow job each on their card**,
  in their own persistent scoped session (fan out crews/addenda from within — see the step-agent
  session section). A cross-step fork is RAISED to the orchestrator (decision gate), never decided
  in the step. `investigate` is just the first step-agent, not a console peer or a setup actor.

**Lane test:** reasoning about *the pipeline* (next step, which crew, back-step) → orchestrator;
*one card's one phase* → a step-agent; *talking to the human* → the command.

## Pipeline Stages

```
Intake → Requirements → [GATE: spec questions] → Design → Tasks → [GATE: approve impl] → Implement → Review → [GATE: post-review] → PR → Done
```

## Stage Definitions

| Stage | Type | Agent | Description |
|-------|------|-------|-------------|
| intake | auto | orchestrator | Issue arrives from Issue Radar or manual creation |
| investigate | auto | crew/agent | Classify the issue: summarize, propose GitHub labels, write a triage note (human-aided). Crew-assignable; a first-class agent step (see below) |
| requirements | auto | spec-agent | Produce requirements doc from issue |
| gate-spec | human | — | User answers clarifying questions before design proceeds |
| design | auto | design-agent | Produce design doc from approved requirements |
| tasks | auto | impl-agent | Break design into atomic implementation tasks |
| gate-impl | human | — | User approves task list before implementation starts |
| implement | auto | impl-agent | Execute tasks, write code, run tests |
| review | auto | review-agent | Code review against requirements + design |
| gate-review | human | — | User reviews findings, decides to proceed or fix |
| pr | auto | orchestrator | Open/update PR with all changes |
| done | terminal | — | Card complete |

## State Transitions

A card advances when:
- **Auto stages**: The assigned agent completes its work successfully
- **Human gates**: The user explicitly approves (via dashboard UI or ask_question)

A card can regress when:
- **gate-review** finds Critical/High issues → back to `implement` for fixes
- **User rejects** at any gate → back to the previous auto stage

## Card Schema

```json
{
  "id": "card-uuid",
  "title": "Issue title",
  "source": {"type": "github", "repo": "owner/repo", "issue": 42, "url": "..."},
  "stage": "requirements",
  "trust": "assisted",
  "depth": "standard",
  "lifecycle": "elaborated",
  "child_tickets": [
    {"issue": 43, "url": "https://github.com/owner/name/issues/43", "card_id": "card-…", "status": "consumed"}
  ],
  "parent_ticket": {"issue": 41, "url": "…", "card_id": "card-…"},
  "block_reason": {"design": "needs a data-model decision"},
  "retry_count": {"implement": 1},
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "artifacts": {
    "requirements": "path/to/requirements.md",
    "design": "path/to/design.md",
    "tasks": ["task-1.md", "task-2.md"],
    "review": "path/to/review.md",
    "spec_dir": "/tmp/dlc-yolo/specs/<card-id>/",
    "pr_url": "https://github.com/..."
  },
  "gate_history": [
    {"gate": "gate-spec", "decision": "approved", "at": "ISO8601", "notes": "..."}
  ],
  "trigger_history": [
    {"phase": "requirements", "trigger": "spec-builder", "at": "ISO8601"},
    {"phase": "implement", "trigger": "task-runner", "at": "ISO8601"}
  ],
  "step_sessions": {
    "design": {"agent_id": "…", "session_key": "…", "name": "dlc-yolo · gesture-engine · design", "at": "ISO8601"}
  },
  "orchestrator_session": {"agent_id": "…", "session_key": "…", "name": "dlc-yolo · <pipeline> · orchestrator", "at": "ISO8601", "warm": false},
  "interjection": [
    {"at": "ISO8601", "step": "design", "kind": "design", "text": "use a component store, not props drilling", "by": "hai-dvash", "status": "pending"}
  ],
  "effort": {
    "features": [
      {"id": "f1", "note": "Rate-limit middleware", "size": "M", "points": 3},
      {"id": "f2", "note": "Redis token bucket store", "size": "L", "points": 5}
    ],
    "total": 8,
    "spent": 5,
    "scope": {"requirements": 8, "design": 9, "tasks": 9}
  },
  "backstep_history": [
    {"from": "design", "to": "requirements", "reason": "design scope 9 > 2x requirements-baseline", "at": "ISO8601"}
  ],
  "parked": [
    {"id": "park-uuid", "note": "Needs auth redesign — can't spec now", "issue_url": "https://github.com/owner/repo/issues/57", "at": "ISO8601", "phase": "design"}
  ],
  "decisions": [
    {"id": "dec-uuid", "at": "ISO8601", "step": "design", "raised_by": "auto:intent-fidelity",
     "kind": "intent-fidelity", "question": "Caching design vs the issue's p99 intent?",
     "options": [{"id": "a", "note": "keep cache", "risk": "may not move p99"}, {"id": "b", "note": "profile hot path first", "risk": "adds a spike"}],
     "chosen": "b", "rationale": "the feature is a means; the intent is p99 — validate the hot path",
     "action": "add-step", "enhancement": {"target_step": "design", "add_step": "profile"}, "confidence": "med"}
  ],
  "history": [
    {"from": "intake", "to": "requirements", "at": "ISO8601", "agent": "spec-agent"}
  ]
}
```

The top of `state.json` also carries pipeline-wide defaults that cards inherit unless overridden:

```json
{
  "config": { "trust": "assisted", "depth": "standard" },
  "pipelines": [ ... ],
  "cards": [ ... ]
}
```

A card's effective mode = its own `trust`/`depth`, else its **pipeline's** `trust`/`depth`, else `config`.

### Pipeline (first-class object)

A **pipeline** is the top-level unit of work: one per repo/workspace, configured via the
Pipeline Setup modal, and owning the cards that flow through it. A pipeline exists even
with zero cards, and holds the per-repo default modes that its cards inherit.

```json
{
  "id": "pl-uuid",
  "repo": "owner/name",
  "workspace": "default",
  "source": "issue-radar",           // where the repo came from: issue-radar | workspace | manual
  "trust": "assisted",               // pipeline default (cards inherit unless they override)
  "depth": "standard",
  "backlog_intake": true,            // opt in to the dlc-yolo-backlog-intake cron for this repo
  "sot": "github",                   // source of truth for stage: "github" | "local"
  "results_in_repo": false,          // false (default): phase results (requirements/design/…) live ONLY in
                                     //   the workspace-partitioned .dlc-yolo results area
                                     //   (<base>/workspaces/<ws>/data/results/<card-id>/); true: ALSO mirror
                                     //   a copy into the owned repo — a repo-root .dlc-yolo/ mirror of the app-data layout
                                     //   (.dlc-yolo/<card-id>/ results + .dlc-yolo/workspaces/<ws>/data/pipeline_conversation.md)
                                     //   committed there, so results are present in the workspace repo itself. Card may override.
  "self_enabling": false,            // true: orchestrator runs the setup->intent->per-step self-enabling flow
  "trusted_authors": ["hai-dvash"],  // OWNERSHIP GUARD: only issues whose author.login is here may
                                     //   create/advance/RESOLVE a card. Unset/empty = [gh-auth user] only,
                                     //   NEVER allow-all. Card->pipeline->config resolution; fail closed.
  "approach": "simplified",          // "simplified" (lean ladder) | "enhanced" (research gate + addendum crews + deeper);
                                     //   the chosen side of the setup dual-proposal; sets each agent's simplified/enhanced mode
  "budget": {                        // depth-derived at SETUP (depth-budget-spec): depth = the EFFORT SCALE
                                     //   (in the existing S=1/M=3/L=5/XL=8 points), not arbitrary numbers
    "max_child_cards": 3,            //   quick=0 (one card) · standard<=3 · deep<=8 · "unlimited" = no cap
    "effort_ceiling": 15,            //   points cap (same S/M/L/XL currency): quick~3 · standard~15 · deep~40 · "unlimited" = no ceiling
    "max_feature_size": "L",         //   per-feature size welcomed: quick=S · standard=M/L · deep=L/XL
    "addenda": "obvious"             //   none (quick) | obvious (standard) | proactive (deep)
  },
  "steps": [
    { "id": "requirements", "name": "Requirements", "type": "agent",
      "agent": { "name": "spec-agent", "role": "produce requirements.md", "tools": ["ask_question"] },
      "trust": "assisted", "depth": "standard", "capability": "authoring", "label": "dlc:requirements" },
    { "id": "gate-spec", "name": "Gate: Spec", "type": "gate", "label": "dlc:gate-spec" },
    { "id": "implement", "name": "Implement", "type": "agent",
      "agent": { "name": "impl-agent", "role": "write code + tests", "crew": "dlcyolo-<pipeline>-impl" },
      "trust": "autonomous", "depth": "deep", "capability": "builder", "label": "dlc:implement" }
  ],
  "created_at": "ISO8601"
}
```

Every card carries `"pipeline_id": "pl-uuid"` linking it to its pipeline. The mode
resolution order is **card override → step override → pipeline default → global `config`**.
The `dlc-yolo-backlog-intake` cron only back-feeds repos whose pipeline has
`backlog_intake: true`.

### Custom steps (per pipeline)

A pipeline owns its OWN ordered `steps[]` — there is no fixed global stage list; the
built-in 11-stage ladder is only the default the wizard offers. Each step is one of:

- **`type: "gate"`** — a human approval point. No agent; the card waits here for
  approve/reject.
- **`type: "agent"`** — runs work. Carries an `agent` config: `{ name, role/prompt,
  tools[] }`. A tiny **step wizard** (in the setup modal or the `/dlc-yolo` command)
  collects that config conversationally when the step is created.

Each step may set its OWN execution profile — `trust` (manual/assisted/autonomous) and
`depth` (quick/standard/deep) — overriding the pipeline default for that step only. This
is how "this step runs YOLO/autonomous+deep, that gate stays manual" is expressed.

A step also carries a **`capability`** — the THIRD orthogonal axis (see
`docs/capability-profile-spec.md`): **depth** = how MANY crews/cards, **trust** = WHEN to pause,
**capability** = WHAT tool/scope the step's crew/agent gets. Values map 1:1 to four fixed base
**kiro-agent profile templates** the orchestrator points a crew at via
`kirocrew agent create --kiro-agent <profile>` (a crew's tools/trust come from its `kiro_agent`
template, NOT the thin `config.json` crew record and NOT a CLI flag — so the profile IS how a
crew stops raising spurious approvals):

| `capability` | Profile template | Scope |
|---|---|---|
| `readonly` | `dlcyolo-readonly` | read + card artifacts + read-only `gh` (investigate/triage/research/review) |
| `authoring` | `dlcyolo-authoring` | + scoped write to results + git-only shell + `ask_question` (requirements/design/spec/doc-addenda) |
| `builder` | `dlcyolo-builder` | + `write`/`shell` + `spawn_run`, git shell (implement/code/tests) |
| `coordinator` | `dlcyolo-coordinator` | + `select_crew` + `kirocrew agent create` + `gh` write verbs (dispatch crews/file tickets/bootstrap) |

Resolution: `card.capability` → `step.capability` → **derived from the step's role + the prior
step's produced scope**. A step DEFINING a new crew (bootstrap) is where the orchestrator picks
the profile; a step USING an existing crew inherits the profile that crew was created against.
The per-repo sandbox (cwd = owned repo) ALWAYS applies on top: capability = which tools, sandbox
= which repo. A one-off `capability_template` (nearest base + a delta) is allowed when no base
fits, but a scope-WIDENING one is a trust-gated decision, never silent.

Every step has a `label` (`dlc:<step-id>`) used as the GitHub stage label (below).

### Investigation step (issue classification)

The default ladder opens with an **`investigate`** agent step — a first-class,
crew-assignable classification pass (the pipeline-owned equivalent of Issue Radar's
Investigate button). When a card reaches it, the step's agent/crew:

1. Reads the issue (title/body/labels) within the card's owned repo sandbox.
2. Produces a short **triage note** (what it is, type: feature/bug/chore, rough size) into
   the card's `artifacts.investigation` and spec dir.
3. **Proposes GitHub labels** for the issue; under `manual`/`assisted` the user
   accepts/adjusts (human-aided), under `autonomous` the orchestrator may apply them via
   `gh` on the owned repo.
4. Sets `step_status['investigate']='done'` when classified.

Because it is a normal agent step, it can be crew-assigned (`step.agent.crew`, e.g. a
`triage`/`research` crew) and carry `addenda[]` like any other step. Issue Radar stays the
read-only source of candidate repos + its own Investigate button; DLC-YOLO's investigate
step is the pipeline-owned classification that then drives the ticket onward. Pipelines
that don't want it can delete the step in the setup modal.

### Source of truth (GitHub-first, local fallback)

`pipeline.sot` and each card's stage follow **GitHub as the source of truth**:

- **`sot: "github"`** — the card's stage is authoritative from its GitHub issue's
  `dlc:<step>` label. Advancing/rejecting a card **relabels the issue** (remove old
  `dlc:*`, add the new one) via `gh`, then reflects it into `state.json`. External tools
  (or a human relabeling on GitHub) can move a card by changing its label.
- **`sot: "local"`** — used when `gh`/the repo is unavailable. The pipeline runs entirely
  from `state.json`. When `gh` access returns, the orchestrator **re-syncs to GitHub as
  SoT**: it files/updates the issue, applies the current `dlc:<step>` label, and flips the
  card to `sot: "github"`.

### Step labels on GitHub

The orchestrator maintains a `dlc:<step-id>` label per pipeline step on the owned repo
(alongside `dlc-backlog`). On stage change it moves the single active `dlc:*` label. Label
creation is idempotent:
`gh label create dlc:<step-id> --color <hex> --description "DLC-YOLO stage" 2>/dev/null || true`.
Reading stage from GitHub = the issue's current `dlc:*` label; writing = remove others, add one.

**Issue Radar integration (read-only).** The setup modal can list repos already connected
in Issue Radar by READING `~/.kiro/crew/apps/issue-radar/data/config.json` (its
`repos[]`). DLC-YOLO never writes to Issue Radar's data dir — that store is lock-guarded
and cache-first, so it is strictly a read-only source of candidate repos. Issue Radar has
no cron of its own (an in-process 60s watcher), so DLC-YOLO's own crons run independently
and cannot interfere with it.

## The `/dlc-yolo` command

`/dlc-yolo` is a skill that turns the current chat session into a pipeline driver. On
invoke it asks whether to:

1. **Start a new pipeline conversation** — spec a feature/idea freely with the user, then
   **file it to GitHub as an issue** on the target pipeline's repo (`gh issue create`),
   apply the first `dlc:<step>` label, and record a card in `state.json` linked to that
   issue (`sot: github`). The local advance cron then triggers off the labeled issue.
2. **Maintain an existing pipeline** — pick an existing pipeline/card, review where it is
   (read its issue's `dlc:*` label), and drive the next step: answer a gate, re-spec,
   re-trigger a phase, or park/back-step.

The command can spec anything; the invariant is that whatever it produces is **persisted to
GitHub as an issue** so the pipeline is drivable locally from labels. If `gh` is
unavailable it creates a `sot: local` card and tells the user it will re-sync to GitHub
when access returns.

## Self-Enablement (autonomous orchestrator variation)

Self-enablement is an **autonomous variation of the orchestrator, not a separate engine**. The
same orchestrator runs; each agent (**intent**, spec, design, impl, review) runs in a
**simplified** or **enhanced** mode. Full design: `docs/self-enablement-spec.md`.

**Sequence: setup → intent (skippable) → per-step elaboration → bootstrap.**

1. **Setup FIRST (trust/depth-gated).** On pipeline creation the orchestrator proposes
   **simplified vs enhanced** as ONE decision-gate entry:
   - **Simplified** — lean default ladder, minimal/no new crews, inline agents, no research
     gate, depth `standard`/`quick`.
   - **Enhanced** — research crew as a go/no-go gate first, addendum crews
     (secure-design/a11y/perf), extra gates, depth `deep`.
   `manual` → ask at every fork; `assisted` → ask, and if the user doesn't choose **default
   mid** (assisted+standard, simplified); `autonomous` → the orchestrator picks.
2. **Intent NEXT, skippable.** The **Intent Agent** (`intent-agent`) resolves/sharpens intent,
   raising `needs-info`/`needs-research` decisions into the **one** decision gate (it is the
   gate's smartest caller, never a parallel mechanism). Elaborating intent autonomously produces
   an **intent card** that may carry **research addenda** (`step.addenda[]` with a research crew).
   Under `autonomous` intent runs by default; under `assisted`/`manual` the user may **skip** it
   (recorded as `trigger_history {phase:"intent", trigger:"skip"}`).
3. **Per-step elaboration.** If intent is skipped — or after it resolves — the user can
   elaborate **spec, or any step**, on demand (simplified or enhanced). Same agent-run
   machinery, triggered per-step; makes the pipeline usable fully-autonomous OR à-la-carte.
4. **Bootstrap (realizes the chosen approach).** Simplified = minimal. Enhanced = infer the
   crew lineup → propose (the enhanced side of the dual proposal) → `kirocrew agent create`
   (global, namespaced `dlcyolo-<pipeline>-<role>`) → wire `step.agent.crew`/`step.addenda[]` →
   open tickets → advance loop. Idempotency via a `card.bootstrap` marker; autonomous caps at
   ≤3 new crews and escalates on low confidence / irreversible plans.

The **Intent Agent** is the only genuinely new actor; everything else is orchestrator behavior
plus the existing agents running enhanced-or-simplified.

## Cron Behavior

DLC-YOLO uses a **two-tier** model, deliberately splitting deterministic bookkeeping from
agent reasoning:

- **`dlc-yolo-advance` (every 120s) — a zero-token SCRIPT cron.** Moving a card between
  steps is pure bookkeeping (read `state.json` → next step in the pipeline's `steps[]` →
  move the `dlc:<step>` label → write state), so it is NOT an LLM turn. The script
  (`~/.kiro/crew/crons/dlc_yolo_advance.py:advance`):
  1. advances any card whose current agent step is marked done (`step_status[step]=="done"`),
  2. auto-approves gate steps only under `trust: autonomous` (else leaves them waiting),
  3. escalates ON DEMAND — when a card lands on an agent step not yet started, it fires a
     single `spawn_run` for the orchestrator to run THAT step, then moves on,
  4. stays SILENT on empty cycles, and notifies only on a real signal (a gate awaiting a
     human).
- **Agent tier (on demand only).** The real reasoning lives in the step agents
  (spec/design/impl/review), spawned by the escalation above or by the `/dlc-yolo` command
  — never as a standing loop. `dlc-yolo-backlog-intake` (every 900s) likewise only reads
  `dlc-backlog` issues and creates intake cards.

**Cron registration & reconcile.** Both crons are declared in the manifest (`app.json`), but
live registration drifts: on an existing install `kirocrew app enable` does NOT re-scan crons,
the CLI/MCP `cron add` cannot create the zero-token **script** cron (only the manifest scan
can), and `kirocrew app uninstall` **removes the app's registered crons** (app data is kept).
The supported fix is the idempotent `scripts/setup-crons.py` — it re-deploys the cron script
and upserts both jobs to match the manifest (script cron for advance, `pipeline-orchestrator`
agent cron for backlog), touching no other app's jobs (`--check` previews drift). Run it after
a sync, an upgrade, or an uninstall→reinstall.

### Step Review Contract (agents own the judgment)

Because the advance loop is deterministic, every ambiguity/effort decision is the STEP
AGENT's responsibility, recorded in state so the loop acts on numbers, not prose. Each
agent step, when it finishes its work, MUST:

1. Write its artifact(s) to the card's `artifacts` and spec dir.
2. **Attribute effort / scope** for its phase into `effort.scope[<step>]` (and
   `effort.features[]` / `effort.total` for the spec agent) — this is what the scope-growth
   back-step compares.
3. **Self-review** against the step's acceptance criteria; if the phase outgrew the prior
   phase beyond the depth factor, or a feature can't be spec'd now, either flag a back-step
   or park the feature to `dlc-backlog` (the agent decides — the loop does not).
3b. **Raise the Decision Gate when needed (protects shallow/unseen intent).** Before marking
   done, self-check: does the artifact serve the card's INTENT (not just its literal text)?
   Did this step introduce entities the predecessor never sanctioned (unseen scope)? Was a
   consequential technical choice made implicitly? Would this step be materially better with
   a crew/addendum/tool it lacks (capability-gap)? If any is true — or you otherwise sense a
   fork worth surfacing — RAISE the gate: append a pending entry to `card.decisions[]`
   (`{id, at, step, raised_by, kind, question, options[], chosen?, rationale, action,
   enhancement?, confidence}`) with your recommendation, and do NOT set `step_status='done'`
   until its `action` is resolved (the orchestrator deliberates + trust-gates it). Actions
   include card-flow moves (back-step/re-scope/split/park/continue/escalate) AND pipeline
   ENHANCEMENTS (add-crew/add-addendum/add-tool/add-step) that reshape the step/pipeline via
   `state.json`. The gate is ON-DEMAND — not every step; skip it when the step cleanly
   serves intent with no fork.
4. **End on a TERMINAL status — never a dangling `pending`.** A step run MUST resolve
   `card.step_status[<step>]` to one of: **`done`** (the step's artifact was genuinely produced
   — code where applicable — and any raised decision resolved; the loop advances), **`blocked`**
   (cannot proceed without a human/decision — missing capability, needs approval, a fork; set
   `block_reason`; the loop neither advances nor re-escalates — it waits for an interjection),
   or **`error`** (retriable failure; set `error_reason`; the loop re-escalates after the
   staleness window, bounded by a retry cap, then treats it as `blocked`). `pending` means ONLY
   "a spawn is in flight" and MUST be transient — never end a run leaving it `pending`, and
   never advance an EMPTY phase just by moving a label (produce the artifact or write
   `blocked`). Crews are spawned from WITHIN the step's agent session (which has the tools); a
   run that lacks crew-routing tools writes `blocked` rather than faking it.

`step_status` values: `pending` (spawn in flight — transient), `done` (artifact produced —
safe to advance), `blocked` (awaits human; not re-escalated), `error` (retriable; re-escalated
under a cap), `advanced` (loop has moved past it). Gates use `approved` (set by the UI / user).

### Card Lifecycle (handoff — separate from step_status)

`card.lifecycle` tracks the card's position in the create-next-ticket / confirm-receipt
handoff, ABOVE per-step execution (`step_status`). States: `ingested` → `pending` →
`elaborated` (step produced its artifact) → `handed-off` (step created the next ticket(s),
recorded in `child_tickets[]`) → `consumed` (a successor step ingested the child) → `retired`
(removable). Plus `blocked`/`parked` (awaiting human).

**No-retire-until-consumed (hard guard):** a card may become `retired` (removed/archived) ONLY
when every entry in its `child_tickets[]` has `status: "consumed"`. Until then it stays live —
if a successor never picks up its child (crash/block), the parent is not lost; it re-surfaces.
This is the card-level analogue of the step-level staleness reclaim.

**Post-gate routing (orchestrator, on gate resolution):**
- **Approved** on an elaborating step → the step elaborates + **creates the next ticket(s)** as
  child cards (`gh issue create` + `dlc:<next>` label; record in `child_tickets[]`); parent →
  `handed-off`. The successor marks the child `consumed` on ingest; parent → `retired` ONLY
  then.
- **Rejected** → no child created; back-step (re-run predecessor) or park; parent stays live.
- **Interjected** → re-run the step incorporating the interjection (`card.interjection` /
  `decisions[]`), then re-evaluate the gate; no premature child, no retire.

Model B (distinct child tickets) — an elaborating step produces a real successor ticket, not
just a relabel; the parent is retired only once that child is genuinely consumed.

---

## First-Class Sessions & Non-Blocking Orchestrator

See `docs/first-class-sessions-spec.md`. Steps and the orchestrator are **visible, addressable,
interjectable SESSIONS** — not opaque fire-and-forget spawns — while the advance loop **NEVER
blocks waiting on a persistent orchestrator**.

- **Session pointers.** When a step's work is spawned (by the advance cron's escalation or by the
  orchestrator directly), a pointer is recorded on the card:
  `step_sessions[<step>] = {agent_id, session_key?, name:"dlc-yolo · <card> · <step>", at}`.
  The UI joins this against `live_spawns.json` (on `agent_id`) to turn a subagents-pane row into a
  **link that opens the session**; a later interjection uses the pointer to `spawn_continue` the
  SAME conversation (keeping accumulated context) instead of a cold re-spawn. Best-effort — a
  missing id just means no deep-link, never a block.
- **Orchestrator session + local trigger.** The orchestrator can be **triggered on demand**
  (`/dlc-yolo` or a pane control) as a NAMED session (`dlc-yolo · <pipeline> · orchestrator`,
  recorded in `card.orchestrator_session`) that a human can open to see its per-card reasoning,
  capability/profile assignments, and fan-out/back-step decisions — and interject. It is
  available + inspectable, NOT a standing daemon.
- **Non-blocking invariant (load-bearing).** The advance loop escalates via a fire-and-forget
  `spawn_run`, records `step_status='pending'` + `pending_at`, and **moves on in the same cycle**
  — it never awaits completion. Completion is signalled by a TERMINAL status written to state
  (done/blocked/error); the next tick reads it. A **warm** orchestrator session (kept open via
  `monitor_start`/`register_hook`, `orchestrator_session.warm=true`) is an OPT-IN observer/driver
  — the loop is correct whether it exists, is closed, or crashed, because the loop reads STATE,
  never waits on a session. A `pending` step with no matching `live_spawns` entry past the
  staleness window is a confirmed-dead spawn → reclaimed + re-escalated, so an abandoned session
  never wedges the pipeline.
- **Steer vs interject.** A running step session can be **live-steered** (`spawn_steer`) for an
  in-flight correction; a finished/`blocked` one is resumed by **`spawn_continue`** from its
  `step_sessions` pointer; OR write a durable **`card.interjection[]`** the next run honors. None
  block the loop. `blocked` is the interjection hand-off (a step parks with a reason, a human
  interjects, a later run resumes) — it is what makes "interjectable" real rather than a wedge.

### Step agent = persistent scoped session that fans out from within (canon AND custom)

**Invariant — STEP = SESSION, regardless of trigger:** if it's a step (canon OR custom
`type:"agent"`), it is RUN by spawning a persistent step-agent (`keep=true` + record
`card.step_sessions[step]`) — NEVER inline as the orchestrator itself. Crews + addenda are the
opposite: ephemeral, spawned from WITHIN the step-agent's session, never persisted, never given a
pointer. Persistence is a property of *being a step*, not of *which driver* (cron / `/dlc-yolo` /
manual kick) spawned it — every driver runs a step the same persistent way.

See `docs/persistent-step-agent-sessions-spec.md`. Each agent step — built-in OR a pipeline's own
**custom** `type:"agent"` step — escalates as a **persistent, capability-scoped agent** so it is
reachable (interject / gate / respond to orchestrator) AND holds the tools to **spawn its crews +
addenda from WITHIN itself**:

- **Escalate as the step's capability PROFILE** (`card.capability → step.capability → derived`),
  targeting `dlcyolo-{readonly|authoring|builder|coordinator}`. A spawned agent inherits ITS OWN
  `--agent` config's tools (verified: `kiro-cli --agent <name>`, MCP via per-session `mcpServers`),
  so a `coordinator`-profiled step agent genuinely holds `select_crew`/`spawn_run` and dispatches
  crews itself. **Custom steps resolve capability the SAME way** — no canon/custom distinction.
- **`keep=true`** so the step agent persists → `spawn_continue` (resume/interject) / `spawn_steer`
  (live); record `card.step_sessions[step]={agent_id,name,at,kept:true}`.
- **Crews + addenda spawn from WITHIN the step agent** (it holds the tools): the canon
  `step.agent.crew` pass, then each matching `step.addenda[]` pass — uncapped per call,
  artifact-only, owned-repo cwd. NEVER from the script cron (a zero-token script that cannot route
  crews — it only fires the `keep=true` profiled spawn and reads terminal status back).
- **`coordinator` (crew-routing) only for steps that dispatch** (`step.agent.crew`/`addenda[]`
  set); producing steps default `authoring`/`builder`. No silent over-grant. If a step needs a
  wider capability it raises a `capability-gap` decision — it never fakes a crew run.

---

## Phase Triggers

When a card enters an auto-stage, the orchestrator asks the user (via `ask_question`)
how to handle that phase, then records the answer in `trigger_history` so it is never
re-asked for the same card+phase.

| Phase | Prompt options | Trigger action |
|-------|----------------|----------------|
| requirements / design / tasks | Trigger Spec Builder \| Handle inline (spec-agent) \| Skip | **Spec Builder**: create `/tmp/dlc-yolo/specs/<card-id>/` with `requirements.md`, `design.md`, `tasks.md`, `.spec-state.json`; `spawn_run` a subagent seeded with the `spec-workflow` skill, those absolute paths, spec type `feature`, and the card's WORKING_DIR (its owned repo). |
| implement | Trigger Task Runner \| Handle inline (impl-agent) \| Skip | **Task Runner**: `task_run` with the `tasks.md` produced in the tasks phase (or inline task list prefixed `__inline__:`). |
| intake / review / pr | (no trigger prompt) | Handled inline / delegated to the appropriate agent. |

`trigger_history` entries: `{"phase": "<phase>", "trigger": "spec-builder|task-runner|inline|skip", "at": "ISO8601"}`.
The orchestrator MUST check `trigger_history` before asking and skip phases already decided.

---

## Trust Modes & Agent Sandboxing

Like the rest of DLC-YOLO, the app supports **trust modes** (how much autonomy the
pipeline runs with before pausing for a human). Independently of trust mode, every
pipeline agent is **strictly sandboxed to the single repository it owns** — the repo
named in the card's `source.repo` (its WORKING_DIR). This is a hard boundary, not a
trust-mode setting:

- **spec-agent / impl-agent / review-agent** may read and write ONLY within their card's
  owned repo working directory (plus the card's spec dir under `/tmp/dlc-yolo/specs/<card-id>/`
  for artifacts). They must never touch another card's repo or another card's spec dir.
- **Spec Builder** and **Task Runner** subagents are seeded with exactly one WORKING_DIR
  (the owned repo) and one SPEC_DIR. Pass the owned repo as the subagent `cwd`; do not
  grant broader filesystem scope.
- The **orchestrator** is the only actor that reads/writes shared pipeline state
  (`/tmp/dlc-yolo/state.json`); specialist agents receive their inputs and return outputs
  through the orchestrator, not by reaching across repos.
- Enforce the boundary via the agent's `cwd` (owned repo) and the native agent sandbox;
  a card's work never escapes its `source.repo`.

Trust mode governs *when to pause for a human* (e.g. auto-advance auto-stages vs. confirm
each phase trigger). The per-repo sandbox governs *where an agent may act* and always
applies regardless of trust mode.

---

## Operation Modes

Every card runs under three orthogonal mode axes. Each has a pipeline-wide default in
`state.json.config`; a card may override any axis on itself. **Effective mode** =
card value if present, else `config` value.

### 1. Trust — how much autonomy before pausing for a human

| Level | Behavior |
|-------|----------|
| `manual` | Confirm EVERY phase trigger via `ask_question` AND stop at all three human gates. Nothing runs without a click. |
| `assisted` *(default)* | Auto-run auto-stages, but still stop at the three human gates (gate-spec, gate-impl, gate-review). Phase-trigger prompts still fire unless already recorded in `trigger_history`. |
| `autonomous` | Auto-advance through gates too (auto-approve), pick the recommended trigger for each phase without asking, and only pause on a blocker, a failed run, or a Critical/High review finding. |

Trust is independent of the sandbox — a card can be `autonomous` and still never leave its owned repo.

### 2. Depth — how thoroughly each phase runs (maps to the Spec Builder spec type)

| Level | Behavior | Spec type |
|-------|----------|-----------|
| `quick` | Lightweight: requirements + tasks, skip design; minimal review (Critical only). | `quick` |
| `standard` *(default)* | Full requirements → design → tasks; normal severity-ranked review. | `feature` |
| `deep` | Exhaustive design (alternatives, risks), adversarial review, extra test coverage expectations. | `feature` (with deep-review instruction) |

When the orchestrator triggers the Spec Builder, it passes the depth-derived spec type as the seed's spec type. A `bug`-type card overrides depth→spec-type mapping and uses spec type `bug`.

### 3. Backlog / Parked Ideas — see below.

The orchestrator reads a card's effective trust+depth at the start of every phase and adjusts: whether to `ask_question` or auto-pick (trust), and which spec type / review rigor to request (depth).

---

## Backlog / Parked Ideas (requires gh access to the owned repo)

When any agent surfaces a tangent that **cannot be spec'd now** (out of scope for the
current card, needs a separate design, blocked on an external decision), it must NOT
block the current card. Instead it **parks** the idea:

1. The agent reports the tangent to the orchestrator (agents never call `gh` directly —
   only the orchestrator holds repo write authority, preserving the per-repo sandbox).
2. The orchestrator files a GitHub issue on the card's OWNED repo (`source.repo`) via
   the `gh` CLI, labeled `dlc-backlog`:
   ```
   gh issue create --repo <source.repo> --label dlc-backlog \
     --title "<short idea>" --body "<context, why parked, originating card id/phase>"
   ```
   (Create the `dlc-backlog` label first if missing: `gh label create dlc-backlog --color BFD4F2 --description "DLC-YOLO parked idea" 2>/dev/null || true`.)
3. It appends a `parked` entry to the card: `{"id","note","issue_url","at","phase"}`.

**Back-feeding (auto-intake).** A separate cron (`dlc-yolo-backlog-intake`) periodically
lists open `dlc-backlog` issues across the repos DLC-YOLO owns cards for, and for any
issue that has no existing card, creates a fresh `intake`-stage card (inheriting
`config` trust/depth) linked to that issue. This closes the loop: parked ideas re-enter
the pipeline as new work when capacity allows. The intake cron only READS issues and
CREATES cards — it never advances or executes, so it stays within the same safety model.

Never park to a repo the card does not own, and never write issues cross-repo — the
backlog lives in each card's own `source.repo`.

---

## Effort Attribution & Back-Step

The **spec-agent** attributes an **effort estimate** to every spec. This drives two
scope-safety movements: parking an over-scoped *feature* (backlog, above) and stepping a
whole *card* back one pipeline level when a phase outgrows the phase before it.

### Effort points

Each feature/requirement gets a T-shirt size mapped to points:

| Size | Points |
|------|--------|
| `S` | 1 |
| `M` | 3 |
| `L` | 5 |
| `XL` | 8 |

The spec-agent records per-feature effort in `effort.features[]` and the rolled-up
`effort.total`. As each phase runs it records that phase's realized scope in
`effort.scope[phase]` (sum of the effort points the phase actually produced — e.g. the
design's component count × size, the tasks list total).

### Scope-growth back-step (heuristic — no token accounting)

At each auto-phase the orchestrator compares the phase's realized scope to the phase
before it. If a step **outgrows its predecessor's scope** beyond a factor
(default `GROWTH_FACTOR = 2.0`), the step is proposed to **back-step one level**:

| Phase outgrows… | Back-step to | Meaning |
|-----------------|--------------|---------|
| `implement` > `design` scope | **design** | "this became a design ticket, not just coding" |
| `tasks` > `design` scope | **design** | tasks reveal the design was underspecified |
| `design` > `requirements` scope | **requirements** | scope creep — re-spec smaller |

Rule: `scope[current] > GROWTH_FACTOR × scope[predecessor]` ⇒ propose back-step.
A single over-scoped **feature** (rather than the whole card) is instead **parked** to the
backlog; the whole-card back-step fires when the *aggregate* scope has grown.

### Trust-gated proposal

- `manual` / `assisted`: the orchestrator calls `ask_question` — "Card <title>'s <phase>
  scope grew Nx over <predecessor>. Step back to re-scope, or continue?" Options:
  `Step back to <predecessor>` | `Park the largest feature` | `Continue anyway`.
- `autonomous`: auto-back-step (or auto-park the largest feature if that alone brings it
  under the factor), and note it.

Every back-step appends `{from, to, reason, at}` to `backstep_history` and moves the card
to the predecessor stage; the re-run of that stage is expected to produce a smaller scope.
Guard against ping-pong: do not back-step the same card across the same boundary more than
twice — if it still overflows, park features instead and notify the user.

### Budget source

`GROWTH_FACTOR` is the only knob for the heuristic. Depth tunes it: `quick` is stricter
(1.5), `standard` = 2.0, `deep` is lenient (3.0) since deep work is expected to expand.

> **Parked (not built): predictive token budgeting (Option B).** A future `effort-budget`
> side-skill would log real per-phase token spend, build a rolling baseline, and *predict*
> the next phase's spend to trigger back-steps on projected cost rather than scope ratio.
> Deferred until spend history exists; the heuristic above ships first and needs no data.
