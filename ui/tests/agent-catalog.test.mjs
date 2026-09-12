import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  applyAgentProfileToDraft,
  catalogProfileNames,
  DLC_AGENT_PROFILE_NAMES,
  normalizeAgentProfile,
  normalizeCrewRecords,
  profileDeclarationPath,
} from '../src/agentCatalog.js'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const catalog = readFileSync(new URL('../src/AgentCrewCatalog.tsx', import.meta.url), 'utf8')
const controls = readFileSync(new URL('../src/WebhookSettings.tsx', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8'))

test('crew normalization preserves KiroCrew routing identity instead of flattening configs', () => {
  const crews = normalizeCrewRecords({
    'alpha-crew': {
      kiro_agent: 'dlcyolo-readonly', workspace: 'research', memory_store: 'alpha-memory',
      model: 'model-a', description: 'read pass', triggers: ['audit'], tools: ['not-a-crew-field'],
    },
    'beta-crew': {
      kiro_agent: 'dlcyolo-builder', workspace: 'build', memory_store: 'beta-memory',
      model: 'model-b', description: 'build pass', triggers: ['implement'],
    },
    '../escape': { kiro_agent: 'bad' },
  })

  assert.deepEqual(crews.map(crew => crew.name), ['alpha-crew', 'beta-crew'])
  assert.deepEqual(crews.map(crew => crew.kiroAgent), ['dlcyolo-readonly', 'dlcyolo-builder'])
  assert.equal(crews[0].workspace, 'research')
  assert.equal(crews[1].memoryStore, 'beta-memory')
  assert.equal('tools' in crews[0], false)
})

test('catalog includes app profiles plus distinct path-safe profiles referenced by crews', () => {
  const names = catalogProfileNames([
    { kiroAgent: 'custom-reviewer' },
    { kiroAgent: 'dlcyolo-builder' },
    { kiroAgent: '../escape' },
  ], ['spec-agent', 'dlcyolo-builder'])
  assert.deepEqual(names, ['spec-agent', 'dlcyolo-builder', 'custom-reviewer'])
})

test('profile declaration paths are authoritative rather than speculative', () => {
  assert.equal(
    profileDeclarationPath('spec-agent', []),
    '~/.kiro/crew/apps/dlc-yolo/agents/spec-agent.json',
  )
  assert.equal(
    profileDeclarationPath('auto-improvement-discovery', [
      { kiroAgent: 'auto-improvement-discovery', source: 'auto-improvement' },
    ]),
    '~/.kiro/agents/auto-improvement--auto-improvement-discovery.json',
  )
  assert.equal(
    profileDeclarationPath('custom-reviewer', [{ kiroAgent: 'custom-reviewer' }]),
    undefined,
  )
})

test('switching profiles changes declared config while preserving the pipeline step objective and route', () => {
  const draft = {
    name: 'spec-agent', role: 'Produce this step artifact', tools: ['read'], model: 'auto',
    crew: 'alpha-crew', capability: 'authoring', trust: 'assisted', depth: 'deep',
  }
  const readonly = normalizeAgentProfile({
    name: 'dlcyolo-readonly', model: 'model-read', tools: ['read', 'grep'],
    allowedTools: ['read'], resources: ['skill://review/SKILL.md'],
  }, 'dlcyolo-readonly', '~/.kiro/agents/dlcyolo-readonly.json')
  const builder = normalizeAgentProfile({
    name: 'dlcyolo-builder', model: 'model-build', tools: ['read', 'write', 'shell'],
    allowedTools: ['read', 'write'], resources: [],
  }, 'dlcyolo-builder', '~/.kiro/agents/dlcyolo-builder.json')

  const first = applyAgentProfileToDraft(draft, readonly)
  const second = applyAgentProfileToDraft(first, builder)

  assert.equal(first.name, 'dlcyolo-readonly')
  assert.deepEqual(first.tools, ['read', 'grep'])
  assert.equal(first.capability, 'readonly')
  assert.equal(second.name, 'dlcyolo-builder')
  assert.deepEqual(second.tools, ['read', 'write', 'shell'])
  assert.equal(second.model, 'model-build')
  assert.equal(second.capability, 'builder')
  assert.equal(second.role, draft.role)
  assert.equal(second.crew, draft.crew)
  assert.equal(second.trust, draft.trust)
  assert.equal(second.depth, draft.depth)
})

test('UI exposes one reusable catalog from the main strip and pipeline setup', () => {
  assert.match(controls, /onOpenAgents/)
  assert.match(controls, /Agent config/)
  assert.match(app, /onOpenAgents=\{openAgentCatalog\}/)
  assert.match(app, /Browse agents &amp; crews/)
  assert.match(app, /normalizeCrewRecords\(cfg\?\.agents\)/)
  assert.match(app, /profileDeclarationPath\(name, roster\)/)
  assert.match(app, /onSaveCrew=\{onSaveCrew\}/)
  assert.match(app, /onSaveCrew=\{saveCrewRoute\}/)
  assert.match(app, /agentProfiles=\{agentProfiles\}/)
  assert.doesNotMatch(app, /useEffect\(\(\) => \{ void loadAgentCatalog\(\) \}, \[loadAgentCatalog\]\)/)
  assert.doesNotMatch(app, /`~\/\.kiro\/agents\/\$\{name\}\.json`/)
  assert.doesNotMatch(app, /onClick=\{\(\) => setName\(a\)\}/)
})

test('catalog explains template authority and keeps global route mutation in the UI/CLI boundary', () => {
  assert.match(catalog, /agent templates define prompts\/tools\/approval policy/)
  assert.match(catalog, /thin global routing record/)
  assert.match(catalog, /UI-managed routing record backed by the sanctioned KiroCrew agent CLI/)
  assert.match(catalog, /onSaveCrew/)
  assert.match(catalog, /New crew route/)
  assert.match(catalog, /Edit route/)
  assert.match(catalog, /declarations from disk, not proof that a live session/)
  assert.doesNotMatch(catalog, /useChatLauncher|openChat|Create \/ update in chat/)
  assert.doesNotMatch(catalog, /api\/file-write/)
})


test('catalog built-in roster matches the app manifest agent declarations', () => {
  const declared = manifest.agents.map(path => path.split('/').at(-1).replace(/\.json$/, ''))
  assert.deepEqual([...DLC_AGENT_PROFILE_NAMES], declared)
})
