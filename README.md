<p align="center">
  <img src="assets/logos.png" alt="DLC-YOLO + KiroCrew" width="440">
</p>

# DLC-YOLO

**Autonomous software development lifecycle, as a KiroCrew app.** Issues flow through a
spec → design → build → review → PR pipeline driven by specialist agents — with human
gates where you want control and full autonomy where you don't, and pipelines you can
shape step by step.

![DLC-YOLO pipeline board](docs/pipeline-board.png)

The pipeline graph across the top shows each stage as a node — circles for agent steps,
diamonds for human gates. Nodes **glow in proportion to how many cards sit in that
stage**, so the board's center of gravity is visible at a glance. A left rail switches
between pipelines/workspaces; the kanban below groups the work.

---

## First-class pipelines

A **pipeline** is the top-level unit of work — one per repo/workspace, created from the
**Pipeline Setup** modal, owning the cards that flow through it. It exists even with zero
cards and holds the defaults its cards inherit.

Pipelines own their **own ordered steps** — there is no fixed stage list. Each step is
either:

- a **gate** — a human approval point, or
- an **agent step** — runs work under an agent config (name, role/prompt, tools, model).

Steps are reorderable, renamable, and add/removable in the setup modal. The built-in
spec → design → tasks → implement → review → PR ladder is just the default the wizard
seeds from.

### Agent setup panel + UI-native crew routes

Configuring an agent step opens an inline **step-execution panel** in the same modal. Its
role/prompt is the pipeline-local objective; requested tools and model remain declarations, while
the capability profile controls the actual session template and an optional crew selects a global
route. Choosing an installed profile loads that profile's distinct declared tools/model without
overwriting the step objective. Agent name, objective, requested tools, model, capability, trust,
depth, crew, and addenda are all edited and saved in this UI—there is no agent-authoring shortcut
into the command session.

The same **Agent config** catalog opens directly from the compact control row or from Pipeline
Setup. It shows installed/referenced Kiro agent templates separately from global KiroCrew crew
records (`name → kiro_agent + workspace + memory store + overrides`). Its authenticated global crew
route form creates or updates the sanctioned routing fields through KiroCrew's public agent CLI;
it does not create a parallel app registry. Profile prompts/tools remain source-managed declarations,
and pipeline-local objectives remain in Pipeline Setup.

---

## Self-enabling pipelines

A pipeline can **enable itself**. Self-enablement is an *autonomous variation of the
orchestrator* — not a separate engine — that turns a fuzzy one-line idea into a configured,
ticketed pipeline. The flow is **setup → intent → per-step → bootstrap**, and each agent
(intent, spec, design, impl, review) runs in a **simplified** or **enhanced** mode.

- **Setup first** *(trust/depth-gated)* — on creation the orchestrator proposes **simplified
  vs enhanced** as a single decision-gate entry. *Simplified* is the lean ladder (minimal
  crews, inline agents, no research gate); *enhanced* adds a research go/no-go gate, addendum
  crews (secure-design / a11y / perf), extra gates, and deeper depth. Under `assisted` it asks
  but defaults **mid** (assisted + standard, simplified) if you don't choose; under
  `autonomous` it picks.
- **Intent next** *(skippable)* — a dedicated **Intent Agent** resolves/sharpens the idea. It
  is the decision gate's *smartest caller*: it classifies (needs-info / needs-research /
  needs-sharpening / sufficient) and **raises into the one decision gate**, never a parallel
  mechanism. Elaborating intent autonomously produces an **intent card** that can carry
  research addenda. You can skip intent and go straight to elaborating any step.
- **Per-step elaboration** — run or expand spec, or any step, on demand (à-la-carte), so the
  pipeline is usable both fully-autonomous and one-step-at-a-time.
- **Bootstrap** — infers the crew lineup, creates crews globally via `kirocrew agent create`
  (namespaced `dlcyolo-<pipeline>-<role>`), wires `step.agent.crew` / `step.addenda[]`, and
  opens the tickets. A `card.bootstrap` idempotency marker makes it safe to re-run; under
  `autonomous` it caps new crews and escalates on low confidence.

Toggle it per pipeline in the setup modal (**Self-enabling pipeline** + a simplified/enhanced
selector) or via `/dlc-yolo`. Every self-designed choice is recorded in `card.decisions[]` as
the audit trail of *why the pipeline built itself this way*.

