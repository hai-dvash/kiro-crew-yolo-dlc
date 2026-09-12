import test from 'node:test'
import assert from 'node:assert/strict'
import { projectCardTimeline, timelineNeedsHuman, resolveChildren, resolveParentId, childTagFromTitle } from '../src/cardTimeline.js'

test('projects and orders events from the card arrays by timestamp', () => {
  const card = {
    updated_at: '2026-09-12T10:00:00Z',
    history: [{ from: 'investigate', to: 'requirements', at: '2026-09-12T09:00:00Z', agent: 'spec-agent' }],
    step_summaries: {
      investigate: { headline: 'Investigated the issue', description: 'ran market crew', status: 'done', executor: 'dlcyolo-rps3d-market', at: '2026-09-12T08:30:00Z' },
    },
    gate_history: [{ gate: 'gate-spec', decision: 'approved', at: '2026-09-12T09:30:00Z' }],
  }
  const ev = projectCardTimeline(card)
  const ats = ev.map(e => e.at)
  assert.deepEqual([...ats].sort(), ats, 'events must be time-ordered')
  // actor tagging
  const byKind = Object.fromEntries(ev.map(e => [e.kind, e]))
  assert.equal(byKind['step-done'].actor, 'step-agent')
  assert.equal(byKind['step-done'].executor, 'dlcyolo-rps3d-market')
  assert.equal(byKind['promoted'].actor, 'loop')
  assert.equal(byKind['approved'].actor, 'human')
  assert.equal(byKind['approved'].cls, 'decision')
})

test('flags needs_human on an unresolved decision and a blocked step', () => {
  const card = {
    step_summaries: { design: { headline: 'design: blocked', status: 'blocked', needs_human: true, at: '2026-09-12T10:00:00Z' } },
    decisions: [{ id: 'd1', at: '2026-09-12T10:05:00Z', step: 'design', kind: 'technical-fork', question: 'cache or profile?' }],
  }
  assert.equal(timelineNeedsHuman(card), true)
  const ev = projectCardTimeline(card)
  const dec = ev.find(e => e.kind === 'decision')
  assert.equal(dec.needs_human, true)
  assert.equal(dec.actor, 'orchestrator')
})

test('a resolved decision is not needs_human', () => {
  const card = { decisions: [{ id: 'd1', at: 't', chosen: 'b', kind: 'fork' }] }
  const ev = projectCardTimeline(card)
  assert.equal(ev[0].kind, 'resolved')
  assert.equal(ev[0].needs_human, false)
})

test('empty/garbage card yields no events', () => {
  assert.deepEqual(projectCardTimeline(null), [])
  assert.deepEqual(projectCardTimeline({}), [])
})

test('childTagFromTitle parses the live [parent · fN] convention', () => {
  assert.deepEqual(childTagFromTitle('[card-rps3d-objects · f1] Throwable RPS object-rig'),
    { parentId: 'card-rps3d-objects', rest: 'Throwable RPS object-rig' })
  assert.equal(childTagFromTitle('plain title with no tag'), null)
})

test('resolveChildren finds title-convention children (topology absent)', () => {
  const parent = { id: 'card-rps3d-objects', title: 'Redesign: throw the objects', topology: null }
  const all = [
    parent,
    { id: 'c-23', title: '[card-rps3d-objects · f1] Throwable rig', stage: 'done', lifecycle: 'retired' },
    { id: 'c-24', title: '[card-rps3d-objects · f2] Poppy reveal', stage: 'done', lifecycle: 'retired' },
    { id: 'c-other', title: 'unrelated card' },
  ]
  const kids = resolveChildren(parent, all)
  assert.equal(kids.length, 2)
  assert.deepEqual(kids.map(k => k.id).sort(), ['c-23', 'c-24'])
  assert.equal(kids[0].lifecycle, 'retired')
})

test('resolveChildren uses topology.children when present', () => {
  const parent = { id: 'P', title: 'parent', topology: { children: [{ card_id: 'k1', required: true }, { card_id: 'k2', required: false }] } }
  const all = [parent, { id: 'k1', title: 'child one', stage: 'review' }, { id: 'k2', title: 'child two', stage: 'design' }]
  const kids = resolveChildren(parent, all)
  assert.deepEqual(kids.map(k => k.id), ['k1', 'k2'])
  assert.equal(kids[1].required, false)
})

test('resolveParentId reads the child title tag', () => {
  assert.equal(resolveParentId({ title: '[card-rps3d-objects · f3] Hidden-CPU board' }), 'card-rps3d-objects')
  assert.equal(resolveParentId({ title: 'a normal card' }), null)
})
