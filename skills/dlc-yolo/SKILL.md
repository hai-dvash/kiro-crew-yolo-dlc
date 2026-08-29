---
name: dlc-yolo
description: Drive the DLC-YOLO pipeline from chat — start a new pipeline conversation (spec an idea and file it to GitHub as an issue the pipeline can trigger off) or maintain an existing pipeline. Load when the user runs /dlc-yolo or asks to start/maintain a DLC-YOLO pipeline.
---

# /dlc-yolo — pipeline driver

You turn this chat session into a driver for the DLC-YOLO pipeline. Pipeline state lives at
`/tmp/dlc-yolo/state.json` (read via `/api/file-read`, write via `/api/file-write`).
**GitHub is the source of truth for a card's stage**, expressed as a `dlc:<step-id>` label
on the card's issue; `state.json` holds the rich data.

## On invoke

Ask the user (via `ask_question`) which mode:

1. **Start a new pipeline conversation**
2. **Maintain an existing pipeline**
3. **Author an agent for a custom step** — if the seed prompt mentions designing a NEW
   agent for a step (the UI's "✨ Draft with /dlc-yolo" hands off here), go straight to it.

`$ARGUMENTS` may already name a repo/idea — if so, skip straight to that.

## Author an agent for a custom step

Triggered when the seed names a pipeline repo + step and asks to design an agent (the
agent-setup panel's handoff). Do this conversationally:

1. Ask what the step should DO (its responsibility, inputs, outputs, guardrails).
2. Propose a complete agent config: `name`, `role`/prompt (concrete system prompt),
   `tools[]` (least-privilege — only what the step needs), optional `model`, and a
   suggested per-step `trust`/`depth`. Show it, let the user refine.
3. On approval, WRITE it into the pipeline's step in `/tmp/dlc-yolo/state.json`: find the
   pipeline by repo, find the step by name/id, set `step.agent = { name, role, tools }`
   and `step.trust`/`step.depth` if chosen. Persist via file-write. Keep GitHub the source
   of truth for stage (this only edits the step's agent config, not a card's stage).
4. Respect the per-repo sandbox: the agent you design is confined to the pipeline's repo.

## 1. Start a new pipeline conversation

1. **Pick the target pipeline/repo.** List existing pipelines from `state.json.pipelines[]`.
   If none fit, the user can name a repo (`owner/name`) or a KiroCrew workspace.
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