### Where results live

Phase results (requirements/design/…) are written to the workspace-partitioned app-data area
`~/.dlc-yolo/workspaces/<ws>/data/results/<card-id>/` (durable; `/tmp` only as fallback). The
per-pipeline **`results_in_repo`** knob (setup-modal toggle or `/dlc-yolo`) additionally
mirrors + commits a copy into the owned repo's `.dlc-yolo/` (a repo-root mirror of the
app-data layout — `.dlc-yolo/workspaces/<ws>/data/` with the pipeline conversation log, and
`.dlc-yolo/<card-id>/` results) — so both results **and** pipeline conversations can live in
the workspace repo itself when you want them there. Specialist agents (spec/design/impl) hold
scoped `git add/commit/push` for this, confined to the exact active card lease path and branch.

---

## Operation modes

Three orthogonal axes. Each has a pipeline-wide default; a pipeline, a **step**, or a card
can override it. Resolution cascades **card → step → pipeline → global**.

### Trust — how much autonomy before pausing for a human
| Level | Behavior |
|-------|----------|
| `manual` | Confirm every trigger **and** stop at all gates |
| `assisted` *(default)* | Auto-run agent steps, stop at human gates |
| `autonomous` | Auto-approve gates, auto-pick triggers, pause only on a blocker or Critical/High finding |

### Depth — how thoroughly each step runs
| Level | Behavior | Spec type |
|-------|----------|-----------|
| `quick` | Requirements + tasks, skip design; Critical-only review | `quick` |
| `standard` *(default)* | Full requirements → design → tasks; normal review | `feature` |
| `deep` | Exhaustive design, adversarial review, extra test coverage | `feature` (deep) |

Per-step overrides mean "this step runs autonomous + deep, that gate stays manual."

### Sync mode — webhook fast-path vs polling (per pipeline)

`sync_mode` tunes how eagerly the always-on advance cron does a pipeline's **periodic GitHub
reconciliation**. It never disables the poll — that is the missed-wake safety net — and a verified
webhook receipt always reconciles immediately regardless of mode.

| Level | Behavior |
|-------|----------|
| `poll` *(default)* | Reconcile the pipeline's GitHub stage every 120s cycle. Correct when no webhook is configured. |
| `webhook` | The verified webhook wake is the fast path; the periodic poll for this pipeline is throttled to `webhook_reconcile_interval_secs` (default 900). **Auto-safety:** falls back to `poll` when the app-wide receiver is not actually enabled, so a pipeline with no working webhook is never starved. |

Resolution cascades card → pipeline → global, like the other axes. For a full stop (webhook-only, no
polling at all) pause the crons from the **Webhook · app-wide** tab — the *hard* lever `sync_mode`'s
*soft* throttle complements.

### Adaptive model and pass controls

Before dispatch, the runtime persists an immutable execution envelope. A card/step/role/pipeline/
global model policy may name a concrete model; only then is that exact model supplied to the
step's `cron_add`. `auto` and provider-default modes never become fabricated model IDs. The same
envelope allocates bounded research and crew/addendum passes and target IDs; infeasible required
work blocks before dispatch, and terminal results cannot record more passes than allocated.
Requested and observed model/effort remain separate provenance. KiroCrew's cron API currently has
no per-run reasoning-effort field, so effort is seeded as a request and is never claimed as applied
unless live session metadata reports it. The app-owned bounded DAG scheduler now controls card-step
ready sets, phase-subgraph contracts, layered permits, write-set/worktree mutexes, fan-out/fan-in,
and cooperative cancellation. It never claims host-native in-flight turn cancellation or
unobserved timing. Authenticated, privacy-minimized GitHub webhook facts enter this same bounded
event vocabulary through the app-owned loopback receiver described below. Priority 11 separately
makes only the privacy-minimized operational read projection ledger-replay authoritative after exact
parity; rich/control state remains in `state.json`.

### Local terminal event bridge

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
path. GitHub webhook receipts use the same bounded bus through the separate ingress path below;
neither producer path grants projection authority. The separate replay reconciler activates the
minimized read model only after exact snapshot parity.

### Secure GitHub webhook ingress

