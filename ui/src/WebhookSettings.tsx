import { useAppApi, useChatLauncher } from '@kirocrew/app-sdk'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { repositoriesFromText } from './webhookConfig.js'

interface WebhookConfigView {
  schema_version: number
  listener: string
  bind: string
  path: string
  configuration_source: 'none' | 'ui' | 'environment' | 'invalid'
  editable: boolean
  enabled: boolean
  configured: boolean
  secret_configured: boolean
  port: number | null
  repositories: string[]
  inbox_path: string | null
  allowed_repository_count: number
  autosync?: boolean
  inbox?: { pending?: number | null; processed?: number | null }
  last_error?: string | null
  configuration_error?: string | null
}

interface TunnelAutosyncResult {
  enabled: boolean
  payload_url?: string | null
  error?: string
  results?: Array<{ repo: string; action: string; from?: string | null; to?: string | null; error?: string }>
}

interface TunnelView {
  installed: boolean
  running: boolean
  public_url: string | null
  payload_url: string | null
  command: string | null
  started_at: number | null
  last_error: string | null
  install_hint: string | null
  target_port?: number
  receiver_ready?: boolean
  receiver_block_reason?: string | null
  autosync?: TunnelAutosyncResult | null
}

interface CronJob { id: string; name: string; basename: string; paused: boolean }
interface CronStatus {
  available: boolean
  error?: string | null
  jobs: CronJob[]
  all_paused?: boolean
  any_active?: boolean
}

const RECEIVER_BLOCK_LABELS: Record<string, string> = {
  'receiver-disabled': 'Enable and save the receiver above first.',
  'receiver-secret-missing': 'Set a webhook secret above before exposing the port.',
  'receiver-allowlist-empty': 'Add at least one allowed repository above first.',
  'receiver-port-mismatch': 'Save the receiver on this port before starting the tunnel.',
  'receiver-not-listening': 'The receiver is not listening yet — save it, then Refresh.',
  'receiver-config-invalid': 'Repair the stored receiver configuration first.',
}

function statusColor(status: string): string {
  if (status === 'listening') return 'var(--ok)'
  if (status === 'misconfigured' || status === 'failed') return 'var(--danger, #ef4444)'
  return 'var(--muted)'
}

function webhookErrorMessage(cause: any): string {
  const message = cause?.message || String(cause)
  return /(?:404|not found)/i.test(message)
    ? 'Webhook backend unavailable in the running gateway. Restart KiroCrew after syncing this app, then refresh this tab.'
    : message
}

