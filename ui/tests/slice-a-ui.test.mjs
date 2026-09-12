import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const budget = readFileSync(new URL('../src/CardBudgetEditor.tsx', import.meta.url), 'utf8')

test('pipeline setup keeps workspace, repository, and checkout as distinct fields', () => {
  assert.match(app, /Workspace partition/)
  assert.match(app, /workspace: p\.workspace/)
  assert.match(app, /existing\.workspace = p\.workspace/)
  assert.match(app, /repo: declaredRepo, workspace: name/)
  assert.doesNotMatch(app, /repo: name, source: 'workspace'/)
})

test('agent setup exposes capability as authority distinct from requested tools', () => {
  assert.match(app, /Capability profile/)
  assert.match(app, /auto-derived/)
  for (const capability of ['readonly', 'authoring', 'builder', 'coordinator']) {
    assert.match(app, new RegExp(`'${capability}'`))
  }
  assert.match(app, /requested\/declared—not proof of runtime access/)
  assert.match(app, /capability: a\.capability/)
})

test('status view uses one pure status projector rather than stage-only in-flight buckets', () => {
  assert.match(app, /deriveCardStatus\(card, \{ isGate: gate, liveObserved \}\)/)
  assert.match(app, /CARD_STATUS_ORDER/)
  assert.doesNotMatch(app, /'In-Flight \(Auto\)'/)
  assert.match(app, /Pending · unconfirmed|cardStatus\.label/)
})

test('cards surface recorded status, capability, SoT, lifecycle, and budget', () => {
  assert.match(app, /sot:\{card\.sot \|\| 'unknown'\}/)
  assert.match(app, /\{card\.lifecycle\}/)   // lifecycle badge (rendered with a 🔄 glyph)
  assert.match(app, /cap:\{effectiveCapability|\{effectiveCapability/)
  assert.match(app, /CardBudgetEditor/)
  assert.match(app, /delete card\.budget/)
})

test('card budget editor preserves exact follow/custom/unlimited semantics', () => {
  assert.match(budget, /if \(mode === 'depth'\) onSave\(undefined\)/)
  assert.match(budget, /max_child_cards: 'unlimited'/)
  assert.match(budget, /effort_ceiling: 'unlimited'/)
  assert.match(budget, /max_feature_size: 'XL'/)
  assert.match(budget, /addenda: 'proactive'/)
  assert.match(budget, /else onSave\(\{ \.\.\.custom \}\)/)
})
