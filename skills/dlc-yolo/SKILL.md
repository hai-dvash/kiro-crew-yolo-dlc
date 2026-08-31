---
name: dlc-yolo
description: Drive the DLC-YOLO pipeline from chat — start a new pipeline conversation (spec an idea and file it to GitHub as an issue the pipeline can trigger off) or maintain an existing pipeline. Load when the user runs /dlc-yolo or asks to start/maintain a DLC-YOLO pipeline.
---

# /dlc-yolo — pipeline driver

You turn this chat session into a driver for the DLC-YOLO pipeline. Pipeline state lives at
the DLC-YOLO state file — resolved durable-first: `$DLC_YOLO_STATE` if set, else
`~/.dlc-yolo/state.json` (durable), else `/tmp/dlc-yolo/state.json` (ephemeral fallback);
read via `/api/file-read`, write via `/api/file-write` (the cron bootstraps the file).
**GitHub is the source of truth for a card's stage**, expressed as a `dlc:<step-id>` label
on the card's issue; `state.json` holds the rich data.

## Conversation log (this command only — presentation feature)

While you drive the pipeline in this session, keep a running transcript of the exchange so
the run is reviewable after the fact. This is scoped to the `/dlc-yolo` command for the
test — it is NOT the orchestrator/cron path.

- **File:** `~/.dlc-yolo/workspaces/<workspace>/data/pipeline_conversation.md`, where
  `<workspace>` is the current KiroCrew workspace name. Mirror the state resolver
  durable-first: under `$DLC_YOLO_STATE`'s dir if set, else `~/.dlc-yolo/`, else
  `/tmp/dlc-yolo/` as the last-resort fallback — then `/workspaces/<ws>/data/` beneath it.
- **Use your native `read` + `write` tools, NOT `/api/file-write`.** The file API cannot
  append and 404s on a missing file; the `write` tool creates parent dirs + the file and
  lets you do read-modify-write. So: `read` the current markdown (empty string if it does
  not exist yet), append the new turn, `write` the whole file back.
- **FIRST STEP on invoke (do this before mode selection):** ensure the log exists. Resolve
  `<workspace>` + the durable-first base, then use `write` to create
  `~/.dlc-yolo/workspaces/<workspace>/data/pipeline_conversation.md` if it does not already
  exist — write a `# DLC-YOLO pipeline conversation — <workspace>` header (and a `_started
  <ISO8601>_` line). Do this whenever there is a pipeline in `state.json` (or the user is
  about to create one), so the file is present the moment the command runs against a
  pipeline — NOT lazily on the first action. If a `read` shows it already exists, leave it
  and just append.
- **What to log, one section per turn** (append, never truncate):
  ```
  ## <ISO8601> — <actor: user | dlc-yolo>
  <the user's message, OR a concise summary of your action:
   decision raised, crew created, issue filed (#n + url), stage moved, gate answered>
  ```
- **When to append:** right after creating/confirming the file, append the user's seed
  prompt; then after each of your substantive actions (a decision, a crew create, an issue
  file, a stage move) append a section. Keep entries short — a presentation trail, not a
  full dump.
- Single writer: only this command writes the log, so no lock is needed. Presentation-only;
  no cross-workspace aggregation or future-proofing.

## On invoke

Ask the user (via `ask_question`) which mode / topic:

