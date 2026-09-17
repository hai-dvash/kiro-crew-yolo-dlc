# Architecture

> Purpose: the deep internals — state authority, crons, the event bridge, the DAG scheduler, the
> replay-parity projection, the worktree sandbox, and GitHub as source of truth.
> **← [back to README](../README.md)**

## Overview

The UI still reads/writes pipeline state through the gateway's file API —
`GET /api/file-read?path=…` and `POST /api/file-write` — against the durable-first state file
(`$DLC_YOLO_STATE` → `~/.dlc-yolo/state.json` → `/tmp/dlc-yolo/state.json` fallback), using the
SDK's `api.get()` / `api.post()`. An explicit `DLC_YOLO_STATE` must be absolute and must not traverse
a symlink. After bootstrap, the runtime publishes its resolved absolute authority as bounded JSON in
an atomic, durable `0600` `~/.dlc-yolo/.statepath`; the UI validates and probes that target first.
A missing, malformed, relative, or stale pointer leaves the established durable→scratch fallback
unchanged, preventing UI/cron split-brain without granting the file API new state authority. The app
backend owns receiver lifecycle plus authenticated status/config control routes; its write-only
secret storage is separate from `state.json`. Direct GitHub traffic terminates on the separate
loopback-only `/github` listener. Two zero-token script crons drive/observe agents
(advance · spawns); specialist work goes through `spawn_run` / `task_run`. The single orchestrator
is minted on demand (one accumulating session per pipeline), never a standing daemon.

Native KiroCrew APIs used: `ask_question`, `spawn_run`, `task_run`, `spawn_continue`, `send_message`,
scheduled crons plus `cron_trigger` for the exact reconciled advance job and
`cron_pause`/`cron_remove` for cooperative cancellation and cleanup, `/api/file-read` +
`/api/file-write`, the SDK chat launcher (`useChatLauncher`), and `gh` for authoritative
issues/labels/repositories/backlog refetches. The receiver uses app-hosted `aiohttp`; it does not
alter KiroCrew authentication. The Pipeline Setup modal reads **Issue Radar**'s connected repos
(read-only) as pipeline candidates.

## Local terminal event bridge

A terminal step writes `done|blocked|error` and a compact schema-v1 `card.event_outbox` marker in
the same `state.json` update. The marker contains identifiers/status only—never prompt, result, or
artifact prose. After persistence, normal and replacement step sessions best-effort trigger the
exact app-owned `dlc-yolo-advance` job ID reconciled by `scripts/setup-crons.py`; a failed or missing
trigger leaves the marker intact for the regular 120-second poll.

The zero-token advance script canonicalizes each marker to the same deterministic CloudEvent ID used
by the append-only audit ledger, rejects malformed markers, and dispatches completed/blocked/errored
facts through a priority-ordered in-process bus with event-ID deduplication and hard cascade/dispatch
bounds. Stage-change follow-ons can activate a gate or successor agent in the same dispatch cycle;
`MAX_MOVES` and `MAX_ESCALATIONS` still bound work. Consumed receipts retain bounded history, while
pending records are never pruned. `state.json` remains authoritative and polling remains the repair
path. GitHub webhook receipts use the same bounded bus through the separate ingress path (see
[security & webhooks](security-and-webhooks.md)); neither producer path grants projection authority.
The separate replay reconciler activates the minimized read model only after exact snapshot parity.

## Replay-parity-gated operational projection

Priority 11 makes the append-only ledger authoritative for **one bounded read model only**. After each
successful control-state save, the advance runtime independently derives a deterministic,
privacy-minimized workspace projection from `state.json`, appends a complete
`io.dlcyolo.projection.snapshot` event after the ordinary observations, durably fsyncs the ledger,
then re-reads and strictly replays it. Authority is activated or refreshed only when the replayed
object and SHA-256 digest exactly match the independently derived projection.

For each workspace, the ledger directory contains:

- `projections/runs.json` — the last verified ledger-replay authority for minimized pipeline, card,
  session, gate, scheduler, worktree-lease, transition, outbox, and run status identifiers/facts;
- `projections/status.json` — the current parity check, including whether authority is active,
  verified, or blocked.

These files live below
`<state-base>/workspaces/<workspace>/data/ledger/`; both are atomic `0600` writes. A malformed,
oversized, symlinked, conflicting, digest-mismatched, privacy-invalid, or parity-mismatched ledger
fails closed: `status.json` reports blocked authority while an existing `runs.json` remains untouched
as the last known-good projection. Projection append/replay failure is observational only and cannot
move cards, answer gates, release permits/worktrees, cancel sessions, acknowledge commands, or alter
pipeline control.

