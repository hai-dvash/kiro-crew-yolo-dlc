# Self-enablement, effort & backlog

> Purpose: how a pipeline enables itself, where results live, scope-aware back-stepping, and the
> backlog. **← [back to README](../README.md)**

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

## Where results live

Phase results (requirements/design/…) are written to the workspace-partitioned app-data area
`~/.dlc-yolo/workspaces/<ws>/data/results/<card-id>/` (durable; `/tmp` only as fallback). The
per-pipeline **`results_in_repo`** knob (setup-modal toggle or `/dlc-yolo`) additionally
mirrors + commits a copy into the owned repo's `.dlc-yolo/` (a repo-root mirror of the
app-data layout — `.dlc-yolo/workspaces/<ws>/data/` with the pipeline conversation log, and
`.dlc-yolo/<card-id>/` results) — so both results **and** pipeline conversations can live in
the workspace repo itself when you want them there. Specialist agents (spec/design/impl) hold
scoped `git add/commit/push` for this, confined to the exact active card lease path and branch.

## Effort & scope-aware back-stepping

The spec agent attributes **effort** (T-shirt points) to each spec. When a step outgrows
the scope of the step before it (beyond a depth-tuned factor), the pipeline proposes a
**back-step** a level down — implement → design ("this became a design ticket"), design →
requirements ("re-spec smaller") — or parks the single over-scoped feature to the backlog.
Cards surface an ⚡ effort badge and a ↩ back-step badge. A deterministic backstop raises the
scope-growth fork as a `card.decisions[]` entry even if the prompt missed it (the code raises;
the orchestrator decides).

*(Predictive token-budgeting is designed but parked; the scope-growth heuristic ships and
needs no history.)*

## Backlog — parked ideas that can't be spec'd now

When an agent hits a tangent it can't spec right now, it **parks** the idea instead of
blocking: the orchestrator files a GitHub issue labeled `dlc-backlog` on the card's owned
repo and records it on the card. The zero-token advance loop's discovery scan pulls open
`dlc-backlog` issues back in as fresh intake cards (authoritative `gh` refetch + trusted-author
guard, READ + CREATE only — no LLM); a verified `labeled dlc-backlog` webhook does the same
immediately.

![Backlog view](../docs/backlog-view.png)
