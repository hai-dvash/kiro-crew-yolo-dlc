import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REQUEST_KINDS, REQUEST_META, TEXT_MAX, newRequestId,
  validateRequest, buildRequest, appendRequest,
} from '../src/maintenanceRequests.js'

const card = { id: 'c1', stage: 'design', step_status: { design: 'error' } }

test('kinds match the runtime handler exactly', () => {
  assert.deepEqual([...REQUEST_KINDS].sort(), [
    'request:back-step', 'request:cancel', 'request:park', 'request:re-spec', 'request:retry',
  ])
})

test('buildRequest produces the §8.2 shape with the expected snapshot', () => {
  const req = buildRequest({ id: 'ui-abc', kind: 'request:retry', text: '', card, now: 't1' })
  assert.equal(req.id, 'ui-abc')
  assert.equal(req.kind, 'request:retry')
  assert.equal(req.step, 'design')
  assert.equal(req.by, 'user')
  assert.equal(req.status, 'pending')
  assert.deepEqual(req.expected, { stage: 'design', step_status: 'error' })
})

test('expected.step_status is null when the stage has no recorded status', () => {
  const req = buildRequest({ id: 'ui-x', kind: 'request:re-spec', text: '', card: { id: 'c', stage: 'tasks', step_status: {} }, now: 't' })
  assert.equal(req.expected.step_status, null)
})

test('back-step / park require a reason', () => {
  assert.equal(validateRequest('request:back-step', '').ok, false)
  assert.equal(validateRequest('request:park', '   ').ok, false)
  assert.equal(validateRequest('request:back-step', 'too big').ok, true)
  // retry/re-spec/cancel do not require a reason
  assert.equal(validateRequest('request:retry', '').ok, true)
  assert.equal(validateRequest('request:cancel', '').ok, true)
})

test('text is bounded and trimmed', () => {
  const long = 'x'.repeat(TEXT_MAX + 50)
  assert.equal(validateRequest('request:re-spec', long).ok, false)
  const req = buildRequest({ id: 'ui-1', kind: 'request:re-spec', text: '  hi  ', card, now: 't' })
  assert.equal(req.text, 'hi')
})

test('back-step carries the boundary when provided', () => {
  const req = buildRequest({ id: 'ui-b', kind: 'request:back-step', text: 'redo', card, now: 't', boundary: 'design→requirements' })
  assert.equal(req.boundary, 'design→requirements')
})

test('appendRequest is idempotent by id', () => {
  const req = buildRequest({ id: 'ui-1', kind: 'request:retry', text: '', card, now: 't' })
  const once = appendRequest([], req)
  const twice = appendRequest(once, req)
  assert.equal(once.length, 1)
  assert.equal(twice.length, 1)          // deduped
})

test('newRequestId is ui-prefixed and stable-shaped', () => {
  const id = newRequestId()
  assert.match(id, /^ui-[a-z0-9]+$/i)
})

test('cancel meta carries the cooperative-revoke warning', () => {
  assert.match(REQUEST_META['request:cancel'].confirm, /revoked|retain|may NOT stop/i)
})
