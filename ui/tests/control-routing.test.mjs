import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const controls = readFileSync(new URL('../src/WebhookSettings.tsx', import.meta.url), 'utf8')
const catalog = readFileSync(new URL('../src/AgentCrewCatalog.tsx', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8'))

test('one AI-marked button is the only command-session shortcut', () => {
  assert.match(controls, /✨ Command session/)
  assert.match(controls, /const command = '\/dlc-yolo'/)
  assert.match(controls, /openChat\(\{ message: command \}\)/)
  assert.doesNotMatch(controls, /`\/dlc-yolo \$\{target\}`/)
  assert.equal((controls.match(/openChat\(/g) || []).length, 1)
  assert.doesNotMatch(controls, /Start work|Maintain in chat|launch\('Start|launch\('Maintain/)
  assert.doesNotMatch(app, /useChatLauncher|openChat\(|Draft with \/dlc-yolo/)
  assert.doesNotMatch(catalog, /useChatLauncher|openChat\(|Create \/ update in chat/)
})

test('compact command controls sit immediately below card stats', () => {
  const statsEnd = app.indexOf('<StatCard label="Parked"')
  const controlsAt = app.indexOf('<DlcYoloControls')
  const boardAt = app.indexOf('{/* Sidebar + board */}')
  assert.ok(statsEnd >= 0 && controlsAt > statsEnd && boardAt > controlsAt)
  const commandControls = controls.slice(controls.indexOf('export function DlcYoloControls'))
  assert.match(commandControls, /data-dlc-command-controls/)
  assert.match(commandControls, /items-center justify-end gap-1\.5 flex-wrap/)
  assert.match(commandControls, /text-\[10px\] leading-none px-1\.5 py-1 rounded font-semibold/)
  assert.doesNotMatch(commandControls, /ml-auto/)
  assert.doesNotMatch(commandControls, /px-6 pb-3|py-1\.5 rounded-md/)
})

test('pipeline and agent configuration stay in UI-native surfaces', () => {
  assert.match(controls, /Edit pipeline/)
  assert.match(controls, /New pipeline/)
  assert.match(controls, /Agent config/)
  assert.match(app, /Configure step execution/)
  assert.match(app, /UI configuration/)
  assert.match(app, /apps\/dlc-yolo\/api\/agents\/crew/)
  assert.match(catalog, /New global crew route/)
  assert.match(catalog, /Edit route/)
})


test('app-wide webhook configuration lives inside Pipeline Setup', () => {
  const commandControls = controls.slice(controls.indexOf('export function DlcYoloControls'))
  assert.match(app, /WebhookSettingsSection/)
  assert.match(app, /Webhook · app-wide/)
  assert.match(controls, /data-pipeline-webhook-settings/)
  assert.match(controls, /Shared by every pipeline/)
  assert.match(controls, /Webhook backend unavailable in the running gateway/)
  assert.doesNotMatch(commandControls, /webhookOpen|setWebhookOpen|>Webhook</)
})


test('state polling suppresses expected pointer misses without weakening writes', () => {
  assert.match(app, /fetchCards\(true\)/)
  assert.match(app, /pollCount % 12 === 0/)
  assert.match(app, /readCurrentState\(readAppFile, STATE_PATH\)/)
  assert.match(app, /destination = await resolveStateFile\(readAppFile\)/)
})


test('manifest exposes no standalone webhook page', () => {
  assert.deepEqual(manifest.ui?.pages?.map(page => page.route), ['/apps/dlc-yolo'])
})
