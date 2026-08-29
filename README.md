# DLC-YOLO

**Autonomous software development lifecycle, as a KiroCrew app.** Issues flow through a
spec → design → build → review → PR pipeline driven by specialist agents, with human
gates where you want control and full autonomy where you don't.

![DLC-YOLO pipeline board](docs/pipeline-board.png)

Each phase is a node in the pipeline graph at the top — circles for automated stages,
diamonds for human gates. Nodes **glow in proportion to how many cards sit in that
phase**, so the board's center of gravity is visible at a glance. Below, a kanban
groups the work; a left rail switches between workspaces.

---

## Pipeline

```
Intake → Requirements → [GATE: spec Q's] → Design → Tasks → [GATE: approve impl] → Implement → Review → [GATE: post-review] → PR → Done
```

| Stage | Type | Agent | Produces |
|-------|------|-------|----------|
| intake | auto | orchestrator | A card from an issue (manual or Issue Radar) |
| requirements | auto | spec-agent | `requirements.md` |
| **gate-spec** | human | — | Clarifying questions answered before design |
| design | auto | design-agent | `design.md` (architecture, data model, contracts) |
| tasks | auto | impl-agent | Ordered, atomic task breakdown |
| **gate-impl** | human | — | Approve the task list before code is written |
| implement | auto | impl-agent | Code + tests, per task |
| review | auto | review-agent | Severity-ranked findings |
| **gate-review** | human | — | Verdict — proceed to PR, or send back to fix |
| pr | auto | orchestrator | Opens / updates the pull request |
| done | terminal | — | Card complete |

### Human gates

- **gate-spec** — clarifying questions before design proceeds
- **gate-impl** — approve the task list before implementation starts
- **gate-review** — review findings verdict before the PR opens

Reject at any gate and the card regresses to the previous automated stage.

---

## Operation modes

Every card runs under three orthogonal axes. Each has a pipeline-wide default
(`state.json.config`) that a card can override on itself — click a card's mode pill to
cycle a per-card override.

### Trust — how much autonomy before pausing for a human
| Level | Behavior |
|-------|----------|
| `manual` | Confirm every phase trigger **and** stop at all human gates |
| `assisted` *(default)* | Auto-run automated stages, stop at the three human gates |
| `autonomous` | Auto-approve gates, auto-pick triggers, pause only on a blocker or Critical/High finding |

### Depth — how thoroughly each phase runs
| Level | Behavior | Spec type |
|-------|----------|-----------|
| `quick` | Requirements + tasks, skip design; Critical-only review | `quick` |
| `standard` *(default)* | Full requirements → design → tasks; normal review | `feature` |
| `deep` | Exhaustive design, adversarial review, extra test coverage | `feature` (deep) |

### Backlog — parked ideas that can't be spec'd now

When an agent hits a tangent it can't spec right now, it **parks** the idea instead of
blocking: the orchestrator files a GitHub issue labeled `dlc-backlog` on the card's
owned repo and records it on the card. A back-feed cron periodically pulls open
`dlc-backlog` issues back in as fresh intake cards.

![Backlog view](docs/backlog-view.png)

---

## Phase triggers

When a card enters an automated stage, the orchestrator asks (via `ask_question`) how to
run that phase, then records the choice so it never re-asks:

- **requirements / design / tasks** → *Trigger Spec Builder* (drives the native
  `spec-workflow` skill) · *Handle inline* (specialist agent) · *Skip*
- **implement** → *Trigger Task Runner* (native `task_run`) · *Handle inline* · *Skip*

Under `autonomous` trust the orchestrator picks the recommended trigger automatically.

---

## Per-repo sandbox

Independently of trust mode, **every pipeline agent is strictly confined to the single
repository its card owns** (`source.repo`). Specialist and Spawn/Task-runner subagents
are seeded with exactly one `WORKING_DIR` and one `SPEC_DIR`; only the orchestrator
touches shared pipeline state. Trust governs *when to pause*; the sandbox governs
*where an agent may act*, always.

---

## Architecture

DLC-YOLO runs with **no backend process**. The UI reads and writes pipeline state
directly through the gateway's file API — `GET /api/file-read?path=…` and
`POST /api/file-write` — against `/tmp/dlc-yolo/state.json`. Agents are driven by two
crons; specialist work is dispatched with `spawn_run` / `task_run`.

Native KiroCrew APIs used: `ask_question`, `spawn_run`, `task_run`, `send_message`,
scheduled crons, `/api/file-read` + `/api/file-write`, and `gh` for the backlog channel.

### State shape

```jsonc
{
  "config": { "trust": "assisted", "depth": "standard" },   // pipeline-wide defaults
  "cards": [
    {
      "id": "…", "title": "…", "stage": "design",
      "trust": "deep",          // optional per-card override
      "depth": "deep",
      "source": { "type": "github", "repo": "owner/name", "issue": 42, "url": "…" },
      "artifacts": { "requirements": "…", "design": "…", "spec_dir": "…", "pr_url": "…" },
      "gate_history": [ … ],
      "trigger_history": [ { "phase": "requirements", "trigger": "spec-builder", "at": "…" } ],
      "parked": [ { "id": "…", "note": "…", "issue_url": "…", "phase": "design", "at": "…" } ],
      "history": [ … ]
    }
  ]
}
```

### Crons

| Cron | Interval | Role |
|------|----------|------|
| `dlc-yolo-advance` | 120s | Advance automated stages, honor trust/depth, fire phase triggers |
| `dlc-yolo-backlog-intake` | 900s | Back-feed open `dlc-backlog` issues as new intake cards (read + create only) |

---

## UI

- **Pipeline graph** — glowing, count-correlated stage nodes; click a node to scroll to its column
- **Workspace rail** — multi-select repos to view several pipelines combined, plus **+ Add Workspace** (pick from your KiroCrew workspaces)
- **Views** — Pipeline (by stage) · Workspace (by repo) · Crew (by agent) · Status (blocked/in-flight/done) · Backlog (parked ideas)
- **Mode pills** — click to override trust/depth per card; theme-aware (adapts to the active dashboard theme)

---

## Installation

```bash
cd ui && npm install --legacy-peer-deps && npx vite build
kirocrew app install /path/to/kiro-crew-yolo-dlc
kirocrew app enable dlc-yolo
```

## Development

```bash
kirocrew app dev dlc-yolo          # hot-reload the app
cd ui && npx vite build            # rebuild the UI bundle
```

## Structure

```
kiro-crew-yolo-dlc/
├── app.json                          ← manifest (agents, skills, crons, permissions)
├── agents/
│   ├── pipeline-orchestrator.json    ← stage advancement, triggers, gates, backlog
│   ├── spec-agent.json               ← requirements
│   ├── design-agent.json             ← design
│   ├── impl-agent.json               ← task breakdown + implementation
│   └── review-agent.json             ← code review
├── skills/
│   └── pipeline-workflow/SKILL.md    ← stages, modes, sandbox, backlog, triggers
├── ui/
│   ├── src/App.tsx                   ← kanban + pipeline graph (@kirocrew/app-sdk)
│   └── vite.config.ts
├── docs/                             ← screenshots
└── README.md
```

## License

Apache License 2.0 © 2026 hai-dvash

---

*DLC-YOLO is an independent, community-built extension for the KiroCrew agent platform.
It is not affiliated with, endorsed by, or an official product of KiroCrew. "KiroCrew"
and related names are the property of their respective owners; they are referenced here
only to describe the platform this app runs on. DLC-YOLO bundles no KiroCrew source —
it links against the public `@kirocrew/app-sdk` at runtime.*
