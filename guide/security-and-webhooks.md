# Security & webhooks

> Purpose: the complete DLC-YOLO security model — GitHub webhook ingress, the tunnel, and cron
> control — in one auditable place. **← [back to README](../README.md)**

> **The tunnel is UNTRUSTED TRANSPORT, never authority — this is the security model.**
> A public relay (Cloudflare quick tunnel, a named tunnel, ngrok, Tailscale Funnel, or your own
> reverse proxy) only *carries bytes* to the loopback `/github` route; it can never *act*. Every
> delivery must pass **HMAC-SHA256 signature verification** (constant-time, before JSON parse) +
> the **exact repository/event/action allowlist** + an authoritative **`gh` refetch and
> trusted-author ownership check** before any card is touched. So a world-reachable quick-tunnel URL
> leaks nothing and drives nothing on its own. Because the tunnel is provider-agnostic, DLC-YOLO
> defaults to the **zero-account, zero-domain Cloudflare quick tunnel** (anyone can run it, no
> signup/token — its only cost is a URL that rotates on restart, which the opt-in **auto-sync**
> self-heals). **Bring your own stable endpoint** any time via the env-var override
> (`DLC_YOLO_GITHUB_WEBHOOK_*`) or by pointing GitHub at a named CF tunnel / ngrok reserved domain /
> Tailscale Funnel — the app forces no provider and the security guarantees are identical regardless
> of which relay fronts the one guarded route.

## Secure GitHub webhook ingress

Priority 10 adds an app-owned `aiohttp` receiver that is **disabled by default** and binds
unconditionally to `127.0.0.1`. It exposes exactly `POST /github`. Separately, the app's own
backend is a **spawned `entryPoint` subprocess** (`backend/server.py`, declared by
`backend.entryPoint` in `app.json`), which the gateway reverse-proxies: the dashboard calls
`/apps/dlc-yolo/api/webhook/status` and `GET|POST /apps/dlc-yolo/api/webhook/config`, which the
proxy forwards to the backend as `/api/webhook/*`. Every forwarded request is authenticated with the
gateway's per-request `X-KiroCrew-Proxy` HMAC. Those control routes are not GitHub ingress and
do not add a public-auth bypass to KiroCrew or expose the dashboard, gateway, `/api/ws`, terminal,
or general API.

Open **Pipeline Setup/Edit → Webhook · app-wide** in the DLC-YOLO UI to configure enablement,
loopback port, repository allowlist, optional absolute inbox path, and the GitHub secret. The tab is
inside pipeline configuration for discoverability, but its receiver settings are shared by every
pipeline. UI-managed settings apply immediately.
The secret is write-only: it is never returned to the browser or placed in `state.json`, `app.json`,
command arguments, logs, status responses, or projections. It lives in an exact-schema, bounded,
no-symlink, atomic/fsynced mode-`0600` app-owned `webhook-config.json` beside the selected state
authority. The UI can retain or rotate it, and can clear it only while the receiver is disabled.

Gateway process environment remains the operator override:

```bash
export DLC_YOLO_GITHUB_WEBHOOK_PORT=8765       # 1024..65535
export DLC_YOLO_GITHUB_WEBHOOK_REPOS=owner/repo[,owner/another-repo]
read -rsp 'GitHub webhook secret: ' DLC_YOLO_GITHUB_WEBHOOK_SECRET; echo
export DLC_YOLO_GITHUB_WEBHOOK_SECRET
# Optional; when set, this must be absolute. Otherwise it lives beside DLC_YOLO_STATE/app data.
export DLC_YOLO_WEBHOOK_INBOX=/absolute/path/to/github-webhook-inbox.json
```

If any of those four variables is present, the complete environment configuration wins atomically;
the UI shows the effective values and status read-only, never mixes file and environment authority,
and requires a gateway restart for environment changes. For either source, port, secret, a
syntactically valid non-empty repository allowlist, app enablement, and an absolute explicit inbox
path (when supplied) must pass before the receiver can operate.

