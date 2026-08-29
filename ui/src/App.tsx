import { useAppApi, useChatLauncher } from '@kirocrew/app-sdk'
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
  pipeline_id?: string
  source: { type?: string; repo?: string; issue?: number; url?: string }
  created_at: string
  updated_at: string
  artifacts: Record<string, unknown>
  gate_history: Array<{ gate: string; decision: string; at: string; notes: string }>
  trigger_history?: Array<{ phase: string; trigger: string; at: string }>
  effort?: {
    features?: Array<{ id: string; note: string; size: string; points: number }>
    total?: number
    scope?: Record<string, number>
  }
  backstep_history?: Array<{ from: string; to: string; reason: string; at: string }>
  parked?: ParkedIdea[]
  history: Array<{ from: string; to: string; at: string; agent: string }>
}

interface PipelineConfig { trust: Trust; depth: Depth }

interface StepAgent { name: string; role?: string; tools?: string[] }
interface PipelineStep {
  id: string
  name: string
  type: 'agent' | 'gate'
  agent?: StepAgent
  trust?: Trust
  depth?: Depth
  label?: string
}

// Default step ladder the wizard seeds from (users edit freely per pipeline).
const DEFAULT_STEPS: PipelineStep[] = [
  { id: 'requirements', name: 'Requirements', type: 'agent', agent: { name: 'spec-agent', role: 'Produce requirements.md' } },
  { id: 'gate-spec', name: 'Gate: Spec', type: 'gate' },
  { id: 'design', name: 'Design', type: 'agent', agent: { name: 'design-agent', role: 'Produce design.md' } },
  { id: 'tasks', name: 'Tasks', type: 'agent', agent: { name: 'impl-agent', role: 'Break design into tasks' } },
  { id: 'gate-impl', name: 'Gate: Impl', type: 'gate' },
  { id: 'implement', name: 'Implement', type: 'agent', agent: { name: 'impl-agent', role: 'Write code + tests' } },
  { id: 'review', name: 'Review', type: 'agent', agent: { name: 'review-agent', role: 'Severity-ranked review' } },
  { id: 'gate-review', name: 'Gate: Review', type: 'gate' },
  { id: 'pr', name: 'PR', type: 'agent', agent: { name: 'orchestrator', role: 'Open/update PR' } },
]

