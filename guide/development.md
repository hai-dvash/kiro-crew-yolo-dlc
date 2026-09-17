# Development

> Purpose: hot-reload, testing, and the repo structure. **← [back to README](../README.md)**

```bash
kirocrew app dev dlc-yolo                                    # hot-reload the app
cd ui && npm install --legacy-peer-deps && npx vite build    # rebuild ui/dist/index.mjs after UI edits
```

## Testing

DLC-YOLO is exercised end-to-end against a dedicated sandbox repository —
[**hai-dvash/kiro-crew-yolo-dlc-test-repo**](https://github.com/hai-dvash/kiro-crew-yolo-dlc-test-repo) —
so live `gh` issue/label/PR flows run against a throwaway project instead of this one. Pipelines
created there drive real cards through the full spec → design → tasks → implement → review → PR
ladder (the RPS-game fixtures live there), keeping this repo's own history clean.

Python tests run with `pytest`; UI tests run with `npm test` (`node --test tests/*.test.mjs`).

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
├── guide/                            ← shipped user docs (this directory)
├── docs/                             ← screenshots + internal dev specs (gitignored except PNGs)
└── README.md
```
