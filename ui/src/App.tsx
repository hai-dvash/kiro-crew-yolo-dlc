import { useAppApi, useChatLauncher } from '@kirocrew/app-sdk'
import { Card, CardTitle, PageHeader, StatCard } from '@kirocrew/app-sdk/ui'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// --- State file location ---------------------------------------------------
// Durable-first, mirroring crons/dlc_yolo_advance.py:_resolve_state_path().
// Order: ~/.dlc-yolo/state.json (durable, survives reboot) -> /tmp fallback
// (ephemeral). The cron bootstraps the file (the UI's /api/file-write refuses
// to CREATE files), so the UI just probes which resolved path actually exists
// and uses it for all reads/writes. resolveStatePath() runs once on mount.
const DURABLE_STATE = '~/.dlc-yolo/state.json'
const TMP_STATE = '/tmp/dlc-yolo/state.json'
let STATE_PATH = DURABLE_STATE   // updated by resolveStatePath() at startup

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
  decisions?: Array<{ id: string; at: string; step?: string; raised_by?: string; kind?: string; question?: string; chosen?: string; rationale?: string; action?: string; confidence?: string }>
  parked?: ParkedIdea[]
  history: Array<{ from: string; to: string; at: string; agent: string }>
}

interface PipelineConfig { trust: Trust; depth: Depth }

interface StepAgent { name: string; role?: string; tools?: string[]; crew?: string; model?: string }
// Addendum crew (Model 2): a cross-cutting specialist run that layers onto an agent step
// AFTER the canon crew, gated by a `when` integration trigger. Each is its own spawn_run.
interface Addendum {
  crew: string                                        // config.json agents entry to route to
  when?: 'always' | 'depth:deep' | 'kind:bug' | 'manual' | string  // integration trigger; string = label:<x>
  writes?: string                                     // artifact it produces in SPEC_DIR (e.g. research.md)
}
interface PipelineStep {
  id: string
  name: string
  type: 'agent' | 'gate'
  agent?: StepAgent
  addenda?: Addendum[]
  trigger?: 'ask' | 'spec-builder' | 'task-runner' | 'inline' | 'skip'  // default engine for this phase (ask = prompt at runtime)
  trust?: Trust
  depth?: Depth
  label?: string
}

