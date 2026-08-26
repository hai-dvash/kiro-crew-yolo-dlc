# SDLC Pipeline — YOLO DLC

Automated software development lifecycle as a KiroCrew app.

## Pipeline

```
Intake → Requirements → [GATE: spec Q's] → Design → Tasks → [GATE: approve impl] → Implement → Review → [GATE: post-review] → PR → Done
```

## Human Gates

- **gate-spec**: Clarifying questions before design proceeds
- **gate-impl**: Approve task list before implementation starts  
- **gate-review**: Review findings verdict before PR opens

## Installation

```bash
cd ui && npm install && npm run build
kirocrew app install /path/to/kiro-crew-yolo-dlc
kirocrew app enable sdlc-pipeline
```

## Development

```bash
kirocrew app dev sdlc-pipeline
```

## Structure

```
kiro-crew-yolo-dlc/
├── app.json                          ← manifest
├── agents/
│   ├── pipeline-orchestrator.json    ← stage advancement + coordination
│   ├── spec-agent.json               ← requirements + design
│   ├── impl-agent.json               ← task breakdown + coding
│   └── review-agent.json             ← code review
├── skills/
│   └── pipeline-workflow/SKILL.md    ← stage definitions + state machine
├── backend/
│   └── server.py                     ← state engine + REST API
├── ui/
│   ├── src/App.tsx                   ← kanban board UI
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/apps/sdlc-pipeline/cards` | GET | List all cards |
| `/api/apps/sdlc-pipeline/cards` | POST | Create a card |
| `/api/apps/sdlc-pipeline/cards/:id` | GET | Get one card |
| `/api/apps/sdlc-pipeline/cards/:id/advance` | POST | Advance to next stage |
| `/api/apps/sdlc-pipeline/cards/:id/gate-approve` | POST | Approve at gate |
| `/api/apps/sdlc-pipeline/cards/:id/gate-reject` | POST | Reject at gate (regress) |
| `/api/apps/sdlc-pipeline/status` | GET | Pipeline summary |
