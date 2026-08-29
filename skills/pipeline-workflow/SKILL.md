---
description: SDLC Pipeline workflow orchestration — stage definitions, gate logic, and state transitions.
always: true
---

# SDLC Pipeline Workflow

## Pipeline Stages

```
Intake → Requirements → [GATE: spec questions] → Design → Tasks → [GATE: approve impl] → Implement → Review → [GATE: post-review] → PR → Done
```

## Stage Definitions

| Stage | Type | Agent | Description |
|-------|------|-------|-------------|
| intake | auto | orchestrator | Issue arrives from Issue Radar or manual creation |
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
  "parked": [
    {"id": "park-uuid", "note": "Needs auth redesign — can't spec now", "issue_url": "https://github.com/owner/repo/issues/57", "at": "ISO8601", "phase": "design"}
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
  "cards": [ ... ]
}
```

A card's effective mode = its own `trust`/`depth` if set, else `config.trust`/`config.depth`.

## Cron Behavior

The `sdlc-pipeline-advance` cron (every 120s):
1. Load pipeline state
2. For each card in an auto-stage that has no active agent working on it:
   - Spawn the appropriate agent
   - Mark card as "in-progress"
3. For each card at a human gate:
   - Check if approval was given (via storage)
   - If approved, advance to next stage
4. Report errors but do NOT retry failed stages without user input

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
