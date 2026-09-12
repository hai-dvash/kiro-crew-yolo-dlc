import { useEffect, useMemo, useState } from 'react'

export interface AgentProfile {
  name: string
  description?: string
  prompt?: string
  model?: string
  tools: string[]
  allowedTools: string[]
  resources: string[]
  mcpServers: string[]
  status: 'loaded' | 'unavailable'
  sourcePath?: string
}

export interface CrewRecord {
  name: string
  kiroAgent?: string
  workspace?: string
  memoryStore?: string
  model?: string
  description?: string
  triggers: string[]
  source?: string
}

export interface CrewRouteDraft {
  mode: 'create' | 'update'
  name: string
  kiroAgent: string
  workspace?: string
  memoryStore?: string
}

const SAFE_ROUTE_NAME = /^[A-Za-z0-9._-]{1,128}$/

function TokenList({ values, empty = 'none declared' }: { values: string[]; empty?: string }) {
  if (!values.length) return <span className="text-[11px] italic" style={{ color: 'var(--muted)' }}>{empty}</span>
  return <div className="flex flex-wrap gap-1">
    {values.map(value => <code key={value} className="text-[10px] px-1.5 py-0.5 rounded"
      style={{ color: 'var(--text)', background: 'var(--bg-hover, var(--border))', border: '1px solid var(--border)' }}>{value}</code>)}
  </div>
}

function Fact({ label, value }: { label: string; value?: string }) {
  return <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-[11px]">
    <span className="uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</span>
    <span className="break-words" style={{ color: value ? 'var(--text)' : 'var(--muted)' }}>{value || 'not set'}</span>
  </div>
}

