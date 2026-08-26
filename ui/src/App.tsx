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

export default function SdlcPipeline() {
  const api = useAppApi()
  const [cards, setCards] = useState<PipelineCard[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCards = useCallback(async () => {
    try {
      const res = await api.fetch('/api/apps/sdlc-pipeline/cards')
      const data = await res.json()
      setCards(data.cards || [])
    } catch (e) {
      console.error('Failed to fetch cards:', e)
    } finally {
      setLoading(false)
    }
  }, [api])

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
      <PageHeader title="SDLC Pipeline" subtitle="Automated dev lifecycle with human gates" />
      <div className="px-6 pb-8 overflow-y-auto flex-1 min-h-0">
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
                        {card.stage.startsWith('gate-') && (
                          <div className="mt-2 flex gap-1">
                            <button
                              className="text-xs px-2 py-0.5 rounded bg-green-600 text-white"
                              onClick={() => api.fetch(`/api/apps/sdlc-pipeline/cards/${card.id}/gate-approve`, { method: 'POST', body: '{}' }).then(fetchCards)}
                            >
                              Approve
                            </button>
                            <button
                              className="text-xs px-2 py-0.5 rounded bg-red-600 text-white"
                              onClick={() => api.fetch(`/api/apps/sdlc-pipeline/cards/${card.id}/gate-reject`, { method: 'POST', body: '{}' }).then(fetchCards)}
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
