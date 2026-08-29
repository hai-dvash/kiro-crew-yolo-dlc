import { useAppApi } from '@kirocrew/app-sdk'
import { Card, CardTitle, PageHeader, StatCard } from '@kirocrew/app-sdk/ui'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// --- Types ---
type Trust = 'manual' | 'assisted' | 'autonomous'
type Depth = 'quick' | 'standard' | 'deep'

interface ParkedIdea {
  id: string
  note: string
  issue_url?: string
  at: string
  phase?: string
}

interface PipelineCard {
  id: string
  title: string
  stage: string
  trust?: Trust
  depth?: Depth
  source: { type?: string; repo?: string; issue?: number; url?: string }
  created_at: string
  updated_at: string
  artifacts: Record<string, unknown>
  gate_history: Array<{ gate: string; decision: string; at: string; notes: string }>
  trigger_history?: Array<{ phase: string; trigger: string; at: string }>
  parked?: ParkedIdea[]
  history: Array<{ from: string; to: string; at: string; agent: string }>
}

interface PipelineConfig { trust: Trust; depth: Depth }

// --- Constants ---
const STAGES = [
  'intake', 'requirements', 'gate-spec', 'design', 'tasks',
  'gate-impl', 'implement', 'review', 'gate-review', 'pr', 'done'
] as const

type Stage = typeof STAGES[number]

const STAGE_LABELS: Record<Stage, string> = {
  'intake': 'Intake',
  'requirements': 'Requirements',
  'gate-spec': 'Gate: Spec',
  'design': 'Design',
  'tasks': 'Tasks',
  'gate-impl': 'Gate: Impl',
  'implement': 'Implement',
  'review': 'Review',
  'gate-review': 'Gate: Review',
  'pr': 'PR',
  'done': 'Done',
}

const STAGE_AGENTS: Record<Stage, string> = {
  'intake': 'orchestrator',
  'requirements': 'spec-agent',
  'gate-spec': 'human',
  'design': 'design-agent',
  'tasks': 'impl-agent',
  'gate-impl': 'human',
  'implement': 'impl-agent',
  'review': 'review-agent',
  'gate-review': 'human',
  'pr': 'orchestrator',
  'done': 'done',
}

const GATE_STAGES = new Set<string>(['gate-spec', 'gate-impl', 'gate-review'])

const TRUST_LEVELS: Trust[] = ['manual', 'assisted', 'autonomous']
const DEPTH_LEVELS: Depth[] = ['quick', 'standard', 'deep']
const DEFAULT_CONFIG: PipelineConfig = { trust: 'assisted', depth: 'standard' }

// Mode badge accent colors — pull from theme tokens where sensible.
const TRUST_TOKEN: Record<Trust, string> = {
  manual: 'var(--info)',
  assisted: 'var(--accent)',
  autonomous: 'var(--danger)',
}
const DEPTH_TOKEN: Record<Depth, string> = {
  quick: 'var(--ok)',
  standard: 'var(--muted)',
  deep: 'var(--warn)',
}

type ViewMode = 'pipeline' | 'workspace' | 'crew' | 'status' | 'backlog'

// Small pill helper using theme tokens.
function Pill({ color, children, title, onClick, active }: {
  color: string; children: React.ReactNode; title?: string; onClick?: () => void; active?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        boxShadow: active ? `inset 0 0 0 1px color-mix(in srgb, ${color} 55%, transparent)` : 'none',
        opacity: onClick && !active ? 0.85 : 1,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {children}
    </button>
  )
}

