import { useAppApi, useNavigate, useChatLauncher } from '@kirocrew/app-sdk'
import { Card, CardTitle, PageHeader, StatCard } from '@kirocrew/app-sdk/ui'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { appendLiveTail, beginLiveThinking, finishLiveTail } from './liveTail.js'
import { buildGateInspection, gateValue } from './gateInspection.js'
import { DURABLE_STATE, readCurrentState, resolveStateFile } from './statePath.js'
import { DlcYoloControls, WebhookSettingsSection } from './WebhookSettings.js'
import { CardBudgetEditor } from './CardBudgetEditor.js'
import { CARD_STATUS_META, CARD_STATUS_ORDER, deriveCardStatus } from './cardStatus.js'
import { projectCardTimeline, resolveChildren, resolveParentId } from './cardTimeline.js'
import { projectPipelineEvents, ACTOR_GLYPH } from './pipelineEventTree.js'
import { REQUEST_META, newRequestId, buildRequest, appendRequest } from './maintenanceRequests.js'
import { aggregateRuntime, projectionStatusView, RUNTIME_BUCKETS } from './operationsProjection.js'
import { AgentCrewCatalogModal, type AgentProfile, type CrewRecord, type CrewRouteDraft } from './AgentCrewCatalog.js'
import { applyAgentProfileToDraft, catalogProfileNames, normalizeAgentProfile, normalizeCrewRecords, profileDeclarationPath } from './agentCatalog.js'

// --- State file location ---------------------------------------------------
// The runtime publishes its validated absolute DLC_YOLO_STATE authority through a bounded,
// atomic 0600 pointer. Missing, malformed, relative, or stale pointers retain the historical
// durable→/tmp probes, so default installs behave exactly as before without split-brain under
// an explicit override.
let STATE_PATH = DURABLE_STATE

// --- Types ---
type Trust = 'manual' | 'assisted' | 'autonomous'
type Depth = 'quick' | 'standard' | 'deep'
type BudgetMode = 'depth' | 'custom' | 'unlimited'
type FeatureSize = 'S' | 'M' | 'L' | 'XL'
type AddendaBudget = 'none' | 'obvious' | 'proactive'
type Capability = 'readonly' | 'authoring' | 'builder' | 'coordinator'

interface Budget {
  max_child_cards: number | 'unlimited'
  effort_ceiling: number | 'unlimited'
  max_feature_size: FeatureSize
  addenda: AddendaBudget
}

const budgetForDepth = (depth: Depth): Budget => ({
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: 'S', addenda: 'none' },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: 'L', addenda: 'obvious' },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: 'XL', addenda: 'proactive' },
}[depth])

interface ParkedIdea {
  id: string
  note: string
  issue_url?: string
  at: string
  phase?: string
}

interface StepSessionPointer {
  agent_id?: string
  session_key?: string
  slot_key?: string
  cron_id?: string
  agent?: string
  name?: string
  at?: string
  kept?: boolean
  retired_at?: string
  superseded?: string
  chat_disabled_at?: string
  last_response_at?: string
  last_response_handled_at?: string
  response_routed_at?: string
  response_routed_to_step?: string
  retention?: string
  retained_for_gate?: string
  retained_at?: string
  release_after?: string
  retention_handoff_at?: string
  retention_released_at?: string
  writes_allowed?: boolean
  cancel_requested_at?: string
}

interface GateResultBundle {
  summary?: string
  artifacts?: unknown[]
  changes_since_prior?: unknown[]
  intent_and_requirement_coverage?: unknown[]
  decisions_and_questions?: unknown[]
  alternatives?: unknown[]
  research_and_citations?: unknown[]
  card_topology?: Record<string, unknown>
  budget?: { allocated?: unknown; consumed?: unknown; remaining?: unknown }
  routing_and_provenance?: Record<string, unknown>
  validation_and_evidence?: unknown[]
  known_risks?: unknown[]
  omissions_and_deviations?: unknown[]
}

interface GateReview {
  gate?: string
  producer_step?: string
  producer_session_ref?: string
  envelope_id?: string
  result_revision?: number
  status?: string
  bundle?: GateResultBundle
  created_at?: string
}

interface GateCommand {
  id: string
  gate: string
  action: 'approve' | 'reject' | 'interject'
  expected_revision: number | null
  actor: string
  at: string
  status: 'pending' | 'applied' | 'approved' | 'rejected' | 'consumed'
  reason?: string
  rejection_reason?: string
  processed_at?: string
  kind?: string
  text?: string
}

interface PipelineCard {
  id: string
  title: string
  stage: string
  trust?: Trust
  depth?: Depth
  budget?: Budget
  capability?: Capability
  sot?: 'github' | 'local'
  pipeline_id?: string
  source: { type?: string; repo?: string; issue?: number; url?: string }
  created_at: string
  updated_at: string
  artifacts: Record<string, unknown>
  step_status?: Record<string, string>
  step_summaries?: Record<string, { step?: string; status?: string; headline?: string; description?: string; executor?: string | null; needs_human?: boolean; synthesized?: boolean; at?: string }>
  block_reason?: Record<string, string>
  error_reason?: Record<string, string>
  retry_count?: Record<string, number>
  execution_schedule?: { schema_version?: number; current_node_id?: string; nodes?: Record<string, Record<string, unknown>> }
  pending_at?: Record<string, string>
  step_sessions?: Record<string, StepSessionPointer>
  successor_receipts?: Record<string, { producer_step?: string; successor_step?: string; received_at?: string }>
  gate_review?: GateReview
  gate_commands?: GateCommand[]
  runtime_handshakes?: Record<string, Record<string, unknown>>
  runtime_handshake?: Record<string, unknown>
  orchestrator_session?: { agent_id?: string; session_key?: string; slot_key?: string; cron_id?: string; name?: string; at?: string; warm?: boolean; pipeline_id?: string; ref?: boolean }
  lifecycle?: string
  interjection?: Array<{ id?: string; at: string; step?: string; kind: string; text: string; by?: string; status?: string; result_revision?: number }>
  gate_history: Array<{ gate: string; decision: string; at: string; notes: string; command_id?: string; actor?: string; result_revision?: number }>
  trigger_history?: Array<{ phase: string; trigger: string; at: string }>
  effort?: {
    features?: Array<{ id: string; note: string; size: string; points: number }>
    total?: number
    scope?: Record<string, number>
  }
  backstep_history?: Array<{ from: string; to: string; reason: string; at: string }>
  decisions?: Array<{ id: string; at: string; step?: string; raised_by?: string; kind?: string; question?: string; options?: Array<{ id?: string; note?: string; risk?: string }>; chosen?: string; rationale?: string; action?: string; enhancement?: { target_step?: string; add_step?: string; crew?: string }; resolved_at?: string; confidence?: string }>
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
  reviews_step?: string
  agent?: StepAgent
  addenda?: Addendum[]
  trigger?: 'ask' | 'spec-builder' | 'task-runner' | 'inline' | 'skip'  // default engine for this phase (ask = prompt at runtime)
  capability?: Capability
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
  repo_path?: string
  workspace?: string
  source?: 'issue-radar' | 'workspace' | 'manual'
  trust?: Trust
  depth?: Depth
  budget?: Budget
  backlog_intake?: boolean
  results_in_repo?: boolean
  conversation_log?: boolean
  trusted_authors?: string[]
  self_enabling?: boolean
  approach?: 'simplified' | 'enhanced'
  sync_mode?: 'poll' | 'webhook'
  webhook_reconcile_interval_secs?: number
  sot?: 'github' | 'local'
  steps?: PipelineStep[]
  orchestrator_session?: { session_key?: string; slot_key?: string; cron_id?: string; name?: string; at?: string; released?: boolean }
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
  'example-org/web-app',
  'example-org/dashboard',
  'example-org/api-core',
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

type ViewMode = 'pipeline' | 'workspace' | 'crew' | 'status'

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

type GateInspectionView = ReturnType<typeof buildGateInspection>
type GateInspectionRow = { key: string; title: string; detail?: string | null; status?: string | null; level?: string | null; ref?: string | null; url?: string | null }

function GateInspectionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg p-3" style={{ background: 'var(--bg, transparent)', border: '1px solid var(--border)' }}>
      <h3 className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--muted)' }}>{title}</h3>
      {children}
    </section>
  )
}

function GateInspectionRows({ rows, empty = 'None recorded' }: { rows: GateInspectionRow[]; empty?: string }) {
  if (!rows.length) return <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{empty}</div>
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(row => (
        <div key={row.key} className="rounded-md px-2 py-1.5" style={{ background: 'var(--bg-elevated, var(--card))', border: '1px solid color-mix(in srgb, var(--border) 78%, transparent)' }}>
          <div className="flex items-start gap-2 text-[11px]">
            <span className="font-medium min-w-0 break-words" style={{ color: 'var(--text)' }}>{row.title}</span>
            <span className="ml-auto flex gap-1 flex-shrink-0">
              {row.level && <span className="px-1 py-0.5 rounded text-[9px] font-semibold" style={{ color: row.level === 'required' ? 'var(--warn)' : 'var(--muted)', background: 'var(--bg-hover, var(--border))' }}>{row.level}</span>}
              {row.status && <span className="px-1 py-0.5 rounded text-[9px] font-semibold" style={{ color: /fail|block|open|pending/i.test(row.status) ? 'var(--warn)' : 'var(--ok)', background: 'var(--bg-hover, var(--border))' }}>{row.status}</span>}
            </span>
          </div>
          {row.detail && <div className="mt-0.5 text-[10px] break-words" style={{ color: 'var(--muted)' }}>{row.detail}</div>}
          {row.ref && (row.url
            ? <a href={row.url} target="_blank" rel="noreferrer" className="mt-1 block text-[10px] underline break-all" style={{ color: 'var(--accent)' }}>{row.ref}</a>
            : <code className="mt-1 block text-[10px] break-all" style={{ color: 'var(--muted)' }}>{row.ref}</code>)}
        </div>
      ))}
    </div>
  )
}

function GateDatum({ label, value, status }: { label: string; value: unknown; status?: unknown }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-[11px] mt-0.5 break-words" style={{ color: gateValue(value) === 'unobservable' ? 'var(--warn)' : 'var(--text)' }}>
        {gateValue(value)}
        {status && <span className="ml-1 text-[9px]" style={{ color: 'var(--muted)' }}>({gateValue(status)})</span>}
      </div>
    </div>
  )
}

function GateInspectionDialog({ card, inspection, producerSession, onClose, onOpenProducer, onApprove, onReject, onInterject }: {
  card: PipelineCard
  inspection: GateInspectionView
  producerSession?: { step: string; slotKey: string; retained: boolean }
  onClose: () => void
  onOpenProducer?: () => void
  onApprove?: () => void
  onReject?: (reason: string) => void
  onInterject?: () => void
}) {
  const routing = inspection.routing
  const requestReject = () => {
    const reason = window.prompt(`Why reject revision ${inspection.revision ?? 'unknown'}?`)
    if (reason?.trim() && onReject) {
      onReject(reason.trim())
      onClose()
    }
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(4px)' }}
      onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby={`gate-inspection-${card.id}`}
        className="flex flex-col rounded-xl overflow-hidden"
        style={{ width: 'min(860px, calc(100vw - 32px))', maxHeight: 'min(88vh, 860px)', background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 28px 90px rgba(0,0,0,0.5)' }}>
        <header className="px-5 py-4 flex items-start gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id={`gate-inspection-${card.id}`} className="text-[15px] font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>Gate result inspection</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: inspection.ready ? 'var(--ok)' : 'var(--warn)', background: `color-mix(in srgb, ${inspection.ready ? 'var(--ok)' : 'var(--warn)'} 14%, transparent)` }}>
                {inspection.ready ? 'review-ready' : 'not review-ready'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)' }}>
                revision {inspection.revision ?? 'unobservable'}
              </span>
            </div>
            <div className="text-[12px] mt-1 truncate" style={{ color: 'var(--text)' }}>{card.title}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
              {inspection.gate || card.stage} reviews {inspection.producerStep || 'unobservable producer'} · status {inspection.reviewStatus}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close gate inspection" className="w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none"
            style={{ color: 'var(--muted)', background: 'var(--bg-hover, transparent)', border: '1px solid var(--border)' }}>×</button>
        </header>

        <div className="overflow-y-auto p-4 flex flex-col gap-3">
          <div className="rounded-lg p-3" style={{ background: inspection.ready ? 'color-mix(in srgb, var(--ok) 8%, transparent)' : 'color-mix(in srgb, var(--warn) 8%, transparent)', border: `1px solid color-mix(in srgb, ${inspection.ready ? 'var(--ok)' : 'var(--warn)'} 38%, var(--border))` }}>
            <div className="text-[11px] font-semibold" style={{ color: inspection.ready ? 'var(--ok)' : 'var(--warn)' }}>
              {inspection.ready ? 'Bundle is structurally ready for review' : `${inspection.missing.length} readiness gap${inspection.missing.length === 1 ? '' : 's'}`}
            </div>
            {!inspection.ready && (
              <ul className="mt-1.5 pl-4 list-disc text-[10px] space-y-0.5" style={{ color: 'var(--muted)' }}>
                {inspection.missing.map((item: string) => <li key={item}>{item}</li>)}
              </ul>
            )}
            {inspection.preferredShortfalls.length > 0 && (
              <div className="mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>
                Preferred shortfalls (non-blocking): {inspection.preferredShortfalls.join(' · ')}
              </div>
            )}
            <div className="text-[9px] mt-2" style={{ color: 'var(--muted)' }}>Inspection is read-only; deterministic runtime remains authoritative for movement and readiness enforcement.</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <GateInspectionSection title="Result summary">
              <div className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: inspection.summary ? 'var(--text)' : 'var(--warn)' }}>
                {inspection.summary || 'No result summary was published.'}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <GateDatum label="Envelope" value={inspection.envelopeId} />
                <GateDatum label="Created" value={inspection.createdAt} />
              </div>
            </GateInspectionSection>
            <GateInspectionSection title="Changes since prior revision">
              <GateInspectionRows rows={inspection.changes} empty="No revision delta recorded" />
            </GateInspectionSection>
          </div>

          <GateInspectionSection title="Artifacts and evidence references">
            {inspection.artifacts.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {inspection.artifacts.map((artifact: { key: string; label: string; ref: string | null; url: string | null; preview: string | null; kind: string | null; status: string | null }) => (
                  <div key={artifact.key} className="rounded-md p-2" style={{ background: 'var(--bg-elevated, var(--card))', border: '1px solid var(--border)' }}>
                    <div className="flex gap-2 text-[11px]"><span className="font-medium" style={{ color: 'var(--text)' }}>{artifact.label}</span>{artifact.kind && <span className="ml-auto text-[9px]" style={{ color: 'var(--muted)' }}>{artifact.kind}</span>}</div>
                    {artifact.preview && <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>{artifact.preview}</div>}
                    {artifact.ref && (artifact.url
                      ? <a href={artifact.url} target="_blank" rel="noreferrer" className="mt-1 block text-[10px] underline break-all" style={{ color: 'var(--accent)' }}>{artifact.ref}</a>
                      : <code className="mt-1 block text-[10px] break-all" style={{ color: 'var(--muted)' }}>{artifact.ref}</code>)}
                  </div>
                ))}
              </div>
            ) : <div className="text-[11px]" style={{ color: 'var(--warn)' }}>No referenced artifacts were published.</div>}
          </GateInspectionSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <GateInspectionSection title="Alternatives and trade-offs">
              <GateInspectionRows rows={inspection.alternatives} empty="No alternatives published" />
            </GateInspectionSection>
            <GateInspectionSection title="Research and citations">
              <GateInspectionRows rows={inspection.research} empty="No research passes published" />
            </GateInspectionSection>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <GateInspectionSection title="Intent and requirement coverage">
              <GateInspectionRows rows={inspection.coverage} empty="No coverage records published" />
            </GateInspectionSection>
            <GateInspectionSection title="Omissions and deviations">
              <GateInspectionRows rows={inspection.deviations} empty="No omissions or deviations recorded" />
            </GateInspectionSection>
          </div>

          <GateInspectionSection title="Card topology and integration">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <GateDatum label="Action" value={inspection.topology.action} />
              <GateDatum label="Integration owner" value={inspection.topology.integrationOwner} />
              <GateDatum label="Integration status" value={inspection.topology.integrationStatus} />
              <GateDatum label="Required children incomplete" value={inspection.topology.incompleteRequiredChildren.length} />
            </div>
            {inspection.topology.children.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {inspection.topology.children.map((child: { key: string; label: string; required: boolean; status: string }) => (
                  <div key={child.key} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]" style={{ background: 'var(--bg-elevated, var(--card))', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text)' }}>{child.label}</span>
                    <span className="ml-auto text-[9px]" style={{ color: child.required ? 'var(--warn)' : 'var(--muted)' }}>{child.required ? 'required' : 'optional'}</span>
                    <span className="text-[9px]" style={{ color: /done|advanced|complete|consume|integrate|waive|omit/i.test(child.status) ? 'var(--ok)' : 'var(--warn)' }}>{child.status}</span>
                  </div>
                ))}
              </div>
            ) : <div className="text-[11px]" style={{ color: 'var(--muted)' }}>No child topology recorded.</div>}
          </GateInspectionSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <GateInspectionSection title="Budget consumption">
              <div className="grid grid-cols-1 gap-3">
                <GateDatum label="Allocated" value={inspection.budget.allocated} />
                <GateDatum label="Consumed" value={inspection.budget.consumed} />
                <GateDatum label="Remaining" value={inspection.budget.remaining} />
              </div>
            </GateInspectionSection>
            <GateInspectionSection title="Routing and runtime provenance">
              <div className="grid grid-cols-2 gap-3">
                <GateDatum label="Assigned profile" value={routing.assignedProfile} />
                <GateDatum label="Effective profile" value={routing.effectiveProfile} />
                <GateDatum label="Model requested" value={routing.model.requested} />
                <GateDatum label="Model applied" value={routing.model.applied} status={routing.model.status} />
                <GateDatum label="Provider / version" value={routing.model.provider || routing.model.version ? [routing.model.provider, routing.model.version].filter(Boolean) : null} />
                <GateDatum label="Effort requested" value={routing.effort.requested} />
                <GateDatum label="Effort applied" value={routing.effort.applied} status={routing.effort.status} />
                <GateDatum label="Tools available" value={routing.tools.actual} status={routing.tools.status} />
                <GateDatum label="Skills available" value={routing.skills.actual} status={routing.skills.status} />
                <GateDatum label="Network scope" value={routing.network.actual} status={routing.network.status} />
                <GateDatum label="Write scope" value={routing.write.actual} status={routing.write.status} />
                <GateDatum label="Worktree / branch" value={routing.worktree} />
              </div>
            </GateInspectionSection>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <GateInspectionSection title="Validation and evidence">
              <GateInspectionRows rows={inspection.validation} empty="No validation results published" />
            </GateInspectionSection>
            <GateInspectionSection title="Known risks">
              <GateInspectionRows rows={inspection.risks} empty="No known risks recorded" />
            </GateInspectionSection>
            <GateInspectionSection title="Open decisions and questions">
              <GateInspectionRows rows={inspection.decisions} empty="No open decisions recorded" />
            </GateInspectionSection>
          </div>
        </div>

        <footer className="px-5 py-3 flex items-center gap-2 flex-wrap" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated, var(--bg))' }}>
          {onApprove && <button onClick={() => { onApprove(); onClose() }} className="text-[11px] px-3 py-1.5 rounded-md font-semibold" style={{ background: 'var(--ok)', color: 'var(--bg)' }}>Approve{inspection.revision != null ? ` r${inspection.revision}` : ''}</button>}
          {onReject && <button onClick={requestReject} className="text-[11px] px-3 py-1.5 rounded-md font-semibold" style={{ background: 'var(--danger)', color: 'var(--bg)' }}>Reject{inspection.revision != null ? ` r${inspection.revision}` : ''}</button>}
          {onInterject && <button onClick={onInterject} className="text-[11px] px-3 py-1.5 rounded-md font-semibold" style={{ background: 'var(--bg-hover, var(--border))', color: 'var(--accent)', border: '1px solid var(--border)' }}>Interject on this revision</button>}
          {producerSession && onOpenProducer && <button onClick={onOpenProducer} className="text-[11px] px-3 py-1.5 rounded-md font-semibold" style={{ background: 'var(--bg-hover, var(--border))', color: 'var(--accent)', border: '1px solid var(--border)' }}>Open producer · {producerSession.step}</button>}
          <span className="ml-auto text-[9px]" style={{ color: 'var(--muted)' }}>{inspection.producerSessionRef || 'producer session reference unobservable'}</span>
        </footer>
      </section>
    </div>
  )
}