// Default step ladder the wizard seeds from (users edit freely per pipeline).
const DEFAULT_STEPS: PipelineStep[] = [
  { id: 'investigate', name: 'Investigate', type: 'agent', agent: { name: 'spec-agent', role: 'Classify the issue: summarize, propose labels, write a triage note (human-aided)' } },
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

// Seed/demo repos shipped as sample data — surfaced as "Example: …" in the rail so
// users know they are removable (and can delete them via the pipeline delete button).
const EXAMPLE_REPOS = new Set([
  'hai-dvash/webapp',
  'hai-dvash/dashboard',
  'hai-dvash/api-core',
])

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

// --- Pixel-art "Pipeline World" header ---
// Faithful to KiroCrew's Agent Worlds canvas language: integer-scaled pixel art
// (imageRendering: pixelated), a requestAnimationFrame tick, flat palette, blinking/
// bobbing sprites. Renders the whole active step ladder as landmarks across one world
// strip; each card is a sprite standing at its step, occupancy lights the landmark.
const WORLD_COLORS = ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2ecc71', '#e84393']

function PipelineWorld({ steps, cardsByStage, onNodeClick }: {
  steps: { id: string; name: string; type: 'agent' | 'gate' }[]
  cardsByStage: Record<string, PipelineCard[]>
  onNodeClick: (stage: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const tickRef = useRef(0)
  const animRef = useRef<number | null>(null)
  // live refs so the rAF loop always sees fresh data without re-subscribing
  const stepsRef = useRef(steps)
  const cardsRef = useRef(cardsByStage)
  const hitRef = useRef<{ x: number; w: number; id: string }[]>([])
  stepsRef.current = steps
  cardsRef.current = cardsByStage

  const S = 3                    // integer pixel scale (matches Agent Worlds)
  const H = 116                  // css height (px)
  const baseH = H / S            // logical height
  const groundY = baseH - 26     // horizon line
  const [wCss, setWCss] = useState(880)

  // responsive width — fill the header, min 60 logical px per landmark
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = Math.max(360, Math.floor(entries[0].contentRect.width))
      setWCss(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isGate = (s: { id: string; type: string }) => s.type === 'gate' || s.id.startsWith('gate-')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const baseW = Math.floor(wCss / S)
    canvas.width = baseW * S
    canvas.height = baseH * S
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const d = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color
      ctx.fillRect(x * S, y * S, w * S, h * S)
    }

    const draw = () => {
      const tick = tickRef.current
      const stps = stepsRef.current
      const cbs = cardsRef.current
      const n = Math.max(1, stps.length)
      const maxCount = Math.max(1, ...stps.map(s => cbs[s.id]?.length || 0))

      // ── Sky + stars ──
      d(0, 0, baseW, groundY, '#0f172a')
      for (let i = 0; i < baseW / 5; i++) {
        const sx = (i * 37) % baseW
        const sy = (i * 13) % (groundY - 4)
        if (Math.sin(tick * 0.03 + i * 2.1) > 0.35) d(sx, sy, 1, 1, '#e2e8f0')
      }
      // moon
      d(baseW - 26, 8, 10, 10, '#fde68a')
      d(baseW - 24, 7, 8, 8, '#0f172a')

      // ── Ground ──
      for (let i = 0; i < baseW; i += 16) {
        for (let j = groundY; j < baseH; j += 16) {
          d(i, j, 16, 16, (((i / 16) + (j / 16)) & 1) ? '#33261a' : '#2a1f14')
        }
      }
      d(0, groundY - 2, baseW, 2, '#4a3520')

      // ── Landmarks (one per step) ──
      const slot = baseW / n
      const hits: { x: number; w: number; id: string }[] = []
      for (let i = 0; i < stps.length; i++) {
        const s = stps[i]
        const cx = Math.round(slot * (i + 0.5))
        const cards = cbs[s.id] || []
        const count = cards.length
        const active = count > 0
        const accent = WORLD_COLORS[i % WORLD_COLORS.length]
        const gate = isGate(s)
        const ly = groundY - 2
        hits.push({ x: cx - Math.floor(slot / 2), w: Math.floor(slot), id: s.id })

        // path connector to next landmark
        if (i < stps.length - 1) {
          const nx = Math.round(slot * (i + 1.5))
          for (let px = cx + 8; px < nx - 8; px += 4) d(px, groundY - 1, 2, 1, '#4a3520')
        }

        if (gate) {
          // Gate = a glowing obelisk / diamond marker
          const gy = ly - 20
          const col = active ? '#f39c12' : '#3a3222'
          // pillar
          d(cx - 3, gy, 6, 20, active ? '#5c4a2a' : '#2a2418')
          // diamond top
          for (let r = 0; r < 5; r++) d(cx - r, gy - 5 + r, r * 2 + 1, 1, col)
          for (let r = 0; r < 5; r++) d(cx - (4 - r), gy - r, (4 - r) * 2 + 1, 1, col)
          if (active) {
            // pulse cap
            const pulse = (Math.sin(tick * 0.08) + 1) / 2
            ctx.globalAlpha = 0.35 + pulse * 0.4
            d(cx - 1, gy - 6, 2, 2, '#ffd27a')
            ctx.globalAlpha = 1
          }
        } else {
          // Agent step = a desk workstation with a monitor
          const dy = ly - 14
          d(cx - 10, dy, 20, 3, '#7a5c47')       // desk
          d(cx - 10, dy - 1, 20, 1, accent)      // accent edge
          d(cx - 9, dy + 3, 2, 8, '#5c4033')     // legs
          d(cx + 7, dy + 3, 2, 8, '#5c4033')
          d(cx - 5, dy - 9, 10, 9, '#333')       // monitor bezel
          d(cx - 4, dy - 8, 8, 7, active ? '#0a2a0a' : '#1a1a1a')
          if (active) {
            for (let l = 0; l < 3; l++) {
              const lw = 2 + ((tick + l * 7) % 5)
              d(cx - 3, dy - 7 + l * 2, lw, 0.8, '#33ff33')
            }
          }
        }

        // ── Card sprites clustered at the landmark ──
        const shown = Math.min(count, 5)
        for (let k = 0; k < shown; k++) {
          const spread = shown > 1 ? (k - (shown - 1) / 2) * 8 : 0
          const bx = Math.round(cx + spread) - 3
          const by = ly - (gate ? 2 : 4)
          const scolor = WORLD_COLORS[(i + k) % WORLD_COLORS.length]
          const bob = Math.sin(tick * 0.08 + i + k) > 0 ? 1 : 0
          // shadow
          ctx.fillStyle = 'rgba(0,0,0,0.18)'
          ctx.fillRect((bx) * S, (by + 8) * S, 6 * S, S)
          // body
          d(bx, by + bob, 6, 6, scolor)
          // head
          d(bx + 1, by - 4 + bob, 4, 4, '#fdd')
          d(bx + 1, by - 5 + bob, 4, 1, '#333')  // hair
          // eyes (blink)
          if ((tick + i * 9 + k * 5) % 120 >= 3) {
            d(bx + 2, by - 3 + bob, 1, 1, '#333')
            d(bx + 4, by - 3 + bob, 1, 1, '#333')
          }
          // legs
          d(bx + 1, by + 6, 1, 2, scolor)
          d(bx + 4, by + 6, 1, 2, scolor)
        }
        // overflow tag
        if (count > 5) {
          ctx.fillStyle = accent
          ctx.font = `${3 * S}px monospace`
          ctx.fillText(`+${count - 5}`, (cx + 10) * S, (ly - 6) * S)
        }

        // count badge on the landmark
        if (count > 0) {
          ctx.fillStyle = accent
          ctx.fillRect((cx + 6) * S, (ly - 30) * S, 9 * S, 9 * S)
          ctx.fillStyle = '#0f172a'
          ctx.font = `bold ${5 * S}px monospace`
          ctx.textAlign = 'center'
          ctx.fillText(String(count), (cx + 10.5) * S, (ly - 24) * S)
          ctx.textAlign = 'left'
        }

        // step label
        ctx.fillStyle = active ? '#e2e8f0' : '#6b7280'
        ctx.font = `${3.4 * S}px monospace`
        ctx.textAlign = 'center'
        const lbl = s.name.length > 12 ? s.name.slice(0, 11) + '…' : s.name
        ctx.fillText(lbl, cx * S, (baseH - 4) * S)
        ctx.textAlign = 'left'
      }
      hitRef.current = hits

      // world census (top-left)
      const total = stps.reduce((a, s) => a + (cbs[s.id]?.length || 0), 0)
      ctx.fillStyle = '#f90'
      ctx.font = `bold ${3.6 * S}px monospace`
      ctx.fillText(`${total} card${total !== 1 ? 's' : ''} · ${n} milestone${n !== 1 ? 's' : ''}`, 4 * S, 8 * S)
    }

    const loop = () => {
      tickRef.current++
      draw()
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [wCss, baseH, groundY])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const lx = ((e.clientX - rect.left) / rect.width) * (canvas.width / S)
    const hit = hitRef.current.find(hh => lx >= hh.x && lx <= hh.x + hh.w)
    if (hit) onNodeClick(hit.id)
  }

  return (
    <div ref={wrapRef} className="w-full mb-5">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          width: '100%',
          height: H + 'px',
          imageRendering: 'pixelated',
          borderRadius: 8,
          border: '1px solid var(--border, #333)',
          cursor: 'pointer',
          display: 'block',
        }}
      />
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
        {card.decisions && card.decisions.length > 0 && (() => {
          const d = card.decisions[card.decisions.length - 1]
          return (
            <Pill color="var(--accent)"
              title={`${card.decisions.length} decision${card.decisions.length === 1 ? '' : 's'} — last: ${d.question || d.kind || ''}${d.action ? ` → ${d.action}` : ''}${d.rationale ? `\n${d.rationale}` : ''}`}>
              ⚖ {card.decisions.length}
            </Pill>
          )
        })()}
      </div>

      {isGate && onApprove && onReject && (
        <div className="mt-2.5 flex gap-1.5 items-center flex-wrap">
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
          {/* Review gate: hand off to Code Review Sage, scoped to the card's repo (+ PR if known). */}
          {(card.stage === 'gate-review' || /review/i.test(card.stage || '')) && (() => {
            const repo = card.source?.repo
            if (!repo) return null
            const pr = card.artifacts?.pr_url
            const prNum = pr && /\/pull\/(\d+)/.exec(pr)?.[1]
            const href = `/code-review-sage?repo=${encodeURIComponent('https://github.com/' + repo)}` + (prNum ? `&pr=${prNum}` : '')
            return (
              <a href={href} title={pr ? `Deep-review PR #${prNum} in Code Review Sage` : `Open Code Review Sage for ${repo}`}
                className="text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1"
                style={{ background: 'var(--bg-hover, var(--border))', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 40%, var(--border))' }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Review in Sage
              </a>
            )
          })()}
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
function RepoScroller({ repos, selected, onToggle, onClear, onAddWorkspace, onEdit }: {
  repos: { name: string; count: number }[]
  selected: Set<string>
  onToggle: (repo: string) => void
  onClear: () => void
  onAddWorkspace: () => void
  onEdit: (repo: string) => void
}) {
  const total = repos.reduce((n, r) => n + r.count, 0)
  const allSelected = selected.size === 0 // empty set = viewing all

  const Row = ({ name, count, label, checked, onClick, isAll }: {
    name?: string; count: number; label: string; checked: boolean; onClick: () => void; isAll?: boolean
  }) => {
    const [hover, setHover] = useState(false)
    return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative w-full rounded-md transition-all flex items-center"
      style={{
        background: checked ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'transparent',
        boxShadow: checked ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)' : 'none',
      }}
    >
      <button
        onClick={onClick}
        className="flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2"
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
      {/* Pencil → Pipeline Edit modal (which contains the type-to-confirm Danger Zone). */}
      {!isAll && name && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(name) }}
          title={`Edit pipeline "${label}"`}
          aria-label={`Edit pipeline ${label}`}
          className="mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            opacity: hover ? 1 : 0,
            pointerEvents: hover ? 'auto' : 'none',
            color: 'var(--text-strong, var(--text))',
            background: 'var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))',
            border: '1px solid var(--border-strong, var(--border))',
          }}
          onMouseEnter={(e) => { const t = e.currentTarget as HTMLElement; t.style.color = 'var(--accent)'; t.style.borderColor = 'var(--accent)' }}
          onMouseLeave={(e) => { const t = e.currentTarget as HTMLElement; t.style.color = 'var(--text-strong, var(--text))'; t.style.borderColor = 'var(--border-strong, var(--border))' }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M11.5 1.5l3 3L5 14l-3.5.5L2 11 11.5 1.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
    )
  }

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
          label={(EXAMPLE_REPOS.has(r.name) ? 'Example: ' : '') + (r.name.includes('/') ? r.name.split('/')[1] : r.name)}
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
  crew?: string          // optional KiroCrew crew (config.json agents key) to route this step to
  addenda?: Addendum[]   // optional addendum crews (Model 2) layered after the canon crew
  trust?: Trust          // step execution profile (DLC-YOLO)
  depth?: Depth
}

function AgentSetupPanel({ initial, knownAgents, crews, repo, stepName, onSave, onClose }: {
  initial: AgentDraft
  knownAgents: string[]
  crews: { name: string; description?: string }[]
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
  const [crew, setCrew] = useState(initial.crew || '')
  const [addenda, setAddenda] = useState<Addendum[]>(initial.addenda || [])
  const [trust, setTrust] = useState<Trust | ''>(initial.trust || '')
  const [depth, setDepth] = useState<Depth | ''>(initial.depth || '')

  const toggleTool = (t: string) => setTools(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  const addAddendum = () => setAddenda(prev => prev.length >= 3 ? prev : [...prev, { crew: crews[0]?.name || '', when: 'always', writes: '' }])
  const updateAddendum = (i: number, patch: Partial<Addendum>) => setAddenda(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a))
  const removeAddendum = (i: number) => setAddenda(prev => prev.filter((_, idx) => idx !== i))
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
              `When I'm happy, write it into this pipeline's step in the DLC-YOLO state file (~/.dlc-yolo/state.json, or /tmp/dlc-yolo/state.json if that's what exists) — the step's agent {name, role, tools} and any trust/depth — keeping GitHub as the source of truth.`
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

          {/* Crew: route this step to a KiroCrew crew (config.json agents). Empty = use the step agent above. */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Crew</label>
              <select value={crew} onChange={e => setCrew(e.target.value)}
                className="w-52 px-2 py-1 rounded-md text-sm outline-none"
                style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <option value="">— none (use step agent) —</option>
                {crews.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            {crew && (
              <div className="text-[10px] mt-1 text-right" style={{ color: 'var(--muted)' }}>
                {crews.find(c => c.name === crew)?.description || 'Runs this step via select_crew → spawn_run(agent=' + crew + ')'}
              </div>
            )}
          </div>

          {/* Addendum crews (Model 2): cross-cutting passes run AFTER the canon crew, gated by `when`. */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Addendum crews</label>
              <button onClick={addAddendum} disabled={addenda.length >= 3}
                className="text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40"
                style={{ color: 'var(--accent)', border: '1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))' }}>+ addendum</button>
            </div>
            <div className="text-[10px] mb-1.5" style={{ color: 'var(--muted)' }}>
              Run after the canon crew as separate passes (e.g. research, secure-design). Max 3.
            </div>
            {addenda.length === 0 && (
              <div className="text-[11px] italic" style={{ color: 'var(--muted)' }}>none</div>
            )}
            {addenda.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 mb-1.5">
                <select value={a.crew} onChange={e => updateAddendum(i, { crew: e.target.value })}
                  className="flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none"
                  style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  {crews.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <select value={a.when || 'always'} onChange={e => updateAddendum(i, { when: e.target.value })}
                  title="Integration trigger — when this addendum runs"
                  className="px-1.5 py-1 rounded-md text-[11px] outline-none"
                  style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  <option value="always">always</option>
                  <option value="depth:deep">depth:deep</option>
                  <option value="kind:bug">kind:bug</option>
                  <option value="manual">manual</option>
                </select>
                <input value={a.writes || ''} onChange={e => updateAddendum(i, { writes: e.target.value })}
                  placeholder="writes (e.g. research.md)"
                  className="w-32 px-2 py-1 rounded-md text-[11px] outline-none"
                  style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <button onClick={() => removeAddendum(i)} className="w-5 h-5 flex items-center justify-center flex-shrink-0" style={{ color: 'var(--muted)' }} aria-label="Remove addendum">
                  <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </button>
              </div>
            ))}
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
              crew: crew || undefined,
              addenda: addenda.length ? addenda.filter(a => a.crew) : undefined,
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

function PipelineSetupModal({ candidates, existingRepos, defaults, knownAgents, crews, onCreate, onClose, editPipeline, cardCount, isExample, onDelete }: {
  candidates: RepoCandidate[]
  existingRepos: Set<string>
  defaults: PipelineConfig
  knownAgents: string[]
  crews: { name: string; description?: string }[]
  onCreate: (p: { repo: string; source: RepoCandidate['source']; trust: Trust; depth: Depth; backlog_intake: boolean; steps: PipelineStep[] }) => void
  onClose: () => void
  editPipeline?: Pipeline          // when set, the modal is in EDIT mode
  cardCount?: number               // cards in the pipeline (for the Danger Zone copy)
  isExample?: boolean
  onDelete?: (repo: string) => void
}) {
  const isEdit = !!editPipeline
  const [repo, setRepo] = useState(editPipeline?.repo || '')
  const [source, setSource] = useState<RepoCandidate['source']>(editPipeline?.source || 'manual')
  const [trust, setTrust] = useState<Trust>(editPipeline?.trust || defaults.trust)
  const [depth, setDepth] = useState<Depth>(editPipeline?.depth || defaults.depth)
  const [backlog, setBacklog] = useState(editPipeline?.backlog_intake ?? true)
  const [steps, setSteps] = useState<PipelineStep[]>(() => (editPipeline?.steps?.length ? editPipeline.steps.map(s => ({ ...s })) : DEFAULT_STEPS.map(s => ({ ...s }))))
  const [editingAgentIdx, setEditingAgentIdx] = useState<number | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [modalView, setModalView] = useState<'settings' | 'danger'>('settings')

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
  // Accept a pasted GitHub/GitLab URL OR a bare owner/name and normalize to "owner/name".
  // e.g. https://github.com/hai-dvash/repo(.git)(/…) -> hai-dvash/repo
  const normalizeRepoInput = (raw: string): string => {
    let s = (raw || '').trim()
    if (!s) return ''
    const m = s.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i)
    if (m) s = m[1]
    return s.replace(/\.git$/i, '').replace(/\/+$/, '')
  }
  const onRepoInput = (raw: string) => {
    const looksUrl = /github\.com|gitlab\.com/i.test(raw)
    setRepo(looksUrl ? normalizeRepoInput(raw) : raw)
    setSource(looksUrl ? 'manual' : 'manual')
  }
  const valid = /^[^/\s]+\/[^/\s]+$/.test(normalizeRepoInput(repo)) || candidates.some(c => c.repo === repo)
  const dup = !isEdit && existingRepos.has(normalizeRepoInput(repo))

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
              model: steps[editingAgentIdx]?.agent?.model,
              crew: steps[editingAgentIdx]?.agent?.crew,
              addenda: steps[editingAgentIdx]?.addenda,
              trust: steps[editingAgentIdx]?.trust,
              depth: steps[editingAgentIdx]?.depth,
            }}
            knownAgents={knownAgents}
            crews={crews}
            repo={repo}
            stepName={steps[editingAgentIdx]?.name || ''}
            onClose={() => setEditingAgentIdx(null)}
            onSave={(a) => {
              updateStep(editingAgentIdx, {
                agent: { name: a.name, role: a.role, tools: a.tools, model: a.model, crew: a.crew },
                addenda: a.addenda,
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
            <div className="text-base font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>{isEdit ? 'Edit Pipeline' : 'New Pipeline'}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{isEdit ? (repo.includes('/') ? repo.split('/')[1] : repo) : 'Configure a pipeline for a repository or workspace'}</div>
          </div>
          <button onClick={onClose} className="text-lg leading-none px-2" style={{ color: 'var(--muted)' }}>×</button>
        </div>

        {/* Edit-mode tabs: Settings | Danger Zone (same modal, separate pages) */}
        {isEdit && (
          <div className="px-5 pt-3 flex gap-1" style={{ borderBottom: '1px solid var(--border)' }}>
            {(['settings', 'danger'] as const).map(v => {
              const on = modalView === v
              const isDanger = v === 'danger'
              return (
                <button key={v} onClick={() => setModalView(v)}
                  className="text-[12px] px-3 py-2 font-semibold transition-all"
                  style={{
                    color: on ? (isDanger ? 'var(--danger, #ef4444)' : 'var(--accent)') : 'var(--muted)',
                    borderBottom: `2px solid ${on ? (isDanger ? 'var(--danger, #ef4444)' : 'var(--accent)') : 'transparent'}`,
                    marginBottom: '-1px',
                  }}>
                  {v === 'settings' ? 'Settings' : 'Danger Zone'}
                </button>
              )
            })}
          </div>
        )}

        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1"
          style={{ display: isEdit && modalView === 'danger' ? 'none' : 'flex' }}>
          {/* Repo picker */}
          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Repository — paste a GitHub URL or owner/name</label>
            <input
              value={repo}
              onChange={e => onRepoInput(e.target.value)}
              onPaste={e => { const t = e.clipboardData.getData('text'); if (/github\.com|gitlab\.com/i.test(t)) { e.preventDefault(); onRepoInput(t) } }}
              placeholder="https://github.com/owner/name  ·  or  owner/name"
              disabled={isEdit}
              className="mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60"
              style={{ background: 'var(--bg-elevated, var(--bg))', border: `1px solid ${dup ? 'var(--danger)' : 'var(--border)'}`, color: 'var(--text)' }}
            />
            {!isEdit && repo && normalizeRepoInput(repo) !== repo && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>→ <code style={{ color: 'var(--accent)' }}>{normalizeRepoInput(repo)}</code></div>
            )}
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
                    <div className="mt-1.5 pl-5 flex items-center gap-2 flex-wrap">
                      <button onClick={() => setEditingAgentIdx(i)}
                        className="text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5"
                        style={{ background: 'var(--bg-hover, var(--border))', color: 'var(--accent)' }}>
                        ⚙ {s.agent?.name ? `Agent: ${s.agent.name}` : 'Configure agent'}
                      </button>
                      {/* Phase trigger: which engine runs this step (else ask at runtime). Editable/visible per §4. */}
                      <span className="text-[9px] uppercase" style={{ color: 'var(--muted)' }}>trigger</span>
                      <select value={s.trigger || 'ask'} onChange={e => updateStep(i, { trigger: (e.target.value === 'ask' ? undefined : e.target.value) as PipelineStep['trigger'] })}
                        title="Which engine runs this phase (ask = prompt at runtime)"
                        className="text-[10px] px-1 py-0.5 rounded outline-none" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                        <option value="ask">ask</option>
                        <option value="spec-builder">Spec Builder</option>
                        <option value="task-runner">Task Runner</option>
                        <option value="inline">inline</option>
                        <option value="skip">skip</option>
                      </select>
                      {(s.trust || s.depth) && (
                        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                          {[s.trust, s.depth].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {s.addenda && s.addenda.length > 0 && (
                        <span className="text-[10px]" style={{ color: 'var(--accent)' }}>+{s.addenda.length} addendum{s.addenda.length === 1 ? '' : 's'}</span>
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

        {/* Danger Zone tab (edit mode). Examples: one-click "Remove Example".
            Real pipelines: type-to-confirm delete. */}
        {isEdit && modalView === 'danger' && onDelete && (() => {
          const dzName = repo.includes('/') ? repo.split('/')[1] : repo
          const canDelete = confirmText.trim() === dzName
          return (
            <div className="px-5 pb-4 pt-4">
              {isExample ? (
                <div className="rounded-lg p-4 flex flex-col gap-3"
                  style={{ border: '1px solid var(--border-strong, var(--border))', background: 'var(--bg-elevated, transparent)' }}>
                  <div className="text-[12px]" style={{ color: 'var(--text, var(--muted))' }}>
                    This is a bundled <strong>example</strong> pipeline ({cardCount ?? 0} sample card{(cardCount ?? 0) === 1 ? '' : 's'}). Remove it any time — it's demo data, not real work.
                  </div>
                  <button
                    onClick={() => { onDelete(repo); onClose() }}
                    className="w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all"
                    style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                  >
                    Remove Example
                  </button>
                </div>
              ) : (
                <div className="rounded-lg p-4 flex flex-col gap-3"
                  style={{ border: '1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))', background: 'color-mix(in srgb, var(--danger, #ef4444) 6%, transparent)' }}>
                  <div className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--danger, #ef4444)' }}>Danger Zone</div>
                  <div className="text-[12px]" style={{ color: 'var(--text, var(--muted))' }}>
                    Deleting removes this pipeline and its {cardCount ?? 0} card{(cardCount ?? 0) === 1 ? '' : 's'} from DLC-YOLO's local state.
                    It does <strong>not</strong> touch GitHub issues or labels. This cannot be undone.
                  </div>
                  <label className="text-[11px]" style={{ color: 'var(--muted)' }}>
                    Type <code className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-hover, var(--border))', color: 'var(--text-strong, var(--text))' }}>{dzName}</code> to confirm:
                  </label>
                  <input
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder={dzName}
                    className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                    style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border-strong, var(--border))', color: 'var(--text-strong, var(--text))' }}
                  />
                  <button
                    disabled={!canDelete}
                    onClick={() => { onDelete(repo); onClose() }}
                    className="w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all"
                    style={{
                      background: canDelete ? 'var(--danger, #ef4444)' : 'color-mix(in srgb, var(--danger, #ef4444) 20%, transparent)',
                      color: canDelete ? '#fff' : 'var(--muted)',
                      cursor: canDelete ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Delete pipeline
                  </button>
                </div>
              )}
            </div>
          )
        })()}

        {/* Footer */}
        <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated, var(--card))' }}>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md font-medium" style={{ color: 'var(--muted)' }}>Cancel</button>
          {!(isEdit && modalView === 'danger') && (
          <button
            disabled={!valid || (!isEdit && dup)}
            onClick={() => onCreate({
              repo: normalizeRepoInput(repo), source, trust, depth, backlog_intake: backlog,
              steps: steps.map(s => ({ ...s, label: `dlc:${s.id}` })),
            })}
            className="text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            {isEdit ? 'Save Pipeline' : 'Create Pipeline'}
          </button>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  )
}

// --- Pipeline Edit Modal (opened from the rail pencil) ---
// Shows pipeline summary + a Danger Zone whose "Delete pipeline" button stays disabled
// until the user types the exact pipeline name — a type-to-confirm safety gate.
function PipelineEditModal({ repo, cardCount, isExample, onDelete, onClose }: {
  repo: string
  cardCount: number
  isExample: boolean
  onDelete: (repo: string) => void
  onClose: () => void
}) {
  const name = repo.includes('/') ? repo.split('/')[1] : repo
  const [confirmText, setConfirmText] = useState('')
  const canDelete = confirmText.trim() === name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'color-mix(in srgb, var(--bg) 70%, black)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold truncate" style={{ color: 'var(--text-strong, var(--text))' }}>
              {isExample ? 'Example: ' : ''}{name}
            </div>
            <div className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>{repo}</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center" style={{ color: 'var(--muted)' }} aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
            {cardCount} card{cardCount === 1 ? '' : 's'} in this pipeline.
            {isExample && ' This is bundled example data — safe to remove.'}
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg p-4 flex flex-col gap-3"
            style={{ border: '1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))', background: 'color-mix(in srgb, var(--danger, #ef4444) 6%, transparent)' }}>
            <div className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--danger, #ef4444)' }}>Danger Zone</div>
            <div className="text-[12px]" style={{ color: 'var(--text, var(--muted))' }}>
              Deleting removes this pipeline and its {cardCount} card{cardCount === 1 ? '' : 's'} from DLC-YOLO's local state.
              It does <strong>not</strong> touch GitHub issues or labels. This cannot be undone.
            </div>
            <label className="text-[11px]" style={{ color: 'var(--muted)' }}>
              Type <code className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-hover, var(--border))', color: 'var(--text-strong, var(--text))' }}>{name}</code> to confirm:
            </label>
            <input
              autoFocus
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={name}
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
              style={{ background: 'var(--bg, #fff)', border: '1px solid var(--border-strong, var(--border))', color: 'var(--text-strong, var(--text))' }}
            />
            <button
              disabled={!canDelete}
              onClick={() => { onDelete(repo); onClose() }}
              className="w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all"
              style={{
                background: canDelete ? 'var(--danger, #ef4444)' : 'color-mix(in srgb, var(--danger, #ef4444) 20%, transparent)',
                color: canDelete ? '#fff' : 'var(--muted)',
                cursor: canDelete ? 'pointer' : 'not-allowed',
              }}
            >
              Delete pipeline
            </button>
          </div>
        </div>
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
  const [editRepo, setEditRepo] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<RepoCandidate[]>([])
  const [crews, setCrews] = useState<{ name: string; description?: string }[]>([])
  const kanbanRef = useRef<HTMLDivElement>(null)

  const fetchCards = useCallback(async () => {
    try {
      let data
      try {
        data = await api.get('/api/file-read?path=' + encodeURIComponent(STATE_PATH))
      } catch (primaryErr) {
        // durable path not present/readable yet — fall back to the ephemeral /tmp
        // location (mirrors the cron's resolution order) and pin it for all sites.
        if (STATE_PATH !== TMP_STATE) {
          STATE_PATH = TMP_STATE
          data = await api.get('/api/file-read?path=' + encodeURIComponent(STATE_PATH))
        } else {
          throw primaryErr
        }
      }
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

  // Load the KiroCrew crew roster (config.json `agents` map) once, for the step Crew dropdown.
  // The UI reads config.json directly (same pattern as workspaces); select_crew binds these at run time.
  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.get('/api/file-read?path=~/.kiro/crew/config.json')
        const agents = cfg?.agents || {}
        const list = Object.entries(agents).map(([name, v]: [string, any]) => ({
          name, description: v?.description || undefined,
        }))
        setCrews(list)
      } catch (e) { console.warn('crew roster (config.json) unreadable:', e) }
    })()
  }, [api])

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
      const state = await api.get('/api/file-read?path=' + encodeURIComponent(STATE_PATH))
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
      await api.post('/api/file-write', { path: STATE_PATH, content: JSON.stringify(state, null, 2) })
      fetchCards()
    } catch (e) {
      console.error('Failed to advance card:', e)
    }
  }, [api, fetchCards])

  const rejectCard = useCallback(async (cardId: string) => {
    try {
      const state = await api.get('/api/file-read?path=' + encodeURIComponent(STATE_PATH))
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
      await api.post('/api/file-write', { path: STATE_PATH, content: JSON.stringify(state, null, 2) })
      fetchCards()
    } catch (e) {
      console.error('Failed to reject card:', e)
    }
  }, [api, fetchCards])

  const mutateState = useCallback(async (mutator: (state: { config?: PipelineConfig; pipelines?: Pipeline[]; cards: PipelineCard[] }) => void) => {
    try {
      const state = await api.get('/api/file-read?path=' + encodeURIComponent(STATE_PATH))
      state.cards = state.cards || []
      mutator(state)
      await api.post('/api/file-write', { path: STATE_PATH, content: JSON.stringify(state, null, 2) })
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
      const existing = state.pipelines.find((pl: Pipeline) => pl.repo === p.repo)
      if (existing) {
        // Edit mode: update the existing pipeline in place.
        existing.source = p.source
        existing.trust = p.trust
        existing.depth = p.depth
        existing.backlog_intake = p.backlog_intake
        existing.steps = p.steps
      } else {
        state.pipelines.push({
          id, repo: p.repo, source: p.source,
          trust: p.trust, depth: p.depth, backlog_intake: p.backlog_intake,
          sot: 'github', steps: p.steps,
          created_at: now,
        })
      }
    })
    setSetupOpen(false)
    setEditRepo(null)
    setRepoFilter(new Set([p.repo]))
  }, [mutateState])

  // Pipeline deletion (invoked from the edit modal's type-to-confirm Danger Zone).
  // Removes the pipeline entry (if any) AND every card for that repo. Does not touch GitHub.
  const deletePipeline = useCallback(async (repo: string) => {
    await mutateState(state => {
      state.pipelines = (state.pipelines || []).filter((pl: Pipeline) => pl.repo !== repo)
      state.cards = (state.cards || []).filter((c: PipelineCard) => (c.source?.repo || 'unlinked') !== repo)
    })
    setRepoFilter(prev => { const n = new Set(prev); n.delete(repo); return n })
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
          crews={crews}
          onCreate={createPipeline}
          onClose={() => setSetupOpen(false)}
        />
      )}
      {editRepo && (
        <PipelineSetupModal
          candidates={candidates}
          existingRepos={new Set(pipelines.map(p => p.repo))}
          defaults={config}
          knownAgents={['spec-agent', 'design-agent', 'impl-agent', 'review-agent', 'orchestrator']}
          crews={crews}
          editPipeline={
            pipelines.find(p => p.repo === editRepo) ||
            // demo repos have cards but no pipelines[] entry — synthesize a default to edit
            { id: 'pl-' + editRepo, repo: editRepo, source: 'manual', trust: config.trust, depth: config.depth, backlog_intake: true, sot: 'github', steps: DEFAULT_STEPS.map(s => ({ ...s })), created_at: new Date().toISOString() }
          }
          cardCount={allCards.filter(c => (c.source?.repo || 'unlinked') === editRepo).length}
          isExample={EXAMPLE_REPOS.has(editRepo)}
          onCreate={createPipeline}
          onDelete={deletePipeline}
          onClose={() => setEditRepo(null)}
        />
      )}
      <div className="px-6 pb-8 overflow-y-auto flex-1 min-h-0">
        <PipelineWorld steps={activeSteps} cardsByStage={cardsByStage} onNodeClick={scrollToStage} />

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
            onEdit={setEditRepo}
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
