# UI

> Purpose: the DLC-YOLO dashboard surfaces. **← [back to README](../README.md)**

- **Pipeline graph** — glowing, count-correlated nodes (circles = agent steps, diamonds = gates); click a node to scroll to its column
- **Workspace rail** — multi-select repos to view several pipelines combined, plus **+ New Pipeline**
- **Pipeline Setup modal** — the same config-first surface as `/dlc-yolo`: keep repository identity, workspace partition, and verified checkout distinct; configure trust/depth/budget/capability, ownership allowlist, result/log/backlog/self-enablement extras, custom steps with the inline agent setup panel, and the clearly app-wide webhook receiver from its own tab
- **Command entry controls** — one compact AI-marked button opens the bare `/dlc-yolo` command session without preselecting an action; pipeline setup/edit and agent configuration remain compact UI-native controls directly below the card stats, while webhook configuration lives inside Pipeline Setup/Edit rather than as a separate launcher
- **Agent config catalog** — switch among distinct installed/referenced agent-template declarations and global crew routes; inspect each crew's `kiro_agent`, workspace, memory store, model/source metadata, and linked authority profile; create/update the sanctioned global routing fields through the authenticated UI form
- **Card controls** — 🔍 **details** opens a read-only 4-tab drawer (Overview / Results / Decisions & history / Execution); 🔧 **maintain** appends a bounded `request:*` interjection (re-spec / retry / back-step / park / cancel) the runtime consumes; 📜 **timeline** shows the ordered per-card story (+ fan-out children); the in-card **live pane** streams the working agent's output; ⚙ **open orchestrator** deep-links the one pipeline orchestrator session
- **Truthful card/status projection** — blocked/error/gate/observed-running/unconfirmed-pending/queued/ready/terminal are distinct; cancellation remains in progress until terminal observation, and cards expose recorded SoT/lifecycle/capability without inventing missing facts
- **🌲 Tree** — a pipeline-wide event stream (webhook · loop · orchestrator · crew · step-agent · human lanes), time-ordered and causally linked; **🛠 Ops** — runtime/scheduler counts, projection parity, webhook status, sessions/worktrees; **📋 Backlog** — parked ideas. All three open as modals.
- **Webhook settings** — the Pipeline Setup/Edit **Webhook · app-wide** tab provides authenticated enable/disable, port, repository allowlist, inbox override, write-only secret rotation, effective-source/status, and durable queue counters
- **Views** — Pipeline (by step) · Workspace (by repo) · Crew (by agent) · Status (blocked/in-flight/done)
- **Mode pills** — click a card's trust/depth to override; ⚡ effort and ↩ back-step badges; theme-aware (adapts to the active dashboard theme)
