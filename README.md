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

## Quick start

```bash
kirocrew app install /path/to/kiro-crew-yolo-dlc
kirocrew app enable dlc-yolo
python3 scripts/setup-crons.py          # deploy zero-token crons + publish /dlc-yolo
# then open a FRESH Kiro session for slash discovery
```

Full turnkey, upgrade, and host caveats: **[guide/install.md](guide/install.md)**.

---

## What you get

- **First-class pipelines** — one per repo, with their own ordered, reorderable steps (gates +
  agent steps), configured in the Pipeline Setup modal. → [guide/pipelines.md](guide/pipelines.md)
- **Operation modes** — trust (how much autonomy), depth (how thorough), sync mode (webhook vs
  poll), cascading card → step → pipeline → global. → [guide/operation-modes.md](guide/operation-modes.md)
- **Self-enabling pipelines** — turn a one-line idea into a configured, ticketed pipeline
  (setup → intent → per-step → bootstrap); effort-aware back-stepping; a backlog for parked ideas.
  → [guide/self-enablement.md](guide/self-enablement.md)
- **Secure GitHub webhooks** — the tunnel is untrusted transport; every delivery passes
  HMAC + allowlist + `gh` re-verify + trusted-author guard before touching a card.
  → [guide/security-and-webhooks.md](guide/security-and-webhooks.md)
- **Zero-token runtime** — a deterministic advance loop owns all card movement, the event bus,
  the DAG scheduler, the worktree sandbox, and the replay-parity projection; LLMs run only on real
  work. → [guide/architecture.md](guide/architecture.md)
- **A legible UI** — glowing pipeline graph, per-card live pane / timeline / details drawer,
  maintenance requests, a pipeline-wide event Tree, and an Ops panel.
  → [guide/ui.md](guide/ui.md)

## Docs

| Guide | What's in it |
|-------|--------------|
| [Pipelines](guide/pipelines.md) | Pipelines, steps, the agent setup panel, phase triggers, `/dlc-yolo` |
| [Operation modes](guide/operation-modes.md) | Trust · depth · sync mode · adaptive model/pass controls |
| [Self-enablement](guide/self-enablement.md) | Self-enabling pipelines · where results live · effort & back-stepping · backlog |
| [Security & webhooks](guide/security-and-webhooks.md) | HMAC ingress · loopback receiver · secret storage · tunnel + cron control |
| [Architecture](guide/architecture.md) | State authority · crons · event bridge · DAG scheduler · projection · worktree sandbox · SoT · state shape |
| [UI](guide/ui.md) | Every dashboard surface |
| [Install](guide/install.md) | Full install, upgrade/reinstall, host caveats |
| [Development](guide/development.md) | Hot-reload · testing · repo structure |

---

## Development

```bash
kirocrew app dev dlc-yolo                                    # hot-reload the app
cd ui && npm install --legacy-peer-deps && npx vite build    # rebuild ui/dist/index.mjs after UI edits
```

Testing and the full repo structure: **[guide/development.md](guide/development.md)**.

---

## License

Apache License 2.0 © 2026 hai-dvash

*DLC-YOLO is an independent, community-built extension for the KiroCrew agent platform.
It is not affiliated with, endorsed by, or an official product of KiroCrew. "KiroCrew"
and related names are the property of their respective owners; they are referenced here
only to describe the platform this app runs on. DLC-YOLO bundles no KiroCrew source — it
links against the public `@kirocrew/app-sdk` at runtime.*