function CrewRouteEditor({ profiles, initial, onSave, onClose }: {
  profiles: AgentProfile[]
  initial?: CrewRecord
  onSave: (draft: CrewRouteDraft) => Promise<void>
  onClose: () => void
}) {
  const mode: CrewRouteDraft['mode'] = initial ? 'update' : 'create'
  const [name, setName] = useState(initial?.name || '')
  const [kiroAgent, setKiroAgent] = useState(initial?.kiroAgent || profiles.find(profile => profile.status === 'loaded')?.name || '')
  const [workspace, setWorkspace] = useState(initial?.workspace || '')
  const [memoryStore, setMemoryStore] = useState(initial?.memoryStore || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const valid = SAFE_ROUTE_NAME.test(name.trim()) && SAFE_ROUTE_NAME.test(kiroAgent.trim())
    && new TextEncoder().encode(workspace.trim()).length <= 256
    && new TextEncoder().encode(memoryStore.trim()).length <= 256

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError('')
    try {
      await onSave({
        mode,
        name: name.trim(),
        kiroAgent: kiroAgent.trim(),
        workspace: workspace.trim() || undefined,
        memoryStore: memoryStore.trim() || undefined,
      })
    } catch (cause: any) {
      setError(cause?.message || String(cause))
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
    style={{ background: 'color-mix(in srgb, black 68%, transparent)', backdropFilter: 'blur(3px)' }}
    onMouseDown={event => { if (event.currentTarget === event.target && !saving) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="crew-route-editor-title" className="w-full max-w-lg rounded-xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
      <header className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="min-w-0 flex-1">
          <h3 id="crew-route-editor-title" className="text-[15px] font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>{mode === 'create' ? 'New global crew route' : `Edit ${initial?.name}`}</h3>
          <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>UI-managed routing record backed by the sanctioned KiroCrew agent CLI—no chat handoff.</p>
        </div>
        <button onClick={onClose} disabled={saving} aria-label="Close crew route editor" className="w-8 h-8 rounded-lg text-lg disabled:opacity-40"
          style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>×</button>
      </header>
      <div className="px-5 py-4 flex flex-col gap-3.5">
        <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Crew name
          <input value={name} onChange={event => setName(event.target.value)} disabled={mode === 'update'} placeholder="e.g. dlcyolo-secure-review"
            className="mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none disabled:opacity-60"
            style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </label>
        <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Kiro agent authority profile
          <input list="dlc-agent-profile-options" value={kiroAgent} onChange={event => setKiroAgent(event.target.value)} placeholder="dlcyolo-readonly"
            className="mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none"
            style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
          <datalist id="dlc-agent-profile-options">{profiles.map(profile => <option key={profile.name} value={profile.name} />)}</datalist>
        </label>
        <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Workspace <span className="normal-case tracking-normal">(optional)</span>
          <input value={workspace} onChange={event => setWorkspace(event.target.value)} placeholder={mode === 'update' ? 'Blank keeps the current value' : 'Default workspace'}
            className="mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none"
            style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </label>
        <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Memory store <span className="normal-case tracking-normal">(optional)</span>
          <input value={memoryStore} onChange={event => setMemoryStore(event.target.value)} placeholder={mode === 'update' ? 'Blank keeps the current value' : 'Default memory store'}
            className="mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none"
            style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </label>
        <div className="text-[10px] rounded-md p-2.5" style={{ color: 'var(--muted)', border: '1px solid var(--border)', background: 'var(--bg-elevated, var(--bg))' }}>
          This edits the global crew → <code>kiro_agent</code> route. Profile prompts, tools, and approval policy remain source-managed declarations; pipeline-local objectives stay in Pipeline Setup.
        </div>
        {error && <div className="text-[11px] rounded-md px-3 py-2" style={{ color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 35%, var(--border))' }}>{error}</div>}
      </div>
      <footer className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated, var(--bg))' }}>
        <button onClick={onClose} disabled={saving} className="text-[11px] px-3 py-1.5 rounded-md disabled:opacity-40" style={{ color: 'var(--muted)' }}>Cancel</button>
        <button onClick={() => void submit()} disabled={!valid || saving} className="text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}>{saving ? 'Saving…' : mode === 'create' ? 'Create crew route' : 'Save crew route'}</button>
      </footer>
    </section>
  </div>
}

export function AgentCrewCatalogModal({ profiles, crews, loading = false, context, onRefresh, onClose, onSelectProfile, onSelectCrew, onSaveCrew }: {
  profiles: AgentProfile[]
  crews: CrewRecord[]
  loading?: boolean
  context?: string
  onRefresh?: () => void
  onClose: () => void
  onSelectProfile?: (profile: AgentProfile) => void
  onSelectCrew?: (crew: CrewRecord) => void
  onSaveCrew?: (draft: CrewRouteDraft) => Promise<void>
}) {
  const [tab, setTab] = useState<'agents' | 'crews'>('agents')
  const [selectedProfileName, setSelectedProfileName] = useState(profiles[0]?.name || '')
  const [selectedCrewName, setSelectedCrewName] = useState(crews[0]?.name || '')
  const [routeEditor, setRouteEditor] = useState<{ mode: 'create' } | { mode: 'update'; crew: CrewRecord } | null>(null)

  useEffect(() => {
    if (!profiles.some(profile => profile.name === selectedProfileName)) setSelectedProfileName(profiles[0]?.name || '')
  }, [profiles, selectedProfileName])
  useEffect(() => {
    if (!crews.some(crew => crew.name === selectedCrewName)) setSelectedCrewName(crews[0]?.name || '')
  }, [crews, selectedCrewName])

  const profile = profiles.find(item => item.name === selectedProfileName)
  const crew = crews.find(item => item.name === selectedCrewName)
  const linkedProfile = useMemo(
    () => crew?.kiroAgent ? profiles.find(item => item.name === crew.kiroAgent) : undefined,
    [crew, profiles],
  )
  const promptPreview = profile?.prompt
    ? profile.prompt.length > 1200 ? `${profile.prompt.slice(0, 1200)}…` : profile.prompt
    : ''

  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    style={{ background: 'color-mix(in srgb, black 62%, transparent)', backdropFilter: 'blur(2px)' }}
    onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="agent-crew-catalog-title"
      className="w-full max-w-4xl rounded-xl overflow-hidden flex flex-col"
      style={{ height: 'min(78vh, 760px)', background: 'var(--card)', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}>
      <header className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="min-w-0 flex-1">
          <h2 id="agent-crew-catalog-title" className="text-base font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>Agents &amp; crews</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
            KiroCrew agent templates define prompts/tools/approval policy. Global crew records route to one template plus workspace and memory.
          </p>
          {context && <p className="text-[10px] mt-1" style={{ color: 'var(--accent)' }}>Pipeline context: {context}</p>}
        </div>
        {onRefresh && <button onClick={onRefresh} disabled={loading} className="text-[11px] px-2.5 py-1.5 rounded-md disabled:opacity-50"
          style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>{loading ? 'Refreshing…' : 'Refresh'}</button>}
        {onSaveCrew && <button onClick={() => { setTab('crews'); setRouteEditor({ mode: 'create' }) }} className="text-[11px] px-2.5 py-1.5 rounded-md font-semibold"
          style={{ color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 45%, var(--border))' }}>+ New crew route</button>}
        <button onClick={onClose} aria-label="Close agents and crews" className="w-8 h-8 rounded-lg text-lg leading-none"
          style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>×</button>
      </header>

      <div className="px-5 pt-3 flex gap-1" style={{ borderBottom: '1px solid var(--border)' }}>
        {([['agents', `Agent templates · ${profiles.length}`], ['crews', `Global crews · ${crews.length}`]] as const).map(([value, label]) => (
          <button key={value} onClick={() => setTab(value)} className="text-[12px] px-3 py-2 font-semibold"
            style={{ color: tab === value ? 'var(--accent)' : 'var(--muted)', borderBottom: `2px solid ${tab === value ? 'var(--accent)' : 'transparent'}`, marginBottom: -1 }}>{label}</button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {tab === 'agents' ? <>
          <aside className="w-60 flex-shrink-0 overflow-y-auto p-2" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-elevated, var(--bg))' }}>
            {profiles.map(item => <button key={item.name} onClick={() => setSelectedProfileName(item.name)}
              className="w-full text-left px-3 py-2 rounded-md mb-1"
              style={{ background: item.name === selectedProfileName ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'transparent', color: item.name === selectedProfileName ? 'var(--accent)' : 'var(--text)' }}>
              <div className="text-[12px] font-semibold truncate">{item.name}</div>
              <div className="text-[9px] mt-0.5" style={{ color: item.status === 'loaded' ? 'var(--ok)' : 'var(--warn)' }}>{item.status === 'loaded' ? 'config loaded' : 'config unavailable'}</div>
            </button>)}
            {!profiles.length && <div className="p-3 text-[11px] italic" style={{ color: 'var(--muted)' }}>No referenced profiles.</div>}
          </aside>
          <main className="flex-1 min-w-0 overflow-y-auto p-5">
            {profile ? <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>{profile.name}</div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>{profile.description || 'No description declared.'}</div>
                </div>
                {onSelectProfile && <button onClick={() => onSelectProfile(profile)} disabled={profile.status !== 'loaded'}
                  className="text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}>Use for this step</button>}
              </div>
              <div className="rounded-lg p-3 flex flex-col gap-2" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated, var(--bg))' }}>
                <Fact label="Model" value={profile.model || 'auto / provider default'} />
                <Fact label="Config source" value={profile.sourcePath} />
                <Fact label="Prompt" value={profile.prompt ? (profile.prompt.startsWith('file://') ? profile.prompt : 'inline prompt') : undefined} />
              </div>
              <section><div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Declared tools</div><TokenList values={profile.tools} /></section>
              <section><div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Auto-approved tools</div><TokenList values={profile.allowedTools} /></section>
              <section><div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Resources / skills</div><TokenList values={profile.resources} /></section>
              <section><div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>MCP servers</div><TokenList values={profile.mcpServers} /></section>
              {promptPreview && <details className="rounded-lg p-3" style={{ border: '1px solid var(--border)' }}>
                <summary className="text-[11px] cursor-pointer" style={{ color: 'var(--accent)' }}>Prompt preview</summary>
                <pre className="mt-2 text-[10px] whitespace-pre-wrap break-words max-h-56 overflow-y-auto" style={{ color: 'var(--muted)' }}>{promptPreview}</pre>
              </details>}
              <div className="text-[10px] rounded-md p-2.5" style={{ color: 'var(--muted)', background: 'color-mix(in srgb, var(--warn) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--warn) 28%, var(--border))' }}>
                These are declarations from disk, not proof that a live session loaded or applied them. Runtime handshake evidence remains authoritative for observed access.
              </div>
            </div> : <div className="text-[12px] italic" style={{ color: 'var(--muted)' }}>Select an agent template.</div>}
          </main>
        </> : <>
          <aside className="w-60 flex-shrink-0 overflow-y-auto p-2" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-elevated, var(--bg))' }}>
            {crews.map(item => <button key={item.name} onClick={() => setSelectedCrewName(item.name)}
              className="w-full text-left px-3 py-2 rounded-md mb-1"
              style={{ background: item.name === selectedCrewName ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'transparent', color: item.name === selectedCrewName ? 'var(--accent)' : 'var(--text)' }}>
              <div className="text-[12px] font-semibold truncate">{item.name}</div>
              <div className="text-[9px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>→ {item.kiroAgent || 'profile not declared'}</div>
            </button>)}
            {!crews.length && <div className="p-3 text-[11px] italic" style={{ color: 'var(--muted)' }}>No global crews found.</div>}
          </aside>
          <main className="flex-1 min-w-0 overflow-y-auto p-5">
            {crew ? <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>{crew.name}</div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>{crew.description || 'No description declared.'}</div>
                </div>
                {onSaveCrew && <button onClick={() => setRouteEditor({ mode: 'update', crew })}
                  className="text-[11px] px-3 py-1.5 rounded-md font-semibold"
                  style={{ color: 'var(--accent)', border: '1px solid var(--border)' }}>Edit route</button>}
                {onSelectCrew && <button onClick={() => onSelectCrew(crew)} className="text-[11px] px-3 py-1.5 rounded-md font-semibold"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}>Route step here</button>}
              </div>
              <div className="rounded-lg p-3 flex flex-col gap-2" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated, var(--bg))' }}>
                <Fact label="kiro_agent" value={crew.kiroAgent} />
                <Fact label="Workspace" value={crew.workspace} />
                <Fact label="Memory store" value={crew.memoryStore} />
                <Fact label="Model override" value={crew.model} />
                <Fact label="Source" value={crew.source} />
              </div>
              <section><div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Selection triggers</div><TokenList values={crew.triggers} /></section>
              {crew.kiroAgent && <div className="rounded-lg p-3" style={{ border: '1px solid var(--border)' }}>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Authority profile</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <code className="text-[12px]" style={{ color: 'var(--accent)' }}>{crew.kiroAgent}</code>
                  <span className="text-[10px]" style={{ color: linkedProfile?.status === 'loaded' ? 'var(--ok)' : 'var(--warn)' }}>{linkedProfile?.status === 'loaded' ? 'loaded' : 'unavailable'}</span>
                  <button onClick={() => { setSelectedProfileName(crew.kiroAgent || ''); setTab('agents') }} className="ml-auto text-[10px] px-2 py-1 rounded"
                    style={{ color: 'var(--accent)', border: '1px solid var(--border)' }}>View profile</button>
                </div>
              </div>}
              <div className="text-[10px] rounded-md p-2.5" style={{ color: 'var(--muted)', background: 'color-mix(in srgb, var(--accent) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 28%, var(--border))' }}>
                This crew entry is a thin global routing record. Its tools and approval policy come from the linked <code>kiro_agent</code> template; they are not duplicated on the crew.
              </div>
            </div> : <div className="text-[12px] italic" style={{ color: 'var(--muted)' }}>Select a global crew.</div>}
          </main>
        </>}
      </div>
    </section>
    {routeEditor && onSaveCrew && <CrewRouteEditor
      profiles={profiles}
      initial={routeEditor.mode === 'update' ? routeEditor.crew : undefined}
      onClose={() => setRouteEditor(null)}
      onSave={async draft => {
        await onSaveCrew(draft)
        setSelectedCrewName(draft.name)
        setRouteEditor(null)
      }}
    />}
  </div>
}
