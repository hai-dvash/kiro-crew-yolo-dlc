import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const webhook = readFileSync(new URL('../src/WebhookSettings.tsx', import.meta.url), 'utf8')

test('raised advisory decisions acknowledge without fabricating action enactment', () => {
  assert.match(app, /Acknowledge &amp; continue/)
  assert.match(app, /This records acknowledgement only; it does not enact/)
  assert.match(app, /d\.chosen = 'acknowledged'/)
  assert.match(app, /status = 'acknowledged'/)
  assert.doesNotMatch(app, /onResolveDecision\(d\.id, 'approve'\)/)
  assert.doesNotMatch(app, /onResolveDecision\(d\.id, 'decline'\)/)
})

test('invalid webhook storage exposes the backend validation reason', () => {
  assert.match(webhook, /view\.configuration_source === 'invalid'/)
  assert.match(webhook, /view\.configuration_error/)
  assert.match(webhook, /Reason: \{view\.configuration_error\}/)
})
