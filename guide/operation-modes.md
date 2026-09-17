# Operation modes

> Purpose: the orthogonal control axes (trust, depth, sync mode) and the adaptive model/pass
> controls. **← [back to README](../README.md)**

Three orthogonal axes. Each has a pipeline-wide default; a pipeline, a **step**, or a card
can override it. Resolution cascades **card → step → pipeline → global**.

## Trust — how much autonomy before pausing for a human
| Level | Behavior |
|-------|----------|
| `manual` | Confirm every trigger **and** stop at all gates |
| `assisted` *(default)* | Auto-run agent steps, stop at human gates |
| `autonomous` | Auto-approve gates, auto-pick triggers, pause only on a blocker or Critical/High finding |

## Depth — how thoroughly each step runs
| Level | Behavior | Spec type |
|-------|----------|-----------|
| `quick` | Requirements + tasks, skip design; Critical-only review | `quick` |
| `standard` *(default)* | Full requirements → design → tasks; normal review | `feature` |
| `deep` | Exhaustive design, adversarial review, extra test coverage | `feature` (deep) |

Per-step overrides mean "this step runs autonomous + deep, that gate stays manual."

## Sync mode — webhook fast-path vs polling (per pipeline)

`sync_mode` tunes how eagerly the always-on advance cron does a pipeline's **periodic GitHub
reconciliation**. It never disables the poll — that is the missed-wake safety net — and a verified
webhook receipt always reconciles immediately regardless of mode.

| Level | Behavior |
|-------|----------|
| `poll` *(default)* | Reconcile the pipeline's GitHub stage every 120s cycle. Correct when no webhook is configured. |
| `webhook` | The verified webhook wake is the fast path; the periodic poll for this pipeline is throttled to `webhook_reconcile_interval_secs` (default 900). **Auto-safety:** falls back to `poll` when the app-wide receiver is not actually enabled, so a pipeline with no working webhook is never starved. |

Resolution cascades card → pipeline → global, like the other axes. For a full stop (webhook-only, no
polling at all) pause the crons from the **Webhook · app-wide** tab — the *hard* lever `sync_mode`'s
*soft* throttle complements. See [security & webhooks](security-and-webhooks.md).

## Adaptive model and pass controls

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
event vocabulary through the app-owned loopback receiver. Priority 11 separately
makes only the privacy-minimized operational read projection ledger-replay authoritative after exact
parity; rich/control state remains in `state.json`. See [architecture](architecture.md) for the
event bridge, scheduler, and projection internals.
