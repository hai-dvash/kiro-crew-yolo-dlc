---
description: SDLC Pipeline workflow orchestration — stage definitions, gate logic, and state transitions.
always: true
---

# SDLC Pipeline Workflow

## Pipeline Stages

```
Intake → Requirements → [GATE: spec questions] → Design → Tasks → [GATE: approve impl] → Implement → Review → [GATE: post-review] → PR → Done
```

## Stage Definitions

| Stage | Type | Agent | Description |
|-------|------|-------|-------------|
| intake | auto | orchestrator | Issue arrives from Issue Radar or manual creation |
| requirements | auto | spec-agent | Produce requirements doc from issue |
| gate-spec | human | — | User answers clarifying questions before design proceeds |
| design | auto | spec-agent | Produce design doc from approved requirements |
| tasks | auto | impl-agent | Break design into atomic implementation tasks |
| gate-impl | human | — | User approves task list before implementation starts |
| implement | auto | impl-agent | Execute tasks, write code, run tests |
| review | auto | review-agent | Code review against requirements + design |
| gate-review | human | — | User reviews findings, decides to proceed or fix |
| pr | auto | orchestrator | Open/update PR with all changes |
| done | terminal | — | Card complete |

## State Transitions

A card advances when:
- **Auto stages**: The assigned agent completes its work successfully
- **Human gates**: The user explicitly approves (via dashboard UI or ask_question)

A card can regress when:
- **gate-review** finds Critical/High issues → back to `implement` for fixes
- **User rejects** at any gate → back to the previous auto stage

## Card Schema

```json
{
  "id": "card-uuid",
  "title": "Issue title",
  "source": {"type": "github", "repo": "owner/repo", "issue": 42, "url": "..."},
  "stage": "requirements",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "artifacts": {
    "requirements": "path/to/requirements.md",
    "design": "path/to/design.md",
    "tasks": ["task-1.md", "task-2.md"],
    "review": "path/to/review.md",
    "pr_url": "https://github.com/..."
  },
  "gate_history": [
    {"gate": "gate-spec", "decision": "approved", "at": "ISO8601", "notes": "..."}
  ],
  "history": [
    {"from": "intake", "to": "requirements", "at": "ISO8601", "agent": "spec-agent"}
  ]
}
```

## Cron Behavior

The `sdlc-pipeline-advance` cron (every 120s):
1. Load pipeline state
2. For each card in an auto-stage that has no active agent working on it:
   - Spawn the appropriate agent
   - Mark card as "in-progress"
3. For each card at a human gate:
   - Check if approval was given (via storage)
   - If approved, advance to next stage
4. Report errors but do NOT retry failed stages without user input