Priority 10 adds an app-owned `aiohttp` receiver that is **disabled by default** and binds
unconditionally to `127.0.0.1`. It exposes exactly `POST /github`. Separately, the app's own
backend is a **spawned `entryPoint` subprocess** (`backend/server.py`, declared by
`backend.entryPoint` in `app.json`), which the gateway reverse-proxies: the dashboard calls
`/apps/dlc-yolo/api/webhook/status` and `GET|POST /apps/dlc-yolo/api/webhook/config`, which the
proxy forwards to the backend as `/api/webhook/*`. Every forwarded request is authenticated with the
gateway's per-request `X-KiroCrew-Proxy` HMAC. Those control routes are not GitHub ingress and
do not add a public-auth bypass to KiroCrew or expose the dashboard, gateway, `/api/ws`, terminal,
or general API.

> **The tunnel is UNTRUSTED TRANSPORT, never authority — this is the security model.**
> A public relay (Cloudflare quick tunnel, a named tunnel, ngrok, Tailscale Funnel, or your own
> reverse proxy) only *carries bytes* to the loopback `/github` route; it can never *act*. Every
> delivery must pass **HMAC-SHA256 signature verification** (constant-time, before JSON parse) +
> the **exact repository/event/action allowlist** + an authoritative **`gh` refetch and
> trusted-author ownership check** before any card is touched. So a world-reachable quick-tunnel URL
> leaks nothing and drives nothing on its own. Because the tunnel is provider-agnostic, DLC-YOLO
> defaults to the **zero-account, zero-domain Cloudflare quick tunnel** (anyone can run it, no
> signup/token — its only cost is a URL that rotates on restart, which the opt-in **auto-sync**
> self-heals). **Bring your own stable endpoint** any time via the env-var override
> (`DLC_YOLO_GITHUB_WEBHOOK_*`) or by pointing GitHub at a named CF tunnel / ngrok reserved domain /
> Tailscale Funnel — the app forces no provider and the security guarantees are identical regardless
> of which relay fronts the one guarded route.

Open **Pipeline Setup/Edit → Webhook · app-wide** in the DLC-YOLO UI to configure enablement,
loopback port, repository allowlist, optional absolute inbox path, and the GitHub secret. The tab is
inside pipeline configuration for discoverability, but its receiver settings are shared by every
pipeline. UI-managed settings apply immediately.
The secret is write-only: it is never returned to the browser or placed in `state.json`, `app.json`,
command arguments, logs, status responses, or projections. It lives in an exact-schema, bounded,
no-symlink, atomic/fsynced mode-`0600` app-owned `webhook-config.json` beside the selected state
authority. The UI can retain or rotate it, and can clear it only while the receiver is disabled.

Gateway process environment remains the operator override:

```bash
export DLC_YOLO_GITHUB_WEBHOOK_PORT=8765       # 1024..65535
export DLC_YOLO_GITHUB_WEBHOOK_REPOS=owner/repo[,owner/another-repo]
read -rsp 'GitHub webhook secret: ' DLC_YOLO_GITHUB_WEBHOOK_SECRET; echo
export DLC_YOLO_GITHUB_WEBHOOK_SECRET
# Optional; when set, this must be absolute. Otherwise it lives beside DLC_YOLO_STATE/app data.
export DLC_YOLO_WEBHOOK_INBOX=/absolute/path/to/github-webhook-inbox.json
```

If any of those four variables is present, the complete environment configuration wins atomically;
the UI shows the effective values and status read-only, never mixes file and environment authority,
and requires a gateway restart for environment changes. For either source, port, secret, a
syntactically valid non-empty repository allowlist, app enablement, and an absolute explicit inbox
path (when supplied) must pass before the receiver can operate.

In GitHub, create a repository webhook whose payload URL is the public relay/tunnel URL ending in
`/github`, content type is `application/json`, secret is the same process-injected secret, and events
are limited to **Issues** plus **Labels**. Signed `ping` is accepted. Issue actions are exactly
`opened`, `reopened`, `labeled`, `unlabeled`, and `closed`; repository-label actions are exactly
`created`, `edited`, and `deleted`. Configure the tunnel/relay to forward **only** this one route to
`127.0.0.1:<port>/github`. Never publish the loopback listener directly or tunnel the dashboard or
general KiroCrew API.

