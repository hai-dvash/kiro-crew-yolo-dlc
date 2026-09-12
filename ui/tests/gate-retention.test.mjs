import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const commandPath = source.slice(
  source.indexOf('const submitCardCommand = useCallback'),
  source.indexOf('// Approve/decline a raised decision'),
)

test('gate controls enqueue commands but never mutate gate state or move stages directly', () => {
  assert.match(commandPath, /card\.gate_commands = card\.gate_commands \|\| \[\]/)
  assert.match(commandPath, /card\.gate_commands\.push\(\{/)
  assert.match(commandPath, /action: command\.type/)
  assert.match(commandPath, /expected_revision: expectedRevision \?\? null/)
  assert.doesNotMatch(commandPath, /card\.step_status/)
  assert.doesNotMatch(commandPath, /card\.gate_history/)
  assert.doesNotMatch(source, /const advanceCard\b/)
  assert.doesNotMatch(source, /const rejectCard\b/)
  assert.doesNotMatch(source, /\bcard\.stage\s*=(?!=)/)
  assert.doesNotMatch(source, /agent: 'human'/)
})

test('gate commands are revision-guarded, idempotent, and require a rejection reason', () => {
  assert.match(commandPath, /card\.stage !== stage/)
  assert.match(commandPath, /actualRevision !== expectedRevision/)
  assert.match(commandPath, /card\.gate_commands\.some\(entry => entry\.id === commandId\)/)
  assert.match(commandPath, /command\.type === 'reject' && !reason/)
  assert.match(source, /Why reject revision/)
})

test('gate cards identify and open the retained producer slot', () => {
  assert.match(source, /reviews_step\?: string/)
  assert.match(source, /ptr\.retained_for_gate === card\.stage/)
  assert.match(source, /Open producer · \{producerSession\.step\}/)
  assert.match(source, /navigate\(`\/chat\?sid=\$\{encodeURIComponent\(producerSession\.slotKey\)\}`\)/)
})
