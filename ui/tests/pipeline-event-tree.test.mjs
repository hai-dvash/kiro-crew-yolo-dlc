import test from 'node:test'
import assert from 'node:assert/strict'
import { projectPipelineEvents, ACTORS } from '../src/pipelineEventTree.js'

const pipeline = { id: 'pl-x', repo: 'o/r' }

function sampleCards() {
  return [
    {
      id: 'c1', pipeline_id: 'pl-x',
      history: [{ from: 'investigate', to: 'design', at: '2026-09-12T10:02:00Z', agent: 'advance-cron' }],
      event_outbox: [{ id: 'evt-1', type: 'io.dlcyolo.step.completed', subject: 'design', time: '2026-09-12T10:03:00Z', run_id: 'run-abc', terminal_status: 'completed', observed_status: 'advanced', correlation_id: 'c1' }],
      gate_history: [{ gate: 'gate-spec', decision: 'approved', actor: 'user', at: '2026-09-12T10:05:00Z' }],
      decisions: [{ id: 'd1', step: 'design', kind: 'fork', status: 'open', resolution: 'human-required', at: '2026-09-12T10:04:00Z', question: 'a or b?' }],
      orchestrator_session: { session_key: 'cron:1', slot_key: 'cron-1', name: 'orch', at: '2026-09-12T10:01:00Z' },
    },
    { id: 'c2', pipeline_id: 'other-pipeline', event_outbox: [{ id: 'evt-x', type: 'io.dlcyolo.step.completed', subject: 'x', time: '2026-09-12T09:00:00Z' }] },
  ]
}

test('aggregates all recorded sources for the pipeline, time-ordered', () => {
  const extras = { github_webhook_history: [{ delivery_id: 'wh1', event: 'issues', action: 'labeled', repository: 'o/r', issue_number: 29, card_id: 'c1', status: 'accepted', at: '2026-09-12T10:00:00Z' }], scheduler_state: { running_node_ids: ['n1'], ready_node_ids: [], blocked_node_ids: [] } }
  const { events, actors, now } = projectPipelineEvents(pipeline, sampleCards(), extras)
  const ats = events.map(e => e.at)
  assert.deepEqual([...ats].sort(), ats, 'must be time-ordered')
  // scoped: c2 belongs to another pipeline → excluded
  assert.ok(!events.some(e => e.cardId === 'c2'), 'other-pipeline card must be excluded')
  // sources present
  const kinds = new Set(events.map(e => e.kind))
  assert.ok([...kinds].some(k => k.includes('webhook')), 'webhook lane')
  assert.ok(kinds.has('promoted'), 'stage promotion')
  assert.ok(kinds.has('completed'), 'outbox event')
  assert.ok(kinds.has('gate-approved'), 'gate')
  assert.ok(kinds.has('decision-open'), 'decision')
  assert.ok(kinds.has('orchestrator-session'), 'orchestrator call')
  // actors used include webhook, loop, orchestrator, human, step-agent
  assert.ok(actors.includes('webhook') && actors.includes('human') && actors.includes('orchestrator'))
  assert.equal(now.running_node_ids.length, 1)
})

test('open decision with human-required is flagged needs_human', () => {
  const { events } = projectPipelineEvents(pipeline, sampleCards(), {})
  const dec = events.find(e => e.kind === 'decision-open')
  assert.equal(dec.needs_human, true)
})

test('empty pipeline yields no events, no crash', () => {
  const r = projectPipelineEvents(pipeline, [], {})
  assert.deepEqual(r.events, [])
  assert.deepEqual(r.actors, [])
})

test('ACTORS lane order is stable and complete', () => {
  assert.deepEqual(ACTORS, ['webhook', 'loop', 'orchestrator', 'crew', 'step-agent', 'human'])
})