export function WebhookSettingsSection() {
  const api = useAppApi()
  const [view, setView] = useState<WebhookConfigView | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [port, setPort] = useState('8765')
  const [repositories, setRepositories] = useState('')
  const [inboxPath, setInboxPath] = useState('')
  const [secret, setSecret] = useState('')
  const [clearSecret, setClearSecret] = useState(false)
  const [autosync, setAutosync] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const applyView = useCallback((next: WebhookConfigView) => {
    setView(next)
    setEnabled(!!next.enabled)
    setPort(String(next.port || 8765))
    setRepositories((next.repositories || []).join('\n'))
    setInboxPath(next.inbox_path || '')
    setAutosync(!!next.autosync)
    setSecret('')
    setClearSecret(false)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      applyView(await api.get('/apps/dlc-yolo/api/webhook/config') as WebhookConfigView)
    } catch (cause: any) {
      setError(webhookErrorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [api, applyView])

  useEffect(() => { void refresh() }, [refresh])

  const [tunnel, setTunnel] = useState<TunnelView | null>(null)
  const [tunnelBusy, setTunnelBusy] = useState(false)

  const refreshTunnel = useCallback(async () => {
    try {
      setTunnel(await api.get('/apps/dlc-yolo/api/tunnel/status') as TunnelView)
    } catch {
      setTunnel(null)
    }
  }, [api])

  useEffect(() => { void refreshTunnel() }, [refreshTunnel])

  const startTunnel = useCallback(async () => {
    setTunnelBusy(true)
    try {
      setTunnel(await api.post('/apps/dlc-yolo/api/tunnel/start', {}) as TunnelView)
    } catch (cause: any) {
      setError(webhookErrorMessage(cause))
    } finally {
      setTunnelBusy(false)
    }
  }, [api])

  const stopTunnel = useCallback(async () => {
    setTunnelBusy(true)
    try {
      setTunnel(await api.post('/apps/dlc-yolo/api/tunnel/stop', {}) as TunnelView)
    } catch (cause: any) {
      setError(webhookErrorMessage(cause))
    } finally {
      setTunnelBusy(false)
    }
  }, [api])

  const [crons, setCrons] = useState<CronStatus | null>(null)
  const [cronsBusy, setCronsBusy] = useState(false)

  const refreshCrons = useCallback(async () => {
    try {
      setCrons(await api.get('/apps/dlc-yolo/api/crons/status') as CronStatus)
    } catch {
      setCrons(null)
    }
  }, [api])

  useEffect(() => { void refreshCrons() }, [refreshCrons])

  const setCronsPaused = useCallback(async (pause: boolean) => {
    setCronsBusy(true)
    try {
      const path = pause ? '/apps/dlc-yolo/api/crons/pause' : '/apps/dlc-yolo/api/crons/resume'
      setCrons(await api.post(path, {}) as CronStatus)
    } catch (cause: any) {
      setError(webhookErrorMessage(cause))
    } finally {
      setCronsBusy(false)
    }
  }, [api])

  const repoList = useMemo(() => repositoriesFromText(repositories), [repositories])
  const parsedPort = Number(port)
  const secretBytes = typeof TextEncoder === 'undefined' ? secret.length : new TextEncoder().encode(secret).length
  const secretReady = !!view?.secret_configured || secretBytes >= 32
  const formValid = Number.isInteger(parsedPort) && parsedPort >= 1024 && parsedPort <= 65535
    && (!enabled || (repoList.length > 0 && secretReady))
    && (!inboxPath.trim() || inboxPath.trim().startsWith('/'))

  const save = async () => {
    if (!view?.editable || !formValid) return
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, unknown> = {
        enabled,
        port: parsedPort,
        repositories: repoList,
        inbox_path: inboxPath.trim() || null,
        clear_secret: clearSecret,
        autosync,
      }
      if (secret) payload.secret = secret
      applyView(await api.post('/apps/dlc-yolo/api/webhook/config', payload) as WebhookConfigView)
    } catch (cause: any) {
      setError(webhookErrorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
      <section data-pipeline-webhook-settings aria-labelledby="webhook-settings-title"
        className="w-full rounded-lg overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border-strong, var(--border))' }}>
        <header className="px-4 py-3 flex items-start gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 id="webhook-settings-title" className="text-[15px] font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>GitHub webhook</h2>
              <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                style={{ color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 40%, var(--border))' }}>App-wide</span>
              {view && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: statusColor(view.listener), background: `color-mix(in srgb, ${statusColor(view.listener)} 13%, transparent)` }}>{view.listener}</span>}
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>Shared by every pipeline. This authenticated control owns the app-wide loopback receiver; the secret is write-only and never returned.</p>
          </div>
        </header>

        <div className="px-4 py-4 flex flex-col gap-4">
          {loading ? <div className="text-[12px]" style={{ color: 'var(--muted)' }}>Loading receiver configuration…</div> : view && <>
            {view.configuration_source === 'environment' && (
              <div className="rounded-md px-3 py-2 text-[11px]" style={{ color: 'var(--warn)', border: '1px solid color-mix(in srgb, var(--warn) 40%, var(--border))', background: 'color-mix(in srgb, var(--warn) 7%, transparent)' }}>
                Gateway environment variables currently own this configuration, so the UI is read-only. Remove those overrides and restart the gateway to transfer authority to this form.
              </div>
            )}
            {view.configuration_source === 'invalid' && (
              <div className="rounded-md px-3 py-2 text-[11px]" style={{ color: 'var(--danger, #ef4444)', border: '1px solid var(--danger, #ef4444)' }}>
                Stored configuration failed secure validation and was not loaded. Repair or remove the app-owned config file before using this form.
                {view.configuration_error && <div className="mt-1 font-mono">Reason: {view.configuration_error}</div>}
              </div>
            )}

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Enable receiver</div>
                <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Applies immediately for UI-managed settings; polling remains reconciliation.</div>
              </div>
              <button type="button" disabled={!view.editable} onClick={() => setEnabled(value => !value)}
                aria-pressed={enabled} className="rounded-full transition-all relative disabled:opacity-50"
                style={{ background: enabled ? 'var(--accent)' : 'var(--border-strong, var(--border))', height: 22, width: 40 }}>
                <span className="absolute top-0.5 rounded-full transition-all" style={{ height: 18, width: 18, background: 'var(--bg)', left: enabled ? 20 : 2 }} />
              </button>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Loopback port
                <input type="number" min={1024} max={65535} value={port} disabled={!view.editable}
                  onChange={event => setPort(event.target.value)} className="mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60"
                  style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </label>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Fixed listener route
                <div className="mt-1 px-3 py-2 rounded-md text-sm font-mono normal-case"
                  style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  127.0.0.1:{Number.isFinite(parsedPort) ? parsedPort : '—'}/github
                </div>
              </div>
            </div>

            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Repository allowlist · one owner/repo per line
              <textarea rows={4} value={repositories} disabled={!view.editable}
                onChange={event => setRepositories(event.target.value)} placeholder="owner/repo"
                className="mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y disabled:opacity-60"
                style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </label>

            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Durable inbox override · optional absolute path
              <input value={inboxPath} disabled={!view.editable} onChange={event => setInboxPath(event.target.value)}
                placeholder="Uses the state directory by default"
                className="mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none disabled:opacity-60"
                style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </label>

            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              GitHub webhook secret · {view.secret_configured ? 'configured; leave blank to keep' : 'minimum 32 bytes'}
              <input type="password" autoComplete="new-password" value={secret} disabled={!view.editable}
                onChange={event => setSecret(event.target.value)} placeholder={view.secret_configured ? '•••••••••••••••• (unchanged)' : 'Enter a new secret'}
                className="mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60"
                style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </label>

            {!enabled && view.secret_configured && view.editable && (
              <label className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: 'var(--muted)' }}>
                <input type="checkbox" checked={clearSecret} onChange={event => setClearSecret(event.target.checked)} />
                Remove the stored secret when saving the disabled receiver
              </label>
            )}

            <div className="rounded-md p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]"
              style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)' }}>
              <div><span style={{ color: 'var(--muted)' }}>Source</span><div style={{ color: 'var(--text)' }}>{view.configuration_source}</div></div>
              <div><span style={{ color: 'var(--muted)' }}>Allowlist</span><div style={{ color: 'var(--text)' }}>{view.allowed_repository_count}</div></div>
              <div><span style={{ color: 'var(--muted)' }}>Pending</span><div style={{ color: 'var(--text)' }}>{view.inbox?.pending ?? '—'}</div></div>
              <div><span style={{ color: 'var(--muted)' }}>Processed</span><div style={{ color: 'var(--text)' }}>{view.inbox?.processed ?? '—'}</div></div>
            </div>

            <div className="text-[11px] leading-5" style={{ color: 'var(--muted)' }}>
              Configure GitHub for <strong>Issues</strong> and <strong>Labels</strong> events and use the same secret. A public relay/tunnel may forward only its <code>/github</code> route to this loopback listener—never expose the dashboard or general API.
            </div>

            <div data-cloudflare-tunnel className="rounded-md p-3 flex flex-col gap-2"
              style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Cloudflare tunnel</span>
                <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                  style={{ color: tunnel?.running ? 'var(--ok)' : 'var(--muted)', border: '1px solid var(--border)' }}>
                  {tunnel ? (tunnel.running ? 'running' : tunnel.installed ? 'stopped' : 'not installed') : '—'}
                </span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                The receiver is loopback-only, so GitHub needs a public relay. Start a Cloudflare quick tunnel here, or run the shown command yourself. cloudflared is never installed automatically.
              </p>

              {tunnel && !tunnel.installed && (
                <div className="rounded px-2 py-1.5 text-[11px]" style={{ color: 'var(--warn)', border: '1px solid color-mix(in srgb, var(--warn) 40%, var(--border))' }}>
                  cloudflared is not installed. Install it, then Refresh status.
                  {tunnel.install_hint && <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px]" style={{ color: 'var(--text)' }}>{tunnel.install_hint}</pre>}
                </div>
              )}

              {tunnel?.running && tunnel.payload_url && (
                <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  GitHub payload URL
                  <input readOnly value={tunnel.payload_url} onFocus={e => e.currentTarget.select()}
                    className="mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--ok)' }} />
                </label>
              )}

              {tunnel?.command && (
                <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  Command {tunnel.running ? 'running' : 'to run yourself'}
                  <input readOnly value={tunnel.command} onFocus={e => e.currentTarget.select()}
                    className="mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </label>
              )}

              {tunnel?.last_error && (
                <div className="text-[11px]" style={{ color: 'var(--danger, #ef4444)' }}>Tunnel: {tunnel.last_error}</div>
              )}

              {tunnel && tunnel.installed && !tunnel.running && tunnel.receiver_ready === false && (
                <div className="rounded px-2 py-1.5 text-[11px]" style={{ color: 'var(--warn)', border: '1px solid color-mix(in srgb, var(--warn) 40%, var(--border))' }}>
                  Won't expose the port until the receiver is ready: {RECEIVER_BLOCK_LABELS[tunnel.receiver_block_reason || ''] || tunnel.receiver_block_reason}
                </div>
              )}

              <div className="flex gap-2">
                {!tunnel?.running
                  ? <button onClick={() => void startTunnel()} disabled={tunnelBusy || !tunnel?.installed || tunnel?.receiver_ready === false}
                      className="text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40"
                      style={{ background: 'var(--accent)', color: 'var(--bg)' }}>{tunnelBusy ? 'Starting…' : 'Start tunnel'}</button>
                  : <button onClick={() => void stopTunnel()} disabled={tunnelBusy}
                      className="text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40"
                      style={{ background: 'var(--danger, #ef4444)', color: 'var(--bg)' }}>{tunnelBusy ? 'Stopping…' : 'Stop tunnel'}</button>}
                <button onClick={() => void refreshTunnel()} disabled={tunnelBusy}
                  className="text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50" style={{ color: 'var(--muted)' }}>Refresh</button>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                Exposes only the receiver's <code>/github</code> route; every delivery is HMAC-verified. Quick-tunnel URLs change each restart — update the GitHub payload URL when it does.
              </p>

              <label className="flex items-start gap-2 mt-1 cursor-pointer" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={autosync} disabled={!view?.editable}
                  onChange={e => setAutosync(e.target.checked)} className="mt-0.5" />
                <span className="text-[11px]">
                  <span className="font-medium">Auto-sync the GitHub webhook URL</span> — on tunnel start, re-point each allowed repo's webhook to the new <code>…trycloudflare.com/github</code> URL via <code>gh</code>. Only rewrites a hook already on a quick-tunnel host (a hand-set stable URL is never touched). Save to apply.
                </span>
              </label>
              {tunnel?.autosync && tunnel.autosync.enabled && (
                <div className="text-[10px]" style={{ color: tunnel.autosync.error ? 'var(--danger, #ef4444)' : 'var(--ok)' }}>
                  {tunnel.autosync.error
                    ? `Auto-sync failed: ${tunnel.autosync.error}`
                    : `Auto-synced ${(tunnel.autosync.results || []).filter(r => r.action === 'updated').length} hook(s) → ${tunnel.autosync.payload_url}`}
                </div>
              )}
            </div>

            <div data-automation-crons className="rounded-md p-3 flex flex-col gap-2"
              style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Automation crons</span>
                {crons && crons.available && (
                  <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ color: crons.all_paused ? 'var(--warn)' : 'var(--ok)', border: '1px solid var(--border)' }}>
                    {crons.all_paused ? 'paused' : crons.any_active ? 'running' : '—'}
                  </span>
                )}
              </div>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                DLC-YOLO's three background jobs (advance · spawns · backlog-intake). Pause them for a webhook-only or maintenance setup; the webhook receiver keeps working while paused (a verified delivery still wakes advance when resumed). Polling stops while paused.
              </p>

              {crons && !crons.available && (
                <div className="text-[11px]" style={{ color: 'var(--danger, #ef4444)' }}>
                  Cron control unavailable{crons.error ? `: ${crons.error}` : ''}.
                </div>
              )}

              {crons && crons.available && crons.jobs.length > 0 && (
                <div className="flex flex-col gap-1">
                  {crons.jobs.map(j => (
                    <div key={j.id} className="flex items-center justify-between text-[11px] font-mono"
                      style={{ color: 'var(--muted)' }}>
                      <span>{j.basename}</span>
                      <span style={{ color: j.paused ? 'var(--warn)' : 'var(--ok)' }}>{j.paused ? 'paused' : 'active'}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => void setCronsPaused(true)} disabled={cronsBusy || !crons?.available || crons?.all_paused}
                  className="text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40"
                  style={{ background: 'var(--warn)', color: 'var(--bg)' }}>{cronsBusy ? '…' : 'Pause all'}</button>
                <button onClick={() => void setCronsPaused(false)} disabled={cronsBusy || !crons?.available || crons?.any_active}
                  className="text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}>{cronsBusy ? '…' : 'Resume all'}</button>
                <button onClick={() => void refreshCrons()} disabled={cronsBusy}
                  className="text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50" style={{ color: 'var(--muted)' }}>Refresh</button>
              </div>
            </div>
          </>}

          {error && <div className="rounded-md px-3 py-2 text-[11px]" style={{ color: 'var(--danger, #ef4444)', border: '1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))' }}>{error}</div>}
        </div>

        <footer className="px-4 py-3 flex justify-between gap-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
          <button onClick={() => void refresh()} disabled={loading || saving} className="text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50" style={{ color: 'var(--muted)' }}>Refresh status</button>
          {view?.editable && <button onClick={() => void save()} disabled={!formValid || saving}
            className="text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}>{saving ? 'Applying…' : 'Save & apply'}</button>}
        </footer>
      </section>
  )
}

export function DlcYoloControls({ repos, selectedRepos, onNewPipeline, onConfigure, onOpenAgents }: {
  repos: string[]
  selectedRepos: string[]
  onNewPipeline: () => void
  onConfigure: (repo: string) => void
  onOpenAgents: () => void
}) {
  const { openChat } = useChatLauncher()
  const target = selectedRepos.length === 1 ? selectedRepos[0] : repos.length === 1 ? repos[0] : ''
  const command = '/dlc-yolo'
  const buttonClass = 'text-[10px] leading-none px-1.5 py-1 rounded font-semibold'

  return <>
    <div data-dlc-command-controls className="mb-4 flex min-h-6 items-center justify-end gap-1.5 flex-wrap">
      <button onClick={() => openChat({ message: command })} title="Open the DLC-YOLO command session; choose the next command action there"
        className={buttonClass} style={{ background: 'var(--accent)', color: 'var(--bg)' }}>✨ Command session</button>
      <button onClick={() => target ? onConfigure(target) : onNewPipeline()}
        className={buttonClass} style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>{target ? 'Edit pipeline' : 'New pipeline'}</button>
      <button onClick={onOpenAgents}
        className={buttonClass} style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>Agent config</button>
      {target && <span className="text-[10px] truncate max-w-[300px]" style={{ color: 'var(--muted)' }}>Target: {target}</span>}
    </div>
  </>
}
