# Pipelines

> Purpose: what a pipeline is, how steps and agents are configured, phase triggers, and the
> `/dlc-yolo` command. **← [back to README](../README.md)**

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

## Phase triggers

When a card enters an agent step, the orchestrator asks how to run it, then records the
choice so it never re-asks:

- **requirements / design / tasks** → *Trigger Spec Builder* (native `spec-workflow`
  skill) · *Handle inline* · *Skip*
- **implement** → *Trigger Task Runner* (native `task_run`) · *Handle inline* · *Skip*

Under `autonomous` trust the orchestrator auto-picks the recommended trigger.

## The `/dlc-yolo` command

`/dlc-yolo` turns a chat session into a pipeline driver:

1. **Start a new pipeline conversation** — spec anything, file it to GitHub as an issue,
   label it, and record a card the local pipeline triggers off.
2. **Maintain an existing pipeline** — read a card's stage from its label and drive the
   next step (answer a gate, re-trigger a phase, park, back-step).
3. **Author an agent for a custom step** — still available when explicitly requested in the
   command session; ordinary step-agent configuration stays in Pipeline Setup.
