import assert from 'node:assert/strict'
import test from 'node:test'

import { CARD_STATUS_ORDER, deriveCardStatus } from '../src/cardStatus.js'

function card(overrides = {}) {
  return {
    id: 'card-1', stage: 'design', lifecycle: 'elaborated',
    step_status: {}, step_sessions: {},
    ...overrides,
  }
}

function scheduled(status, extras = {}) {
  return {
    schema_version: 1,
    current_node_id: 'sched:1',
    nodes: { 'sched:1': { id: 'sched:1', step: 'design', status, ...extras } },
  }
}

test('status precedence is explicit and stable', () => {
  assert.deepEqual(CARD_STATUS_ORDER, [
    'terminal', 'cancelling', 'blocked', 'error', 'waiting-gate',
    'running-observed', 'pending-unconfirmed', 'queued', 'ready', 'idle',
  ])
})

test('terminal and terminal-observed cancellation outrank all other state', () => {
  assert.equal(deriveCardStatus(card({ stage: 'done', step_status: { done: 'blocked' } })).kind, 'terminal')
  assert.equal(deriveCardStatus(card({ lifecycle: 'retired' })).kind, 'terminal')
  assert.equal(deriveCardStatus(card({
    lifecycle: 'cancelled', execution_schedule: scheduled('cancelled'),
  })).kind, 'terminal')
})

test('cooperative cancellation stays cancelling until terminal observation', () => {
  const value = deriveCardStatus(card({
    lifecycle: 'cancelled', step_status: { design: 'pending' },
    step_sessions: { design: { writes_allowed: false, cancel_requested_at: '2026-09-09T00:00:00Z' } },
    execution_schedule: scheduled('cancelling'),
  }))
  assert.equal(value.kind, 'cancelling')
  assert.match(value.reason, /awaiting terminal observation/)
})

test('blocked and error expose only recorded reasons', () => {
  assert.deepEqual(
    deriveCardStatus(card({ step_status: { design: 'blocked' }, block_reason: { design: 'needs approval' } })).kind,
    'blocked',
  )
  assert.equal(
    deriveCardStatus(card({ step_status: { design: 'blocked' }, block_reason: { design: 'needs approval' } })).reason,
    'needs approval',
  )
  assert.equal(
    deriveCardStatus(card({ step_status: { design: 'error' }, error_reason: { design: 'tool unavailable' } })).reason,
    'tool unavailable',
  )
})

test('blocked severity scales the badge — a decision-with-options is a chill non-red prompt', () => {
  // A raised decision with options → light "Choose an option", accent (not danger/red).
  const dec = deriveCardStatus(card({
    step_status: { design: 'blocked' },
    block_reason: { design: 'library direction fork' },
    decisions: [{ id: 'd1', step: 'design', options: [{ id: 'a', note: 'x' }, { id: 'b', note: 'y' }] }],
  }))
  assert.equal(dec.kind, 'blocked')
  assert.equal(dec.severity, 'decision')
  assert.equal(dec.label, 'Choose an option')
  assert.equal(dec.color, 'var(--accent)')

  // A capability-gap block → heavy, danger/red.
  const hard = deriveCardStatus(card({
    step_status: { design: 'blocked' },
    block_reason: { design: 'capability-gap: crew not in inventory' },
  }))
  assert.equal(hard.severity, 'hard')
  assert.equal(hard.color, 'var(--danger)')

  // An approval block → medium, warn (not red).
  const appr = deriveCardStatus(card({
    step_status: { design: 'blocked' },
    block_reason: { design: 'awaiting human approval' },
  }))
  assert.equal(appr.severity, 'approval')
  assert.equal(appr.color, 'var(--warn)')
})

test('gate, live observation, and unconfirmed pending remain distinct', () => {
  assert.equal(deriveCardStatus(card(), { isGate: true }).kind, 'waiting-gate')
  assert.equal(deriveCardStatus(card({ step_status: { design: 'pending' } }), { liveObserved: true }).kind, 'running-observed')
  assert.equal(deriveCardStatus(card({ step_status: { design: 'pending' } })).kind, 'pending-unconfirmed')
  assert.equal(deriveCardStatus(card({ execution_schedule: scheduled('running') })).kind, 'pending-unconfirmed')
})

test('queued, ready, and idle are derived from scheduler evidence only', () => {
  assert.equal(deriveCardStatus(card({ execution_schedule: scheduled('queued', { wait_reasons: ['pipeline-limit'] }) })).kind, 'queued')
  assert.equal(deriveCardStatus(card({ execution_schedule: scheduled('queued', { wait_reasons: ['pipeline-limit'] }) })).reason, 'pipeline-limit')
  assert.equal(deriveCardStatus(card({ execution_schedule: scheduled('ready') })).kind, 'ready')
  assert.equal(deriveCardStatus(card()).kind, 'idle')
})