`state.json` therefore remains authoritative for full pipelines/cards, prose, prompts, artifacts,
decisions/interjections, gates and commands, active-session mutation, scheduling, webhook transport,
and filesystem paths. The replay-owned model contains no secrets, raw webhook payloads/signatures,
free-form prose, absolute paths, working directories, or artifact contents; artifact references are
hashed. GitHub remains the source of truth for issue stage labels. This is a read-model migration,
not reconstruction of all application state.

## Bounded topology/DAG scheduler

The orchestrator is the sole topology selector. Step agents may persist a proposal, but only a
resolved orchestrator decision writes schema-v1 `card.topology` with one of `keep-unified`,
`fan-out`, `fan-in`, `unify`, `back-step`, or `park`. Authorized fan-out declares required versus
optional children, one integration owner, and a real integration step. Child cards retain distinct
branches, worktrees, histories, artifacts, commits, decisions, and validation; unification links
that provenance instead of flattening or deleting it.

On each terminal event or reconciliation poll, the zero-token runtime builds the card-step ready set
from stable dependencies and validates each seeded phase subgraph. Queue order is explicit priority,
then oldest-ready, then remaining critical-path length. Dispatch is bounded by the existing per-cycle
caps plus layered global, pipeline, class, model/provider, and network/research semaphores. Exclusive,
same-branch, worktree, and overlapping write-set locks prevent unsafe concurrency; distinct card
worktrees may run together. Cycles, missing required dependencies, infeasible envelopes, and fan-out
budget breaches fail closed before dispatch. Fan-in starts only when every required child/pass is
terminal; failed optional work needs an omission rationale.

A step that dispatches **exactly one crew** (no addenda, no fan-out topology, not force-delegated) is
**collapsed inline**: it runs in ONE session on the crew's own capability profile
(readonly/authoring/builder) rather than a coordinator wrapper spawning a separate crew session and
synthesizing. Fan-out steps keep the two-layer coordinator→crews model where the extra session earns
parallelism.

Cancellation is cooperative and truthful: park/back-step/cancel sets `writes_allowed:false` and
`cancel_requested_at`, then best-effort pauses the cron-backed session. Producers re-read that marker
before each tool call or mutable write. Because the host exposes no confirmed in-flight model-turn
kill, the runtime retains the permit/worktree until terminal observation rather than claiming an
instant stop. `card.execution_schedule` records only observed ready/queue/permit/session/terminal/
event timestamps and derives only durations supported by those timestamps; missing first-output,
model, tool, or research spans remain absent. `state.json` remains authoritative for control, while
only the separately verified minimized operational projection is replay-owned. Verified GitHub events
enter through the separate loopback receiver and the same bounded event vocabulary; they do not
bypass projection parity or control-state authority.

## Per-card worktree sandbox

Independently of trust mode, mutable repository work runs on one deterministic linked
worktree and branch per card. Pipeline Setup stores the absolute primary checkout as
`repo_path`; for owner/name repositories the advance runtime verifies its Git `origin`,
then creates and locks
`<state-base>/workspaces/<workspace>/worktrees/<card-id>` without `--force` or `-B`.
A path or branch already owned elsewhere blocks.

The cron API does not expose an atomic per-run cwd option, so requested and applied cwd
are kept separate: each mutable step receives the exact lease path/branch/id, verifies
it before writing, and records `step_sessions[step].working_dir`. Terminal completion
blocks if that live observation is absent or mismatched. Leases survive blocked/retriable/
gate-held work. Clean terminal trees release without deleting their branch; dirty or
unverifiable trees are quarantined and never force-removed. Trust governs *when to
pause*; the lease governs *where mutable work may occur*.

## GitHub as the source of truth

A card's stage is a `dlc:<step>` **label** on its GitHub issue. Advancing/rejecting moves
the label; external tools (or a human relabeling on GitHub) can move a card. The secure receiver
wakes reconciliation immediately for verified deliveries, then the runtime authoritatively refetches
with `gh` before changing a card. The regular poll remains the repair path for missed or failed wakes.
If `gh`/the repo is unavailable, a pipeline runs **local-only**. On later reconciliation, an
explicitly `sot: local` card that is already linked to an exact issue is re-synced deterministically:
the advance runtime authoritatively refetches the owning repository and issue, requires the refetched
author to pass the normal trusted-author rule, converges exactly one `dlc:<current-step>` label, then
post-refetches before persisting `sot: github`. Unavailable, ambiguous, unauthorized,
closed/nonterminal-conflicting, or post-verification-failed paths remain local for a later poll. An
unlinked local card is never guessed or auto-filed by the zero-token runtime; issue creation stays
with the coordinator-capability orchestrator. `state.json` holds the rich data; GitHub holds the stage.