In GitHub, create a repository webhook whose payload URL is the public relay/tunnel URL ending in
`/github`, content type is `application/json`, secret is the same process-injected secret, and events
are limited to **Issues** plus **Labels**. Signed `ping` is accepted. Issue actions are exactly
`opened`, `reopened`, `labeled`, `unlabeled`, and `closed`; repository-label actions are exactly
`created`, `edited`, and `deleted`. Configure the tunnel/relay to forward **only** this one route to
`127.0.0.1:<port>/github`. Never publish the loopback listener directly or tunnel the dashboard or
general KiroCrew API.

Admission streams at most 256 KiB, applies a bounded process-local rate limit, and verifies
`X-Hub-Signature-256` as HMAC-SHA256 over the untouched request body with constant-time comparison
before JSON decoding. It then enforces exact delivery/event/action/repository fields, reduces the
payload to delivery/event/action/repo/issue/label/time/digest metadata, seals that normalized record,
and appends it to a locked `0600`, fsync-and-atomic, bounded durable inbox. Raw payloads, issue prose,
authors, and signatures are never persisted. `X-GitHub-Delivery` deduplication is durable and
bounded; a full or unavailable inbox returns retriable `503` without evicting accepted work.

The advance cron re-verifies each sealed receipt and uses `gh issue view` (or `gh repo view` for
repository-label events) before any card mutation. Only the refetched repository identity, issue
number/state/title/URL/labels/author can influence state. Exactly one pipeline must own that
case-insensitive `owner/repo`, and the refetched author must pass the card → pipeline → global →
authenticated-user trusted-author rule. Unknown, missing, or ambiguous stage labels hold/reject
rather than guessing. External stage/close requests are queued; active producers first receive
`writes_allowed:false` plus cooperative cancellation, and their permits/worktrees remain held until
terminal host observation. Shared `MAX_MOVES=3` and `MAX_ESCALATIONS=2` remain unchanged.

After state is durably saved, the inbox receipt is acknowledged; a crash or acknowledgement failure
therefore replays idempotently. Accepted ingress best-effort triggers the deterministic advance job,
while its 120-second poll remains reconciliation for a missed wake. `state.json` remains authoritative
for rich/control state, and ordinary ledger observations remain payload-free. The projection snapshot
and replay path is separate from webhook/event authority.

## Cloudflare tunnel + cron control (app-managed, optional)

The receiver binds `127.0.0.1` only, so GitHub needs a public relay. The **Webhook · app-wide** tab
can **start/stop a Cloudflare quick tunnel** for you (`cloudflared tunnel --url
http://127.0.0.1:<port>`) and show the ready-to-paste `…/github` payload URL — or it shows the exact
command so you can run it yourself. `cloudflared` is never auto-installed (the tab shows the install
command when it is absent), the tunnel is a fixed-argv `exec` (no shell), and it **refuses to expose
the port unless the receiver is enabled, secret-configured, and actually listening** on it — so a
public URL can only ever front the guarded `/github` route, whose deliveries are all HMAC-verified.
A quick-tunnel URL rotates on restart; the opt-in **auto-sync** re-points the GitHub hook to the new
URL, and a tunnel that fails to announce a URL within the startup window is torn down rather than
left running.

The same tab exposes **Automation crons** — pause/resume DLC-YOLO's background jobs
(advance · spawns) from the UI, matched by name and acted on by their real ids via the sanctioned
`kirocrew cron` CLI. Pausing is the *hard* lever for a webhook-only or maintenance setup (the
receiver keeps accepting deliveries while paused; a verified delivery wakes advance again on resume).
It complements the per-pipeline `sync_mode` *soft* throttle described under
[operation modes](operation-modes.md). Both the tunnel and cron routes are served by the spawned
`entryPoint` backend and gated by the gateway's per-request `X-KiroCrew-Proxy` HMAC.