Admission streams at most 256 KiB, applies a bounded process-local rate limit, and verifies
`X-Hub-Signature-256` as HMAC-SHA256 over the untouched request body with constant-time comparison
before JSON decoding. It then enforces exact delivery/event/action/repository fields, reduces the
payload to delivery/event/action/repo/issue/label/time/digest metadata, seals that normalized record,
and appends it to a locked `0600`, fsync-and-atomic, bounded durable inbox. Raw payloads, issue prose,
authors, and signatures are never persisted. `X-GitHub-Delivery` deduplication is durable and
bounded; a full or unavailable inbox returns retriable `503` without evicting accepted work.

The advance cron re-verifies each sealed receipt and uses `gh issue view` (or `gh repo view` for
repository-label events) before any card mutation. Only the refetched repository identity, issue
number/state/title/URL/labels/author can influence state. Exactly one pipeline must own that
case-insensitive `owner/repo`, and the refetched author must pass the card → pipeline → global →
authenticated-user trusted-author rule. Unknown, missing, or ambiguous stage labels hold/reject
rather than guessing. External stage/close requests are queued; active producers first receive
`writes_allowed:false` plus cooperative cancellation, and their permits/worktrees remain held until
terminal host observation. Shared `MAX_MOVES=3` and `MAX_ESCALATIONS=2` remain unchanged.

After state is durably saved, the inbox receipt is acknowledged; a crash or acknowledgement failure
therefore replays idempotently. Accepted ingress best-effort triggers the deterministic advance job,
while its 120-second poll remains reconciliation for a missed wake. `state.json` remains authoritative
for rich/control state, and ordinary ledger observations remain payload-free. The projection snapshot
and replay path below is separate from webhook/event authority.

### Cloudflare tunnel + cron control (app-managed, optional)

The receiver binds `127.0.0.1` only, so GitHub needs a public relay. The **Webhook · app-wide** tab
can **start/stop a Cloudflare quick tunnel** for you (`cloudflared tunnel --url
http://127.0.0.1:<port>`) and show the ready-to-paste `…/github` payload URL — or it shows the exact
command so you can run it yourself. `cloudflared` is never auto-installed (the tab shows the install
command when it is absent), the tunnel is a fixed-argv `exec` (no shell), and it **refuses to expose
the port unless the receiver is enabled, secret-configured, and actually listening** on it — so a
public URL can only ever front the guarded `/github` route, whose deliveries are all HMAC-verified.

The same tab exposes **Automation crons** — pause/resume DLC-YOLO's three background jobs
(advance · spawns · backlog-intake) from the UI, matched by name and acted on by their real ids via
the sanctioned `kirocrew cron` CLI. Pausing is the *hard* lever for a webhook-only or maintenance
setup (the receiver keeps accepting deliveries while paused; a verified delivery wakes advance again
on resume). It complements the per-pipeline `sync_mode` *soft* throttle described under Operation
modes. Both the tunnel and cron routes are served by the spawned `entryPoint` backend and gated by
the gateway's per-request `X-KiroCrew-Proxy` HMAC.

### Replay-parity-gated operational projection

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

### Bounded topology/DAG scheduler

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

### Backlog — parked ideas that can't be spec'd now

When an agent hits a tangent it can't spec right now, it **parks** the idea instead of
blocking: the orchestrator files a GitHub issue labeled `dlc-backlog` on the card's owned
repo and records it on the card. A back-feed cron pulls open `dlc-backlog` issues back in
as fresh intake cards.

![Backlog view](docs/backlog-view.png)

---

## Effort & scope-aware back-stepping

The spec agent attributes **effort** (T-shirt points) to each spec. When a step outgrows
the scope of the step before it (beyond a depth-tuned factor), the pipeline proposes a
**back-step** a level down — implement → design ("this became a design ticket"), design →
requirements ("re-spec smaller") — or parks the single over-scoped feature to the backlog.
Cards surface an ⚡ effort badge and a ↩ back-step badge.

*(Predictive token-budgeting is designed but parked; the scope-growth heuristic ships and
needs no history.)*

---

## GitHub as the source of truth