interface Pipeline {
  id: string
  repo: string
  workspace?: string
  source?: 'issue-radar' | 'workspace' | 'manual'
  trust?: Trust
  depth?: Depth
  backlog_intake?: boolean
  sot?: 'github' | 'local'
  steps?: PipelineStep[]
  created_at: string
}

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
function PipelineGraph({ steps, cardsByStage, onNodeClick }: {
  steps: { id: string; name: string; type: 'agent' | 'gate' }[]
  cardsByStage: Record<string, PipelineCard[]>
  onNodeClick: (stage: string) => void
}) {
  const R = 16
  const D = 18
  const spacing = 76
  const svgWidth = steps.length * spacing + 44
  const svgHeight = 84
  const cy = 38

  const maxCount = Math.max(1, ...steps.map(s => cardsByStage[s.id]?.length || 0))
  const isGate = (s: { id: string; type: string }) => s.type === 'gate' || s.id.startsWith('gate-')

  const nodeColor = (s: { id: string; type: string }): string => {
    const count = cardsByStage[s.id]?.length || 0
    if (s.id === 'done' && count > 0) return 'var(--ok)'
    if (isGate(s) && count > 0) return 'var(--warn)'
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
          {steps.map(s => {
            const count = cardsByStage[s.id]?.length || 0
            if (count === 0) return null
            const dev = 2 + (count / maxCount) * 5
            return (
              <filter key={`f-${s.id}`} id={`glow-${s.id}`} x="-80%" y="-80%" width="260%" height="260%">
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
        {steps.slice(0, -1).map((s, i) => {
          const x1 = 22 + i * spacing + (isGate(s) ? D : R)
          const x2 = 22 + (i + 1) * spacing - (isGate(steps[i + 1]) ? D : R)
          return (
            <line key={`l-${s.id}`} x1={x1} y1={cy} x2={x2} y2={cy}
              stroke="var(--border-strong, var(--border))" strokeWidth={1.5} markerEnd="url(#ah)" />
          )
        })}

        {/* Nodes */}
        {steps.map((s, i) => {
          const cx = 22 + i * spacing
          const color = nodeColor(s)
          const count = cardsByStage[s.id]?.length || 0
          const gate = isGate(s)
          const active = count > 0
          const intensity = active ? 0.16 + (count / maxCount) * 0.30 : 0.05
          const glow = active ? `url(#glow-${s.id})` : undefined
          return (
            <g key={s.id} onClick={() => onNodeClick(s.id)} style={{ cursor: 'pointer' }}>
              {active && (
                <circle cx={cx} cy={cy} r={R + 3} fill={color}
                  style={{ filter: glow, opacity: 0.10 + (count / maxCount) * 0.22, transition: 'opacity .4s' }}>
                  <animate attributeName="opacity"
                    values={`${0.10 + (count / maxCount) * 0.22};${0.22 + (count / maxCount) * 0.28};${0.10 + (count / maxCount) * 0.22}`}
                    dur="2.8s" repeatCount="indefinite" />
                </circle>
              )}

              {gate ? (
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
                  <circle cx={cx + (gate ? 13 : 12)} cy={cy - (gate ? 13 : 12)} r={8.5} fill={color}
                    style={{ filter: glow }} />
                  <text x={cx + (gate ? 13 : 12)} y={cy - (gate ? 13 : 12)}
                    textAnchor="middle" dominantBaseline="central"
                    fill="var(--bg)" fontSize={9.5} fontWeight={800}>{count}</text>
                </>
              )}

              <text x={cx} y={cy + (gate ? 32 : 30)} textAnchor="middle"
                fill={active ? 'var(--text)' : 'var(--muted)'} fontSize={9}
                fontWeight={active ? 600 : 500}>{s.name}</text>
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
        {typeof card.effort?.total === 'number' && card.effort.total > 0 && (
          <Pill color="var(--info)" title={`estimated effort: ${card.effort.total} points`}>
            ⚡ {card.effort.total}
          </Pill>
        )}
        {card.backstep_history && card.backstep_history.length > 0 && (
          <Pill color="var(--danger)"
            title={`stepped back ${card.backstep_history.length}× — last: ${card.backstep_history[card.backstep_history.length - 1].reason}`}>
            ↩ {card.backstep_history.length}
          </Pill>
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
        <span className="text-[15px] leading-none">+</span> New Pipeline
      </button>
      {selected.size > 1 && (
        <div className="text-[10px] px-2.5 mt-1" style={{ color: 'var(--muted)' }}>
          Showing {selected.size} pipelines combined
        </div>
      )}
    </div>
  )
}

// --- Agent Setup Modal (nested from a step, or standalone to edit) ---
// Common built-in tools an agent step is likely to want (maps to KiroCrew agent `tools[]`).
const AGENT_TOOL_OPTIONS = [
  'read', 'write', 'shell', 'grep', 'code',
  'ask_question', 'spawn_run', 'task_run', 'send_message',
]

interface AgentDraft {
  name: string
  role?: string          // → agent `prompt`
  tools?: string[]
  model?: string         // '' / 'auto' → omit
  trust?: Trust          // step execution profile (DLC-YOLO)
  depth?: Depth
}

function AgentSetupPanel({ initial, knownAgents, repo, stepName, onSave, onClose }: {
  initial: AgentDraft
  knownAgents: string[]
  repo: string
  stepName: string
  onSave: (a: AgentDraft) => void
  onClose: () => void
}) {
  const { openChat } = useChatLauncher()
  const [name, setName] = useState(initial.name || '')
  const [role, setRole] = useState(initial.role || '')
  const [tools, setTools] = useState<string[]>(initial.tools || ['read'])
  const [model, setModel] = useState(initial.model || 'auto')
  const [trust, setTrust] = useState<Trust | ''>(initial.trust || '')
  const [depth, setDepth] = useState<Depth | ''>(initial.depth || '')

  const toggleTool = (t: string) => setTools(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  const valid = name.trim().length > 0

  return (
    <div className="flex flex-col h-full">
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} className="text-sm leading-none" style={{ color: 'var(--accent)' }}>← Steps</button>
          <div className="ml-1">
            <div className="text-sm font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>Configure Agent</div>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>This step's agent (KiroCrew agent config)</div>
          </div>
          <button
            onClick={() => openChat({ message:
              `/dlc-yolo\n\nHelp me design a NEW agent for a custom pipeline step.\n` +
              `Pipeline repo: ${repo || '(unset)'}\nStep: ${stepName || '(unnamed)'}\n\n` +
              `Ask me what the step should do, then propose an agent config (name, role/prompt, tools, model). ` +
              `When I'm happy, write it into this pipeline's step in /tmp/dlc-yolo/state.json (the step's agent {name, role, tools} and any trust/depth), keeping GitHub as the source of truth.`
            })}
            className="ml-auto text-[11px] px-2.5 py-1 rounded-md font-semibold flex items-center gap-1"
            style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}
            title="Author this agent in a /dlc-yolo chat session">
            ✨ Draft with /dlc-yolo
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3.5 flex-1 overflow-y-auto">
          {/* Reuse existing agent */}
          {knownAgents.length > 0 && (
            <div>
              <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Reuse an existing agent</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {knownAgents.map(a => (
                  <button key={a} onClick={() => setName(a)}
                    className="text-[11px] px-2 py-1 rounded-md font-medium"
                    style={{
                      background: name === a ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'var(--bg-hover, var(--border))',
                      color: name === a ? 'var(--accent)' : 'var(--muted-strong, var(--muted))',
                      boxShadow: name === a ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)' : 'none',
                    }}>{a}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Agent name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. impl-agent"
              className="mt-1 w-full px-3 py-2 rounded-md text-sm outline-none"
              style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Role / prompt</label>
            <textarea value={role} onChange={e => setRole(e.target.value)} rows={3}
              placeholder="What this agent does in this step…"
              className="mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y"
              style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Tools</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {AGENT_TOOL_OPTIONS.map(t => {
                const on = tools.includes(t)
                return (
                  <button key={t} onClick={() => toggleTool(t)}
                    className="text-[11px] px-2 py-1 rounded-md font-medium transition-all"
                    style={{
                      background: on ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'var(--bg-hover, var(--border))',
                      color: on ? 'var(--accent)' : 'var(--muted)',
                      boxShadow: on ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)' : 'none',
                    }}>{t}</button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Model</label>
            <input value={model} onChange={e => setModel(e.target.value)} placeholder="auto"
              className="w-40 px-2 py-1 rounded-md text-sm outline-none"
              style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>

          {/* Execution profile for the step */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Trust</span>
            <div className="flex gap-0.5 p-0.5 rounded-md" style={{ background: 'var(--bg-elevated, var(--card))', border: '1px solid var(--border)' }}>
              {(['', ...TRUST_LEVELS] as const).map(t => {
                const on = trust === t
                return (
                  <button key={t || 'inherit'} onClick={() => setTrust(t as Trust | '')}
                    className="text-[11px] px-2 py-0.5 rounded font-semibold"
                    style={{ color: on ? (t ? TRUST_TOKEN[t as Trust] : 'var(--text)') : 'var(--muted)', background: on ? 'var(--bg-hover, var(--border))' : 'transparent' }}>
                    {t || 'inherit'}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Depth</span>
            <div className="flex gap-0.5 p-0.5 rounded-md" style={{ background: 'var(--bg-elevated, var(--card))', border: '1px solid var(--border)' }}>
              {(['', ...DEPTH_LEVELS] as const).map(d => {
                const on = depth === d
                return (
                  <button key={d || 'inherit'} onClick={() => setDepth(d as Depth | '')}
                    className="text-[11px] px-2 py-0.5 rounded font-semibold"
                    style={{ color: on ? (d ? DEPTH_TOKEN[d as Depth] : 'var(--text)') : 'var(--muted)', background: on ? 'var(--bg-hover, var(--border))' : 'transparent' }}>
                    {d || 'inherit'}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated, var(--card))' }}>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md font-medium" style={{ color: 'var(--muted)' }}>Back</button>
          <button disabled={!valid}
            onClick={() => onSave({
              name: name.trim(), role: role.trim() || undefined, tools,
              model: model.trim() && model.trim() !== 'auto' ? model.trim() : undefined,
              trust: trust || undefined, depth: depth || undefined,
            })}
            className="text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}>Save Agent</button>
        </div>
    </div>
  )
}

// --- Pipeline Setup Modal ---
interface RepoCandidate { repo: string; source: 'issue-radar' | 'workspace' | 'manual'; detail?: string }

function PipelineSetupModal({ candidates, existingRepos, defaults, knownAgents, onCreate, onClose }: {
  candidates: RepoCandidate[]
  existingRepos: Set<string>
  defaults: PipelineConfig
  knownAgents: string[]
  onCreate: (p: { repo: string; source: RepoCandidate['source']; trust: Trust; depth: Depth; backlog_intake: boolean; steps: PipelineStep[] }) => void
  onClose: () => void
}) {
  const [repo, setRepo] = useState('')
  const [source, setSource] = useState<RepoCandidate['source']>('manual')
  const [trust, setTrust] = useState<Trust>(defaults.trust)
  const [depth, setDepth] = useState<Depth>(defaults.depth)
  const [backlog, setBacklog] = useState(true)
  const [steps, setSteps] = useState<PipelineStep[]>(() => DEFAULT_STEPS.map(s => ({ ...s })))
  const [editingAgentIdx, setEditingAgentIdx] = useState<number | null>(null)

  const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'step'
  const updateStep = (i: number, patch: Partial<PipelineStep>) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  const removeStep = (i: number) => setSteps(prev => prev.filter((_, idx) => idx !== i))
  const moveStep = (i: number, dir: -1 | 1) => setSteps(prev => {
    const j = i + dir; if (j < 0 || j >= prev.length) return prev
    const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next
  })
  const addStep = (type: 'agent' | 'gate') => setSteps(prev => [...prev, {
    id: `${type}-${Math.random().toString(36).slice(2, 6)}`,
    name: type === 'gate' ? 'New Gate' : 'New Step',
    type,
    agent: type === 'agent' ? { name: 'impl-agent', role: '' } : undefined,
  }])

  const pick = (c: RepoCandidate) => { setRepo(c.repo); setSource(c.source) }
  const valid = /^[^/\s]+\/[^/\s]+$/.test(repo.trim()) || candidates.some(c => c.repo === repo)
  const dup = existingRepos.has(repo.trim())

  const Seg = <T extends string>({ value, options, tokens, onPick }: {
    value: T; options: T[]; tokens: Record<string, string>; onPick: (v: T) => void
  }) => (
    <div className="flex gap-0.5 p-0.5 rounded-md" style={{ background: 'var(--bg-elevated, var(--card))', border: '1px solid var(--border)' }}>
      {options.map(opt => {
        const on = value === opt
        return (
          <button key={opt} onClick={() => onPick(opt)}
            className="text-[11px] px-2.5 py-1 rounded font-semibold transition-all"
            style={{
              color: on ? tokens[opt] : 'var(--muted)',
              background: on ? `color-mix(in srgb, ${tokens[opt]} 16%, transparent)` : 'transparent',
              boxShadow: on ? `inset 0 0 0 1px color-mix(in srgb, ${tokens[opt]} 45%, transparent)` : 'none',
            }}>{opt}</button>
        )
      })}
    </div>
  )

  const grouped: Record<string, RepoCandidate[]> = { 'issue-radar': [], workspace: [], manual: [] }
  candidates.forEach(c => { (grouped[c.source] ||= []).push(c) })
  const SOURCE_LABEL: Record<string, string> = { 'issue-radar': 'Issue Radar', workspace: 'KiroCrew Workspaces', manual: 'Manual' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'color-mix(in srgb, black 55%, transparent)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--card)', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}>
        {editingAgentIdx !== null ? (
          <AgentSetupPanel
            initial={{
              name: steps[editingAgentIdx]?.agent?.name || '',
              role: steps[editingAgentIdx]?.agent?.role,
              tools: steps[editingAgentIdx]?.agent?.tools,
              trust: steps[editingAgentIdx]?.trust,
              depth: steps[editingAgentIdx]?.depth,
            }}
            knownAgents={knownAgents}
            repo={repo}
            stepName={steps[editingAgentIdx]?.name || ''}
            onClose={() => setEditingAgentIdx(null)}
            onSave={(a) => {
              updateStep(editingAgentIdx, {
                agent: { name: a.name, role: a.role, tools: a.tools },
                trust: a.trust, depth: a.depth,
              })
              setEditingAgentIdx(null)
            }}
          />
        ) : (
          <>
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="text-base font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>New Pipeline</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Configure a pipeline for a repository or workspace</div>
          </div>
          <button onClick={onClose} className="text-lg leading-none px-2" style={{ color: 'var(--muted)' }}>×</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Repo picker */}
          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Repository</label>
            <input
              value={repo}
              onChange={e => { setRepo(e.target.value); setSource('manual') }}
              placeholder="owner/name"
              className="mt-1 w-full px-3 py-2 rounded-md text-sm outline-none"
              style={{ background: 'var(--bg-elevated, var(--bg))', border: `1px solid ${dup ? 'var(--danger)' : 'var(--border)'}`, color: 'var(--text)' }}
            />
            {dup && <div className="text-[11px] mt-1" style={{ color: 'var(--danger)' }}>A pipeline for this repo already exists.</div>}

            {/* Candidate sources */}
            <div className="mt-2 flex flex-col gap-2">
              {(['issue-radar', 'workspace'] as const).map(src => grouped[src].length > 0 && (
                <div key={src}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>{SOURCE_LABEL[src]}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {grouped[src].map(c => (
                      <button key={c.repo} onClick={() => pick(c)}
                        disabled={existingRepos.has(c.repo)}
                        title={c.detail || c.repo}
                        className="text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40"
                        style={{
                          background: repo === c.repo ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'var(--bg-hover, var(--border))',
                          color: repo === c.repo ? 'var(--accent)' : 'var(--muted-strong, var(--muted))',
                          boxShadow: repo === c.repo ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)' : 'none',
                        }}>
                        {c.repo.includes('/') ? c.repo.split('/')[1] : c.repo}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modes */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Default Trust</span>
            <Seg value={trust} options={TRUST_LEVELS} tokens={TRUST_TOKEN} onPick={setTrust} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Default Depth</span>
            <Seg value={depth} options={DEPTH_LEVELS} tokens={DEPTH_TOKEN} onPick={setDepth} />
          </div>

          {/* Backlog intake */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm" style={{ color: 'var(--text)' }}>Backlog auto-intake</div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Back-feed open <code style={{ color: 'var(--warn)' }}>dlc-backlog</code> issues as cards</div>
            </div>
            <button onClick={() => setBacklog(b => !b)}
              className="w-10 h-5.5 rounded-full transition-all relative flex-shrink-0"
              style={{ background: backlog ? 'var(--accent)' : 'var(--border-strong, var(--border))', height: 22, width: 40 }}>
              <span className="absolute top-0.5 rounded-full transition-all"
                style={{ height: 18, width: 18, background: 'var(--bg)', left: backlog ? 20 : 2 }} />
            </button>
          </label>

          {/* Custom steps editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Steps</span>
              <div className="flex gap-1">
                <button onClick={() => addStep('agent')} className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                  style={{ color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 40%, var(--border))' }}>+ agent</button>
                <button onClick={() => addStep('gate')} className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                  style={{ color: 'var(--warn)', border: '1px solid color-mix(in srgb, var(--warn) 40%, var(--border))' }}>+ gate</button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {steps.map((s, i) => (
                <div key={s.id} className="rounded-md p-2"
                  style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', borderLeft: `2px solid ${s.type === 'gate' ? 'var(--warn)' : 'var(--accent)'}` }}>
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col">
                      <button onClick={() => moveStep(i, -1)} disabled={i === 0} className="text-[8px] leading-none disabled:opacity-30" style={{ color: 'var(--muted)' }}>▲</button>
                      <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} className="text-[8px] leading-none disabled:opacity-30" style={{ color: 'var(--muted)' }}>▼</button>
                    </div>
                    <input value={s.name} onChange={e => updateStep(i, { name: e.target.value, id: slug(e.target.value) })}
                      className="flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase"
                      style={{ color: s.type === 'gate' ? 'var(--warn)' : 'var(--accent)', background: `color-mix(in srgb, ${s.type === 'gate' ? 'var(--warn)' : 'var(--accent)'} 14%, transparent)` }}>{s.type}</span>
                    <button onClick={() => removeStep(i)} className="text-[13px] leading-none px-1" style={{ color: 'var(--muted)' }}>×</button>
                  </div>
                  {/* Agent config (opens the agent setup modal) */}
                  {s.type === 'agent' && (
                    <div className="mt-1.5 pl-5 flex items-center gap-2">
                      <button onClick={() => setEditingAgentIdx(i)}
                        className="text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5"
                        style={{ background: 'var(--bg-hover, var(--border))', color: 'var(--accent)' }}>
                        ⚙ {s.agent?.name ? `Agent: ${s.agent.name}` : 'Configure agent'}
                      </button>
                      {(s.trust || s.depth) && (
                        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                          {[s.trust, s.depth].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {s.agent?.role && <span className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{s.agent.role}</span>}
                    </div>
                  )}
                  {/* Gate steps: only a per-step trust selector (no depth/agent) */}
                  {s.type === 'gate' && (
                    <div className="mt-1.5 pl-5 flex items-center gap-1">
                      <span className="text-[9px] uppercase" style={{ color: 'var(--muted)' }}>trust</span>
                      <select value={s.trust || ''} onChange={e => updateStep(i, { trust: (e.target.value || undefined) as Trust })}
                        className="text-[10px] px-1 py-0.5 rounded outline-none" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                        <option value="">inherit</option>
                        {TRUST_LEVELS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated, var(--card))' }}>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md font-medium" style={{ color: 'var(--muted)' }}>Cancel</button>
          <button
            disabled={!valid || dup}
            onClick={() => onCreate({
              repo: repo.trim(), source, trust, depth, backlog_intake: backlog,
              steps: steps.map(s => ({ ...s, label: `dlc:${s.id}` })),
            })}
            className="text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            Create Pipeline
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  )
}

// --- Main Component ---
export default function SdlcPipeline() {
  const api = useAppApi()
  const [allCards, setAllCards] = useState<PipelineCard[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('pipeline')
  const [repoFilter, setRepoFilter] = useState<Set<string>>(new Set())
  const [setupOpen, setSetupOpen] = useState(false)
  const [candidates, setCandidates] = useState<RepoCandidate[]>([])
  const kanbanRef = useRef<HTMLDivElement>(null)

  const fetchCards = useCallback(async () => {
    try {
      const data = await api.get('/api/file-read?path=/tmp/dlc-yolo/state.json')
      setAllCards(data.cards || [])
      setPipelines(data.pipelines || [])
      setConfig({ ...DEFAULT_CONFIG, ...(data.config || {}) })
    } catch (e) {
      console.error('Failed to fetch cards:', e)
    } finally {
      setLoading(false)
    }
  }, [api])

  // Repo list for the scroller: union of pipeline repos and any repo that has cards.
  const repoList = useMemo(() => {
    const m = new Map<string, number>()
    pipelines.forEach(pl => { if (!m.has(pl.repo)) m.set(pl.repo, 0) })
    allCards.forEach(c => {
      const r = c.source?.repo || 'unlinked'
      m.set(r, (m.get(r) || 0) + 1)
    })
    return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [allCards, pipelines])

  // Cards scoped to the selected repos (empty set = all repos).
  const cards = useMemo(
    () => repoFilter.size === 0 ? allCards : allCards.filter(c => repoFilter.has(c.source?.repo || 'unlinked')),
    [allCards, repoFilter]
  )

  // Active step ladder: when exactly ONE pipeline (repo) is selected and it has
  // custom steps, render those; otherwise fall back to the default ladder + a
  // terminal "done". Steps drive the kanban columns, the graph, and gate logic.
  const activeSteps = useMemo<PipelineStep[]>(() => {
    let steps: PipelineStep[] | undefined
    if (repoFilter.size === 1) {
      const repo = [...repoFilter][0]
      steps = pipelines.find(p => p.repo === repo)?.steps
    } else if (pipelines.length === 1) {
      steps = pipelines[0].steps
    }
    const base = (steps && steps.length ? steps : DEFAULT_STEPS).map(s => ({ ...s }))
    // Always include intake (front) + done (terminal) so cards at those stages render.
    const ids = new Set(base.map(s => s.id))
    const withEnds: PipelineStep[] = []
    if (!ids.has('intake')) withEnds.push({ id: 'intake', name: 'Intake', type: 'agent', agent: { name: 'orchestrator' } })
    withEnds.push(...base)
    if (!ids.has('done')) withEnds.push({ id: 'done', name: 'Done', type: 'agent' })
    return withEnds
  }, [repoFilter, pipelines])

  const stepIds = useMemo(() => activeSteps.map(s => s.id), [activeSteps])
  const isGateStep = useCallback((id: string) => activeSteps.find(s => s.id === id)?.type === 'gate' || id.startsWith('gate-'), [activeSteps])
  const stepAgent = useCallback((id: string) => activeSteps.find(s => s.id === id)?.agent?.name || STAGE_AGENTS[id as Stage] || 'unknown', [activeSteps])

  useEffect(() => {
    fetchCards()
    const interval = setInterval(fetchCards, 10000)
    return () => clearInterval(interval)
  }, [fetchCards])

  // Resolve the step ladder for a given card from state (its pipeline's steps, else default),
  // always bracketed by intake…done, returning an array of step ids.
  const ladderFor = (state: { pipelines?: Pipeline[] }, card: PipelineCard): string[] => {
    const pl = (state.pipelines || []).find(p => p.id === card.pipeline_id) ||
               (state.pipelines || []).find(p => p.repo === card.source?.repo)
    const steps = (pl?.steps && pl.steps.length ? pl.steps : DEFAULT_STEPS).map(s => s.id)
    const ids = ['intake', ...steps.filter(s => s !== 'intake' && s !== 'done'), 'done']
    return [...new Set(ids)]
  }

  const advanceCard = useCallback(async (cardId: string) => {
    try {
      const state = await api.get('/api/file-read?path=/tmp/dlc-yolo/state.json')
      const card = state.cards?.find((c: PipelineCard) => c.id === cardId)
      if (!card) return
      const ladder = ladderFor(state, card)
      const idx = ladder.indexOf(card.stage)
      if (idx < 0 || idx >= ladder.length - 1) return
      const prevStage = card.stage
      card.stage = ladder[idx + 1]
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
      const ladder = ladderFor(state, card)
      const gateIds = new Set((
        ((state.pipelines || []).find((p: Pipeline) => p.id === card.pipeline_id)?.steps) || DEFAULT_STEPS
      ).filter((s: PipelineStep) => s.type === 'gate').map((s: PipelineStep) => s.id))
      const idx = ladder.indexOf(card.stage)
      if (idx <= 0) return
      const prevStage = card.stage
      let target = idx - 1
      while (target > 0 && (gateIds.has(ladder[target]) || ladder[target].startsWith('gate-'))) target--
      card.stage = ladder[target]
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

  const mutateState = useCallback(async (mutator: (state: { config?: PipelineConfig; pipelines?: Pipeline[]; cards: PipelineCard[] }) => void) => {
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
  // Open the setup modal: discover candidate repos from KiroCrew workspaces
  // and Issue Radar (both READ-ONLY), then show the modal.
  const openSetup = useCallback(async () => {
    const found: RepoCandidate[] = []
    // KiroCrew workspaces
    try {
      const cfg = await api.get('/api/file-read?path=~/.kiro/crew/config.json')
      const ws = cfg?.workspaces || {}
      Object.entries(ws).forEach(([name, v]: [string, any]) =>
        found.push({ repo: name, source: 'workspace', detail: v?.dir || name }))
    } catch (e) { console.warn('workspaces registry unreadable:', e) }
    // Issue Radar connected repos (read-only — never write to its data dir)
    try {
      const ir = await api.get('/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json')
      ;(ir?.repos || []).forEach((r: any) => {
        if (r?.owner && r?.repo) found.push({ repo: `${r.owner}/${r.repo}`, source: 'issue-radar', detail: `${r.provider || 'github'} · ${r.host || 'github.com'}` })
      })
    } catch (e) { console.warn('issue-radar config unreadable (app may not be installed):', e) }
    setCandidates(found)
    setSetupOpen(true)
  }, [api])

  const createPipeline = useCallback(async (p: {
    repo: string; source: RepoCandidate['source']; trust: Trust; depth: Depth; backlog_intake: boolean; steps: PipelineStep[]
  }) => {
    const now = new Date().toISOString()
    const id = 'pl-' + Math.random().toString(36).slice(2, 10)
    await mutateState(state => {
      state.pipelines = state.pipelines || []
      if (state.pipelines.some((pl: Pipeline) => pl.repo === p.repo)) return
      state.pipelines.push({
        id, repo: p.repo, source: p.source,
        trust: p.trust, depth: p.depth, backlog_intake: p.backlog_intake,
        sot: 'github', steps: p.steps,
        created_at: now,
      })
    })
    setSetupOpen(false)
    setRepoFilter(new Set([p.repo]))
  }, [mutateState])

  const cardsByStage = useMemo(() => {
    return stepIds.reduce((acc, id) => {
      acc[id] = cards.filter(c => c.stage === id)
      return acc
    }, {} as Record<string, PipelineCard[]>)
  }, [cards, stepIds])

  const scrollToStage = useCallback((stage: string) => {
    document.getElementById(`stage-col-${stage}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [])

  const workspaceGroups = useMemo(() => {
    const g: Record<string, PipelineCard[]> = {}
    cards.forEach(c => { const k = c.source?.repo || 'unlinked'; (g[k] ||= []).push(c) })
    return g
  }, [cards])

  const crewGroups = useMemo(() => {
    const g: Record<string, PipelineCard[]> = {}
    cards.forEach(c => { const k = stepAgent(c.stage); (g[k] ||= []).push(c) })
    return g
  }, [cards, stepAgent])

  const statusGroups = useMemo(() => {
    const blocked: PipelineCard[] = [], inFlight: PipelineCard[] = [], done: PipelineCard[] = []
    cards.forEach(c => {
      if (c.stage === 'done') done.push(c)
      else if (isGateStep(c.stage)) blocked.push(c)
      else inFlight.push(c)
    })
    return { 'Blocked at Gate': blocked, 'In-Flight (Auto)': inFlight, 'Done': done }
  }, [cards, isGateStep])

  const activeCount = cards.filter(c => c.stage !== 'done').length
  const gatedCount = cards.filter(c => isGateStep(c.stage)).length
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
    onApprove: isGateStep(card.stage) ? () => advanceCard(card.id) : undefined,
    onReject: isGateStep(card.stage) ? () => rejectCard(card.id) : undefined,
    onCycleTrust: () => cycleTrust(card.id),
    onCycleDepth: () => cycleDepth(card.id),
  })

  return (
    <>
      <PageHeader title="DLC-YOLO" subtitle="Autonomous SDLC pipeline with human gates" />
      {setupOpen && (
        <PipelineSetupModal
          candidates={candidates}
          existingRepos={new Set(pipelines.map(p => p.repo))}
          defaults={config}
          knownAgents={['spec-agent', 'design-agent', 'impl-agent', 'review-agent', 'orchestrator']}
          onCreate={createPipeline}
          onClose={() => setSetupOpen(false)}
        />
      )}
      <div className="px-6 pb-8 overflow-y-auto flex-1 min-h-0">
        <PipelineGraph steps={activeSteps} cardsByStage={cardsByStage} onNodeClick={scrollToStage} />

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
            onAddWorkspace={openSetup}
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
                {view === 'pipeline' && activeSteps.map(step => (
                  <ColumnGroup key={step.id} id={`stage-col-${step.id}`} title={step.name} count={(cardsByStage[step.id] || []).length}>
                    {(cardsByStage[step.id] || []).map(card => <PipelineCardItem key={card.id} {...cardProps(card)} />)}
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
