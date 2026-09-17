import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateRuntime, projectionStatusView, RUNTIME_BUCKETS } from '../src/operationsProjection.js'

test('aggregateRuntime pulls node sets from scheduler_state', () => {
  const sched = { ready_node_ids: ['a'], running_node_ids: ['a'], blocked_node_ids: ['b'], selected_node_ids: ['a'] }
  const { counts } = aggregateRuntime([], sched)
  assert.equal(counts.ready, 1)
  assert.equal(counts.running, 1)
  assert.equal(counts.blocked, 1)
  assert.equal(counts.queued, 1)
})

test('aggregateRuntime adds observed per-card error/cancel/terminal + wait reasons', () => {
  const cards = [
    { id: 'c1', stage: 'design', step_status: { design: 'error' } },
    { id: 'c2', stage: 'tasks', writes_allowed: false },                        // cancelling
    { id: 'c3', stage: 'done', lifecycle: 'retired' },                          // terminal
    { id: 'c4', stage: 'design', step_status: { design: 'pending' } },          // unconfirmed
    { id: 'c5', stage: 'design', step_status: {}, block_reason: { design: 'needs decision' } },
  ]
  const { counts, waitReasons } = aggregateRuntime(cards, {})
  assert.equal(counts.error, 1)
  assert.equal(counts.cancelling, 1)
  assert.equal(counts.terminal, 1)
  assert.equal(counts.pending, 1)
  assert.deepEqual(waitReasons[0], { card: 'c5', reason: 'needs decision' })
})

test('projectionStatusView: missing status is unavailable, NEVER healthy', () => {
  const v = projectionStatusView(null)
  assert.equal(v.available, false)
  assert.equal(v.label, 'unavailable')
  assert.equal(v.authority_active, false)
  assert.notEqual(v.label, 'healthy')
})

test('projectionStatusView: verified active authority', () => {
  const v = projectionStatusView({ authority_active: true, parity_status: 'verified', digest_match: true })
  assert.equal(v.available, true)
  assert.equal(v.verified, true)
  assert.equal(v.label, 'verified')
  assert.equal(v.digest_match, true)
})

test('projectionStatusView: blocked authority surfaces failure code', () => {
  const v = projectionStatusView({ authority_active: true, parity_status: 'blocked', failure_code: 'digest-mismatch' })
  assert.equal(v.label, 'blocked')
  assert.equal(v.failure_code, 'digest-mismatch')
})

test('RUNTIME_BUCKETS is the truthful bucket set', () => {
  assert.deepEqual(RUNTIME_BUCKETS, ['ready', 'queued', 'running', 'pending', 'blocked', 'error', 'cancelling', 'terminal'])
})