## State shape

```jsonc
{
  "config": { "trust": "assisted", "depth": "standard" },   // global defaults
  "pipelines": [
    {
      "id": "pl-…", "repo": "owner/name",
      "repo_path": "/absolute/path/to/primary-checkout", "workspace": "default",
      "source": "issue-radar", "sot": "github",
      "trust": "assisted", "depth": "standard", "backlog_intake": true,
      "orchestrator_session": { "session_key": "cron:…", "slot_key": "cron-…" },  // one per pipeline
      "steps": [
        { "id": "requirements", "name": "Requirements", "type": "agent",
          "agent": { "name": "spec-agent", "role": "…", "tools": ["ask_question"] },
          "trust": "assisted", "depth": "standard", "capability": "authoring", "label": "dlc:requirements" },
        { "id": "gate-spec", "name": "Gate: Spec", "type": "gate", "label": "dlc:gate-spec" }
      ]
    }
  ],
  "cards": [
    {
      "id": "…", "title": "…", "stage": "design", "pipeline_id": "pl-…", "sot": "github",
      "trust": "deep", "depth": "deep",
      "source": { "type": "github", "repo": "owner/name", "issue": 42, "url": "…" },
      "worktree_lease": {
        "lease_id": "lease-…", "path": "…/worktrees/<card-id>",
        "branch": "dlc/<pipeline>/<card>/<slug>", "base_commit": "<sha>",
        "owner_card": "<card-id>", "locked": true, "status": "active"
      },
      "topology": {
        "schema_version": 1, "action": "fan-in", "authority": "orchestrator",
        "status": "integration-ready", "integration_owner": "<card-id>",
        "integration_step": "review", "children": [{"card_id": "…", "required": true}]
      },
      "execution_dag": {
        "schema_version": 1,
        "nodes": [{"id": "sched:…", "kind": "card-step", "depends_on": ["sched:…"]}]
      },
      "execution_schedule": {
        "schema_version": 1, "current_node_id": "sched:…",
        "nodes": {"sched:…": {"status": "running", "permit_id": "permit-…"}}
      },
      "event_outbox": [
        { "schema_version": 1, "id": "evt-…", "type": "io.dlcyolo.step.completed",
          "subject": "design", "run_id": "run-…", "terminal_status": "completed",
          "delivery_status": "pending|consumed", "created_at": "<RFC3339>" }
      ],
      "effort": { "total": 8, "spent": 17, "scope": { "requirements": 8, "design": 9 } },
      "backstep_history": [ … ], "parked": [ … ],
      "artifacts": { … }, "gate_history": [ … ], "trigger_history": [ … ],
      "interjection": [ … ], "decisions": [ … ], "history": [ … ]
    }
  ]
}
```

## Crons

| Cron | Interval | Role |
|------|----------|------|
| `dlc-yolo-advance` | 120s + terminal wake | Recover/canonicalize `card.event_outbox`, dispatch terminal/stage facts through the bounded local bus, compute topology-derived ready sets, enforce layered scheduler permits/mutexes/fan-in/cancellation, run the `dlc-backlog` discovery scan + `request:*` maintenance handler + heuristic backstops, retain polling reconciliation, walk each pipeline's own steps, honor per-step trust/depth/**capability**, provision/reconcile/release exclusive card worktree leases, escalate agent steps as capability-profiled cron-backed sessions (single-crew steps collapse inline), mint/continue the one-per-pipeline orchestrator session, move `dlc:<step>` labels, deterministically consume/retire child cards, and notify (deduped) on new waiting gates. **Zero-token script.** |
| `dlc-yolo-spawns` | 30s | Zero-token observability: poll `spawn_list`, write `live_spawns.json` so the UI subagents pane shows dead-vs-in-flight (read-only, never drives). **Zero-token script.** |

Both crons are **zero-token scripts** — no DLC-YOLO cron runs an LLM on a timer. The orchestrator
LLM is spawned only on real lifting, by event. (Backlog intake was formerly a separate agent cron;
it is retired — its deterministic discovery scan now runs inside the zero-token advance loop.)
