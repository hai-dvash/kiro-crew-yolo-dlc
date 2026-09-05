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

### Agent setup panel + `✨ Draft with /dlc-yolo`

Configuring an agent step opens an inline **agent setup panel** in the same modal: reuse
an existing agent, or set name / role / tools / model. For a genuinely new agent, the
panel's **✨ Draft with /dlc-yolo** button launches a real chat session (via the SDK chat
launcher) that designs the agent with you conversationally and writes it back into the
step.

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

### Adaptive model and pass controls

Before dispatch, the runtime persists an immutable execution envelope. A card/step/role/pipeline/
global model policy may name a concrete model; only then is that exact model supplied to the
step's `cron_add`. `auto` and provider-default modes never become fabricated model IDs. The same
envelope allocates bounded research and crew/addendum passes and target IDs; infeasible required
work blocks before dispatch, and terminal results cannot record more passes than allocated.
Requested and observed model/effort remain separate provenance. KiroCrew's cron API currently has
no per-run reasoning-effort field, so effort is seeded as a request and is never claimed as applied
unless live session metadata reports it. Topology, live parallel scheduling, and event authority are
not part of this control slice.

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
the label; external tools (or a human relabeling on GitHub) can move a card. If `gh`/the
repo is unavailable, a pipeline runs **local-only** and **re-syncs to GitHub** when access
returns. `state.json` holds the rich data; GitHub holds the stage.

---

## The `/dlc-yolo` command

`/dlc-yolo` turns a chat session into a pipeline driver:

1. **Start a new pipeline conversation** — spec anything, file it to GitHub as an issue,
   label it, and record a card the local pipeline triggers off.
2. **Maintain an existing pipeline** — read a card's stage from its label and drive the
   next step (answer a gate, re-trigger a phase, park, back-step).
3. **Author an agent for a custom step** — design a new step agent conversationally and
   write it into the pipeline (this is where the panel's Draft button hands off).

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

No backend process. The UI reads/writes pipeline state through the gateway's file API —
`GET /api/file-read?path=…` and `POST /api/file-write` — against the durable-first state file
(`$DLC_YOLO_STATE` → `~/.dlc-yolo/state.json` → `/tmp/dlc-yolo/state.json` fallback), using the
SDK's `api.get()` / `api.post()`. Three crons drive/observe agents (advance · spawns ·
backlog-intake); specialist work goes through `spawn_run` / `task_run`.

Native KiroCrew APIs used: `ask_question`, `spawn_run`, `task_run`, `send_message`,
scheduled crons, `/api/file-read` + `/api/file-write`, the SDK chat launcher
(`useChatLauncher`), and `gh` for issues/labels/backlog. The Pipeline Setup modal reads
**Issue Radar**'s connected repos (read-only) as pipeline candidates.

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
| `dlc-yolo-advance` | 120s | Walk each pipeline's own steps, honor per-step trust/depth/**capability**, provision/reconcile/release exclusive card worktree leases before mutable dispatch, escalate each agent step as a **persistent capability-profiled step-agent** (`keep=true`, records `step_sessions`), move `dlc:<step>` labels, deterministically flip a parent's `child_tickets` to `consumed` + retire, notify (deduped) on new waiting gates |
| `dlc-yolo-spawns` | 30s | Zero-token observability: poll `spawn_list`, write `live_spawns.json` so the UI subagents pane shows dead-vs-in-flight (read-only, never drives) |
| `dlc-yolo-backlog-intake` | 200s | Back-feed open `dlc-backlog` issues as new intake cards (read + create only) |

---

## UI

- **Pipeline graph** — glowing, count-correlated nodes (circles = agent steps, diamonds = gates); click a node to scroll to its column
- **Workspace rail** — multi-select repos to view several pipelines combined, plus **+ New Pipeline**
- **Pipeline Setup modal** — pick a repo (Issue Radar / KiroCrew workspace / manual), set its local checkout path for deterministic card worktrees, configure trust/depth/backlog-intake, and edit custom steps with an inline agent setup panel
- **Views** — Pipeline (by step) · Workspace (by repo) · Crew (by agent) · Status (blocked/in-flight/done) · Backlog (parked ideas)
- **Mode pills** — click a card's trust/depth to override; ⚡ effort and ↩ back-step badges; theme-aware (adapts to the active dashboard theme)

---

## Installation

```bash
# 1. Install the app (the built UI bundle ui/dist/index.mjs ships in the repo, so no
#    build is required for a plain install; rebuild only if you change the UI — see below).
kirocrew app install /path/to/kiro-crew-yolo-dlc
kirocrew app enable dlc-yolo

# 2. Deploy both zero-token cron scripts, reconcile DLC-YOLO's three cron jobs, and
#    publish /dlc-yolo into Kiro's documented global slash-skill directory.
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
>    deploys both scripts, upserts DLC-YOLO's three jobs, and publishes only the
>    `/dlc-yolo` command link, leaving other apps' jobs and user-owned skills untouched:
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