// --- SVG Pipeline Header ---
function PipelineGraph({ cardsByStage, onNodeClick }: {
  cardsByStage: Record<string, PipelineCard[]>
  onNodeClick: (stage: Stage) => void
}) {
  const R = 16
  const D = 18
  const spacing = 76
  const svgWidth = STAGES.length * spacing + 44
  const svgHeight = 84
  const cy = 38

  const maxCount = Math.max(1, ...STAGES.map(s => cardsByStage[s]?.length || 0))

  const nodeColor = (stage: Stage): string => {
    const count = cardsByStage[stage]?.length || 0
    if (stage === 'done' && count > 0) return 'var(--ok)'
    if (GATE_STAGES.has(stage) && count > 0) return 'var(--warn)'
    if (count > 0) return 'var(--accent)'
    return 'var(--border-strong, var(--border))'
  }

  return (
    <div className="w-full overflow-x-auto mb-5 -mx-1 px-1">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto block"
        style={{ minWidth: svgWidth }}
      >
        <defs>
          <marker id="ah" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="var(--border-strong, var(--border))" />
          </marker>
          {/* Glow filter — reused, blur strength varies per node via stdDeviation set inline */}
          {STAGES.map(stage => {
            const count = cardsByStage[stage]?.length || 0
            if (count === 0) return null
            // glow radius scales with count relative to the busiest phase
            const dev = 2 + (count / maxCount) * 5
            return (
              <filter key={`f-${stage}`} id={`glow-${stage}`} x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation={dev} result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )
          })}
        </defs>

        {/* Connection lines */}
        {STAGES.slice(0, -1).map((stage, i) => {
          const x1 = 22 + i * spacing + (GATE_STAGES.has(stage) ? D : R)
          const x2 = 22 + (i + 1) * spacing - (GATE_STAGES.has(STAGES[i + 1]) ? D : R)
          return (
            <line key={`l-${stage}`} x1={x1} y1={cy} x2={x2} y2={cy}
              stroke="var(--border-strong, var(--border))" strokeWidth={1.5} markerEnd="url(#ah)" />
          )
        })}

        {/* Nodes */}
        {STAGES.map((stage, i) => {
          const cx = 22 + i * spacing
          const color = nodeColor(stage)
          const count = cardsByStage[stage]?.length || 0
          const isGate = GATE_STAGES.has(stage)
          const active = count > 0
          // fill intensity + glow scale with count
          const intensity = active ? 0.16 + (count / maxCount) * 0.30 : 0.05
          const glow = active ? `url(#glow-${stage})` : undefined
          return (
            <g key={stage} onClick={() => onNodeClick(stage)} style={{ cursor: 'pointer' }}>
              {/* halo ring — a soft glow disk behind active nodes */}
              {active && (
                <circle cx={cx} cy={cy} r={R + 3} fill={color}
                  style={{ filter: glow, opacity: 0.10 + (count / maxCount) * 0.22, transition: 'opacity .4s' }}>
                  <animate attributeName="opacity"
                    values={`${0.10 + (count / maxCount) * 0.22};${0.22 + (count / maxCount) * 0.28};${0.10 + (count / maxCount) * 0.22}`}
                    dur="2.8s" repeatCount="indefinite" />
                </circle>
              )}

              {isGate ? (
                <rect x={cx - D} y={cy - D} width={D * 2} height={D * 2}
                  fill={color} stroke={color} strokeWidth={1.75} rx={3}
                  transform={`rotate(45 ${cx} ${cy})`}
                  style={{ fillOpacity: intensity, filter: glow, transition: 'fill-opacity .3s, stroke .3s' }} />
              ) : (
                <circle cx={cx} cy={cy} r={R} fill={color} stroke={color} strokeWidth={1.75}
                  style={{ fillOpacity: intensity, filter: glow, transition: 'fill-opacity .3s, stroke .3s' }} />
              )}

              {/* count badge — glows with the node */}
              {count > 0 && (
                <>
                  <circle cx={cx + (isGate ? 13 : 12)} cy={cy - (isGate ? 13 : 12)} r={8.5} fill={color}
                    style={{ filter: glow }} />
                  <text x={cx + (isGate ? 13 : 12)} y={cy - (isGate ? 13 : 12)}
                    textAnchor="middle" dominantBaseline="central"
                    fill="var(--bg)" fontSize={9.5} fontWeight={800}>{count}</text>
                </>
              )}

              <text x={cx} y={cy + (isGate ? 32 : 30)} textAnchor="middle"
                fill={active ? 'var(--text)' : 'var(--muted)'} fontSize={9}
                fontWeight={active ? 600 : 500}>{STAGE_LABELS[stage]}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// --- View Tab Selector ---
function ViewTabs({ active, onChange, counts }: {
  active: ViewMode; onChange: (v: ViewMode) => void; counts: Record<string, number>
}) {
  const tabs: { id: ViewMode; label: string }[] = [
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'workspace', label: 'Workspace' },
    { id: 'crew', label: 'Crew' },
    { id: 'status', label: 'Status' },
    { id: 'backlog', label: 'Backlog' },
  ]
  return (
    <div className="flex gap-0.5 p-0.5 rounded-lg w-fit"
      style={{ background: 'var(--bg-elevated, var(--card))', border: '1px solid var(--border)' }}>
      {tabs.map(tab => {
        const isActive = active === tab.id
        const n = counts[tab.id]
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5"
            style={{
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? 'var(--bg)' : 'var(--muted)',
            }}>
            {tab.label}
            {n > 0 && (
              <span className="text-[10px] px-1 rounded-full font-semibold"
                style={{ background: isActive ? 'color-mix(in srgb, var(--bg) 25%, transparent)' : 'var(--bg-hover, var(--border))', color: isActive ? 'var(--bg)' : 'var(--muted)' }}>
                {n}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// --- Card Component ---
function PipelineCardItem({ card, config, onApprove, onReject, onCycleTrust, onCycleDepth }: {
  card: PipelineCard
  config: PipelineConfig
  onApprove?: () => void
  onReject?: () => void
  onCycleTrust?: () => void
  onCycleDepth?: () => void
}) {
  const isGate = card.stage.startsWith('gate-')
  const accent = isGate ? 'var(--warn)' : 'var(--border-strong, var(--border))'
  const effTrust = (card.trust || config.trust) as Trust
  const effDepth = (card.depth || config.depth) as Depth
  const parkedCount = card.parked?.length || 0

  return (
    <div
      className="rounded-lg p-2.5 transition-all duration-150"
      style={{
        background: 'var(--card)',
        color: 'var(--card-fg, var(--text))',
        border: '1px solid var(--border)',
        borderLeft: `2px solid ${accent}`,
      }}
    >
      <div className="text-[13px] font-medium leading-snug truncate" style={{ color: 'var(--text-strong, var(--text))' }}>
        {card.title}
      </div>
      {card.source?.repo && (
        <a
          href={card.source.url || undefined}
          target="_blank" rel="noreferrer"
          className="text-[11px] mt-0.5 inline-block truncate max-w-full hover:underline"
          style={{ color: 'var(--muted)' }}
        >
          {card.source.repo}{card.source.issue ? `#${card.source.issue}` : ''}
        </a>
      )}

      {/* Mode badges — click to cycle a per-card override */}
      <div className="mt-2 flex items-center gap-1 flex-wrap">
        <Pill color={TRUST_TOKEN[effTrust]} active={!!card.trust} onClick={onCycleTrust}
          title={`trust: ${effTrust}${card.trust ? ' (override)' : ' (inherited)'} — click to cycle`}>
          {effTrust}
        </Pill>
        <Pill color={DEPTH_TOKEN[effDepth]} active={!!card.depth} onClick={onCycleDepth}
          title={`depth: ${effDepth}${card.depth ? ' (override)' : ' (inherited)'} — click to cycle`}>
          {effDepth}
        </Pill>
        {parkedCount > 0 && (
          <Pill color="var(--warn)" title={`${parkedCount} parked idea(s)`}>⏸ {parkedCount}</Pill>
        )}
      </div>

      {isGate && onApprove && onReject && (
        <div className="mt-2.5 flex gap-1.5">
          <button
            className="text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85"
            style={{ background: 'var(--ok)', color: 'var(--bg)' }}
            onClick={onApprove}
          >
            Approve
          </button>
          <button
            className="text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85"
            style={{ background: 'var(--danger)', color: 'var(--bg)' }}
            onClick={onReject}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}

// --- Column wrapper ---
function ColumnGroup({ title, count, children, id }: {
  title: string; count: number; children: React.ReactNode; id?: string
}) {
  return (
    <div id={id} className="min-w-[210px] max-w-[240px] flex-shrink-0">
      <div className="flex items-center gap-2 mb-2 px-0.5 sticky top-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide truncate" style={{ color: 'var(--muted-strong, var(--muted))' }}>
          {title}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
          style={{ background: 'var(--bg-hover, var(--border))', color: 'var(--muted)' }}>
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {count === 0 ? (
          <div className="text-[11px] rounded-lg py-3 px-2 text-center"
            style={{ color: 'var(--muted)', border: '1px dashed var(--border)' }}>
            empty
          </div>
        ) : children}
      </div>
    </div>
  )
}

// --- Global mode bar ---
function ModeBar({ config, onSet }: {
  config: PipelineConfig
  onSet: (patch: Partial<PipelineConfig>) => void
}) {
  function Seg<T extends string>({ label, value, options, tokens, onPick }: {
    label: string; value: T; options: T[]; tokens: Record<string, string>; onPick: (v: T) => void
  }) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</span>
        <div className="flex gap-0.5 p-0.5 rounded-md" style={{ background: 'var(--bg-elevated, var(--card))', border: '1px solid var(--border)' }}>
          {options.map(opt => {
            const on = value === opt
            return (
              <button key={opt} onClick={() => onPick(opt)}
                className="text-[11px] px-2 py-0.5 rounded font-semibold transition-all"
                style={{
                  color: on ? tokens[opt] : 'var(--muted)',
                  background: on ? `color-mix(in srgb, ${tokens[opt]} 16%, transparent)` : 'transparent',
                  boxShadow: on ? `inset 0 0 0 1px color-mix(in srgb, ${tokens[opt]} 45%, transparent)` : 'none',
                }}>
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-5 flex-wrap mb-4 px-3 py-2 rounded-lg"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <span className="text-xs font-semibold" style={{ color: 'var(--muted-strong, var(--muted))' }}>Defaults</span>
      <Seg label="Trust" value={config.trust} options={TRUST_LEVELS} tokens={TRUST_TOKEN} onPick={(v) => onSet({ trust: v })} />
      <Seg label="Depth" value={config.depth} options={DEPTH_LEVELS} tokens={DEPTH_TOKEN} onPick={(v) => onSet({ depth: v })} />
      <span className="text-[10px] ml-auto" style={{ color: 'var(--muted)' }}>click a card badge to override per-card</span>
    </div>
  )
}

// --- Backlog view ---
function BacklogView({ cards }: { cards: PipelineCard[] }) {
  const parked = cards.flatMap(c =>
    (c.parked || []).map(p => ({ ...p, cardTitle: c.title, repo: c.source?.repo }))
  ).sort((a, b) => (b.at || '').localeCompare(a.at || ''))

  if (parked.length === 0) {
    return (
      <div className="rounded-lg p-6 text-center max-w-xl" style={{ border: '1px dashed var(--border)', color: 'var(--muted)' }}>
        <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>No parked ideas yet</div>
        <div className="text-xs mt-1">Agents file un-specable tangents here as <code style={{ color: 'var(--warn)' }}>dlc-backlog</code> issues on each card's owned repo. The intake cron back-feeds them as new cards.</div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      {parked.map(p => (
        <div key={p.id} className="rounded-lg p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderLeft: '2px solid var(--warn)' }}>
          <div className="text-[13px] font-medium" style={{ color: 'var(--text-strong, var(--text))' }}>{p.note}</div>
          <div className="text-[11px] mt-1 flex items-center gap-2 flex-wrap" style={{ color: 'var(--muted)' }}>
            <span>from <span style={{ color: 'var(--text)' }}>{p.cardTitle}</span></span>
            {p.phase && <span>· parked at {p.phase}</span>}
            {p.repo && <span>· {p.repo}</span>}
            {p.issue_url && (
              <a href={p.issue_url} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: 'var(--accent)' }}>view issue →</a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Repo / workspace scroller (left sidebar, multi-select) ---
function RepoScroller({ repos, selected, onToggle, onClear, onAddWorkspace }: {
  repos: { name: string; count: number }[]
  selected: Set<string>
  onToggle: (repo: string) => void
  onClear: () => void
  onAddWorkspace: () => void
}) {
  const total = repos.reduce((n, r) => n + r.count, 0)
  const allSelected = selected.size === 0 // empty set = viewing all

  const Row = ({ name, count, label, checked, onClick, isAll }: {
    name?: string; count: number; label: string; checked: boolean; onClick: () => void; isAll?: boolean
  }) => (
    <button
      onClick={onClick}
      className="w-full text-left px-2.5 py-2 rounded-md transition-all flex items-center gap-2"
      style={{
        background: checked ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'transparent',
        boxShadow: checked ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)' : 'none',
      }}
    >
      {/* checkbox (not shown for the All row) */}
      {!isAll ? (
        <span className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: checked ? 'var(--accent)' : 'transparent',
            border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border-strong, var(--border))'}`,
          }}>
          {checked && (
            <svg width="9" height="9" viewBox="0 0 10 10"><path d="M1 5l2.5 2.5L9 2" fill="none" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </span>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: checked ? 'var(--accent)' : 'var(--border-strong, var(--border))' }} />
      )}
      <span className="text-[12px] font-medium truncate flex-1"
        style={{ color: checked ? 'var(--text-strong, var(--text))' : 'var(--muted-strong, var(--muted))' }}>{label}</span>
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
        style={{ background: 'var(--bg-hover, var(--border))', color: 'var(--muted)' }}>{count}</span>
    </button>
  )

  return (
    <div className="flex-shrink-0 w-52 flex flex-col gap-1 pr-3 border-r self-stretch overflow-y-auto"
      style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-2.5 mb-1">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Workspaces</span>
        {selected.size > 0 && (
          <button onClick={onClear} className="text-[10px] hover:underline" style={{ color: 'var(--accent)' }}>clear</button>
        )}
      </div>

      <Row isAll count={total} label="All repos" checked={allSelected} onClick={onClear} />
      {repos.map(r => (
        <Row key={r.name} name={r.name} count={r.count}
          label={r.name.includes('/') ? r.name.split('/')[1] : r.name}
          checked={selected.has(r.name)} onClick={() => onToggle(r.name)} />
      ))}

      {/* + Add Workspace */}
      <button
        onClick={onAddWorkspace}
        className="mt-2 w-full px-2.5 py-2 rounded-md text-[12px] font-semibold flex items-center gap-2 transition-all"
        style={{ color: 'var(--accent)', border: '1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))' }}
      >
        <span className="text-[15px] leading-none">+</span> Add Workspace
      </button>
      {selected.size > 1 && (
        <div className="text-[10px] px-2.5 mt-1" style={{ color: 'var(--muted)' }}>
          Showing {selected.size} pipelines combined
        </div>
      )}
    </div>
  )
}

// --- Main Component ---
export default function SdlcPipeline() {
  const api = useAppApi()
  const [allCards, setAllCards] = useState<PipelineCard[]>([])
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('pipeline')
  const [repoFilter, setRepoFilter] = useState<Set<string>>(new Set())
  const kanbanRef = useRef<HTMLDivElement>(null)

  const fetchCards = useCallback(async () => {
    try {
      const data = await api.get('/api/file-read?path=/tmp/dlc-yolo/state.json')
      setAllCards(data.cards || [])
      setConfig({ ...DEFAULT_CONFIG, ...(data.config || {}) })
    } catch (e) {
      console.error('Failed to fetch cards:', e)
    } finally {
      setLoading(false)
    }
  }, [api])

  // Repo list (across ALL cards, unfiltered) for the scroller.
  const repoList = useMemo(() => {
    const m = new Map<string, number>()
    allCards.forEach(c => {
      const r = c.source?.repo || 'unlinked'
      m.set(r, (m.get(r) || 0) + 1)
    })
    return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [allCards])

  // Cards scoped to the selected repos (empty set = all repos).
  const cards = useMemo(
    () => repoFilter.size === 0 ? allCards : allCards.filter(c => repoFilter.has(c.source?.repo || 'unlinked')),
    [allCards, repoFilter]
  )

  useEffect(() => {
    fetchCards()
    const interval = setInterval(fetchCards, 10000)
    return () => clearInterval(interval)
  }, [fetchCards])

  const advanceCard = useCallback(async (cardId: string) => {
    try {
      const state = await api.get('/api/file-read?path=/tmp/dlc-yolo/state.json')
      const card = state.cards?.find((c: PipelineCard) => c.id === cardId)
      if (!card) return
      const idx = STAGES.indexOf(card.stage as Stage)
      if (idx < 0 || idx >= STAGES.length - 1) return
      const prevStage = card.stage
      card.stage = STAGES[idx + 1]
      card.updated_at = new Date().toISOString()
      card.gate_history = card.gate_history || []
      card.gate_history.push({ gate: prevStage, decision: 'approved', at: card.updated_at, notes: '' })
      card.history = card.history || []
      card.history.push({ from: prevStage, to: card.stage, at: card.updated_at, agent: 'human' })
      await api.post('/api/file-write', { path: '/tmp/dlc-yolo/state.json', content: JSON.stringify(state, null, 2) })
      fetchCards()
    } catch (e) {
      console.error('Failed to advance card:', e)
    }
  }, [api, fetchCards])

  const rejectCard = useCallback(async (cardId: string) => {
    try {
      const state = await api.get('/api/file-read?path=/tmp/dlc-yolo/state.json')
      const card = state.cards?.find((c: PipelineCard) => c.id === cardId)
      if (!card) return
      const idx = STAGES.indexOf(card.stage as Stage)
      if (idx <= 0) return
      const prevStage = card.stage
      let target = idx - 1
      while (target > 0 && GATE_STAGES.has(STAGES[target])) target--
      card.stage = STAGES[target]
      card.updated_at = new Date().toISOString()
      card.gate_history = card.gate_history || []
      card.gate_history.push({ gate: prevStage, decision: 'rejected', at: card.updated_at, notes: '' })
      card.history = card.history || []
      card.history.push({ from: prevStage, to: card.stage, at: card.updated_at, agent: 'human' })
      await api.post('/api/file-write', { path: '/tmp/dlc-yolo/state.json', content: JSON.stringify(state, null, 2) })
      fetchCards()
    } catch (e) {
      console.error('Failed to reject card:', e)
    }
  }, [api, fetchCards])

  const mutateState = useCallback(async (mutator: (state: { config?: PipelineConfig; cards: PipelineCard[] }) => void) => {
    try {
      const state = await api.get('/api/file-read?path=/tmp/dlc-yolo/state.json')
      state.cards = state.cards || []
      mutator(state)
      await api.post('/api/file-write', { path: '/tmp/dlc-yolo/state.json', content: JSON.stringify(state, null, 2) })
      fetchCards()
    } catch (e) {
      console.error('Failed to mutate state:', e)
    }
  }, [api, fetchCards])

  const setPipelineConfig = useCallback((patch: Partial<PipelineConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }))
    mutateState(state => { state.config = { ...DEFAULT_CONFIG, ...(state.config || {}), ...patch } })
  }, [mutateState])

  const cycleTrust = useCallback((cardId: string) => {
    mutateState(state => {
      const card = state.cards.find(c => c.id === cardId)
      if (!card) return
      const base = (card.trust || state.config?.trust || DEFAULT_CONFIG.trust) as Trust
      card.trust = TRUST_LEVELS[(TRUST_LEVELS.indexOf(base) + 1) % TRUST_LEVELS.length]
      card.updated_at = new Date().toISOString()
    })
  }, [mutateState])

  const cycleDepth = useCallback((cardId: string) => {
    mutateState(state => {
      const card = state.cards.find(c => c.id === cardId)
      if (!card) return
      const base = (card.depth || state.config?.depth || DEFAULT_CONFIG.depth) as Depth
      card.depth = DEPTH_LEVELS[(DEPTH_LEVELS.indexOf(base) + 1) % DEPTH_LEVELS.length]
      card.updated_at = new Date().toISOString()
    })
  }, [mutateState])

  const toggleRepo = useCallback((repo: string) => {
    setRepoFilter(prev => {
      const next = new Set(prev)
      next.has(repo) ? next.delete(repo) : next.add(repo)
      return next
    })
  }, [])

  const clearRepos = useCallback(() => setRepoFilter(new Set()), [])

  // + Add Workspace: pick from REAL KiroCrew workspaces (saved locations in config.json),
  // then register the chosen workspace by seeding an intake card scoped to its dir.
  const addWorkspace = useCallback(async () => {
    let known: { name: string; dir: string }[] = []
    try {
      const cfg = await api.get('/api/file-read?path=~/.kiro/crew/config.json')
      const ws = cfg?.workspaces || {}
      known = Object.entries(ws).map(([name, v]: [string, any]) => ({ name, dir: v?.dir || name }))
    } catch (e) {
      console.warn('Could not read KiroCrew workspaces registry:', e)
    }

    let repo: string | undefined
    if (known.length > 0) {
      const list = known.map((w, i) => `${i + 1}. ${w.name}  (${w.dir})`).join('\n')
      const pick = window.prompt(
        `Add a workspace — pick a KiroCrew workspace by number, or type owner/name:\n\n${list}`
      )?.trim()
      if (!pick) return
      const asNum = Number(pick)
      if (Number.isInteger(asNum) && asNum >= 1 && asNum <= known.length) {
        repo = known[asNum - 1].name
      } else {
        repo = pick
      }
    } else {
      repo = window.prompt('Add a workspace (owner/name or KiroCrew workspace name):')?.trim()
      if (!repo) return
    }

    const now = new Date().toISOString()
    const chosen = known.find(w => w.name === repo)
    await mutateState(state => {
      const exists = state.cards.some(c => (c.source?.repo || '') === repo)
      if (!exists) {
        state.cards.push({
          id: 'card-' + Math.random().toString(36).slice(2, 10),
          title: `New workspace: ${repo}`,
          stage: 'intake',
          source: {
            type: chosen ? 'workspace' : 'github',
            repo: repo!,
            url: chosen ? chosen.dir : `https://github.com/${repo}`,
          },
          created_at: now, updated_at: now,
          artifacts: {}, gate_history: [], trigger_history: [], parked: [], history: [],
        } as PipelineCard)
      }
    })
    setRepoFilter(new Set([repo!]))
  }, [api, mutateState])

  const cardsByStage = useMemo(() => {
    return STAGES.reduce((acc, stage) => {
      acc[stage] = cards.filter(c => c.stage === stage)
      return acc
    }, {} as Record<string, PipelineCard[]>)
  }, [cards])

  const scrollToStage = useCallback((stage: Stage) => {
    document.getElementById(`stage-col-${stage}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [])

  const workspaceGroups = useMemo(() => {
    const g: Record<string, PipelineCard[]> = {}
    cards.forEach(c => { const k = c.source?.repo || 'unlinked'; (g[k] ||= []).push(c) })
    return g
  }, [cards])

  const crewGroups = useMemo(() => {
    const g: Record<string, PipelineCard[]> = {}
    cards.forEach(c => { const k = STAGE_AGENTS[c.stage as Stage] || 'unknown'; (g[k] ||= []).push(c) })
    return g
  }, [cards])

  const statusGroups = useMemo(() => {
    const blocked: PipelineCard[] = [], inFlight: PipelineCard[] = [], done: PipelineCard[] = []
    cards.forEach(c => {
      if (c.stage === 'done') done.push(c)
      else if (GATE_STAGES.has(c.stage)) blocked.push(c)
      else inFlight.push(c)
    })
    return { 'Blocked at Gate': blocked, 'In-Flight (Auto)': inFlight, 'Done': done }
  }, [cards])

  const activeCount = cards.filter(c => c.stage !== 'done').length
  const gatedCount = cards.filter(c => c.stage.startsWith('gate-')).length
  const doneCount = cards.filter(c => c.stage === 'done').length
  const parkedTotal = cards.reduce((n, c) => n + (c.parked?.length || 0), 0)

  const tabCounts: Record<string, number> = {
    pipeline: cards.length,
    workspace: Object.keys(workspaceGroups).length,
    crew: Object.keys(crewGroups).length,
    status: cards.length,
    backlog: parkedTotal,
  }

  const cardProps = (card: PipelineCard) => ({
    card, config,
    onApprove: card.stage.startsWith('gate-') ? () => advanceCard(card.id) : undefined,
    onReject: card.stage.startsWith('gate-') ? () => rejectCard(card.id) : undefined,
    onCycleTrust: () => cycleTrust(card.id),
    onCycleDepth: () => cycleDepth(card.id),
  })

  return (
    <>
      <PageHeader title="DLC-YOLO" subtitle="Autonomous SDLC pipeline with human gates" />
      <div className="px-6 pb-8 overflow-y-auto flex-1 min-h-0">
        <PipelineGraph cardsByStage={cardsByStage} onNodeClick={scrollToStage} />

        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-5">
          <StatCard label="Active" value={String(activeCount)} accent />
          <StatCard label="Gated" value={String(gatedCount)} />
          <StatCard label="Done" value={String(doneCount)} />
          <StatCard label="Parked" value={String(parkedTotal)} />
        </div>

        {/* Sidebar + board */}
        <div className="flex gap-4 items-start">
          <RepoScroller
            repos={repoList}
            selected={repoFilter}
            onToggle={toggleRepo}
            onClear={clearRepos}
            onAddWorkspace={addWorkspace}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <ViewTabs active={view} onChange={setView} counts={tabCounts} />
              {repoFilter.size > 0 && (
                <span className="text-[11px] px-2 py-1 rounded-md font-medium"
                  style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
                  {repoFilter.size === 1 ? [...repoFilter][0] : `${repoFilter.size} workspaces`} · <button onClick={clearRepos} className="underline hover:opacity-80">clear</button>
                </span>
              )}
            </div>

            <ModeBar config={config} onSet={setPipelineConfig} />

            {loading ? (
              <div className="text-sm p-3" style={{ color: 'var(--muted)' }}>Loading pipeline…</div>
            ) : view === 'backlog' ? (
              <BacklogView cards={cards} />
            ) : (
              <div ref={kanbanRef} className="flex gap-3 overflow-x-auto pb-4">
                {view === 'pipeline' && STAGES.map(stage => (
                  <ColumnGroup key={stage} id={`stage-col-${stage}`} title={STAGE_LABELS[stage]} count={cardsByStage[stage].length}>
                    {cardsByStage[stage].map(card => <PipelineCardItem key={card.id} {...cardProps(card)} />)}
                  </ColumnGroup>
                ))}

                {view === 'workspace' && Object.entries(workspaceGroups).map(([repo, rc]) => (
                  <ColumnGroup key={repo} title={repo} count={rc.length}>
                    {rc.map(card => <PipelineCardItem key={card.id} {...cardProps(card)} />)}
                  </ColumnGroup>
                ))}

            {view === 'crew' && Object.entries(crewGroups).map(([agent, ac]) => (
              <ColumnGroup key={agent} title={agent} count={ac.length}>
                {ac.map(card => <PipelineCardItem key={card.id} {...cardProps(card)} />)}
              </ColumnGroup>
            ))}

            {view === 'status' && Object.entries(statusGroups).map(([label, gc]) => (
              <ColumnGroup key={label} title={label} count={gc.length}>
                {gc.map(card => <PipelineCardItem key={card.id} {...cardProps(card)} />)}
              </ColumnGroup>
            ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