A card's stage is a `dlc:<step>` **label** on its GitHub issue. Advancing/rejecting moves
the label; external tools (or a human relabeling on GitHub) can move a card. The secure receiver
wakes reconciliation immediately for verified deliveries, then the runtime authoritatively refetches
with `gh` before changing a card. The regular poll remains the repair path for missed or failed wakes.
If `gh`/the repo is unavailable, a pipeline runs **local-only**. On later reconciliation, an
explicitly `sot: local` card that is already linked to an exact issue is re-synced deterministically:
the advance runtime authoritatively refetches the owning repository and issue, requires the refetched
author to pass the normal trusted-author rule, converges exactly one `dlc:<current-step>` label, then
post-refetches before persisting `sot: github`. Unavailable, ambiguous, unauthorized, closed/nonterminal-conflicting, or
post-verification-failed paths remain local for a later poll. An unlinked local card is never guessed
or auto-filed by the zero-token runtime; issue creation stays with the coordinator-capability
orchestrator. `state.json` holds the rich data; GitHub holds the stage.

---

## The `/dlc-yolo` command

`/dlc-yolo` turns a chat session into a pipeline driver:

1. **Start a new pipeline conversation** — spec anything, file it to GitHub as an issue,
   label it, and record a card the local pipeline triggers off.
2. **Maintain an existing pipeline** — read a card's stage from its label and drive the
   next step (answer a gate, re-trigger a phase, park, back-step).
3. **Author an agent for a custom step** — still available when explicitly requested in the
   command session; ordinary step-agent configuration stays in Pipeline Setup.

---

## Phase triggers

When a card enters an agent step, the orchestrator asks how to run it, then records the
choice so it never re-asks:

- **requirements / design / tasks** → *Trigger Spec Builder* (native `spec-workflow`
  skill) · *Handle inline* · *Skip*
- **implement** → *Trigger Task Runner* (native `task_run`) · *Handle inline* · *Skip*

Under `autonomous` trust the orchestrator auto-picks the recommended trigger.

---

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

---

## Architecture

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
loopback-only `/github` listener. Three crons drive/observe agents
(advance · spawns · backlog-intake); specialist work goes through `spawn_run` / `task_run`.

Native KiroCrew APIs used: `ask_question`, `spawn_run`, `task_run`, `send_message`, scheduled crons
plus `cron_trigger` for the exact reconciled advance job and `cron_pause`/`cron_remove` for
cooperative cancellation and cleanup, `/api/file-read` + `/api/file-write`, the SDK chat launcher
(`useChatLauncher`), and `gh` for authoritative issues/labels/repositories/backlog refetches. The
receiver uses app-hosted `aiohttp`; it does not alter KiroCrew authentication. The Pipeline Setup
modal reads **Issue Radar**'s connected repos (read-only) as pipeline candidates.

### State shape

```jsonc
{
  "config": { "trust": "assisted", "depth": "standard" },   // global defaults
  "pipelines": [
    {
      "id": "pl-…", "repo": "owner/name",
      "repo_path": "/absolute/path/to/primary-checkout", "workspace": "default",
      "source": "issue-radar", "sot": "github",
      "trust": "assisted", "depth": "standard", "backlog_intake": true,
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
      "effort": { "total": 8, "scope": { "requirements": 8, "design": 9 } },
      "backstep_history": [ … ], "parked": [ … ],
      "artifacts": { … }, "gate_history": [ … ], "trigger_history": [ … ], "history": [ … ]
    }
  ]
}
```

### Crons

| Cron | Interval | Role |
|------|----------|------|
| `dlc-yolo-advance` | 120s + terminal wake | Recover/canonicalize `card.event_outbox`, dispatch terminal/stage facts through the bounded local bus, compute topology-derived ready sets, enforce layered scheduler permits/mutexes/fan-in/cancellation, retain polling reconciliation, walk each pipeline's own steps, honor per-step trust/depth/**capability**, provision/reconcile/release exclusive card worktree leases, escalate agent steps as persistent capability-profiled cron-backed sessions, move `dlc:<step>` labels, deterministically consume/retire child cards, and notify (deduped) on new waiting gates |
| `dlc-yolo-spawns` | 30s | Zero-token observability: poll `spawn_list`, write `live_spawns.json` so the UI subagents pane shows dead-vs-in-flight (read-only, never drives) |
| `dlc-yolo-backlog-intake` | 200s | Back-feed open `dlc-backlog` issues as new intake cards (read + create only) |

