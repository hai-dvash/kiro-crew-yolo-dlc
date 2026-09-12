import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DURABLE_STATE,
  STATE_POINTER,
  TMP_STATE,
  readCurrentState,
  resolveStateFile,
  statePathFromPointer,
} from '../src/statePath.js'

function reader(entries, calls = []) {
  return async path => {
    calls.push(path)
    if (!entries.has(path)) throw new Error(`missing: ${path}`)
    const value = entries.get(path)
    if (value instanceof Error) throw value
    return value
  }
}

test('absolute runtime override wins and returns its state payload', async () => {
  const target = '/srv/dlc-yolo/custom-state.json'
  const state = { cards: [{ id: 'override-card' }] }
  const calls = []
  const resolved = await resolveStateFile(reader(new Map([
    [STATE_POINTER, JSON.stringify({ schema_version: 1, path: target })],
    [target, state],
  ]), calls))

  assert.deepEqual(resolved, { path: target, data: state, source: 'pointer' })
  assert.deepEqual(calls, [STATE_POINTER, target])
})

test('malformed and relative pointers are rejected before target reads', async () => {
  for (const pointer of [
    'not-an-object',
    { schema_version: 2, path: '/srv/state.json' },
    { schema_version: 1, path: 'relative/state.json' },
    { schema_version: 1, path: '/srv/../state.json' },
    { schema_version: 1, path: '/srv/state.json', extra: true },
    { schema_version: 1, path: `/${'x'.repeat(5000)}` },
  ]) {
    const calls = []
    const durable = { cards: [] }
    const resolved = await resolveStateFile(reader(new Map([
      [STATE_POINTER, pointer],
      [DURABLE_STATE, durable],
    ]), calls))
    assert.equal(resolved.path, DURABLE_STATE)
    assert.deepEqual(resolved.data, durable)
    assert.deepEqual(calls, [STATE_POINTER, DURABLE_STATE])
  }
})

test('stale or missing pointer target preserves durable then scratch fallback', async () => {
  const staleTarget = '/srv/dlc-yolo/missing.json'
  const durable = { cards: [{ id: 'durable' }] }
  const staleCalls = []
  const stale = await resolveStateFile(reader(new Map([
    [STATE_POINTER, JSON.stringify({ schema_version: 1, path: staleTarget })],
    [DURABLE_STATE, durable],
  ]), staleCalls))
  assert.equal(stale.path, DURABLE_STATE)
  assert.deepEqual(staleCalls, [STATE_POINTER, staleTarget, DURABLE_STATE])

  const scratch = { cards: [{ id: 'scratch' }] }
  const missingCalls = []
  const missing = await resolveStateFile(reader(new Map([
    [TMP_STATE, scratch],
  ]), missingCalls))
  assert.deepEqual(missing, { path: TMP_STATE, data: scratch, source: 'scratch' })
  assert.deepEqual(missingCalls, [STATE_POINTER, DURABLE_STATE, TMP_STATE])
})

test('pointer validator accepts only the bounded canonical absolute schema', () => {
  assert.equal(
    statePathFromPointer({ schema_version: 1, path: '/var/lib/dlc/state.json' }),
    '/var/lib/dlc/state.json',
  )
  assert.equal(statePathFromPointer({ schema_version: 1, path: '~/state.json' }), null)
  assert.equal(statePathFromPointer({ schema_version: 1, path: '/a/./state.json' }), null)
})


test('ordinary polling reads the resolved path without re-probing the optional pointer', async () => {
  const current = { cards: [{ id: 'current' }] }
  const calls = []
  const resolved = await readCurrentState(reader(new Map([
    [DURABLE_STATE, current],
  ]), calls), DURABLE_STATE)

  assert.deepEqual(resolved, { path: DURABLE_STATE, data: current, source: 'current' })
  assert.deepEqual(calls, [DURABLE_STATE])
})

test('a failed current-path poll immediately restores full authority resolution', async () => {
  const target = '/srv/dlc-yolo/new-state.json'
  const state = { cards: [{ id: 'new-authority' }] }
  const calls = []
  const resolved = await readCurrentState(reader(new Map([
    [STATE_POINTER, { schema_version: 1, path: target }],
    [target, state],
  ]), calls), DURABLE_STATE)

  assert.deepEqual(resolved, { path: target, data: state, source: 'pointer' })
  assert.deepEqual(calls, [DURABLE_STATE, STATE_POINTER, target])
})
