import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const webhook = readFileSync(new URL('../src/WebhookSettings.tsx', import.meta.url), 'utf8')

test('raised decisions resolve via STRUCTURED selection (real option id), with a mini-modal picker, never fake enactment', () => {
  // The panel surfaces the fork's options + the agent recommendation + the block reason so the
  // human can answer it. Choosing an option now writes the REAL option id into decisions[].chosen
  // (structured Slice B), NOT a free-text interjection the agent must re-parse.
  assert.match(app, /Decision needed/)
  assert.match(app, /Choose \{id\}/)                                  // per-option quick-resolve button
  assert.match(app, /onClick=\{\(\) => onResolveDecision\(d\.id, o\.id \|\| id\)\}/)  // structured resolve
  assert.match(app, /Agent rationale/)

  // The mini-modal picker: a focused selection surface returning the chosen option id.
  assert.match(app, /function DecisionResolveModal/)
  assert.match(app, /Resolve on this branch/)
  assert.match(app, /resolve in picker…/)
  assert.match(app, /onResolve=\{\(optionId\) => onResolveDecision\(d\.id, optionId\)\}/)

  // resolveDecision writes the real option id + human provenance when one is chosen.
  assert.match(app, /d\.chosen = chosenOptionId && chosenOptionId\.trim\(\) \? chosenOptionId\.trim\(\) : 'acknowledged'/)
  assert.match(app, /resolved_by = 'user'/)

  // Free-text stays the escape hatch, and an OPTIONLESS decision still uses the honest
  // acknowledge marker (never a fabricated enactment).
  assert.match(app, /answer in words/)
  assert.match(app, /Acknowledge &amp; continue/)
  assert.doesNotMatch(app, /onResolveDecision\(d\.id, 'approve'\)/)
  assert.doesNotMatch(app, /onResolveDecision\(d\.id, 'decline'\)/)
})

test('a blocked card surfaces its block_reason and invites an interjection', () => {
  // Blocked with a reason but no pending decision must not be a silent dead-end.
  assert.match(app, /Blocked · \{step\}/)
  assert.match(app, /interject to unblock/)
})

test('the decision UI honors an explicit recommended:true flag (not only rationale text)', () => {
  // Root-cause fix: the agent now emits structured options with recommended:true; the picker
  // and inline panel must prefer that flag over parsing the rationale prose.
  assert.match(app, /o\.recommended === true/)
  assert.match(app, /opts\.find\(o => o\.recommended === true\)\?\.id/)
})

test('the decision mini-modal defaults to the recommended option and returns the selected id', () => {
  // Radio-select surface: pre-selects the agent recommendation, disables confirm until a choice,
  // and the confirm hands back the chosen option id (structured selection = answer).
  assert.match(app, /const \[selected, setSelected\] = useState<string>\(recommendedId \|\| ''\)/)
  assert.match(app, /type="radio"/)
  assert.match(app, /disabled=\{!selected\}/)
  assert.match(app, /if \(selected\) \{ onResolve\(selected\); onClose\(\) \}/)
  assert.match(app, /⭐ recommended/)
})

test('the Agent-sessions panel excludes terminal-lifecycle cards and dead session pointers', () => {
  // Regression: cancelled #29/#30 and a released #32 investigate were filling the panel as "open
  // sessions" with no card open. The runStatus builder must skip terminal-lifecycle cards entirely
  // and treat released/retired/paused/disabled/superseded pointers as NOT enabled.
  assert.match(app, /TERMINAL_LIFECYCLES = new Set\(\['cancelled'/)
  assert.match(app, /TERMINAL_LIFECYCLES\.has\(String\(c\.lifecycle/)
  assert.match(app, /sess\.retired_at \|\| sess\.cron_pause_observed_at/)
  assert.match(app, /sess\.retention === 'released'/)
})

test('invalid webhook storage exposes the backend validation reason', () => {
  assert.match(webhook, /view\.configuration_source === 'invalid'/)
  assert.match(webhook, /view\.configuration_error/)
  assert.match(webhook, /Reason: \{view\.configuration_error\}/)
})