---

## UI

- **Pipeline graph** — glowing, count-correlated nodes (circles = agent steps, diamonds = gates); click a node to scroll to its column
- **Workspace rail** — multi-select repos to view several pipelines combined, plus **+ New Pipeline**
- **Pipeline Setup modal** — the same config-first surface as `/dlc-yolo`: keep repository identity, workspace partition, and verified checkout distinct; configure trust/depth/budget/capability, ownership allowlist, result/log/backlog/self-enablement extras, custom steps with the inline agent setup panel, and the clearly app-wide webhook receiver from its own tab
- **Command entry controls** — one compact AI-marked button opens the bare `/dlc-yolo` command session without preselecting an action; pipeline setup/edit and agent configuration remain compact UI-native controls directly below the card stats, while webhook configuration lives inside Pipeline Setup/Edit rather than as a separate launcher
- **Agent config catalog** — switch among distinct installed/referenced agent-template declarations and global crew routes; inspect each crew's `kiro_agent`, workspace, memory store, model/source metadata, and linked authority profile; create/update the sanctioned global routing fields through the authenticated UI form
- **Truthful card/status projection** — blocked/error/gate/observed-running/unconfirmed-pending/queued/ready/terminal are distinct; cancellation remains in progress until terminal observation, and cards expose recorded SoT/lifecycle/capability without inventing missing facts
- **Webhook settings** — the Pipeline Setup/Edit **Webhook · app-wide** tab provides authenticated enable/disable, port, repository allowlist, inbox override, write-only secret rotation, effective-source/status, and durable queue counters
- **Views** — Pipeline (by step) · Workspace (by repo) · Crew (by agent) · Status (blocked/in-flight/done) · Backlog (parked ideas)
- **Mode pills** — click a card's trust/depth to override; ⚡ effort and ↩ back-step badges; theme-aware (adapts to the active dashboard theme)

---

## Installation

```bash
# 1. Install the app (the built UI bundle ui/dist/index.mjs ships in the repo, so no
#    build is required for a plain install; rebuild only if you change the UI — see below).
kirocrew app install /path/to/kiro-crew-yolo-dlc
kirocrew app enable dlc-yolo

# 2. Deploy both zero-token cron scripts plus their webhook and projection helpers, reconcile DLC-YOLO's
#    three cron jobs (including the deterministic advance-job ID used by terminal producers),
#    and publish /dlc-yolo into Kiro's documented global slash-skill directory.
#    The script is idempotent, never overwrites a user-owned skill path or foreign
#    symlink, and never touches another app's jobs. Use --check to preview drift.
python3 scripts/setup-crons.py

# 3. Open a FRESH Kiro session (skill resources are loaded when the session is
#    created). Native Kiro surfaces can then discover /dlc-yolo from the global path.
```

> **Dashboard host limitation (KiroCrew 0.5.0).** The dashboard `/` picker is currently
> populated by KiroCrew's static `/api/slash-commands` catalogue, not the Kiro skill catalogue.
> Publishing the skill is necessary for native execution but cannot add an app command to that
> host-owned list. Fixing the dashboard picker requires a KiroCrew core change; this app does not
> patch live `site-packages` or overwrite the host command registry.

> **Upgrading an existing install.** Two things do not refresh automatically and need a
> nudge after you pull new code and sync the app files:
>
> 1. **Runtime + slash discovery.** KiroCrew reads manifest crons on first install; on
>    an existing install, `app enable` does **not** reliably re-scan them. KiroCrew also
>    registers app skills below `~/.kiro/crew/skills`, while Kiro's fresh-session slash
>    picker scans `~/.kiro/skills`. After syncing, re-run the idempotent reconciler: it
>    deploys both cron scripts plus the webhook and projection helpers, upserts DLC-YOLO's three jobs, and
>    publishes only the `/dlc-yolo` command link, leaving other apps' jobs and user-owned
>    skills untouched:
>
>    ```bash
>    python3 scripts/setup-crons.py            # deploy + reconcile + publish
>    python3 scripts/setup-crons.py --check     # preview drift only, change nothing
>    ```
>
>    Verify with `kirocrew cron list`: advance/spawns are `script` jobs and backlog-intake
>    uses `agent: pipeline-orchestrator`. Open a fresh native Kiro session for skill discovery.
>    KiroCrew 0.5.0's dashboard `/` picker remains host-static as noted above; changing that list
>    requires a core host fix rather than an app reinstall.
>
>    > **Note:** `kirocrew app uninstall dlc-yolo` removes the app's registered crons
>    > (app *data* remains by default). After reinstalling, run
>    > `python3 scripts/setup-crons.py` to restore all three jobs and slash publication.
>
> 2. **New agents.** A new agent added to the manifest (e.g. `intent-agent` for
>    self-enabling pipelines) is registered by re-enabling the app:
>    `kirocrew app enable dlc-yolo`. Confirm with `kirocrew app info dlc-yolo` (agent count).

