import { useAppApi } from '@kirocrew/app-sdk'
import { Card, CardTitle, PageHeader, StatCard } from '@kirocrew/app-sdk/ui'
import { useState, useEffect, useCallback } from 'react'

interface PipelineCard {
  id: string
  title: string
  stage: string
  source: { type?: string; repo?: string; issue?: number; url?: string }
  created_at: string
  updated_at: string
  artifacts: Record<string, unknown>
  gate_history: Array<{ gate: string; decision: string; at: string; notes: string }>
  history: Array<{ from: string; to: string; at: string; agent: string }>
}

const STATE_PATH = '/tmp/dlc-yolo/state.json'

const STAGES = [
  'intake', 'requirements', 'gate-spec', 'design', 'tasks',
  'gate-impl', 'implement', 'review', 'gate-review', 'pr', 'done'
]

const STAGE_LABELS: Record<string, string> = {
  'intake': '📥 Intake',
  'requirements': '📋 Requirements',
  'gate-spec': '🚧 Gate: Spec Q\'s',
  'design': '🏗️ Design',
  'tasks': '📝 Tasks',
  'gate-impl': '🚧 Gate: Approve',
  'implement': '⚡ Implement',
  'review': '🔍 Review',
  'gate-review': '🚧 Gate: Verdict',
  'pr': '🚀 PR',
  'done': '✅ Done',
}

const GATES = new Set(['gate-spec', 'gate-impl', 'gate-review'])

export default function SdlcPipeline() {
  const api = useAppApi()
  const [cards, setCards] = useState<PipelineCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchCards = useCallback(async () => {
    try {
      const state = await api.get(`/api/file-read?path=${encodeURIComponent(STATE_PATH)}`)
      if (state?.cards) {
        setCards(state.cards)
        setError('')
      } else {
        setCards([])
      }
    } catch (e: any) {
      if (e?.message?.includes('404') || e?.message?.includes('not found')) {
        setCards([])
      } else {
        setError(e?.message || 'Failed to load')
        console.error('Failed to fetch cards:', e)
      }
    } finally {
      setLoading(false)
    }
  }, [api])

  const saveState = useCallback(async (newCards: PipelineCard[]) => {
    const content = JSON.stringify({ cards: newCards }, null, 2)
    await api.post('/api/file-write', { path: STATE_PATH, content })
    setCards(newCards)
  }, [api])

  const advanceCard = useCallback(async (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return
    const idx = STAGES.indexOf(card.stage)
    if (idx >= STAGES.length - 1) return
    const newCards = cards.map(c => {
      if (c.id !== cardId) return c
      return {
        ...c,
        stage: STAGES[idx + 1],
        updated_at: new Date().toISOString(),
        history: [...c.history, { from: c.stage, to: STAGES[idx + 1], at: new Date().toISOString(), agent: 'human' }]
      }
    })
    await saveState(newCards)
  }, [cards, saveState])

  const rejectCard = useCallback(async (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card || !GATES.has(card.stage)) return
    const idx = STAGES.indexOf(card.stage)
    const newCards = cards.map(c => {
      if (c.id !== cardId) return c
      return {
        ...c,
        stage: STAGES[idx - 1],
        updated_at: new Date().toISOString(),
        gate_history: [...c.gate_history, { gate: c.stage, decision: 'rejected', at: new Date().toISOString(), notes: '' }],
        history: [...c.history, { from: c.stage, to: STAGES[idx - 1], at: new Date().toISOString(), agent: 'human' }]
      }
    })
    await saveState(newCards)
  }, [cards, saveState])

  useEffect(() => {
    fetchCards()
    const interval = setInterval(fetchCards, 10000)
    return () => clearInterval(interval)
  }, [fetchCards])

  const cardsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = cards.filter(c => c.stage === stage)
    return acc
  }, {} as Record<string, PipelineCard[]>)

  const activeCount = cards.filter(c => c.stage !== 'done').length
  const gatedCount = cards.filter(c => c.stage.startsWith('gate-')).length

  return (
    <>
      <PageHeader title="⭐ DLC-YOLO" subtitle="Automated dev lifecycle with human gates" />
      <div className="px-6 pb-8 overflow-y-auto flex-1 min-h-0">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6">
          <StatCard label="Active" value={String(activeCount)} accent />
          <StatCard label="Awaiting Gate" value={String(gatedCount)} />
          <StatCard label="Done" value={String(cards.filter(c => c.stage === 'done').length)} />
          <StatCard label="Total" value={String(cards.length)} />
        </div>

        {loading ? (
          <Card><p className="text-sm text-muted">Loading pipeline…</p></Card>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map(stage => (
              <div key={stage} className="min-w-[180px] flex-shrink-0">
                <div className="text-xs font-medium text-muted mb-2 truncate">
                  {STAGE_LABELS[stage]} ({cardsByStage[stage].length})
                </div>
                <div className="flex flex-col gap-2">
                  {cardsByStage[stage].map(card => (
                    <Card key={card.id}>
                      <div className="p-2">
                        <div className="text-sm font-medium truncate">{card.title}</div>
                        <div className="text-xs text-muted mt-1">
                          {card.source?.repo && `${card.source.repo}#${card.source.issue}`}
                        </div>
                        {GATES.has(card.stage) && (
                          <div className="mt-2 flex gap-1">
                            <button
                              className="text-xs px-2 py-0.5 rounded bg-green-600 text-white"
                              onClick={() => advanceCard(card.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="text-xs px-2 py-0.5 rounded bg-red-600 text-white"
                              onClick={() => rejectCard(card.id)}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
