---
name: conversation-digest
description: Distill a DLC-YOLO pipeline conversation log (or the current session) into a durable, review-sized digest with a fixed section template. Load when asked to digest/summarize/snapshot a pipeline conversation, at a pipeline milestone (bootstrap done, card retired), or to archive a session under docs/.sessions/.
---

# Conversation Digest

Turn a raw, append-only conversation log into a **review-sized structured digest** — the raw
log (`pipeline_conversation.md`) grows unbounded and there is no verbatim-transcript export, so
the digest is the recoverable, cheap-to-re-read artifact. Two consumers, same mechanism:
the **orchestrator / `/dlc-yolo` session** (snapshot a pipeline) and **dev/session archival**.

## When to run

- The orchestrator MAY digest at a milestone: **bootstrap complete**, a **gate**, or a card
  reaching **`retired`** (the work is done — snapshot it).
- The `/dlc-yolo` session: on user request ("digest this pipeline") or at session end.
- A human/dev: "digest this session" → archival copy.

## Input

Either a **log path** (`<base>/workspaces/<ws>/data/pipeline_conversation.md`) — read it with
the native `read` tool — or **the current session** (summarize from your own context). If a log
path is given, digest THAT; do not invent content not present in it.

## Output — fixed section template (keep it diffable + scannable)

```markdown
# <title> — digest (<ISO8601>)
## Arc            — one paragraph: what this pipeline/session was about
## Key decisions  — bulleted, the load-bearing choices + rationale
## Built          — what actually shipped (files/commits/features)
## Deferred       — parked/future, with why
## Bugs           — found + fixed (or open)
## Open thread    — what the next session should pick up
```

**Rules:**
- **Size-capped:** ~one screen per section. A digest, NOT a transcript — distill, don't dump.
- **Derived, never replaces the raw log.** The append-only log stays; the digest is its companion.
- **No secrets / PII** — same content-safety as any artifact; use placeholders if the log
  contains paths/usernames/tokens.
- **Do NOT claim verbatim** — if asked for the literal transcript, point to the dashboard's chat
  export; this skill produces a synthesis.

## Where to write (native `write` tool — the file API cannot create files)

Resolve `<base>` durable-first (`$DLC_YOLO_STATE` dir → `~/.dlc-yolo/` → `/tmp/dlc-yolo/`):
- **Pipeline digest:** `<base>/workspaces/<ws>/data/digests/<card-or-pipeline>-<ISO>.md`; when the
  pipeline has `results_in_repo`, ALSO mirror + commit into the owned repo's
  `.dlc-yolo/workspaces/<ws>/data/digests/`.
- **Dev/session digest:** `docs/.sessions/<ISO>-<slug>.md` (repo-local archival).

Create parent dirs with the `write` tool. One digest per invocation; timestamp keeps them ordered.

## Notes

- The self-enabling flow may read the LATEST digest instead of the full log when reasoning over
  prior intent (cheaper context) — so keep the sections stable and truthful.
- Synthesis is a reasoning task → this is an agent-run skill. A future zero-token tool could do
  mechanical rollup (turn counts, marker-extracted decisions) only, not real synthesis.