// --- Card Component ---
// Native maintenance controls (ui-parity §8.2/§8.3): a small menu that appends a bounded
// request:* interjection (consumed by the deterministic runtime handler). Never moves a stage.
// Self-enablement surface (ui-parity §9): four phases (read-only) + HANDOFF buttons that open
// /dlc-yolo with exact context. The browser NEVER creates crews/issues or mutates terminal markers.
function SelfEnablementSurface({ card, openChat }: {
  card: PipelineCard
  openChat: (opts: { message: string }) => void
}) {
  const boot = (card as { bootstrap?: Record<string, unknown> }).bootstrap
  const intent = (card as { intent_contract?: Record<string, unknown>; intent?: Record<string, unknown> }).intent_contract
    || (card as { intent?: Record<string, unknown> }).intent
  if (!boot && !intent) return null
  const ctx = `pipeline ${card.pipeline_id || ''} card ${card.id} (${card.title})`
  const handoff = (action: string, verb: string) => (
    <button className="text-[10px] px-2 py-0.5 rounded hover:opacity-80"
      style={{ color: 'var(--accent)', border: '1px solid var(--border)' }}
      title="Opens /dlc-yolo with this context — nothing is created in the browser"
      onClick={() => openChat({ message: `/dlc-yolo ${action} for ${ctx}` })}>
      {verb}
    </button>
  )
  const bstatus = boot ? String(boot.status || 'not-run') : 'n/a'
  const crews = Array.isArray(boot?.crews_created) ? (boot!.crews_created as unknown[]) : []
  const issues = Array.isArray(boot?.issues_opened) ? (boot!.issues_opened as unknown[]) : []
  return (
    <div className="mt-2 pt-2" style={{ borderTop: '1px dashed var(--border)' }}>
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>🌱 self-enablement</div>
      <div className="flex flex-col gap-1 text-[10px]">
        {/* 1 setup · 2 intent · 3 per-step · 4 bootstrap */}
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text)' }}>① setup</span>
          <span style={{ color: 'var(--muted)' }}>{String((card as { self_enable_mode?: string }).self_enable_mode || 'default')}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ color: 'var(--text)' }}>② intent</span>
          <span style={{ color: 'var(--muted)' }}>{intent ? String((intent as { classification?: string; status?: string }).classification || (intent as { status?: string }).status || 'present') : 'not run'}</span>
          {handoff('resolve intent', 'Resolve intent')}
          {handoff('skip intent', 'Skip intent')}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ color: 'var(--text)' }}>③ per-step</span>
          {handoff(`elaborate step ${card.stage}`, 'Elaborate step')}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ color: 'var(--text)' }}>④ bootstrap</span>
          <span style={{ color: bstatus === 'done' ? 'var(--ok)' : 'var(--muted)' }}>{bstatus}</span>
          {crews.length > 0 && <span style={{ color: 'var(--muted)' }}>· crews {crews.length}</span>}
          {issues.length > 0 && <span style={{ color: 'var(--muted)' }}>· issues {issues.length}</span>}
          {boot?.blocking_reason ? <span style={{ color: 'var(--warn)' }}>· {String(boot.blocking_reason)}</span> : null}
          {handoff('resume bootstrap', 'Resume bootstrap')}
        </div>
        {bstatus === 'done' && (
          <div className="text-[9px]" style={{ color: 'var(--muted)' }}>Replaying bootstrap is idempotent intent, not a promise.</div>
        )}
      </div>
    </div>
  )
}

// Operations panel (ui-parity §10): one read-only surface, four sections.
function OperationsPanel({ cards, schedulerState, statePath, readAppFile, onClose }: {
  cards: PipelineCard[]
  schedulerState: unknown
  statePath: string
  readAppFile: (path: string) => Promise<{ content?: string }>
  onClose: () => void
}) {
  const runtime = useMemo(() => aggregateRuntime(cards, schedulerState), [cards, schedulerState])
  const [projStatus, setProjStatus] = useState<ReturnType<typeof projectionStatusView>>(projectionStatusView(null))
  const [sessions, setSessions] = useState<Array<{ card: string; step: string; slot?: string }>>([])
  const [leases, setLeases] = useState<Array<{ card: string; branch?: string; status?: string }>>([])

  useEffect(() => {
    // §10.2 derive projections/status.json from the CURRENTLY RESOLVED state path. Re-resolve on open.
    const base = statePath.replace(/\/state\.json$/, '')
    // default workspace layout; unavailable (not "healthy") on any miss.
    const statusPath = `${base}/workspaces/default/data/ledger/projections/status.json`
    let cancelled = false
    readAppFile(statusPath)
      .then(r => { if (!cancelled) { try { setProjStatus(projectionStatusView(JSON.parse(r.content || 'null'))) } catch { setProjStatus(projectionStatusView(null)) } } })
      .catch(() => { if (!cancelled) setProjStatus(projectionStatusView(null)) })
    return () => { cancelled = true }
  }, [statePath, readAppFile])

  useEffect(() => {
    // §10.4 sessions + worktrees from recorded card state (observed facts only)
    const ss: Array<{ card: string; step: string; slot?: string }> = []
    const ls: Array<{ card: string; branch?: string; status?: string }> = []
    for (const c of cards) {
      const stepSessions = (c as { step_sessions?: Record<string, { slot_key?: string }> }).step_sessions
      if (stepSessions) for (const [step, p] of Object.entries(stepSessions)) ss.push({ card: c.id, step, slot: p?.slot_key })
      const lease = (c as { worktree_lease?: { branch?: string; status?: string } }).worktree_lease
      if (lease) ls.push({ card: c.id, branch: lease.branch, status: lease.status })
    }
    setSessions(ss.slice(0, 60)); setLeases(ls.slice(0, 60))
  }, [cards])

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>{title}</div>
      {children}
    </div>
  )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(3px)' }}
      onMouseDown={e => { if (e.currentTarget === e.target) onClose() }}>
      <section role="dialog" aria-modal="true" aria-label="Operations" className="flex flex-col rounded-xl overflow-hidden"
        style={{ width: 'min(760px, calc(100vw - 32px))', maxHeight: 'min(88vh, 880px)', background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 28px 90px rgba(0,0,0,0.5)' }}>
        <header className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[15px] font-semibold flex-1" style={{ color: 'var(--text-strong, var(--text))' }}>🛠 Operations</h2>
          <button onClick={onClose} className="text-[13px] px-2 py-0.5 rounded hover:opacity-80" style={{ color: 'var(--muted)' }} aria-label="Close">✕</button>
        </header>
        <div className="px-5 py-3 overflow-y-auto text-[11px]">
          <Section title="Runtime / scheduler">
            <div className="flex flex-wrap gap-2">
              {RUNTIME_BUCKETS.map(b => (
                <span key={b} className="px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: (runtime.counts as Record<string, number>)[b] ? 'var(--text)' : 'var(--muted)' }}>
                  {b} {(runtime.counts as Record<string, number>)[b]}
                </span>
              ))}
            </div>
            {runtime.waitReasons.length > 0 && (
              <div className="mt-2">
                {runtime.waitReasons.map((w, i) => (
                  <div key={i} style={{ color: 'var(--muted)' }}>⛔ {w.card}: {w.reason}</div>
                ))}
              </div>
            )}
          </Section>
          <Section title="Projection parity">
            {!projStatus.available ? (
              <div style={{ color: 'var(--muted)' }}>unavailable</div>
            ) : (
              <div>
                <div style={{ color: projStatus.verified ? 'var(--ok)' : 'var(--warn)' }}>
                  {projStatus.label} · authority {projStatus.authority_active ? 'active' : 'inactive'}
                </div>
                {projStatus.digest_match !== null && <div style={{ color: 'var(--muted)' }}>digest match: {String(projStatus.digest_match)}</div>}
                {projStatus.failure_code && <div style={{ color: 'var(--warn)' }}>failure: {projStatus.failure_code}</div>}
                <div className="text-[9px]" style={{ color: 'var(--muted)' }}>last-known-good runs.json preserved when blocked</div>
              </div>
            )}
          </Section>
          <Section title="Webhook">
            <WebhookSettingsSection />
          </Section>
          <Section title="Sessions & worktrees">
            <div className="mb-1" style={{ color: 'var(--muted)' }}>{sessions.length} session(s) · {leases.length} lease(s)</div>
            {sessions.slice(0, 12).map((s, i) => (
              <div key={i} style={{ color: 'var(--text)' }}>{s.card} · {s.step}{s.slot ? ` · ${s.slot}` : ''}</div>
            ))}
            {leases.slice(0, 12).map((l, i) => (
              <div key={`l${i}`} style={{ color: 'var(--muted)' }}>🌿 {l.card} · {l.branch || '—'} · {l.status || '—'}</div>
            ))}
          </Section>
        </div>
      </section>
    </div>
  )
}

// Card details drawer (ui-parity §7): four READ-ONLY tabs. No mutation, no fabricated
// model/tool/effort/timing, explicit http URLs as links, local refs shown as file references.
function _kv(label: string, value: unknown) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex gap-2 text-[11px] py-0.5">
      <span className="flex-shrink-0" style={{ color: 'var(--muted)', minWidth: '110px' }}>{label}</span>
      <span className="min-w-0 break-words" style={{ color: 'var(--text)' }}>{String(value)}</span>
    </div>
  )
}
function _isHttp(s: unknown): s is string { return typeof s === 'string' && /^https?:\/\//i.test(s) }

function CardDrawer({ card, cardStatus, effectiveCapability, onClose }: {
  card: PipelineCard
  cardStatus: { kind: string; label: string; reason?: string | null }
  effectiveCapability: string
  onClose: () => void
}) {
  const [tab, setTab] = useState<'overview' | 'results' | 'history' | 'execution'>('overview')
  const tabs: Array<[typeof tab, string]> = [
    ['overview', 'Overview'], ['results', 'Results'],
    ['history', 'Decisions & history'], ['execution', 'Execution'],
  ]
  const sched = card.execution_schedule as { current_node_id?: string; nodes?: Record<string, Record<string, unknown>> } | undefined
  const curNode = sched?.current_node_id ? sched?.nodes?.[sched.current_node_id] : undefined
  const lease = card.worktree_lease as Record<string, unknown> | undefined
  const topo = card.topology as Record<string, unknown> | undefined
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (e.currentTarget === e.target) onClose() }}>
      <section role="dialog" aria-modal="true" aria-label="Card details" className="flex flex-col rounded-xl overflow-hidden"
        style={{ width: 'min(760px, calc(100vw - 32px))', maxHeight: 'min(88vh, 860px)', background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 28px 90px rgba(0,0,0,0.5)' }}>
        <header className="px-5 py-3 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-strong, var(--text))' }}>{card.title}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{card.stage} · {cardStatus.label}</div>
          </div>
          <button onClick={onClose} className="text-[13px] px-2 py-0.5 rounded hover:opacity-80" style={{ color: 'var(--muted)' }} aria-label="Close">✕</button>
        </header>
        <nav className="flex gap-1 px-3 pt-2" style={{ borderBottom: '1px solid var(--border)' }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="text-[11px] px-2.5 py-1 rounded-t-md"
              style={{ color: tab === id ? 'var(--accent)' : 'var(--muted)',
                borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent' }}>
              {label}
            </button>
          ))}
        </nav>
        <div className="px-5 py-3 overflow-y-auto text-[11px]">
          {tab === 'overview' && (
            <div>
              {card.source?.url && _isHttp(card.source.url)
                ? _kv('source', null) || <div className="text-[11px] py-0.5"><span style={{ color: 'var(--muted)', minWidth: 110, display: 'inline-block' }}>source</span><a href={card.source.url} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: 'var(--accent)' }}>{card.source.repo}{card.source.issue ? `#${card.source.issue}` : ''}</a></div>
                : _kv('source', card.source?.repo)}
              {_kv('pipeline', card.pipeline_id)}
              {_kv('workspace', (card as { workspace?: string }).workspace)}
              {_kv('stage', card.stage)}
              {_kv('lifecycle', card.lifecycle)}
              {_kv('SoT', card.sot)}
              {_kv('status', `${cardStatus.label}${cardStatus.reason ? ` — ${cardStatus.reason}` : ''}`)}
              {_kv('trust', card.trust ? `${card.trust} (override)` : 'inherited')}
              {_kv('depth', card.depth ? `${card.depth} (override)` : 'inherited')}
              {_kv('capability', effectiveCapability)}
              {_kv('effort', card.effort ? JSON.stringify(card.effort) : null)}
              {_kv('writes_allowed', card.writes_allowed === false ? 'false (cancel requested)' : null)}
            </div>
          )}
          {tab === 'results' && (
            <div>
              {Object.entries((card.step_summaries as Record<string, { headline?: string; description?: string; executor?: string }>) || {}).map(([step, s]) => (
                <div key={step} className="mb-2">
                  <div className="font-medium" style={{ color: 'var(--text)' }}>{step}: {s?.headline || '—'}</div>
                  {s?.description && <div style={{ color: 'var(--muted)' }}>{s.description}</div>}
                  {s?.executor && <div className="text-[9px]" style={{ color: 'var(--muted)' }}>executor {s.executor}</div>}
                </div>
              ))}
              {Object.entries((card.artifacts as Record<string, unknown>) || {}).map(([k, v]) => (
                <div key={k} className="py-0.5">
                  {_isHttp(v)
                    ? <a href={v} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: 'var(--accent)' }}>{k}</a>
                    : <span style={{ color: 'var(--text)' }}>{k}: <code style={{ color: 'var(--muted)' }}>{String(v)}</code></span>}
                </div>
              ))}
              {!card.step_summaries && !card.artifacts && <div style={{ color: 'var(--muted)' }}>No results recorded.</div>}
            </div>
          )}
          {tab === 'history' && (
            <div>
              <div className="text-[10px] uppercase tracking-wider mt-1 mb-1" style={{ color: 'var(--muted)' }}>Decisions</div>
              {((card.decisions as Array<Record<string, unknown>>) || []).map((d, i) => (
                <div key={i} className="py-0.5" style={{ color: 'var(--text)' }}>
                  {String(d.status) === 'open' ? '🔴 ' : '✓ '}{String(d.kind)} — {String(d.question || d.chosen || d.action || '')}
                </div>
              ))}
              <div className="text-[10px] uppercase tracking-wider mt-2 mb-1" style={{ color: 'var(--muted)' }}>Stage history</div>
              {((card.history as Array<Record<string, unknown>>) || []).map((h, i) => (
                <div key={i} className="py-0.5" style={{ color: 'var(--muted)' }}>{String(h.from)} → {String(h.to)} · {String(h.agent || '')} · {String(h.at || '')}</div>
              ))}
              {((card.gate_history as Array<Record<string, unknown>>) || []).length > 0 && <>
                <div className="text-[10px] uppercase tracking-wider mt-2 mb-1" style={{ color: 'var(--muted)' }}>Gates</div>
                {((card.gate_history as Array<Record<string, unknown>>) || []).map((g, i) => (
                  <div key={i} className="py-0.5" style={{ color: 'var(--muted)' }}>{String(g.decision)} {String(g.gate)} · {String(g.actor || '')}</div>
                ))}
              </>}
              {((card.interjection as Array<Record<string, unknown>>) || []).length > 0 && <>
                <div className="text-[10px] uppercase tracking-wider mt-2 mb-1" style={{ color: 'var(--muted)' }}>Requests / interjections</div>
                {((card.interjection as Array<Record<string, unknown>>) || []).map((it, i) => (
                  <div key={i} className="py-0.5" style={{ color: 'var(--muted)' }}>{String(it.kind)} · {String(it.status)}{it.reason ? ` (${String(it.reason)})` : ''}</div>
                ))}
              </>}
            </div>
          )}
          {tab === 'execution' && (
            <div>
              {_kv('current node', sched?.current_node_id)}
              {_kv('node status', curNode?.status as string)}
              {_kv('permit', curNode?.permit_id as string)}
              {_kv('concurrency class', curNode?.concurrency_class as string)}
              {_kv('model (requested)', (card as { model_request?: string }).model_request)}
              {_kv('model (applied)', (card as { model_applied?: string }).model_applied)}
              {topo && <>
                {_kv('topology', topo.action as string)}
                {_kv('integration owner', topo.integration_owner as string)}
                {_kv('children', Array.isArray(topo.children) ? `${topo.children.length}` : null)}
              </>}
              {lease && <>
                {_kv('worktree branch', lease.branch as string)}
                {_kv('lease status', lease.status as string)}
                {_kv('lease locked', lease.locked ? 'true' : null)}
              </>}
              {_kv('cancel requested', card.cancel_requested_at as string)}
              {card.writes_allowed === false && _kv('terminal observed', 'pending (cooperative cancel in progress)')}
            </div>
          )}
        </div>
        <footer className="px-5 py-2 text-[9px]" style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}>
          Read-only view. Use 🔧 maintain to request changes; gate actions use the gate controls.
        </footer>
      </section>
    </div>
  )
}