## Development

```bash
kirocrew app dev dlc-yolo                                    # hot-reload the app
cd ui && npm install --legacy-peer-deps && npx vite build    # rebuild ui/dist/index.mjs after UI edits
```

### Testing

DLC-YOLO is exercised end-to-end against a dedicated sandbox repository —
[**hai-dvash/kiro-crew-yolo-dlc-test-repo**](https://github.com/hai-dvash/kiro-crew-yolo-dlc-test-repo) —
so live `gh` issue/label/PR flows run against a throwaway project instead of this one. Pipelines
created there drive real cards through the full spec → design → tasks → implement → review → PR
ladder (the RPS-game fixtures live there), keeping this repo's own history clean.

## Structure

```
kiro-crew-yolo-dlc/
├── app.json                          ← manifest (agents, skills, crons, permissions)
├── backend/                          ← spawned entryPoint backend (gateway proxies /apps/dlc-yolo/api/*)
│   ├── server.py                     ← aiohttp entryPoint: proxy-HMAC auth, mounts /api/* routes
│   ├── routes.py                     ← webhook control handlers + loopback receiver lifecycle
│   ├── tunnel.py                     ← cloudflared quick-tunnel supervisor (start/stop/status)
│   ├── crons.py                      ← pause/resume the app's own automation crons
│   └── orchestrator.py               ← orchestrator-session trigger writer (first-class-sessions §4)
├── agents/
│   ├── pipeline-orchestrator.json    ← steps, triggers, gates, back-step, GH labels, backlog, self-enablement
│   ├── intent-agent.json             ← front-door intent resolver (self-enabling pipelines)
│   ├── spec-agent.json               ← requirements + effort attribution
│   ├── design-agent.json             ← design
│   ├── impl-agent.json               ← task breakdown + implementation
│   ├── review-agent.json             ← code review
│   └── dlcyolo-{readonly,authoring,builder,coordinator}.json  ← the 4 capability-profile templates
├── skills/
│   ├── pipeline-workflow/SKILL.md    ← pipelines, steps, modes, sandbox, backlog, SoT, effort, roles-&-lanes, step-sessions
│   ├── dlc-yolo/SKILL.md             ← the /dlc-yolo command (thin console → hands off)
│   └── conversation-digest/SKILL.md  ← distill a pipeline log into a review-sized digest
├── crons/
│   ├── dlc_yolo_advance.py           ← zero-token deterministic advance loop (deployed to ~/.kiro/crew/crons/)
│   ├── dlc_yolo_webhook.py           ← HMAC admission + sealed bounded durable inbox shared by backend/cron
│   ├── dlc_yolo_projection.py        ← strict snapshot replay, parity verification, and read-model authority
│   └── dlc_yolo_spawns.py            ← zero-token live-spawn snapshot for the UI subagents pane
├── scripts/
│   └── setup-crons.py                ← idempotent post-sync: deploy crons, reconcile jobs, publish /dlc-yolo globally
├── ui/
│   ├── src/App.tsx                   ← kanban, graph, setup modal, agent panel (@kirocrew/app-sdk)
│   └── vite.config.ts
├── docs/                             ← screenshots
└── README.md
```

---

## License

Apache License 2.0 © 2026 hai-dvash

*DLC-YOLO is an independent, community-built extension for the KiroCrew agent platform.
It is not affiliated with, endorsed by, or an official product of KiroCrew. "KiroCrew"
and related names are the property of their respective owners; they are referenced here
only to describe the platform this app runs on. DLC-YOLO bundles no KiroCrew source — it
links against the public `@kirocrew/app-sdk` at runtime.*