1. **Start a new pipeline conversation**
2. **Maintain an existing pipeline**
3. **Author an agent for a custom step** — if the seed prompt mentions designing a NEW
   agent for a step (the UI's "✨ Draft with /dlc-yolo" hands off here), go straight to it.
4. **Create / assign a crew** — author a NEW globally-reusable crew (canon or addendum) and
   register it, or assign an existing crew to a step. See "Crew creation & assignment".

`$ARGUMENTS` may already name a repo/idea — if so, skip straight to that.

## Crew creation & assignment

DLC-YOLO steps can route to a **crew** (a `config.json` agents entry that `select_crew`
binds). Crews created here are **GLOBAL** — usable across ALL of KiroCrew (Spec Builder
routing, other apps, plain chat), not siloed in this app. There is ONE registry and ONE
creation mechanism; reuse it, never build a parallel store.

**Create a crew (global):** design it conversationally — ask for its purpose (canon phase
worker vs cross-cutting addendum like `research` / `secure-design`), then propose a name,
role/prompt, model, target workspace, and memory store. On approval, register it GLOBALLY
by running the existing CLI (the app UI CANNOT write `config.json`, but you — an agent —
can run the CLI):
```
kirocrew agent create --name <crew-name> --kiro-agent <kiro-agent> \
  --workspace <workspace> --memory-store <memory-store>
```
This writes the global `~/.kiro/crew/config.json` `agents` entry that `select_crew` binds
and every app/session sees. Confirm with `kirocrew agent list`. NOTE: only these sanctioned
fields are set by the CLI; a richer role/prompt is carried by the underlying kiro-agent.
For "canon vs addendum" and default `when` triggers, record those on the pipeline STEP
(`step.agent.crew` / `step.addenda[]`) in `state.json`, not in the global registry.

**Assign a crew to a step:** edit the pipeline's step in `state.json` — set
`step.agent.crew = "<crew-name>"` (canon) or append `{crew, when, writes}` to
`step.addenda[]` (addendum). The orchestrator resolves these via `select_crew` at run time.
The UI's agent-setup panel does the same via its Crew dropdown + Addendum editor.

**Starter canon/addendum library (offer to seed):** canon — `spec`, `design`, `implement`,
`review`; addenda — `research`, `secure-design`, `a11y`, `perf`. Create any on request.

## Author an agent for a custom step

Triggered when the seed names a pipeline repo + step and asks to design an agent (the
agent-setup panel's handoff). Do this conversationally:

1. Ask what the step should DO (its responsibility, inputs, outputs, guardrails).
2. Propose a complete agent config: `name`, `role`/prompt (concrete system prompt),
   `tools[]` (least-privilege — only what the step needs), optional `model`, and a
   suggested per-step `trust`/`depth`. Show it, let the user refine.
3. On approval, WRITE it into the pipeline's step in the DLC-YOLO state file (resolved
   durable-first: `$DLC_YOLO_STATE`, else `~/.dlc-yolo/state.json`, else
   `/tmp/dlc-yolo/state.json`): find the
   pipeline by repo, find the step by name/id, set `step.agent = { name, role, tools }`
   and `step.trust`/`step.depth` if chosen. Persist via file-write. Keep GitHub the source
   of truth for stage (this only edits the step's agent config, not a card's stage).
4. Respect the per-repo sandbox: the agent you design is confined to the pipeline's repo.

## 1. Start a new pipeline conversation

1. **Pick the target pipeline/repo.** List existing pipelines from `state.json.pipelines[]`.
   If none fit, the user can **paste a GitHub URL** (`https://github.com/owner/name`, with
   or without `.git`/trailing path) OR type a bare `owner/name`, OR name a KiroCrew
   workspace. Normalize a pasted URL to `owner/name` (strip scheme/host/`.git`/trailing
   path). If no pipeline exists for that repo yet, **create one** in
   `state.json.pipelines[]` (default steps, inheriting `config` trust/depth,
   `source:"manual"`, `sot:"github"`) so the repo is added as a pipeline/workspace — this
   is the command-side equivalent of the UI's paste-a-link → add-pipeline flow.
   **Ask the results-location preference** when creating (or confirm on an existing
   pipeline): "Where should phase results (requirements/design/…) be saved?" — *App data
   only* (`results_in_repo: false`, default — results live in the workspace-partitioned
   `.dlc-yolo` results area) or *Also save into the repo* (`results_in_repo: true` — also
   write + commit a copy into the owned repo's `docs/dlc/<card-id>/`). Write the choice onto
   `pipeline.results_in_repo` in `state.json` (a card may override it). This is the same knob
   the UI Pipeline Setup modal exposes as the "Save results into repo" toggle.
2. **Spec the idea WITH the user.** Ask focused clarifying questions (1–3 at a time), state
   recommendations, keep it tight. You may spec anything — feature, bug, chore.
3. **File it to GitHub as an issue** on the pipeline's repo — this is the invariant, because
   the local pipeline triggers off labeled issues:
   ```
   gh issue create --repo <owner/name> \
     --title "<concise title>" \
     --body "<spec: problem, acceptance criteria, constraints, out-of-scope>" \
     --label "dlc:<first-step-id>"
   ```
   Ensure the stage label exists first (idempotent):
   `gh label create dlc:<step-id> --color 6366f1 --description "DLC-YOLO stage" 2>/dev/null || true`
4. **Record the card** in `state.json`: `{ id, title, stage: "<first-step-id>",
   pipeline_id, source: { type:"github", repo, issue:<n>, url }, sot:"github", … }`.
5. If `gh` or the repo is unavailable, create the card with `sot:"local"` and tell the user
   it will **re-sync to GitHub** when access returns. Never block on GitHub.

## 2. Maintain an existing pipeline

1. List pipelines/cards; let the user pick one.
2. Read the card's current stage from its issue's `dlc:*` label (GitHub is SoT). If it
   drifts from `state.json`, trust the label and reconcile.
3. Offer the next action for where it sits: answer a gate (approve/reject), re-spec,
   re-trigger a phase (Spec Builder / Task Runner / inline), park an over-scoped feature to
   the backlog, or propose a back-step. Honor the step's effective trust/depth.
4. On any stage change, **move the GitHub label** (remove the old `dlc:*`, add the new one)
   and reflect it into `state.json`.

## Rules

- The per-repo sandbox always applies: only act within the card's `source.repo`.
- Never write to Issue Radar's data dir; it is a read-only candidate source.
- Keep GitHub the source of truth for stage; `state.json` mirrors it plus the rich data.
- Under `autonomous` trust you may auto-pick triggers and auto-approve gates; under
  `manual`/`assisted` ask first.