function MaintenanceMenu({ onRequest }: { onRequest: (kind: string, text: string) => void }) {
  const [open, setOpen] = useState(false)
  const act = (kind: string) => {
    const meta = REQUEST_META[kind]
    let text = ''
    if (meta.reasonRequired) {
      const r = window.prompt(meta.confirm)          // reason required (back-step/park)
      if (!r || !r.trim()) return
      text = r.trim()
    } else if (!window.confirm(meta.confirm)) {        // concise confirm / cancel warning
      return
    }
    onRequest(kind, text)
    setOpen(false)
  }
  return (
    <div className="relative inline-block">
      <button className="text-[10px] hover:underline" style={{ color: 'var(--muted)' }}
        title="Request re-spec / retry / back-step / park / cancel" onClick={() => setOpen(o => !o)}>
        🔧 maintain
      </button>
      {open && (
        <div className="absolute z-20 mt-1 rounded-md py-1 text-[11px]"
          style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 8px 28px rgba(0,0,0,0.4)', minWidth: '120px' }}>
          {Object.entries(REQUEST_META).map(([kind, meta]) => (
            <button key={kind} className="block w-full text-left px-3 py-1 hover:opacity-80"
              style={{ color: kind === 'request:cancel' ? 'var(--danger, #e66)' : 'var(--text)' }}
              onClick={() => act(kind)}>
              {meta.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PipelineCardItem({ card, config, isGate, cardStatus, effectiveCapability, producerStep, producerSession, onOpenProducer, onApprove, onReject, onCycleTrust, onCycleDepth, onSetBudget, onInterject, onResolveDecision, onOpenOrchestrator, liveView, allCards, onOpenCard, onRequest, onOpenStepSession, onCancelCard }: {
  card: PipelineCard
  config: PipelineConfig
  isGate: boolean
  cardStatus: { kind: string; label: string; color: string; reason?: string | null }
  effectiveCapability: Capability | 'auto-derived'
  producerStep?: string
  producerSession?: { step: string; slotKey: string; retained: boolean }
  onOpenProducer?: () => void
  onApprove?: () => void
  onReject?: (reason: string) => void
  onCycleTrust?: () => void
  onCycleDepth?: () => void
  onSetBudget?: (budget?: Budget) => void
  onInterject?: (kind: string, text: string) => void
  onResolveDecision?: (decisionId: string) => void
  onOpenOrchestrator?: () => void
  liveView?: { stage: string; phase: string; tail: string; active: boolean; seq: number; slotKey: string; onOpen: () => void }
  allCards?: PipelineCard[]
  onOpenCard?: (cardId: string) => void
  onRequest?: (kind: string, text: string) => void
  onOpenStepSession?: Array<{ step: string; open: () => void }>
  onCancelCard?: () => void
}) {
  const accent = isGate ? 'var(--warn)' : cardStatus.kind === 'idle' ? 'var(--border-strong, var(--border))' : cardStatus.color
  const effTrust = (card.trust || config.trust) as Trust
  const effDepth = (card.depth || config.depth) as Depth
  const parkedCount = card.parked?.length || 0
  const hasPendingChatResponse = Object.values(card.step_sessions || {}).some(ptr =>
    !!ptr.last_response_at && !ptr.chat_disabled_at && !ptr.superseded &&
    (!ptr.last_response_handled_at || ptr.last_response_handled_at < ptr.last_response_at)
  )
  const [interjectOpen, setInterjectOpen] = useState(false)
  const [interjectText, setInterjectText] = useState('')
  const [inspectionOpen, setInspectionOpen] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { openChat } = useChatLauncher()
  const timelineEvents = useMemo(() => projectCardTimeline(card), [card])
  const relChildren = useMemo(() => resolveChildren(card, allCards || []), [card, allCards])
  const relParentId = useMemo(() => resolveParentId(card), [card])
  const relParent = useMemo(() => {
    if (!relParentId) return null
    const p = (allCards || []).find(c => c.id === relParentId)
    return p ? { id: p.id, title: p.title } : null
  }, [relParentId, allCards])
  const hasTimeline = timelineEvents.length > 0 || relChildren.length > 0 || !!relParent
  const inspection = useMemo(
    () => isGate ? buildGateInspection(card, producerStep) : null,
    [card, isGate, producerStep],
  )
  const requestReject = () => {
    const reason = window.prompt(`Why reject revision ${inspection?.revision ?? 'unknown'}?`)
    if (reason?.trim() && onReject) onReject(reason.trim())
  }
  // Any decision still awaiting a human choice (e.g. a depth-driven addendum suggestion)
  const pendingDecisions = (card.decisions || []).filter(d => !d.chosen && !d.resolved_at && (!!d.action || !!d.options))

  return (
    <div
      id={`card-${card.id}`}
      className="rounded-lg p-2.5 transition-all duration-150"
      style={{
        background: 'var(--card)',
        color: 'var(--card-fg, var(--text))',
        border: '1px solid var(--border)',
        borderLeft: `2px solid ${accent}`,
      }}
    >
      {(() => {
        // The title is the click target for the CURRENT step's session (session-first-spec: the
        // most natural affordance). Styled distinctly (hover underline + pointer + ↗) so it reads
        // as clickable; falls back to plain text when the current step has no session.
        const cur = (onOpenStepSession || []).find(s => s.step === card.stage)
        if (cur) {
          return (
            <button onClick={() => cur.open()}
              className="text-[13px] font-medium leading-snug truncate text-left w-full hover:underline inline-flex items-center gap-1 group"
              title={`Open the ${card.stage} step session`}
              style={{ color: 'var(--text-strong, var(--text))', cursor: 'pointer' }}>
              <span className="truncate">{card.title}</span>
              <span className="opacity-40 group-hover:opacity-100 flex-shrink-0" style={{ color: 'var(--accent)' }} aria-hidden="true">↗</span>
            </button>
          )
        }
        return (
          <div className="text-[13px] font-medium leading-snug truncate" style={{ color: 'var(--text-strong, var(--text))' }}>
            {card.title}
          </div>
        )
      })()}
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

      {/* Glanceable per-step summary (legibility-and-event-tree-spec §3b): plain-language
          headline for the current stage + a "needs you" dot; full description on hover. */}
      {(() => {
        const summ = card.step_summaries?.[card.stage]
        if (!summ?.headline) return null
        return (
          <div className="mt-1 flex items-start gap-1 text-[11px] leading-snug" title={summ.description || summ.headline}>
            {summ.needs_human
              ? <span aria-label="needs you" title="Needs you" style={{ color: 'var(--warn)' }}>🔴</span>
              : <span aria-hidden="true" style={{ color: 'var(--muted)' }}>•</span>}
            <span className="truncate" style={{ color: summ.needs_human ? 'var(--warn)' : 'var(--text)' }}>
              {summ.headline}
            </span>
          </div>
        )
      })()}

      {/* ── Zone: MODES (click a pill to cycle a per-card override) ── */}
      <div className="mt-2 flex items-center gap-1 flex-wrap">
        <span className="text-[9px] uppercase tracking-wider mr-0.5 select-none" style={{ color: 'var(--muted)' }}>⚙ modes</span>
        <Pill color={TRUST_TOKEN[effTrust]} active={!!card.trust} onClick={onCycleTrust}
          title={`trust: ${effTrust}${card.trust ? ' (override)' : ' (inherited)'} — click to cycle`}>
          🛡 {effTrust}
        </Pill>
        <Pill color={DEPTH_TOKEN[effDepth]} active={!!card.depth} onClick={onCycleDepth}
          title={`depth: ${effDepth}${card.depth ? ' (override)' : ' (inherited)'} — click to cycle`}>
          🔬 {effDepth}
        </Pill>
        <Pill color={effectiveCapability === 'coordinator' ? 'var(--warn)' : 'var(--info)'}
          active={effectiveCapability !== 'auto-derived'}
          title={`capability: ${effectiveCapability}; actual authority is runtime handshake-verified`}>
          🧰 {effectiveCapability === 'auto-derived' ? 'auto' : effectiveCapability}
        </Pill>
        {onSetBudget && (
          <span className="inline-flex items-center gap-0.5" title="Decomposition/effort budget for this card">
            <span className="text-[9px]" style={{ color: 'var(--muted)' }}>💰</span>
            <CardBudgetEditor budget={card.budget} depth={effDepth} onSave={onSetBudget} />
          </span>
        )}
      </div>

      {/* ── Zone: PROPERTIES (status + source-of-truth + lifecycle + state badges — descriptive, not clickable actions) ── */}
      <div className="mt-1.5 flex items-center gap-1 flex-wrap"
        style={{ borderTop: '1px dashed var(--border)', paddingTop: '6px' }}>
        <span className="text-[9px] uppercase tracking-wider mr-0.5 select-none" style={{ color: 'var(--muted)' }}>🏷 state</span>
        <Pill color={cardStatus.color} active={cardStatus.kind !== 'idle'}
          title={`${cardStatus.label}${cardStatus.reason ? ` — ${cardStatus.reason}` : ''}`}>
          {cardStatus.label}
        </Pill>
        <Pill color={card.sot === 'local' ? 'var(--warn)' : card.sot === 'github' ? 'var(--info)' : 'var(--muted)'} active={card.sot === 'local'}
          title={card.sot === 'local' ? 'Local stage authority; linked cards retry guarded GitHub convergence' : card.sot === 'github' ? 'GitHub issue label is stage authority' : 'Source-of-truth field is unrecorded'}>
          {card.sot === 'github' ? '🌐' : card.sot === 'local' ? '💾' : '❔'} sot:{card.sot || 'unknown'}
        </Pill>
        {card.lifecycle && <Pill color="var(--muted)" title={`card lifecycle: ${card.lifecycle}`}>🔄 {card.lifecycle}</Pill>}
        {parkedCount > 0 && (
          <Pill color="var(--warn)" title={`${parkedCount} parked idea(s)`}>⏸ {parkedCount}</Pill>
        )}
        {hasPendingChatResponse && (
          <Pill color="var(--accent)" active title="A response in an enabled linked agent chat is being applied to this card">
            ↪ chat response
          </Pill>
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

      {isGate && inspection && (
        <div data-gate-inspection-summary className="mt-2.5 rounded-md p-2"
          style={{ background: inspection.ready ? 'color-mix(in srgb, var(--ok) 7%, transparent)' : 'color-mix(in srgb, var(--warn) 7%, transparent)', border: `1px solid color-mix(in srgb, ${inspection.ready ? 'var(--ok)' : 'var(--warn)'} 32%, var(--border))` }}>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="font-semibold" style={{ color: inspection.ready ? 'var(--ok)' : 'var(--warn)' }}>
              {inspection.ready ? 'Review-ready' : 'Not review-ready'}
            </span>
            <span className="ml-auto" style={{ color: 'var(--muted)' }}>r{inspection.revision ?? '?'}</span>
            <span className="px-1 py-0.5 rounded" style={{ color: 'var(--muted)', background: 'var(--bg-hover, var(--border))' }}>{inspection.reviewStatus}</span>
          </div>
          <div className="mt-1 text-[11px] leading-snug overflow-hidden" style={{ color: inspection.summary ? 'var(--text)' : 'var(--warn)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {inspection.summary || 'No review bundle summary published.'}
          </div>
          {!inspection.ready && <div className="mt-1 text-[9px]" style={{ color: 'var(--muted)' }}>{inspection.missing.length} readiness gap{inspection.missing.length === 1 ? '' : 's'}</div>}
          <button type="button" onClick={() => setInspectionOpen(true)}
            className="mt-1.5 text-[10px] font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
            Inspect result bundle →
          </button>
        </div>
      )}

      {isGate && onApprove && onReject && (
        <div className="mt-2.5 flex gap-1.5 items-center flex-wrap">
          {(() => {
            // Reflect the LATEST gate command for this gate so the buttons are responsive:
            // a click writes a pending gate_command that the cron resolves ASYNCHRONOUSLY —
            // without this the buttons look dead even while the command is being processed,
            // and a rejected command (e.g. "gate-review-missing") failed silently.
            const cmds = (card.gate_commands || []).filter(c => c.gate === card.stage)
            const latest = cmds.length ? cmds[cmds.length - 1] : undefined
            const pending = latest?.status === 'pending'
            const rejected = latest?.status === 'rejected'
            const applied = latest?.status === 'applied' || latest?.status === 'approved'
            return (
              <>
                <button
                  disabled={pending}
                  className="text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1"
                  style={{ background: 'var(--ok)', color: 'var(--bg)' }}
                  onClick={onApprove}
                  title={pending ? 'A gate command is being processed…' : 'Approve this gate'}
                >
                  {pending && latest?.action === 'approve' && <ActivitySpinner size={10} />}
                  {pending && latest?.action === 'approve' ? 'Approving…' : '✓ Approve'}
                </button>
                <button
                  disabled={pending}
                  className="text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1"
                  style={{ background: 'var(--danger)', color: 'var(--bg)' }}
                  onClick={requestReject}
                >
                  {pending && latest?.action === 'reject' && <ActivitySpinner size={10} />}
                  {pending && latest?.action === 'reject' ? 'Rejecting…' : '✕ Reject'}
                </button>
                {pending && (
                  <span className="text-[10px] inline-flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                    <ActivitySpinner size={10} /> {latest?.action} sent — runtime processing…
                  </span>
                )}
                {rejected && (
                  <span className="text-[10px]" style={{ color: 'var(--danger)' }}
                    title={latest?.rejection_reason || 'rejected'}>
                    ⚠ {latest?.action} rejected: {latest?.rejection_reason || 'see gate result'}
                  </span>
                )}
                {applied && (
                  <span className="text-[10px]" style={{ color: 'var(--ok)' }}>
                    ✓ {latest?.action} applied
                  </span>
                )}
              </>
            )
          })()}
          {producerSession && onOpenProducer && (
            <button
              className="text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1"
              style={{ background: 'var(--bg-hover, var(--border))', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 40%, var(--border))' }}
              onClick={onOpenProducer}
              title={`Open the ${producerSession.step} producer session${producerSession.retained ? ' (held for this gate)' : ''}`}
            >
              <span aria-hidden="true">↗</span>
              Open producer · {producerSession.step}
            </button>
          )}
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

      {/* Raised decisions are advisory until Slice B's structured action processor exists. */}
      {onResolveDecision && pendingDecisions.map(d => (
        <div key={d.id} className="mt-2 p-1.5 rounded-md text-[11px]"
          style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 35%, var(--border))' }}>
          <div style={{ color: 'var(--text, var(--muted))' }}>⚖ {d.question || d.kind}</div>
          <div className="mt-1 text-[10px]" style={{ color: 'var(--muted)' }}>
            This records acknowledgement only; it does not enact {d.action || 'the proposed pipeline change'}.
          </div>
          <button className="mt-1 px-2 py-0.5 rounded font-semibold" style={{ background: 'var(--bg-hover, var(--border))', color: 'var(--accent)' }}
            onClick={() => onResolveDecision(d.id)}>Acknowledge &amp; continue</button>
        </div>
      ))}

      {/* ── Zone: LIVE (streaming peek of the working agent's output — in-card-live-view-spec) ── */}
      {liveView && <LiveMiniPane live={liveView} />}

      <SelfEnablementSurface card={card} openChat={openChat} />

      {/* ── Zone: ACTIONS (mutating controls only — visually separated from the descriptive tags above) ── */}
      {(onInterject || onOpenOrchestrator || (onOpenStepSession && onOpenStepSession.length) || onCancelCard) && (
        <div className="mt-2 flex items-center gap-2 flex-wrap"
          style={{ borderTop: '1px dashed var(--border)', paddingTop: '6px' }}>
          <span className="text-[9px] uppercase tracking-wider select-none" style={{ color: 'var(--muted)' }}>⚡ actions</span>
          {onInterject && (
            interjectOpen ? (
              <div className="w-full flex flex-col gap-1">
                <textarea value={interjectText} onChange={e => setInterjectText(e.target.value)}
                  placeholder="Interject: design/spec note, re-scope…" rows={2}
                  className="w-full text-[11px] px-2 py-1 rounded outline-none resize-none"
                  style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <div className="flex gap-1.5">
                  <button className="text-[11px] px-2 py-0.5 rounded font-semibold" style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                    onClick={() => { if (interjectText.trim()) { onInterject('note', interjectText.trim()); setInterjectText(''); setInterjectOpen(false) } }}>Send</button>
                  <button className="text-[11px] px-2 py-0.5 rounded" style={{ color: 'var(--muted)' }}
                    onClick={() => { setInterjectOpen(false); setInterjectText('') }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="text-[10px] hover:underline" style={{ color: 'var(--muted)' }}
                onClick={() => setInterjectOpen(true)}>✏️ interject</button>
            )
          )}
          {onOpenOrchestrator && (
            <button className="text-[10px] hover:underline" style={{ color: 'var(--muted)' }}
              title={(card.orchestrator_session?.slot_key || card.orchestrator_session?.session_key)
                ? 'Open this pipeline\u2019s orchestrator session'
                : 'Trigger an inspectable orchestrator session for this card'}
              onClick={() => onOpenOrchestrator()}>
              {(card.orchestrator_session?.slot_key || card.orchestrator_session?.session_key) ? '\u2699 open orchestrator' : '\u2699 orchestrator'}
            </button>
          )}
          {hasTimeline && (
            <button className="text-[10px] hover:underline inline-flex items-center gap-0.5" style={{ color: 'var(--muted)' }}
              title="Card timeline — the ordered story of what happened"
              onClick={() => setTimelineOpen(true)}>
              📜 timeline{timelineEvents.some(e => e.needs_human) ? ' 🔴' : ''}{relChildren.length > 0 ? ` 🌿${relChildren.length}` : ''}
            </button>
          )}
          {onRequest && <MaintenanceMenu onRequest={onRequest} />}
          {(onOpenStepSession || []).map(s => (
            <button key={s.step} className="text-[10px] hover:underline" style={{ color: 'var(--accent)' }}
              title={`Open the ${s.step} step session`} onClick={() => s.open()}>
              ⚙ {s.step}
            </button>
          ))}
          {onCancelCard && !['cancelled', 'canceled', 'retired', 'merged'].includes(String(card.lifecycle || '')) && (
            <button className="text-[10px] hover:underline" style={{ color: 'var(--danger, #e66)' }}
              title="Cancel this card (cooperative — revokes writes, retains worktree until terminal)"
              onClick={() => onCancelCard()}>
              ⏹ cancel
            </button>
          )}
          <button className="text-[10px] hover:underline" style={{ color: 'var(--muted)' }}
            title="Card details (read-only)" onClick={() => setDetailsOpen(true)}>
            🔍 details
          </button>
        </div>
      )}

      {timelineOpen && (
        <CardTimelineDrawer card={card} events={timelineEvents} children={relChildren} parent={relParent}
          onOpenCard={onOpenCard} onClose={() => setTimelineOpen(false)} />
      )}
      {detailsOpen && (
        <CardDrawer card={card} cardStatus={cardStatus} effectiveCapability={String(effectiveCapability)}
          onClose={() => setDetailsOpen(false)} />
      )}

      {inspectionOpen && inspection && (
        <GateInspectionDialog
          card={card}
          inspection={inspection}
          producerSession={producerSession}
          onClose={() => setInspectionOpen(false)}
          onOpenProducer={onOpenProducer}
          onApprove={onApprove}
          onReject={onReject}
          onInterject={onInterject ? () => { setInspectionOpen(false); setInterjectOpen(true) } : undefined}
        />
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
// --- Pipeline-wide Event Tree view (pipeline-event-tree-spec) ---
const _KIND_COLOR: Record<string, string> = {
  'step-completed': 'var(--ok)', 'completed': 'var(--ok)', 'step-running': 'var(--info)',
  'step-blocked': 'var(--warn)', 'blocked': 'var(--warn)', 'errored': 'var(--danger, #e66)',
  'decision-open': 'var(--warn)', 'decision-resolved': 'var(--accent)',
  'gate-approved': 'var(--ok)', 'gate-rejected': 'var(--danger, #e66)', 'promoted': 'var(--muted)',
}
function PipelineEventTree({ pipeline, cards, extras, onOpenCard }: {
  pipeline?: Pipeline
  cards: PipelineCard[]
  extras: { github_webhook_history?: any[]; scheduler_state?: any }
  onOpenCard?: (cardId: string) => void
}) {
  const { events, actors, now } = useMemo(
    () => projectPipelineEvents(pipeline, cards, extras),
    [pipeline, cards, extras])
  if (!pipeline) return <div className="text-sm p-3" style={{ color: 'var(--muted)' }}>No pipeline selected.</div>
  if (events.length === 0) return <div className="text-sm p-3" style={{ color: 'var(--muted)' }}>No recorded events for this pipeline yet.</div>
  return (
    <div className="w-full overflow-x-auto pb-4">
      {now && (
        <div className="text-[10px] mb-2 flex flex-wrap gap-2" style={{ color: 'var(--muted)' }}>
          <span>now:</span>
          <span>▶ running {(now.running_node_ids || []).length}</span>
          <span>◷ ready {(now.ready_node_ids || []).length}</span>
          <span style={{ color: 'var(--warn)' }}>⛔ blocked {(now.blocked_node_ids || []).length}</span>
        </div>
      )}
      <div className="text-[10px] mb-2 flex flex-wrap gap-3" style={{ color: 'var(--muted)' }}>
        {actors.map(a => <span key={a}>{ACTOR_GLYPH[a] || '•'} {a}</span>)}
      </div>
      <ol className="flex flex-col gap-1.5" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '10px' }}>
        {events.map(ev => {
          const color = _KIND_COLOR[ev.kind] || 'var(--text)'
          return (
            <li key={ev.id} className="flex items-start gap-2 text-[11px]">
              <span className="text-[9px] flex-shrink-0 mt-0.5 tabular-nums" style={{ color: 'var(--muted)', minWidth: '62px' }}>
                {ev.at ? ev.at.replace('T', ' ').replace('Z', '').slice(5) : ''}
              </span>
              <span aria-hidden="true" className="flex-shrink-0 mt-0.5" title={ev.actor}>{ev.glyph}</span>
              <div className="min-w-0 flex-1">
                <button className="text-left hover:underline" onClick={() => ev.cardId && onOpenCard?.(ev.cardId)}
                  title={ev.cardId ? 'Open card' : undefined} style={{ color }}>
                  {ev.headline}
                  {ev.inferred && <span className="ml-1 text-[8px] px-1 rounded-full" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>~inferred</span>}
                  {ev.needs_human && <span className="ml-1">🔴</span>}
                </button>
                {ev.detail && <div className="text-[9px]" style={{ color: 'var(--muted)' }}>{ev.detail}{ev.cardId ? ` · ${ev.cardId}` : ''}</div>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

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
  capability?: Capability // omitted = runtime auto-derives; tools[] is not authority
  trust?: Trust          // step execution profile (DLC-YOLO)
  depth?: Depth
}

function AgentSetupPanel({ initial, agentProfiles, crews, repo, stepName, onSave, onSaveCrew, onClose }: {
  initial: AgentDraft
  agentProfiles: AgentProfile[]
  crews: CrewRecord[]
  repo: string
  stepName: string
  onSave: (a: AgentDraft) => void
  onSaveCrew: (draft: CrewRouteDraft) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(initial.name || '')
  const [role, setRole] = useState(initial.role || '')
  const [tools, setTools] = useState<string[]>(initial.tools || ['read'])
  const [model, setModel] = useState(initial.model || 'auto')
  const [crew, setCrew] = useState(initial.crew || '')
  const [addenda, setAddenda] = useState<Addendum[]>(initial.addenda || [])
  const [capability, setCapability] = useState<Capability | ''>(initial.capability || '')
  const [trust, setTrust] = useState<Trust | ''>(initial.trust || '')
  const [depth, setDepth] = useState<Depth | ''>(initial.depth || '')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const selectedProfile = agentProfiles.find(profile => profile.name === name)
  const selectedCrew = crews.find(item => item.name === crew)
  const visibleToolOptions = [...new Set([...AGENT_TOOL_OPTIONS, ...tools])]

  const applyProfile = (profile: AgentProfile) => {
    const next = applyAgentProfileToDraft({ name, role, tools, model, crew, addenda, capability, trust, depth }, profile)
    setName(next.name)
    setTools(next.tools || [])
    setModel(next.model || 'auto')
    if (next.capability) setCapability(next.capability as Capability)
  }
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
            <div className="text-sm font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>Configure step execution</div>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Step request + capability profile + optional global crew route</div>
          </div>
          <span className="ml-auto text-[10px] px-2 py-1 rounded font-semibold"
            style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
            UI configuration
          </span>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3.5 flex-1 overflow-y-auto">
          {/* Installed agent presets are real configs; applying one copies only its declared request fields. */}
          {agentProfiles.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Agent profile preset</label>
                <button onClick={() => setCatalogOpen(true)} className="text-[10px] px-2 py-1 rounded-md font-semibold"
                  style={{ color: 'var(--accent)', border: '1px solid var(--border)' }}>Browse agents &amp; crews</button>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {agentProfiles.map(profile => (
                  <button key={profile.name} onClick={() => applyProfile(profile)} disabled={profile.status !== 'loaded'}
                    title={profile.description || profile.name}
                    className="text-[11px] px-2 py-1 rounded-md font-medium disabled:opacity-40"
                    style={{
                      background: name === profile.name ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'var(--bg-hover, var(--border))',
                      color: name === profile.name ? 'var(--accent)' : 'var(--muted-strong, var(--muted))',
                      boxShadow: name === profile.name ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)' : 'none',
                    }}>{profile.name}</button>
                ))}
              </div>
              {selectedProfile && (
                <div className="text-[10px] mt-1.5 rounded-md px-2 py-1.5" style={{ color: 'var(--muted)', background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)' }}>
                  Loaded config: model <code>{selectedProfile.model || 'auto'}</code> · {selectedProfile.tools.length} declared tool{selectedProfile.tools.length === 1 ? '' : 's'} · {selectedProfile.allowedTools.length} auto-approved. The step objective below remains pipeline-local.
                </div>
              )}
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
              {visibleToolOptions.map(t => {
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

          <div className="rounded-md p-2.5" style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Capability profile</label>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>Trust = when · depth = how much · capability = what authority</div>
              </div>
              <select value={capability} onChange={event => setCapability(event.target.value as Capability | '')}
                className="w-40 px-2 py-1 rounded-md text-sm outline-none"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <option value="">auto-derived</option>
                {(['readonly', 'authoring', 'builder', 'coordinator'] as Capability[]).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="text-[10px] mt-2" style={{ color: capability === 'coordinator' ? 'var(--warn)' : 'var(--muted)' }}>
              The tools above are requested/declared—not proof of runtime access. Actual crew authority comes from its <code>kiro_agent</code> profile; widening remains trust-gated and handshake-verified.
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
            {selectedCrew && (
              <div className="text-[10px] mt-1 text-right" style={{ color: 'var(--muted)' }}>
                Global route <code>{selectedCrew.name}</code> → <code>{selectedCrew.kiroAgent || 'profile unknown'}</code>
                {selectedCrew.workspace ? ` · workspace ${selectedCrew.workspace}` : ''}
                {selectedCrew.description ? ` · ${selectedCrew.description}` : ''}
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
              capability: capability || undefined,
              trust: trust || undefined, depth: depth || undefined,
            })}
            className="text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}>Save step</button>
        </div>
        {catalogOpen && <AgentCrewCatalogModal
          profiles={agentProfiles}
          crews={crews}
          context={`${repo || 'unassigned pipeline'} · ${stepName || 'unnamed step'}`}
          onSaveCrew={onSaveCrew}
          onClose={() => setCatalogOpen(false)}
          onSelectProfile={profile => { applyProfile(profile); setCatalogOpen(false) }}
          onSelectCrew={record => { setCrew(record.name); setCatalogOpen(false) }}
        />}
    </div>
  )
}

// --- Pipeline Setup Modal ---
interface RepoCandidate {
  repo: string
  workspace?: string
  label?: string
  source: 'issue-radar' | 'workspace' | 'manual'
  detail?: string
  path?: string
}

function PipelineSetupModal({ candidates, existingRepos, defaults, agentProfiles, crews, onCreate, onSaveCrew, onClose, editPipeline, cardCount, isExample, onDelete }: {
  candidates: RepoCandidate[]
  existingRepos: Set<string>
  defaults: PipelineConfig
  agentProfiles: AgentProfile[]
  crews: CrewRecord[]
  onCreate: (p: { repo: string; workspace: string; repo_path?: string; source: RepoCandidate['source']; trust: Trust; depth: Depth; budget?: Budget; backlog_intake: boolean; results_in_repo: boolean; conversation_log: boolean; trusted_authors: string[]; self_enabling: boolean; approach: 'simplified' | 'enhanced'; sync_mode?: 'poll' | 'webhook'; steps: PipelineStep[] }) => void
  onSaveCrew: (draft: CrewRouteDraft) => Promise<void>
  onClose: () => void
  editPipeline?: Pipeline          // when set, the modal is in EDIT mode
  cardCount?: number               // cards in the pipeline (for the Danger Zone copy)
  isExample?: boolean
  onDelete?: (repo: string) => void
}) {
  const isEdit = !!editPipeline
  const [repo, setRepo] = useState(editPipeline?.repo || '')
  const [workspace, setWorkspace] = useState(editPipeline?.workspace || 'default')
  const [repoPath, setRepoPath] = useState(editPipeline?.repo_path || '')
  const [source, setSource] = useState<RepoCandidate['source']>(editPipeline?.source || 'manual')
  const [trust, setTrust] = useState<Trust>(editPipeline?.trust || defaults.trust)
  const [depth, setDepth] = useState<Depth>(editPipeline?.depth || defaults.depth)
  const initialBudget = editPipeline?.budget
  const [budgetMode, setBudgetMode] = useState<BudgetMode>(
    !initialBudget ? 'depth' :
      initialBudget.max_child_cards === 'unlimited' && initialBudget.effort_ceiling === 'unlimited' ? 'unlimited' : 'custom'
  )
  const [customBudget, setCustomBudget] = useState<Budget>(() =>
    initialBudget && initialBudget.max_child_cards !== 'unlimited' && initialBudget.effort_ceiling !== 'unlimited'
      ? { ...initialBudget }
      : budgetForDepth(editPipeline?.depth || defaults.depth)
  )
  const [backlog, setBacklog] = useState(editPipeline?.backlog_intake ?? true)
  const [resultsInRepo, setResultsInRepo] = useState(editPipeline?.results_in_repo ?? false)
  const [conversationLog, setConversationLog] = useState(editPipeline?.conversation_log ?? false)
  const [trustedAuthorsText, setTrustedAuthorsText] = useState((editPipeline?.trusted_authors || []).join('\n'))
  const [selfEnabling, setSelfEnabling] = useState(editPipeline?.self_enabling ?? false)
  const [approach, setApproach] = useState<'simplified' | 'enhanced'>(editPipeline?.approach || 'simplified')
  const [syncMode, setSyncMode] = useState<'poll' | 'webhook'>(editPipeline?.sync_mode || 'poll')
  const [steps, setSteps] = useState<PipelineStep[]>(() => (editPipeline?.steps?.length ? editPipeline.steps.map(s => ({ ...s })) : DEFAULT_STEPS.map(s => ({ ...s }))))
  const [editingAgentIdx, setEditingAgentIdx] = useState<number | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [modalView, setModalView] = useState<'settings' | 'webhook' | 'danger'>('settings')
  const [catalogOpen, setCatalogOpen] = useState(false)

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

  const pick = (c: RepoCandidate) => {
    setRepo(c.repo || '')
    setWorkspace(c.workspace || 'default')
    setRepoPath(c.path || '')
    setSource(c.source)
  }
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
  const trustedAuthors = [...new Map(
    trustedAuthorsText.split(/[\n,]/).map(value => value.trim()).filter(Boolean)
      .map(value => [value.toLowerCase(), value] as const)
  ).values()]
  const trustedAuthorsValid = trustedAuthors.every(value =>
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(value))
  const workspaceValid = /^[A-Za-z0-9_.-]{1,80}$/.test(workspace)
  const valid = (/^[^/\s]+\/[^/\s]+$/.test(normalizeRepoInput(repo)) || candidates.some(c => c.repo && c.repo === repo)) && trustedAuthorsValid && workspaceValid
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
  const modalTabs: Array<typeof modalView> = isEdit ? ['settings', 'webhook', 'danger'] : ['settings', 'webhook']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'color-mix(in srgb, black 55%, transparent)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--card)', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}>
        {catalogOpen && <AgentCrewCatalogModal
          profiles={agentProfiles}
          crews={crews}
          context={repo || workspace}
          onSaveCrew={onSaveCrew}
          onClose={() => setCatalogOpen(false)}
        />}
        {editingAgentIdx !== null ? (
          <AgentSetupPanel
            initial={{
              name: steps[editingAgentIdx]?.agent?.name || '',
              role: steps[editingAgentIdx]?.agent?.role,
              tools: steps[editingAgentIdx]?.agent?.tools,
              model: steps[editingAgentIdx]?.agent?.model,
              crew: steps[editingAgentIdx]?.agent?.crew,
              addenda: steps[editingAgentIdx]?.addenda,
              capability: steps[editingAgentIdx]?.capability,
              trust: steps[editingAgentIdx]?.trust,
              depth: steps[editingAgentIdx]?.depth,
            }}
            agentProfiles={agentProfiles}
            crews={crews}
            repo={repo}
            stepName={steps[editingAgentIdx]?.name || ''}
            onSaveCrew={onSaveCrew}
            onClose={() => setEditingAgentIdx(null)}
            onSave={(a) => {
              updateStep(editingAgentIdx, {
                agent: { name: a.name, role: a.role, tools: a.tools, model: a.model, crew: a.crew },
                addenda: a.addenda,
                capability: a.capability,
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

        {/* Pipeline-local settings and app-wide webhook controls share this configuration surface. */}
        <div className="px-5 pt-3 flex gap-1" style={{ borderBottom: '1px solid var(--border)' }}>
          {modalTabs.map(v => {
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
                {v === 'settings' ? 'Settings' : v === 'webhook' ? 'Webhook · app-wide' : 'Danger Zone'}
              </button>
            )
          })}
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1"
          style={{ display: modalView === 'settings' ? 'flex' : 'none' }}>
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
                    {grouped[src].map(c => {
                      const candidateKey = `${src}:${c.workspace || c.repo}:${c.path || ''}`
                      const selected = c.source === 'workspace'
                        ? workspace === c.workspace && repoPath === (c.path || '')
                        : repo === c.repo
                      return <button key={candidateKey} onClick={() => pick(c)}
                        disabled={!!c.repo && existingRepos.has(c.repo)}
                        title={c.detail || c.repo || c.workspace}
                        className="text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40"
                        style={{
                          background: selected ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'var(--bg-hover, var(--border))',
                          color: selected ? 'var(--accent)' : 'var(--muted-strong, var(--muted))',
                          boxShadow: selected ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)' : 'none',
                        }}>
                        {c.label || (c.repo.includes('/') ? c.repo.split('/')[1] : c.repo) || c.workspace}
                      </button>
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workspace identity is the result/memory partition, not a repository alias. */}
          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Workspace partition
            </label>
            <input value={workspace} onChange={event => setWorkspace(event.target.value.trim())}
              placeholder="default" className="mt-1 w-full px-3 py-2 rounded-md text-sm outline-none"
              style={{ background: 'var(--bg-elevated, var(--bg))', border: `1px solid ${workspaceValid ? 'var(--border)' : 'var(--danger)'}`, color: 'var(--text)' }} />
            <div className="text-[10px] mt-1" style={{ color: workspaceValid ? 'var(--muted)' : 'var(--danger)' }}>
              Partitions results and ledgers. It is independent from <code>owner/name</code> and never inferred from a filesystem path.
            </div>
          </div>

          {/* Local checkout used by the deterministic per-card worktree lease manager. */}
          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Local checkout path
            </label>
            <input
              value={repoPath}
              onChange={e => setRepoPath(e.target.value)}
              placeholder="/absolute/path/to/checkout"
              className="mt-1 w-full px-3 py-2 rounded-md text-sm outline-none"
              style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <div className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
              Required before code or repo-mirrored results run. Mutable steps block rather than use the shared checkout when this path is absent or unverifiable.
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

          {/* Budget: independent from depth when explicitly overridden. */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Budget Mode</div>
              <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Controls fan-out and effort spend</div>
            </div>
            <Seg value={budgetMode} options={['depth', 'custom', 'unlimited'] as BudgetMode[]}
              tokens={{ depth: 'var(--muted)', custom: 'var(--accent)', unlimited: 'var(--ok)' }} onPick={setBudgetMode} />
          </div>
          {budgetMode === 'depth' && (() => {
            const b = budgetForDepth(depth)
            return <div className="text-[11px] px-3 py-2 rounded-md" style={{ color: 'var(--muted)', background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)' }}>
              Follows <strong>{depth}</strong>: {String(b.max_child_cards)} child cards · {String(b.effort_ceiling)} effort points · max {b.max_feature_size} · {b.addenda} addenda
            </div>
          })()}
          {budgetMode === 'unlimited' && (
            <div className="text-[11px] px-3 py-2 rounded-md" style={{ color: 'var(--ok)', background: 'color-mix(in srgb, var(--ok) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--ok) 35%, var(--border))' }}>
              No child-card or effort ceiling · max XL · proactive addenda
            </div>
          )}
          {budgetMode === 'custom' && (
            <div className="grid grid-cols-2 gap-2 p-3 rounded-md" style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)' }}>
              <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Max child cards
                <input type="number" min={0} value={customBudget.max_child_cards as number}
                  onChange={e => setCustomBudget(b => ({ ...b, max_child_cards: Math.max(0, Number(e.target.value) || 0) }))}
                  className="mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </label>
              <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Effort ceiling
                <input type="number" min={0} value={customBudget.effort_ceiling as number}
                  onChange={e => setCustomBudget(b => ({ ...b, effort_ceiling: Math.max(0, Number(e.target.value) || 0) }))}
                  className="mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </label>
              <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Max feature size
                <select value={customBudget.max_feature_size}
                  onChange={e => setCustomBudget(b => ({ ...b, max_feature_size: e.target.value as FeatureSize }))}
                  className="mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  {(['S', 'M', 'L', 'XL'] as FeatureSize[]).map(v => <option key={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Addenda
                <select value={customBudget.addenda}
                  onChange={e => setCustomBudget(b => ({ ...b, addenda: e.target.value as AddendaBudget }))}
                  className="mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  {(['none', 'obvious', 'proactive'] as AddendaBudget[]).map(v => <option key={v}>{v}</option>)}
                </select>
              </label>
            </div>
          )}

          {/* Sync mode: how eagerly the poll reconciles GitHub */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <div className="text-sm" style={{ color: 'var(--text)' }}>GitHub sync mode</div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                {syncMode === 'webhook'
                  ? 'Webhook is the fast path; the safety-net poll reconciles this pipeline on a longer window. Requires the app-wide webhook receiver enabled — falls back to polling if it is not.'
                  : 'Poll reconciles this pipeline every cycle (default). Correct when no webhook is configured.'}
              </div>
            </div>
            <div className="flex rounded-md overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border)' }}>
              {(['poll', 'webhook'] as const).map(m => (
                <button key={m} onClick={() => setSyncMode(m)}
                  className="text-[11px] px-2.5 py-1 font-semibold"
                  style={{ background: syncMode === m ? 'var(--accent)' : 'transparent',
                           color: syncMode === m ? 'var(--bg)' : 'var(--muted)' }}>
                  {m === 'poll' ? 'Poll' : 'Webhook'}
                </button>
              ))}
            </div>
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

          {/* Results location */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm" style={{ color: 'var(--text)' }}>Save results into repo</div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Also commit results &amp; the pipeline conversation to a <code style={{ color: 'var(--accent)' }}>.dlc-yolo/</code> copy in the owned repo (always kept in app data)</div>
            </div>
            <button onClick={() => setResultsInRepo(r => !r)}
              className="w-10 h-5.5 rounded-full transition-all relative flex-shrink-0"
              style={{ background: resultsInRepo ? 'var(--accent)' : 'var(--border-strong, var(--border))', height: 22, width: 40 }}>
              <span className="absolute top-0.5 rounded-full transition-all"
                style={{ height: 18, width: 18, background: 'var(--bg)', left: resultsInRepo ? 20 : 2 }} />
            </button>
          </label>

          {/* Optional presentation log */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm" style={{ color: 'var(--text)' }}>Pipeline conversation log</div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Opt in to the review-oriented command transcript; off means no log file is created</div>
            </div>
            <button onClick={() => setConversationLog(value => !value)}
              className="w-10 h-5.5 rounded-full transition-all relative flex-shrink-0"
              style={{ background: conversationLog ? 'var(--accent)' : 'var(--border-strong, var(--border))', height: 22, width: 40 }}>
              <span className="absolute top-0.5 rounded-full transition-all"
                style={{ height: 18, width: 18, background: 'var(--bg)', left: conversationLog ? 20 : 2 }} />
            </button>
          </label>

          {/* Ownership guard */}
          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Trusted GitHub authors · optional
            </label>
            <textarea value={trustedAuthorsText} onChange={event => setTrustedAuthorsText(event.target.value)} rows={2}
              placeholder="Defaults to the authenticated GitHub user"
              className="mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y"
              style={{ background: 'var(--bg-elevated, var(--bg))', border: `1px solid ${trustedAuthorsValid ? 'var(--border)' : 'var(--danger)'}`, color: 'var(--text)' }} />
            <div className="text-[10px] mt-1" style={{ color: trustedAuthorsValid ? 'var(--muted)' : 'var(--danger)' }}>
              One login per line. Empty never means allow-all; it falls back to the authenticated <code>gh</code> user.
            </div>
          </div>

          {/* Self-enablement */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm" style={{ color: 'var(--text)' }}>Self-enabling pipeline</div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Orchestrator resolves intent &amp; auto-configures crews/steps (setup → intent → per-step)</div>
            </div>
            <button onClick={() => setSelfEnabling(s => !s)}
              className="w-10 h-5.5 rounded-full transition-all relative flex-shrink-0"
              style={{ background: selfEnabling ? 'var(--accent)' : 'var(--border-strong, var(--border))', height: 22, width: 40 }}>
              <span className="absolute top-0.5 rounded-full transition-all"
                style={{ height: 18, width: 18, background: 'var(--bg)', left: selfEnabling ? 20 : 2 }} />
            </button>
          </label>

          {/* Setup approach (only meaningful when self-enabling) */}
          {selfEnabling && (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm" style={{ color: 'var(--text)' }}>Setup approach</div>
                <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper</div>
              </div>
              <div className="flex gap-1">
                {(['simplified', 'enhanced'] as const).map(a => (
                  <button key={a} onClick={() => setApproach(a)}
                    className="text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize"
                    style={{
                      background: approach === a ? 'var(--accent)' : 'transparent',
                      color: approach === a ? 'var(--bg)' : 'var(--muted)',
                      border: `1px solid ${approach === a ? 'var(--accent)' : 'var(--border)'}`,
                    }}>{a}</button>
                ))}
              </div>
            </div>
          )}

          {/* Custom steps editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Steps</span>
              <div className="flex gap-1">
                <button onClick={() => setCatalogOpen(true)} className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                  style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>Agents &amp; crews</button>
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
                      <span className="text-[10px]" style={{ color: s.capability ? 'var(--accent)' : 'var(--muted)' }} title="Actual authority is verified from the assigned capability profile at runtime">
                        cap: {s.capability || 'auto'}
                      </span>
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

        {modalView === 'webhook' && (
          <div className="px-5 py-4 overflow-y-auto flex-1">
            <WebhookSettingsSection />
          </div>
        )}

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
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md font-medium" style={{ color: 'var(--muted)' }}>{modalView === 'settings' ? 'Cancel' : 'Close'}</button>
          {modalView === 'settings' && (
          <button
            disabled={!valid || (!isEdit && dup)}
            onClick={() => onCreate({
              repo: normalizeRepoInput(repo),
              workspace,
              ...(repoPath.trim() ? { repo_path: repoPath.trim() } : {}),
              source, trust, depth,
              budget: budgetMode === 'depth' ? undefined : budgetMode === 'unlimited'
                ? { max_child_cards: 'unlimited', effort_ceiling: 'unlimited', max_feature_size: 'XL', addenda: 'proactive' }
                : customBudget,
              backlog_intake: backlog, results_in_repo: resultsInRepo,
              conversation_log: conversationLog, trusted_authors: trustedAuthors,
              self_enabling: selfEnabling, approach, sync_mode: syncMode,
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
function ActivitySpinner({ size = 12 }: { size?: number }) {
  return (
    <svg className="animate-spin flex-shrink-0" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ color: 'var(--accent)' }}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.22" />
      <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// In-card live-view mini pane (in-card-live-view-spec): stage title + spinner + a bounded,
// auto-scrolling peek of the working agent's streamed output. Presentation-only.
const _STAGE_GLYPH: Record<string, string> = {
  investigate: '🔎', requirements: '📝', design: '📐', tasks: '🧩',
  implement: '🔨', review: '🔍', pr: '🚀', intent: '🎯',
}
// Character-by-character reveal toward a moving target (live-view typewriter). Reveals a few
// chars per animation frame; if the 512-char window slid so the shown text is no longer a
// prefix of the new target, SNAP to it — never lag the real stream (truthful liveness).
function useTypewriter(target: string, active: boolean): string {
  const [shown, setShown] = useState('')
  const shownRef = useRef('')
  const targetRef = useRef('')
  const rafRef = useRef<number | null>(null)
  targetRef.current = target || ''
  useEffect(() => {
    // If not active, or a fresh/slid window means shown is no longer a prefix, snap.
    if (!active || !targetRef.current.startsWith(shownRef.current)) {
      shownRef.current = targetRef.current
      setShown(targetRef.current)
      return
    }
    const tick = () => {
      const t = targetRef.current
      const cur = shownRef.current
      if (cur.length >= t.length) { rafRef.current = null; return }
      // reveal a small burst per frame; scale so long backlogs catch up fast
      const step = Math.max(1, Math.ceil((t.length - cur.length) / 12))
      shownRef.current = t.slice(0, cur.length + step)
      setShown(shownRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  }, [target, active])
  return shown
}

function LiveMiniPane({ live }: { live: { stage: string; phase: string; tail: string; active: boolean; seq: number; onOpen: () => void } }) {
  const [open, setOpen] = useState(true)
  const bodyRef = useRef<HTMLDivElement>(null)
  const shown = useTypewriter(live.tail, live.active)
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [shown])
  const glyph = _STAGE_GLYPH[live.stage] || '⚙'
  return (
    <div className="mt-2" style={{ borderTop: '1px dashed var(--border)', paddingTop: '6px' }}>
      <div className="flex items-center gap-1.5 text-[10px]">
        <button className="inline-flex items-center gap-1 hover:underline" onClick={() => setOpen(o => !o)}
          title="Toggle live output" style={{ color: 'var(--muted)' }}>
          <span aria-hidden="true">{open ? '▾' : '▸'}</span>
          <span className="uppercase tracking-wider">{glyph} {live.stage}</span>
        </button>
        <span style={{ color: live.active ? 'var(--accent)' : 'var(--muted)' }}>· {live.active ? live.phase : 'idle'}</span>
        {live.active && <ActivitySpinner size={10} />}
        <button className="ml-auto hover:underline" onClick={live.onOpen} title="Open the full step session"
          style={{ color: 'var(--accent)' }}>open ↗</button>
      </div>
      {open && (
        <div ref={bodyRef}
          className="mt-1 text-[10px] font-mono leading-snug overflow-y-auto whitespace-pre-wrap break-words"
          style={{ maxHeight: '3.6em', color: 'var(--muted)', background: 'var(--bg-elevated, var(--bg))',
            border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 6px' }}>
          {shown || (live.active ? 'thinking…' : 'no live output')}
        </div>
      )}
    </div>
  )
}

// Card timeline drawer (legibility-and-event-tree-spec §5.2): the ordered per-step/gate/decision
// story as glanceable sentences, actor-tagged + glyphed, expandable to detail. Reads the
// client-side projection (cardTimeline.js).
const _ACTOR_GLYPH: Record<string, string> = {
  'loop': '⚙', 'step-agent': '🤖', 'orchestrator': '🧠', 'human': '🧑',
}
const _ACTOR_COLOR: Record<string, string> = {
  'loop': 'var(--muted)', 'step-agent': 'var(--info)', 'orchestrator': 'var(--accent)', 'human': 'var(--ok)',
}
function CardTimelineDrawer({ card, events, children, parent, onOpenCard, onClose }: {
  card: PipelineCard
  events: Array<{ id: string; at: string; actor: string; kind: string; step?: string; cls: string; needs_human: boolean; headline: string; detail?: string; executor?: string | null }>
  children: Array<{ id: string; title: string; stage?: string; lifecycle?: string; required?: boolean }>
  parent?: { id: string; title: string } | null
  onOpenCard?: (cardId: string) => void
  onClose: () => void
}) {
  const hasRel = (children && children.length > 0) || !!parent
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(4px)' }}
      onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}>
      <section role="dialog" aria-modal="true" aria-label="Card timeline"
        className="flex flex-col rounded-xl overflow-hidden"
        style={{ width: 'min(680px, calc(100vw - 32px))', maxHeight: 'min(84vh, 760px)', background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 28px 90px rgba(0,0,0,0.5)' }}>
        <header className="px-5 py-3.5 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>📜 Timeline</h2>
            <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text)' }}>{card.title}</div>
          </div>
          <button onClick={onClose} className="text-[13px] px-2 py-0.5 rounded hover:opacity-80" style={{ color: 'var(--muted)' }} aria-label="Close">✕</button>
        </header>
        <div className="px-4 py-3 overflow-y-auto">
          {/* Fan-out relationships (event-tree causal linkage). Turns an empty parent's
              "no story" into "work happened in these children →". */}
          {hasRel && (
            <div className="mb-3 pb-3" style={{ borderBottom: '1px dashed var(--border)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>🌿 fan-out</div>
              {parent && (
                <button className="flex items-center gap-1.5 text-[12px] hover:underline mb-1" onClick={() => onOpenCard?.(parent.id)}
                  style={{ color: 'var(--accent)' }} title="Open the integration parent">
                  ↑ parent · <span className="truncate max-w-[420px]" style={{ color: 'var(--text)' }}>{parent.title}</span>
                </button>
              )}
              {children.map(ch => (
                <button key={ch.id} className="flex items-center gap-1.5 text-[12px] hover:underline w-full text-left" onClick={() => onOpenCard?.(ch.id)}
                  title="Open this child card" style={{ color: 'var(--text)' }}>
                  <span aria-hidden="true" style={{ color: 'var(--accent)' }}>↳</span>
                  <span className="truncate flex-1" >{ch.title}</span>
                  <span className="text-[9px] flex-shrink-0" style={{ color: ch.lifecycle === 'retired' ? 'var(--ok)' : 'var(--muted)' }}>
                    {ch.stage || ''}{ch.lifecycle ? ` · ${ch.lifecycle}` : ''}{ch.required === false ? ' · optional' : ''}
                  </span>
                </button>
              ))}
              {children.length > 0 && events.length === 0 && (
                <div className="text-[10px] mt-1.5 italic" style={{ color: 'var(--muted)' }}>
                  This card fanned its work out to the {children.length} child card{children.length > 1 ? 's' : ''} above — the story lives there.
                </div>
              )}
            </div>
          )}
          {events.length === 0 ? (
            <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
              {hasRel ? 'No events recorded on this card directly.' : 'No recorded events yet.'}
            </div>
          ) : (
            <ol className="flex flex-col gap-2">
              {events.map(ev => (
                <li key={ev.id} className="flex gap-2 text-[12px]">
                  <span title={ev.actor} aria-hidden="true" className="flex-shrink-0 mt-0.5">{_ACTOR_GLYPH[ev.actor] || '•'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-medium" style={{ color: ev.needs_human ? 'var(--warn)' : 'var(--text)' }}>
                        {ev.needs_human && '🔴 '}{ev.headline}
                      </span>
                      {ev.cls === 'decision' && (
                        <span className="text-[9px] px-1 rounded-full" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)' }}>decision</span>
                      )}
                      <span className="ml-auto text-[9px]" style={{ color: 'var(--muted)' }}>
                        {ev.at ? ev.at.replace('T', ' ').replace('Z', '') : ''}
                      </span>
                    </div>
                    {ev.detail && (
                      <div className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--muted)' }}>{ev.detail}</div>
                    )}
                    <div className="text-[9px] mt-0.5" style={{ color: _ACTOR_COLOR[ev.actor] || 'var(--muted)' }}>
                      {ev.actor}{ev.step ? ` · ${ev.step}` : ''}{ev.executor ? ` · ${ev.executor}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  )
}

export default function SdlcPipeline() {
  const api = useAppApi()
  const navigate = useNavigate()
  const [allCards, setAllCards] = useState<PipelineCard[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stateExtras, setStateExtras] = useState<{ github_webhook_history?: any[]; scheduler_state?: any }>({})
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('pipeline')
  const [repoFilter, setRepoFilter] = useState<Set<string>>(new Set())
  const [setupOpen, setSetupOpen] = useState(false)
  const [editRepo, setEditRepo] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<RepoCandidate[]>([])
  const [crews, setCrews] = useState<CrewRecord[]>([])
  const [agentProfiles, setAgentProfiles] = useState<AgentProfile[]>([])
  const [agentCatalogOpen, setAgentCatalogOpen] = useState(false)
  const [agentCatalogLoading, setAgentCatalogLoading] = useState(false)
  const [runPaneOpen, setRunPaneOpen] = useState(false)
  const [treeModalOpen, setTreeModalOpen] = useState(false)
  const [backlogModalOpen, setBacklogModalOpen] = useState(false)
  const [operationsOpen, setOperationsOpen] = useState(false)
  const [liveSpawns, setLiveSpawns] = useState<{ id: string; task: string; status?: string }[]>([])
  const kanbanRef = useRef<HTMLDivElement>(null)
  const liveSpawnsAbsent = useRef(false)  // suppress live_spawns polling once found absent (no cron yet)
  const stateAuthorityResolved = useRef(false)
  const linkedSlotsRef = useRef<Set<string>>(new Set())
  const cardIdsRef = useRef<Set<string>>(new Set())
  const [liveTails, setLiveTails] = useState<Record<string, { buffer: string; tail: string; active: boolean; phase: 'thinking' | 'generating' | 'idle'; seq: number }>>({})

  const readAppFile = useCallback(
    (path: string) => api.get('/api/file-read?path=' + encodeURIComponent(path)),
    [api],
  )

  const fetchCards = useCallback(async (reconcileAuthority = false) => {
    try {
      const resolved = !stateAuthorityResolved.current || reconcileAuthority
        ? await resolveStateFile(readAppFile)
        : await readCurrentState(readAppFile, STATE_PATH)
      STATE_PATH = resolved.path
      stateAuthorityResolved.current = true
      const data = resolved.data
      setAllCards(data.cards || [])
      setPipelines(data.pipelines || [])
      setStateExtras({ github_webhook_history: data.github_webhook_history || [], scheduler_state: data.scheduler_state || null })
      setConfig({ ...DEFAULT_CONFIG, ...(data.config || {}) })
    } catch (e) {
      console.error('Failed to fetch cards:', e)
    } finally {
      setLoading(false)
    }
  }, [readAppFile])

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

  // Real live-token projection (Order 6): the dashboard already broadcasts redacted text
  // deltas as {type:'chat_chunk', data:{slot,content,seq}} and TurnEnd as chat_done on
  // /api/ws. Filter to this app's enabled linked slots and retain only a bounded suffix.
  // This is presentation transport only: never write chunks into state.json/live_spawns.json.
  useEffect(() => {
    cardIdsRef.current = new Set(allCards.map(card => card.id))
    linkedSlotsRef.current = new Set(allCards.flatMap(card =>
      Object.values(card.step_sessions || {})
        .filter(ptr => !!ptr.slot_key && !ptr.chat_disabled_at && !ptr.superseded)
        .map(ptr => ptr.slot_key as string)
    ))
  }, [allCards])

  useEffect(() => {
    let stopped = false
    let socket: WebSocket | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let retries = 0

    const connect = () => {
      if (stopped) return
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(`${protocol}//${window.location.host}/api/ws`)
      socket.onopen = () => { retries = 0 }
      socket.onmessage = event => {
        if (typeof event.data !== 'string') return
        try {
          const frame = JSON.parse(event.data)
          const data = frame?.data
          // Slot creation is announced before its first generated chunks. Recognize the
          // DLC step cron's stable "<step> :: <card-id>" title immediately, rather than
          // waiting up to 10s for state.json polling to reveal the same slot_key.
          if (frame.type === 'slots' && Array.isArray(data)) {
            const linked = new Set(linkedSlotsRef.current)
            const runningSlots: string[] = []
            for (const candidate of data) {
              const key = candidate?.key || candidate?.slot || candidate?.name
              const title = String(candidate?.title || candidate?.name || '')
              if (typeof key === 'string' && key.startsWith('cron-') &&
                  [...cardIdsRef.current].some(cardId => title.includes(cardId))) linked.add(key)
              if (typeof key === 'string' && candidate?.running && linked.has(key)) runningSlots.push(key)
            }
            linkedSlotsRef.current = linked
            if (runningSlots.length) {
              setLiveTails(previous => {
                let result = previous
                for (const key of runningSlots) {
                  const next = beginLiveThinking(previous[key])
                  if (next !== previous[key]) result = { ...result, [key]: next }
                }
                return result
              })
            }
            return
          }
          const slot = data?.slot
          if (!slot || !linkedSlotsRef.current.has(slot)) return
          if ((frame.type === 'chat_status' && String(data.status || '').toLowerCase().startsWith('thinking')) ||
              frame.type === 'chat_thinking') {
            setLiveTails(previous => {
              const next = beginLiveThinking(previous[slot], frame.type === 'chat_status')
              return next === previous[slot] ? previous : { ...previous, [slot]: next }
            })
          } else if (frame.type === 'chat_chunk' && typeof data.content === 'string') {
            setLiveTails(previous => {
              const next = appendLiveTail(previous[slot], data.content, Number(data.seq))
              return next === previous[slot] ? previous : { ...previous, [slot]: next }
            })
          } else if (frame.type === 'chat_done') {
            setLiveTails(previous => {
              const next = finishLiveTail(previous[slot])
              return next === previous[slot] ? previous : { ...previous, [slot]: next }
            })
          }
        } catch { /* unrelated/non-JSON dashboard frame */ }
      }
      socket.onclose = () => {
        if (stopped) return
        const delay = Math.min(1000 * 2 ** retries++, 15000)
        retryTimer = setTimeout(connect, delay)
      }
      socket.onerror = () => socket?.close()
    }

    connect()
    return () => {
      stopped = true
      if (retryTimer) clearTimeout(retryTimer)
      socket?.close()
    }
  }, [])

  useEffect(() => {
    if (!runPaneOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRunPaneOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [runPaneOpen])

  // Agent-session pane: retain every enabled linked step chat, including terminal turns.
  // A completed turn does not disable its chat; only chat_disabled_at/superseded removes the
  // linkage. Pending/error rows still carry staleness, while blocked/done/advanced rows remain
  // openable so a later response can reactivate or route back into the card.
  const PENDING_STALE_MS = 600_000
  const runStatus = useMemo(() => {
    const rows: { cardId: string; card: string; step: string; agent: string; stale: boolean; status: string; live: boolean; responsePending: boolean; agentId?: string; slotKey?: string; sessionKey?: string; sessionName?: string }[] = []
    for (const c of cards) {
      const ss = c.step_status || {}
      const sessions = c.step_sessions || {}
      const pl = pipelines.find(p => p.id === c.pipeline_id) || pipelines.find(p => p.repo === c.source?.repo)
      const steps = new Set([...Object.keys(ss), ...Object.keys(sessions)])
      for (const step of steps) {
        const st = ss[step] || 'idle'
        const sess = sessions[step]
        const inFlight = st === 'pending' || st === 'error'
        const enabledSession = !!sess?.slot_key && !sess.chat_disabled_at && !sess.superseded
        if (!inFlight && !enabledSession) continue
        const at = c.pending_at?.[step]
        const stale = inFlight && !!at && (Date.now() - new Date(at).getTime()) > PENDING_STALE_MS
        const sdef = pl?.steps?.find(s => s.id === step)
        const agent = sess?.agent || sdef?.agent?.crew || sdef?.agent?.name || 'orchestrator'
        const agentId = sess?.agent_id
        const slotKey = sess?.slot_key
        const sessionKey = sess?.session_key
        const live = agentId
          ? liveSpawns.some(ls => ls.id === agentId)
          : inFlight && liveSpawns.some(ls => (ls.task || '').includes(c.id) || (ls.task || '').includes(c.title))
        const responsePending = !!sess?.last_response_at &&
          (!sess.last_response_handled_at || sess.last_response_handled_at < sess.last_response_at)
        rows.push({ cardId: c.id, card: c.title || c.id, step, agent, stale, status: st, live, responsePending, agentId, slotKey, sessionKey, sessionName: sess?.name })
      }
    }
    return rows
  }, [cards, pipelines, liveSpawns])

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

  const producerStepFor = useCallback((card: PipelineCard) => {
    const sessions = card.step_sessions || {}
    const retained = Object.entries(sessions).find(([, ptr]) =>
      ptr.retained_for_gate === card.stage && ptr.retention !== 'released'
    )
    let producer = card.gate_review?.producer_step || retained?.[0]

    if (!producer) {
      const pipeline = pipelines.find(p => p.id === card.pipeline_id) ||
        pipelines.find(p => p.repo === card.source?.repo)
      const configured = pipeline?.steps?.length ? pipeline.steps : DEFAULT_STEPS
      const normalized: PipelineStep[] = [
        { id: 'intake', name: 'Intake', type: 'agent' },
        ...configured.filter(step => step.id !== 'intake' && step.id !== 'done'),
        { id: 'done', name: 'Done', type: 'agent' },
      ]
      const gateIndex = normalized.findIndex(step => step.id === card.stage)
      const gate = gateIndex >= 0 ? normalized[gateIndex] : undefined
      producer = gate?.reviews_step
      if (!producer && gateIndex >= 0) {
        for (let index = gateIndex - 1; index >= 0; index--) {
          const candidate = normalized[index]
          if (candidate.id === 'intake' || candidate.id === 'done') continue
          if (candidate.type !== 'gate' && !candidate.id.startsWith('gate-')) {
            producer = candidate.id
            break
          }
        }
      }
    }
    return producer
  }, [pipelines])

  const producerSessionFor = useCallback((card: PipelineCard) => {
    const producer = producerStepFor(card)
    if (!producer) return undefined
    const pointer = (card.step_sessions || {})[producer]
    if (!pointer?.slot_key || pointer.chat_disabled_at || pointer.superseded) return undefined
    return {
      step: producer,
      slotKey: pointer.slot_key,
      retained: pointer.retention === 'held-for-gate',
    }
  }, [producerStepFor])

  useEffect(() => {
    const fetchLive = async () => {
      try {
        // Derive the snapshot path from the RESOLVED state dir (H1) — not a substring
        // replace, and only after fetchCards has settled STATE_PATH onto the live tier, so
        // we read the same dir the cron writes (durable or /tmp), never a phantom path.
        const dir = STATE_PATH.slice(0, STATE_PATH.lastIndexOf('/'))
        const livePath = (dir ? dir + '/' : '') + 'live_spawns.json'
        const snap = await api.get('/api/file-read?path=' + encodeURIComponent(livePath))
        liveSpawnsAbsent.current = false
        // ignore a stale snapshot (cron may have frozen it on a tool-error window)
        const fresh = snap?.at ? (Date.now() - new Date(snap.at).getTime()) < 180_000 : true
        setLiveSpawns(fresh && Array.isArray(snap?.runs) ? snap.runs : [])
      } catch {
        // Snapshot not created yet (the dlc-yolo-spawns cron hasn't run) — a NORMAL state,
        // not an error. Suppress further polling so we don't 404 every interval; a page
        // reload re-arms it (by then the cron will have created the file).
        liveSpawnsAbsent.current = true
        setLiveSpawns([])
      }
    }
    let pollCount = 0
    void fetchCards(true).then(fetchLive)
    const interval = setInterval(() => {
      pollCount += 1
      const reconcileAuthority = pollCount % 12 === 0
      void fetchCards(reconcileAuthority).then(() => { if (!liveSpawnsAbsent.current) fetchLive() })
    }, 10000)
    return () => clearInterval(interval)
  }, [fetchCards, api])

  // KiroCrew has two distinct layers: global crew routing records in config.json and
  // installed agent templates in ~/.kiro/agents. Preserve both; never flatten a crew into
  // a fake inline agent config or claim declarations are live runtime observations.
  const loadAgentCatalog = useCallback(async () => {
    setAgentCatalogLoading(true)
    let roster: CrewRecord[] = []
    try {
      const cfg = await readAppFile('~/.kiro/crew/config.json')
      roster = normalizeCrewRecords(cfg?.agents)
      setCrews(roster)
    } catch (e) {
      console.warn('crew roster (config.json) unreadable:', e)
      setCrews([])
    }

    const profiles = await Promise.all(catalogProfileNames(roster).map(async name => {
      const candidate = profileDeclarationPath(name, roster)
      if (!candidate) return normalizeAgentProfile(null, name) as AgentProfile
      try {
        const raw = await readAppFile(candidate)
        return normalizeAgentProfile(raw, name, candidate) as AgentProfile
      } catch {
        return normalizeAgentProfile(null, name, candidate) as AgentProfile
      }
    }))
    setAgentProfiles(profiles)
    setAgentCatalogLoading(false)
  }, [readAppFile])

  const openAgentCatalog = useCallback(() => {
    setAgentCatalogOpen(true)
    void loadAgentCatalog()
  }, [loadAgentCatalog])

  const openPipelineEditor = useCallback((repo: string) => {
    void loadAgentCatalog().then(() => setEditRepo(repo))
  }, [loadAgentCatalog])

  const saveCrewRoute = useCallback(async (draft: CrewRouteDraft) => {
    await api.post('/apps/dlc-yolo/api/agents/crew', {
      mode: draft.mode,
      name: draft.name,
      kiro_agent: draft.kiroAgent,
      workspace: draft.workspace || null,
      memory_store: draft.memoryStore || null,
    })
    await loadAgentCatalog()
  }, [api, loadAgentCatalog])

  const mutateState = useCallback(async (mutator: (state: { config?: PipelineConfig; pipelines?: Pipeline[]; cards: PipelineCard[] }) => void) => {
    try {
      const initial = await resolveStateFile(readAppFile)
      STATE_PATH = initial.path
      initial.data.cards = initial.data.cards || []
      mutator(initial.data)
      // H2 (reduce lost-update vs the 120s cron): re-resolve + re-read immediately before
      // writing and re-apply the idempotent field-set. This preserves both concurrent cron
      // updates and a runtime override pointer that changed after the first read.
      let destination = initial
      try {
        destination = await resolveStateFile(readAppFile)
        STATE_PATH = destination.path
        destination.data.cards = destination.data.cards || []
        mutator(destination.data)
      } catch {
        destination = initial
      }
      await api.post('/api/file-write', {
        path: destination.path,
        content: JSON.stringify(destination.data, null, 2),
      })
      fetchCards()
    } catch (e) {
      console.error('Failed to mutate state:', e)
    }
  }, [api, fetchCards, readAppFile])

  const setPipelineConfig = useCallback((patch: Partial<PipelineConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }))
    mutateState(state => { state.config = { ...DEFAULT_CONFIG, ...(state.config || {}), ...patch } })
  }, [mutateState])

  // --- One gate/card command path (revision-safe gate state machine) ---
  // At a gate the UI appends one immutable command only. The deterministic driver validates the
  // exact stage/revision/readiness, serializes races, records history/interjections, and moves
  // stages/labels. The stable id survives mutateState's read-re-read application.
  const submitCardCommand = useCallback((
    cardId: string,
    stage: string,
    command: { type: 'approve' } | { type: 'reject'; reason: string } |
      { type: 'interject'; kind: string; text: string },
    expectedRevision?: number | null,
  ) => {
    const at = new Date().toISOString()
    const commandId = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    mutateState(state => {
      const card = state.cards.find(c => c.id === cardId)
      if (!card || card.stage !== stage) return

      // Interjections on ordinary agent steps remain the existing durable card channel. Gate
      // interjections join approve/reject in gate_commands so all three share one mutation path.
      if (expectedRevision === undefined && command.type === 'interject') {
        const text = command.text.trim()
        if (!text) return
        card.interjection = card.interjection || []
        if (!card.interjection.some(entry => entry.id === commandId)) {
          card.interjection.push({
            id: commandId, at, step: stage, kind: command.kind,
            text, by: 'user', status: 'pending',
          })
        }
        card.updated_at = at
        return
      }

      const actualRevision = card.gate_review?.result_revision ?? null
      if (actualRevision !== expectedRevision) return
      const reason = command.type === 'reject' ? command.reason.trim() : undefined
      const text = command.type === 'interject' ? command.text.trim() : undefined
      if (command.type === 'reject' && !reason) return
      if (command.type === 'interject' && !text) return

      card.gate_commands = card.gate_commands || []
      if (!card.gate_commands.some(entry => entry.id === commandId)) {
        card.gate_commands.push({
          id: commandId,
          gate: stage,
          action: command.type,
          expected_revision: expectedRevision ?? null,
          actor: 'user',
          at,
          status: 'pending',
          ...(reason ? { reason } : {}),
          ...(command.type === 'interject' ? { kind: command.kind, text } : {}),
        })
      }
      card.updated_at = at
    })
  }, [mutateState])

  // Native maintenance requests (§8.2): append one bounded request:* interjection consumed by the
  // deterministic _process_maintenance_requests cron pass. UI never writes stage/label/topology.
  const submitMaintenanceRequest = useCallback((cardId: string, kind: string, text: string) => {
    const now = new Date().toISOString()
    const id = newRequestId()  // generated ONCE before the read/re-read (dedupe by id)
    mutateState(state => {
      const card = state.cards.find(c => c.id === cardId)
      if (!card) return
      let req
      try { req = buildRequest({ id, kind, text, card, now }) }
      catch { return }  // validation failure (e.g. missing required reason) — no-op
      card.interjection = appendRequest(card.interjection, req)
      card.updated_at = now
    })
  }, [mutateState])

  // Cooperative cancel from the card (lightweight killswitch): writes the same markers the
  // deterministic runtime already honors (writes_allowed:false + cancel_requested_at) and parks the
  // lifecycle. The runtime stops advancing it; a live producer re-reads the flag and stands down.
  const cancelCard = useCallback((cardId: string) => {
    if (!window.confirm('Cancel this card? Writes are revoked cooperatively — a live turn may not stop immediately, and its worktree is retained until terminal observation.')) return
    const now = new Date().toISOString()
    mutateState(state => {
      const card = state.cards.find(c => c.id === cardId)
      if (!card) return
      card.lifecycle = 'cancelled'
      card.writes_allowed = false
      card.cancel_requested_at = now
      card.updated_at = now
    })
  }, [mutateState])

  // Acknowledge a raised advisory decision without pretending its proposed action was enacted.
  const resolveDecision = useCallback((cardId: string, decisionId: string) => {
    mutateState(state => {
      const card = state.cards.find(c => c.id === cardId)
      if (!card) return
      const d = (card.decisions || []).find(x => x.id === decisionId)
      if (d) {
        d.chosen = 'acknowledged'
        ;(d as { status?: string; resolved_at?: string }).status = 'acknowledged'
        ;(d as { status?: string; resolved_at?: string }).resolved_at = new Date().toISOString()
      }
      card.updated_at = new Date().toISOString()
    })
  }, [mutateState])

  const openOrchestrator = useCallback(async (card: PipelineCard) => {
    // Single orchestrator: the session lives on the PIPELINE; the card holds a back-ref
    // ({pipeline_id, session_key, ref}). Resolve the openable slot from the card's own slot_key
    // (legacy), its back-ref session_key (cron:<id> → cron-<id>), or the owning pipeline session.
    const slotFrom = (c?: PipelineCard): string | undefined => {
      const os = c?.orchestrator_session
      if (os?.slot_key) return os.slot_key
      if (os?.session_key) return os.session_key.replace(/^cron:/, 'cron-')
      const plSess = pipelines.find(p => p.id === c?.pipeline_id)?.orchestrator_session
      return plSess?.slot_key || (plSess?.session_key ? plSess.session_key.replace(/^cron:/, 'cron-') : undefined)
    }
    const existing = slotFrom(card)
    if (existing) { navigate(`/chat?sid=${encodeURIComponent(existing)}`); return }
    try {
      const res = await api.post('/apps/dlc-yolo/api/orchestrator/trigger', { card_id: card.id }) as { ok?: boolean; slot_key?: string }
      if (res?.slot_key) { navigate(`/chat?sid=${encodeURIComponent(res.slot_key)}`); return }
    } catch { /* fall through to poll for the cron-minted slot */ }
    // The advance cron mints the openable session on its next wake; poll fresh state (~16s).
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 2000))
      try {
        const fresh = await readCurrentState(readAppFile, STATE_PATH)
        const freshCard = (fresh.data.cards || []).find(c => c.id === card.id)
        const plSess = (fresh.data.pipelines || []).find((p: Pipeline) => p.id === freshCard?.pipeline_id)?.orchestrator_session
        const slot = freshCard?.orchestrator_session?.slot_key
          || (freshCard?.orchestrator_session?.session_key || plSess?.session_key || '').replace(/^cron:/, 'cron-')
          || plSess?.slot_key
        if (slot) { void fetchCards(); navigate(`/chat?sid=${encodeURIComponent(slot)}`); return }
      } catch { /* keep polling */ }
    }
    void fetchCards()
  }, [api, navigate, readAppFile, fetchCards])

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

  const setCardBudget = useCallback((cardId: string, budget?: Budget) => {
    mutateState(state => {
      const card = state.cards.find(c => c.id === cardId)
      if (!card) return
      if (budget) card.budget = { ...budget }
      else delete card.budget
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
    const catalogLoad = loadAgentCatalog()
    const found: RepoCandidate[] = []
    // KiroCrew workspaces
    try {
      const cfg = await api.get('/api/file-read?path=~/.kiro/crew/config.json')
      const ws = cfg?.workspaces || {}
      Object.entries(ws).forEach(([name, v]: [string, any]) => {
        const declaredRepo = typeof v?.repo === 'string' && /^[^/\s]+\/[^/\s]+$/.test(v.repo) ? v.repo : ''
        found.push({
          repo: declaredRepo, workspace: name, label: name, source: 'workspace', detail: v?.dir || name,
          path: typeof v?.dir === 'string' ? v.dir : undefined,
        })
      })
    } catch (e) { console.warn('workspaces registry unreadable:', e) }
    // Issue Radar connected repos (read-only — never write to its data dir)
    try {
      const ir = await api.get('/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json')
      ;(ir?.repos || []).forEach((r: any) => {
        if (r?.owner && r?.repo) found.push({ repo: `${r.owner}/${r.repo}`, source: 'issue-radar', detail: `${r.provider || 'github'} · ${r.host || 'github.com'}` })
      })
    } catch (e) { console.warn('issue-radar config unreadable (app may not be installed):', e) }
    setCandidates(found)
    await catalogLoad
    setSetupOpen(true)
  }, [api, loadAgentCatalog])

  const createPipeline = useCallback(async (p: {
    repo: string; workspace: string; repo_path?: string; source: RepoCandidate['source']; trust: Trust; depth: Depth; budget?: Budget; backlog_intake: boolean; results_in_repo: boolean; conversation_log: boolean; trusted_authors: string[]; self_enabling: boolean; approach: 'simplified' | 'enhanced'; sync_mode?: 'poll' | 'webhook'; steps: PipelineStep[]
  }) => {
    const now = new Date().toISOString()
    const id = 'pl-' + Math.random().toString(36).slice(2, 10)
    await mutateState(state => {
      state.pipelines = state.pipelines || []
      const existing = state.pipelines.find((pl: Pipeline) => pl.repo === p.repo)
      if (existing) {
        // Edit mode: update the existing pipeline in place.
        existing.source = p.source
        existing.workspace = p.workspace
        if (p.repo_path) existing.repo_path = p.repo_path
        else delete existing.repo_path
        existing.trust = p.trust
        existing.depth = p.depth
        if (p.budget) existing.budget = p.budget
        else delete existing.budget
        existing.backlog_intake = p.backlog_intake
        existing.results_in_repo = p.results_in_repo
        existing.conversation_log = p.conversation_log
        if (p.trusted_authors.length) existing.trusted_authors = p.trusted_authors
        else delete existing.trusted_authors
        existing.self_enabling = p.self_enabling
        existing.approach = p.approach
        if (p.sync_mode) existing.sync_mode = p.sync_mode
        else delete existing.sync_mode
        existing.steps = p.steps
      } else {
        state.pipelines.push({
          id, repo: p.repo, workspace: p.workspace, ...(p.repo_path ? { repo_path: p.repo_path } : {}),
          source: p.source,
          trust: p.trust, depth: p.depth, backlog_intake: p.backlog_intake,
          ...(p.budget ? { budget: p.budget } : {}),
          results_in_repo: p.results_in_repo,
          conversation_log: p.conversation_log,
          ...(p.trusted_authors.length ? { trusted_authors: p.trusted_authors } : {}),
          self_enabling: p.self_enabling, approach: p.approach,
          ...(p.sync_mode && p.sync_mode !== 'poll' ? { sync_mode: p.sync_mode } : {}),
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
    // Active step columns exclude terminal cards — those go to the dedicated Done/Cancelled
    // columns (rendered at the end of the board) so finished work is visible + separated, not
    // lingering in the working columns.
    const TERMINAL = new Set(['retired', 'cancelled', 'canceled', 'merged', 'superseded'])
    return stepIds.reduce((acc, id) => {
      acc[id] = cards.filter(c => c.stage === id && !TERMINAL.has(String(c.lifecycle || '')))
      return acc
    }, {} as Record<string, PipelineCard[]>)
  }, [cards, stepIds])

  // Terminal cards grouped by outcome for the dedicated end-of-board columns.
  const doneCards = useMemo(
    () => cards.filter(c => ['retired', 'merged'].includes(String(c.lifecycle || ''))),
    [cards])
  const cancelledCards = useMemo(
    () => cards.filter(c => ['cancelled', 'canceled', 'superseded'].includes(String(c.lifecycle || ''))),
    [cards])

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
    const grouped = Object.fromEntries(CARD_STATUS_ORDER.map(kind => [kind, [] as PipelineCard[]])) as Record<string, PipelineCard[]>
    cards.forEach(card => {
      const pipeline = pipelines.find(item => item.id === card.pipeline_id) || pipelines.find(item => item.repo === card.source?.repo)
      const gate = pipeline?.steps?.find(step => step.id === card.stage)?.type === 'gate' || isGateStep(card.stage)
      const liveObserved = runStatus.some(row => row.cardId === card.id && row.step === card.stage && row.live)
      grouped[deriveCardStatus(card, { isGate: gate, liveObserved }).kind].push(card)
    })
    return Object.fromEntries(CARD_STATUS_ORDER
      .filter(kind => grouped[kind].length > 0)
      .map(kind => [CARD_STATUS_META[kind].label, grouped[kind]])) as Record<string, PipelineCard[]>
  }, [cards, pipelines, isGateStep, runStatus])

  const TERMINAL_LC = new Set(['retired', 'merged', 'cancelled', 'canceled', 'superseded'])
  const activeCount = cards.filter(c => !TERMINAL_LC.has(String(c.lifecycle || ''))).length
  const gatedCount = cards.filter(c => isGateStep(c.stage) && !TERMINAL_LC.has(String(c.lifecycle || ''))).length
  const doneCount = cards.filter(c => TERMINAL_LC.has(String(c.lifecycle || ''))).length
  const parkedTotal = cards.reduce((n, c) => n + (c.parked?.length || 0), 0)

  const tabCounts: Record<string, number> = {
    pipeline: cards.length,
    workspace: Object.keys(workspaceGroups).length,
    crew: Object.keys(crewGroups).length,
    status: cards.length,
    backlog: parkedTotal,
  }
  const hasLiveGeneration = runStatus.some(row => !!row.slotKey && liveTails[row.slotKey]?.active && liveTails[row.slotKey]?.phase === 'generating')
  const hasLiveThinking = runStatus.some(row => !!row.slotKey && liveTails[row.slotKey]?.active && liveTails[row.slotKey]?.phase === 'thinking')

  const cardProps = (card: PipelineCard) => {
    const pipeline = pipelines.find(item => item.id === card.pipeline_id) ||
      pipelines.find(item => item.repo === card.source?.repo)
    const gateStage = pipeline?.steps?.find(step => step.id === card.stage)?.type === 'gate' ||
      isGateStep(card.stage)
    // A terminal-lifecycle card (cancelled/retired/merged) is DONE — it must never present an
    // actionable gate (Approve/Reject), even if it happens to sit on a gate stage. Otherwise a
    // cancelled card shows gate buttons that can only ever refuse (e.g. gate-review-missing).
    const terminalLifecycle = ['cancelled', 'canceled', 'retired', 'merged', 'superseded']
      .includes(String(card.lifecycle || ''))
    const gate = gateStage && !terminalLifecycle
    const expectedRevision = gate ? (card.gate_review?.result_revision ?? null) : undefined
    const producerStep = gate ? producerStepFor(card) : undefined
    const producerSession = gate ? producerSessionFor(card) : undefined
    const liveObserved = runStatus.some(row => row.cardId === card.id && row.step === card.stage && row.live)
    const cardStatus = deriveCardStatus(card, { isGate: gate, liveObserved })
    const step = pipeline?.steps?.find(item => item.id === card.stage)
    const effectiveCapability = card.capability || step?.capability || 'auto-derived'
    return {
      card,
      config,
      isGate: gate,
      cardStatus,
      effectiveCapability,
      producerStep,
      producerSession,
      onOpenProducer: producerSession
        ? () => navigate(`/chat?sid=${encodeURIComponent(producerSession.slotKey)}`)
        : undefined,
      onApprove: gate
        ? () => submitCardCommand(card.id, card.stage, { type: 'approve' }, expectedRevision)
        : undefined,
      onReject: gate
        ? (reason: string) => submitCardCommand(card.id, card.stage, { type: 'reject', reason }, expectedRevision)
        : undefined,
      onCycleTrust: () => cycleTrust(card.id),
      onCycleDepth: () => cycleDepth(card.id),
      onSetBudget: (budget?: Budget) => setCardBudget(card.id, budget),
      onInterject: (kind: string, text: string) => submitCardCommand(
        card.id, card.stage, { type: 'interject', kind, text }, expectedRevision),
      onResolveDecision: (decisionId: string) => resolveDecision(card.id, decisionId),
      onOpenOrchestrator: () => openOrchestrator(card),
      liveView: (() => {
        // Join the card's CURRENT step session slot → the liveTail stream for it, so the card
        // can render a peek of the working agent's output. Presentation-only (never state).
        const slot = card.step_sessions?.[card.stage]?.slot_key
        const tail = slot ? liveTails[slot] : undefined
        const live = runStatus.some(row => row.cardId === card.id && row.step === card.stage && row.live)
        if (!slot || (!tail?.active && !live)) return undefined
        return {
          stage: card.stage,
          phase: tail?.phase || 'running',
          tail: tail?.tail || '',
          active: !!tail?.active && live,
          seq: tail?.seq || 0,
          slotKey: slot,
          onOpen: () => navigate(`/chat?sid=${encodeURIComponent(slot)}`),
        }
      })(),
      allCards: cards,
      onRequest: (kind: string, text: string) => submitMaintenanceRequest(card.id, kind, text),
      onOpenStepSession: (() => {
        // Expose EVERY recorded step session (not just the current stage) so any session the card
        // produced is reachable — a card past investigate/requirements/design can still open those.
        const ss = card.step_sessions
        if (!ss || typeof ss !== 'object') return undefined
        const sessions = Object.entries(ss)
          .map(([step, ptr]) => {
            const slot = ptr?.slot_key || (ptr?.session_key ? ptr.session_key.replace(/^cron:/, 'cron-') : undefined)
            return slot ? { step, open: () => navigate(`/chat?sid=${encodeURIComponent(slot)}`) } : null
          })
          .filter((x): x is { step: string; open: () => void } => x !== null)
        return sessions.length ? sessions : undefined
      })(),
      onCancelCard: () => cancelCard(card.id),
      onOpenCard: (cardId: string) => {
        const el = document.getElementById(`card-${cardId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          const prev = el.style.outline
          el.style.outline = '2px solid var(--accent)'
          setTimeout(() => { el.style.outline = prev }, 1400)
        }
      },
    }
  }

  return (
    <>
      <PageHeader title="DLC-YOLO" subtitle="Autonomous SDLC pipeline with human gates" />
      {agentCatalogOpen && <AgentCrewCatalogModal
        profiles={agentProfiles}
        crews={crews}
        loading={agentCatalogLoading}
        context={repoFilter.size === 1 ? [...repoFilter][0] : undefined}
        onRefresh={() => { void loadAgentCatalog() }}
        onSaveCrew={saveCrewRoute}
        onClose={() => setAgentCatalogOpen(false)}
      />}
      {treeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(3px)' }}
          onMouseDown={(event) => { if (event.currentTarget === event.target) setTreeModalOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-label="Pipeline event tree" className="flex flex-col rounded-xl overflow-hidden"
            style={{ width: 'min(920px, calc(100vw - 32px))', maxHeight: 'min(88vh, 900px)', background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 28px 90px rgba(0,0,0,0.5)' }}>
            <header className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[15px] font-semibold flex-1" style={{ color: 'var(--text-strong, var(--text))' }}>🌲 Pipeline event tree</h2>
              <button onClick={() => setTreeModalOpen(false)} className="text-[13px] px-2 py-0.5 rounded hover:opacity-80" style={{ color: 'var(--muted)' }} aria-label="Close">✕</button>
            </header>
            <div className="px-4 py-3 overflow-y-auto">
              <PipelineEventTree
                pipeline={pipelines.find(p => cards.some(c => c.pipeline_id === p.id)) || pipelines[0]}
                cards={cards}
                extras={stateExtras}
                onOpenCard={(cardId) => {
                  setTreeModalOpen(false)
                  setView('pipeline')
                  setTimeout(() => {
                    const e2 = document.getElementById(`card-${cardId}`)
                    if (e2) { e2.scrollIntoView({ behavior: 'smooth', block: 'center' }); const prev = e2.style.outline; e2.style.outline = '2px solid var(--accent)'; setTimeout(() => { e2.style.outline = prev }, 1400) }
                  }, 80)
                }}
              />
            </div>
          </section>
        </div>
      )}

      {backlogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(3px)' }}
          onMouseDown={(event) => { if (event.currentTarget === event.target) setBacklogModalOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-label="Backlog" className="flex flex-col rounded-xl overflow-hidden"
            style={{ width: 'min(820px, calc(100vw - 32px))', maxHeight: 'min(88vh, 900px)', background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 28px 90px rgba(0,0,0,0.5)' }}>
            <header className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[15px] font-semibold flex-1" style={{ color: 'var(--text-strong, var(--text))' }}>📋 Backlog{parkedTotal ? ` · ${parkedTotal}` : ''}</h2>
              <button onClick={() => setBacklogModalOpen(false)} className="text-[13px] px-2 py-0.5 rounded hover:opacity-80" style={{ color: 'var(--muted)' }} aria-label="Close">✕</button>
            </header>
            <div className="px-4 py-3 overflow-y-auto">
              <BacklogView cards={cards} />
            </div>
          </section>
        </div>
      )}

      {operationsOpen && (
        <OperationsPanel cards={cards} schedulerState={stateExtras.scheduler_state}
          statePath={STATE_PATH} readAppFile={readAppFile} onClose={() => setOperationsOpen(false)} />
      )}

      {runPaneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(3px)' }}
          onMouseDown={(event) => { if (event.currentTarget === event.target) setRunPaneOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="agent-sessions-title" className="flex flex-col rounded-xl overflow-hidden"
            style={{ width: 'min(680px, calc(100vw - 32px))', maxHeight: 'min(76vh, 680px)', background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}>
            <header className="flex items-start gap-4 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 id="agent-sessions-title" className="text-[15px] font-semibold" style={{ color: 'var(--text-strong, var(--text))' }}>Agent sessions</h2>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>{runStatus.length}</span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>Live activity from enabled chats linked to pipeline cards.</p>
              </div>
              <button onClick={() => setRunPaneOpen(false)} aria-label="Close agent sessions" className="w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none"
                style={{ color: 'var(--muted)', background: 'var(--bg-hover, transparent)', border: '1px solid var(--border)' }}>×</button>
            </header>
            <div className="overflow-y-auto p-3 flex flex-col gap-2">
              {runStatus.length === 0 ? (
                <div className="px-3 py-8 text-center text-[12px]" style={{ color: 'var(--muted)' }}>No linked agent chats yet.</div>
              ) : runStatus.map((r) => {
                const activity = r.slotKey ? liveTails[r.slotKey] : undefined
                return (
                  <div key={`${r.card}:${r.step}`} className="rounded-lg px-3 py-2.5"
                    style={{ background: r.responsePending ? 'color-mix(in srgb, var(--accent) 9%, var(--bg, transparent))' : 'var(--bg, transparent)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 text-[11px] min-w-0">
                      <span className={r.status === 'pending' || r.responsePending ? 'inline-block animate-pulse flex-shrink-0' : 'inline-block flex-shrink-0'}
                        style={{ width: 7, height: 7, borderRadius: 999, background: r.stale ? 'var(--warn)' : r.responsePending ? 'var(--accent)' : r.status === 'pending' ? 'var(--accent)' : 'var(--muted)' }} />
                      <span className="font-semibold flex-shrink-0" style={{ color: 'var(--accent)' }} title={r.sessionName || undefined}>{r.agent}</span>
                      <span className="truncate" style={{ color: 'var(--muted)' }}>· {r.step}</span>
                      <span className="ml-auto truncate max-w-[220px]" style={{ color: 'var(--text, var(--muted))' }} title={r.card}>{r.card}</span>
                      <span className="flex-shrink-0" style={{ color: r.responsePending ? 'var(--warn)' : r.status === 'pending' ? 'var(--ok)' : 'var(--muted)' }}>{r.responsePending ? 'response' : r.status}</span>
                      {r.stale && <span style={{ color: 'var(--warn)' }} title="stale — will be reclaimed">↻</span>}
                    </div>
                    {activity?.active && activity.phase === 'thinking' && (
                      <div className="mt-2 ml-4 flex items-center gap-2 text-[11px] font-medium" style={{ color: 'var(--accent)' }} title="Real thinking state from this linked dashboard slot">
                        <ActivitySpinner size={13} /><span>Thinking</span>
                      </div>
                    )}
                    {activity?.active && activity.phase === 'generating' && activity.tail && (
                      <div className="mt-2 ml-4 flex items-center gap-2 min-w-0" style={{ color: 'var(--ok)' }} title="Real text projected from this linked slot's live chat_chunk stream">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--ok)' }} />
                        <span className="font-mono text-[11px] truncate">Generating · …{activity.tail}</span>
                      </div>
                    )}
                    {r.slotKey && (
                      <button className="mt-2 ml-4 font-mono" style={{ color: 'var(--muted)', fontSize: 10, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        title={`Copy openable slot ${r.slotKey} (${r.sessionName || r.sessionKey}); open it from Chats`}
                        onClick={() => { try { navigator.clipboard?.writeText(r.slotKey || '') } catch { /* clipboard unavailable */ } }}>copy {r.slotKey.slice(0, 18)}</button>
                    )}
                  </div>
                )
              })}
            </div>
            <footer className="px-5 py-3 text-[10px]" style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
              Thinking and text tails come directly from live dashboard events. Terminal turns stay linked until chat is explicitly disabled.
            </footer>
          </section>
        </div>
      )}
      {setupOpen && (
        <PipelineSetupModal
          candidates={candidates}
          existingRepos={new Set(pipelines.map(p => p.repo))}
          defaults={config}
          agentProfiles={agentProfiles}
          crews={crews}
          onCreate={createPipeline}
          onSaveCrew={saveCrewRoute}
          onClose={() => setSetupOpen(false)}
        />
      )}
      {editRepo && (
        <PipelineSetupModal
          candidates={candidates}
          existingRepos={new Set(pipelines.map(p => p.repo))}
          defaults={config}
          agentProfiles={agentProfiles}
          crews={crews}
          editPipeline={
            pipelines.find(p => p.repo === editRepo) ||
            // demo repos have cards but no pipelines[] entry — synthesize a default to edit
            { id: 'pl-' + editRepo, repo: editRepo, source: 'manual', trust: config.trust, depth: config.depth, backlog_intake: true, sot: 'github', steps: DEFAULT_STEPS.map(s => ({ ...s })), created_at: new Date().toISOString() }
          }
          cardCount={allCards.filter(c => (c.source?.repo || 'unlinked') === editRepo).length}
          isExample={EXAMPLE_REPOS.has(editRepo)}
          onCreate={createPipeline}
          onSaveCrew={saveCrewRoute}
          onDelete={deletePipeline}
          onClose={() => setEditRepo(null)}
        />
      )}
      <div className="px-6 pb-8 overflow-y-auto flex-1 min-h-0">
        <PipelineWorld steps={activeSteps} cardsByStage={cardsByStage} onNodeClick={scrollToStage} />

        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-3">
          <StatCard label="Active" value={String(activeCount)} accent />
          <StatCard label="Gated" value={String(gatedCount)} />
          <StatCard label="Done" value={String(doneCount)} />
          <StatCard label="Parked" value={String(parkedTotal)} />
        </div>

        <DlcYoloControls
          repos={repoList.map(item => item.name)}
          selectedRepos={[...repoFilter]}
          onNewPipeline={() => { void openSetup() }}
          onConfigure={openPipelineEditor}
          onOpenAgents={openAgentCatalog}
        />

        {/* Sidebar + board */}
        <div className="flex gap-4 items-start">
          <RepoScroller
            repos={repoList}
            selected={repoFilter}
            onToggle={toggleRepo}
            onClear={clearRepos}
            onAddWorkspace={openSetup}
            onEdit={openPipelineEditor}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <ViewTabs active={view} onChange={setView} counts={tabCounts} />
              <button onClick={() => setTreeModalOpen(true)} aria-haspopup="dialog"
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer" title="Pipeline event tree — everything happening across the pipeline"
                style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                🌲 <span className="font-semibold">Tree</span>
              </button>
              <button onClick={() => setBacklogModalOpen(true)} aria-haspopup="dialog"
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer" title="Parked backlog ideas"
                style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                📋 <span className="font-semibold">Backlog</span>{parkedTotal ? <span style={{ color: 'var(--accent)' }}>· {parkedTotal}</span> : null}
              </button>
              <button onClick={() => setOperationsOpen(true)} aria-haspopup="dialog"
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer" title="Operations — runtime, projection parity, webhook, sessions"
                style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                🛠 <span className="font-semibold">Ops</span>
              </button>
              {/* Enabled agent sessions open as a centered floating modal. */}
              <button onClick={() => setRunPaneOpen(true)} aria-haspopup="dialog" aria-expanded={runPaneOpen}
                className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer" title="Open enabled agent sessions and see live activity"
                style={{ background: 'var(--bg-elevated, var(--bg))', border: '1px solid var(--border)', color: hasLiveGeneration || hasLiveThinking || runStatus.some(r => r.status === 'pending' || r.responsePending) ? 'var(--accent)' : 'var(--muted)' }}>
                {hasLiveThinking ? <ActivitySpinner size={11} /> : (
                  <span className={hasLiveGeneration || runStatus.some(r => r.status === 'pending' || r.responsePending) ? 'inline-block animate-pulse' : 'inline-block'}
                    style={{ width: 7, height: 7, borderRadius: 999, background: hasLiveGeneration ? 'var(--ok)' : runStatus.some(r => r.responsePending) ? 'var(--warn)' : runStatus.some(r => r.status === 'pending') ? 'var(--accent)' : 'var(--muted)', opacity: runStatus.length ? 1 : 0.5 }} />
                )}
                <span className="font-semibold">{runStatus.length ? `${runStatus.length} session${runStatus.length === 1 ? '' : 's'}` : 'no sessions'}</span>
                {hasLiveThinking && <span>· thinking</span>}
                {hasLiveGeneration && <span style={{ color: 'var(--ok)' }}>· generating</span>}
                {!hasLiveThinking && !hasLiveGeneration && runStatus.filter(r => r.status === 'pending').length > 0 && <span>· {runStatus.filter(r => r.status === 'pending').length} running</span>}
                {runStatus.some(r => r.responsePending) && <span style={{ color: 'var(--warn)' }}>· response</span>}
                {runStatus.some(r => r.stale) && <span style={{ color: 'var(--warn)' }}>· {runStatus.filter(r => r.stale).length} stale ↻</span>}
              </button>
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
            ) : (
              <div ref={kanbanRef} className="flex gap-3 overflow-x-auto pb-4">
                {view === 'pipeline' && activeSteps.map(step => (
                  <ColumnGroup key={step.id} id={`stage-col-${step.id}`} title={step.name} count={(cardsByStage[step.id] || []).length}>
                    {(cardsByStage[step.id] || []).map(card => <PipelineCardItem key={card.id} {...cardProps(card)} />)}
                  </ColumnGroup>
                ))}
                {view === 'pipeline' && doneCards.length > 0 && (
                  <div className="flex-shrink-0 pl-3" style={{ borderLeft: '2px dashed var(--border-strong, var(--border))' }}>
                    <ColumnGroup id="stage-col-done" title="✅ Done" count={doneCards.length}>
                      {doneCards.map(card => <PipelineCardItem key={card.id} {...cardProps(card)} />)}
                    </ColumnGroup>
                  </div>
                )}
                {view === 'pipeline' && cancelledCards.length > 0 && (
                  <ColumnGroup id="stage-col-cancelled" title="⏹ Cancelled" count={cancelledCards.length}>
                    {cancelledCards.map(card => <PipelineCardItem key={card.id} {...cardProps(card)} />)}
                  </ColumnGroup>
                )}

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
