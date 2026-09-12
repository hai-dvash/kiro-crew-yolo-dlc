import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildGateInspection, gateValue } from '../src/gateInspection.js'

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

function completeCard() {
  return {
    id: 'card-1',
    stage: 'gate-design',
    step_status: { design: 'advanced' },
    runtime_handshakes: {
      design: {
        assignment: {
          assigned_profile: 'dlcyolo-coordinator',
          effective_profile: 'dlcyolo-authoring',
        },
        capabilities: {
          tools: { profile_declared: ['read', 'write'], actual: null, status: 'unobservable' },
          skills: { profile_declared: ['skill://pipeline-workflow'], actual: null, status: 'unobservable' },
        },
        routing: {
          model: { requested: 'auto', applied: null, status: 'unobservable' },
          reasoning_effort: { requested: 'high', applied: null, status: 'unobservable' },
        },
        scope: {
          network: { declared: 'restricted', actual: null, status: 'unobservable' },
          write: { declared: { owned_repository: 'owner/repo' }, actual: null, status: 'unobservable' },
          worktree: { path: '/worktrees/card-1', branch: 'dlc/card-1', observation_status: 'observed' },
        },
      },
    },
    gate_review: {
      gate: 'gate-design',
      producer_step: 'design',
      producer_session_ref: 'step_sessions.design',
      envelope_id: 'env-1',
      result_revision: 3,
      status: 'awaiting-review',
      created_at: '2026-09-05T00:00:00Z',
      bundle: {
        summary: 'The design satisfies the approved requirements.',
        artifacts: [{ id: 'art-1', path: '/results/design.md', kind: 'design' }],
        changes_since_prior: ['Added failure recovery'],
        intent_and_requirement_coverage: [
          { id: 'R1', requirement: 'Recovery is bounded', enforcement: 'required', status: 'covered' },
        ],
        decisions_and_questions: [],
        card_topology: {
          action: 'fan-in', integration_owner: 'card-1', integration_status: 'ready',
          children: [{ id: 'child-1', required: true, status: 'done' }],
        },
        budget: { allocated: { effort: 15 }, consumed: { effort: 8 }, remaining: { effort: 7 } },
        validation_and_evidence: [{ id: 'test-1', check: 'Design lint', status: 'passed' }],
        known_risks: [{ id: 'risk-1', title: 'Migration ordering', status: 'open' }],
        omissions_and_deviations: [{ id: 'dev-1', title: 'Load test deferred', level: 'preferred' }],
      },
    },
  }
}

test('a complete revisioned bundle is review-ready without inventing applied routing', () => {
  const card = completeCard()
  const before = structuredClone(card)
  const inspection = buildGateInspection(card, 'design')

  assert.deepEqual(card, before)
  assert.equal(inspection.ready, true)
  assert.deepEqual(inspection.missing, [])
  assert.equal(inspection.revision, 3)
  assert.equal(inspection.summary, 'The design satisfies the approved requirements.')
  assert.equal(inspection.topology.action, 'fan-in')
  assert.equal(inspection.topology.incompleteRequiredChildren.length, 0)
  assert.equal(inspection.routing.assignedProfile, 'dlcyolo-coordinator')
  assert.equal(inspection.routing.effectiveProfile, 'dlcyolo-authoring')
  assert.equal(inspection.routing.model.requested, 'auto')
  assert.equal(inspection.routing.model.applied, null)
  assert.equal(inspection.routing.model.status, 'unobservable')
  assert.equal(inspection.routing.effort.requested, 'high')
  assert.equal(inspection.routing.effort.applied, null)
})

test('missing legacy gate data is visibly not review-ready', () => {
  const inspection = buildGateInspection({
    stage: 'gate-spec', step_status: { requirements: 'advanced' },
    runtime_handshakes: {
      requirements: { routing: { model: { requested: 'auto', status: 'unobservable' } } },
    },
  }, 'requirements')

  assert.equal(inspection.ready, false)
  assert.ok(inspection.missing.includes('result bundle record'))
  assert.ok(inspection.missing.includes('declared result bundle'))
  assert.ok(inspection.missing.includes('result revision'))
  assert.ok(inspection.missing.includes('result summary'))
  assert.ok(inspection.missing.includes('referenced artifact'))
  assert.equal(inspection.routing.model.requested, 'auto')
  assert.equal(inspection.routing.model.applied, null)
  assert.equal(inspection.routing.model.status, 'unobservable')
  assert.equal(inspection.producerSessionRef, null)
  assert.equal(inspection.routing.worktree, null)
  assert.equal(gateValue(inspection.routing.model.applied), 'unobservable')
})

test('intent integrity violations block readiness for legacy envelopes', () => {
  const card = completeCard()
  card.intent_integrity = {
    status: 'violation',
    violations: ['raw-intent-mutation-reverted', 'intent-contract-version-not-monotonic'],
  }

  const inspection = buildGateInspection(card, 'design')
  assert.equal(inspection.ready, false)
  assert.ok(inspection.missing.includes(
    'intent integrity (raw-intent-mutation-reverted, intent-contract-version-not-monotonic)'))
})

test('required fan-in stays blocked until every required child is terminal or waived', () => {
  const card = completeCard()
  card.gate_review.bundle.card_topology.children.push(
    { id: 'child-2', required: true, status: 'pending' },
    { id: 'child-3', required: false, status: 'pending' },
  )

  const inspection = buildGateInspection(card, 'design')
  assert.equal(inspection.ready, false)
  assert.equal(inspection.topology.incompleteRequiredChildren.length, 1)
  assert.equal(inspection.topology.incompleteRequiredChildren[0].label, 'child-2')
  assert.ok(inspection.missing.includes('required child fan-in (1 incomplete)'))

  card.gate_review.bundle.card_topology.children[1].status = 'waived'
  assert.equal(buildGateInspection(card, 'design').ready, true)

  card.gate_review.bundle.card_topology.children = []
  const emptyFanIn = buildGateInspection(card, 'design')
  assert.equal(emptyFanIn.ready, false)
  assert.ok(emptyFanIn.missing.includes('declared fan-in child set'))
})

test('artifact rows link only explicit http URLs and preserve local paths as references', () => {
  const card = completeCard()
  card.gate_review.bundle.artifacts = [
    { id: 'local', path: '/results/design.md', kind: 'design', summary: 'Design document preview' },
    { id: 'remote', url: 'https://example.test/evidence.png', kind: 'evidence' },
    { id: 'unsafe', url: 'javascript:alert(1)', kind: 'evidence' },
    { kind: 'missing-reference' },
  ]
  const inspection = buildGateInspection(card, 'design')
  const artifacts = inspection.artifacts

  assert.equal(artifacts[0].url, null)
  assert.equal(artifacts[0].ref, '/results/design.md')
  assert.equal(artifacts[0].preview, 'Design document preview')
  assert.equal(artifacts[1].url, 'https://example.test/evidence.png')
  assert.equal(artifacts[2].url, null)
  assert.equal(artifacts[3].ref, null)
  assert.ok(inspection.missing.includes('artifact reference (1 missing)'))
})

test('gate dialog is read-only and exposes the required review sections and guarded controls', () => {
  assert.match(appSource, /Gate result inspection/)
  assert.match(appSource, /Result summary/)
  assert.match(appSource, /Changes since prior revision/)
  assert.match(appSource, /Artifacts and evidence references/)
  assert.match(appSource, /Alternatives and trade-offs/)
  assert.match(appSource, /Research and citations/)
  assert.match(appSource, /Preferred shortfalls \(non-blocking\)/)
  assert.match(appSource, /Local checkout path/)
  assert.match(appSource, /repo_path/)
  assert.match(appSource, /Intent and requirement coverage/)
  assert.match(appSource, /Omissions and deviations/)
  assert.match(appSource, /Card topology and integration/)
  assert.match(appSource, /Budget consumption/)
  assert.match(appSource, /Routing and runtime provenance/)
  assert.match(appSource, /Validation and evidence/)
  assert.match(appSource, /Known risks/)
  assert.match(appSource, /Open decisions and questions/)
  assert.match(appSource, /Open producer · \{producerSession\.step\}/)
  assert.match(appSource, /onApprove\(\); onClose\(\)/)
  assert.match(appSource, /const requestReject = \(\) =>/)
  assert.match(appSource, /onReject\(reason\.trim\(\)\)/)
  assert.match(appSource, /setInspectionOpen\(false\); setInterjectOpen\(true\)/)
  assert.doesNotMatch(appSource, /const gateInspection.*mutateState/)
  assert.doesNotMatch(appSource, /\bcard\.stage\s*=(?!=)/)
})


test('priority 5 readiness mirrors required result scope and research citations', () => {
  const card = completeCard()
  card.execution_envelope = {
    id: 'env-1', schema_version: 2, step: 'design',
    observations: { controls_runtime: ['questions', 'research_policy', 'result_scope'] },
    questions: { cadence: 'one-at-a-time', max_rounds: 3 },
    result_scope: {
      alternatives: 2,
      evidence: ['visual-proof'], validation: ['visual-review'],
      required_outcome_ids: ['I-1'], hard_constraint_ids: [],
      enforcement: { alternatives: 'required', evidence: 'required', validation: 'required' },
    },
    research_policy: { mode: 'required', citations: 'required', max_passes: 2 },
  }

  const missing = buildGateInspection(card, 'design')
  assert.equal(missing.ready, false)
  assert.ok(missing.missing.includes('required intent coverage I-1'))
  assert.ok(missing.missing.includes('2 material alternatives'))
  assert.ok(missing.missing.includes('required evidence visual-proof'))
  assert.ok(missing.missing.includes('required validation visual-review'))
  assert.ok(missing.missing.includes('required research with claim-level citations'))

  const research = {
    id: 'RS-1', findings: [{ id: 'F-1', claim: 'Finding', source_ids: ['S-1'] }],
    sources: [{ id: 'S-1', url: 'https://example.test/reference', title: 'Reference',
      accessed_at: '2026-09-05T00:00:00Z', source_type: 'primary' }],
  }
  Object.assign(card.gate_review.bundle, {
    alternatives: [{ id: 'A-1' }, { id: 'A-2' }],
    intent_and_requirement_coverage: [
      { intent_id: 'I-1', status: 'satisfied', evidence_refs: ['E-1'] },
    ],
    research_and_citations: [research],
    validation_and_evidence: [
      { id: 'E-1', kind: 'visual-proof', status: 'passed', ref: '/proof.png' },
      { id: 'V-1', kind: 'visual-review', status: 'passed', ref: '/review.md' },
    ],
  })
  const ready = buildGateInspection(card, 'design')
  assert.equal(ready.ready, true)
  assert.deepEqual(ready.missing, [])
  assert.equal(ready.alternatives.length, 2)
  assert.equal(ready.research.length, 1)
})

test('preferred priority 5 shortfalls are visible but non-blocking', () => {
  const card = completeCard()
  card.execution_envelope = {
    id: 'env-1', schema_version: 2, step: 'design',
    observations: { controls_runtime: ['result_scope'] },
    questions: {}, research_policy: { mode: 'disabled', max_passes: 0 },
    result_scope: {
      alternatives: 1, evidence: ['reference-rationale'], validation: [],
      required_outcome_ids: [], hard_constraint_ids: [],
      enforcement: { alternatives: 'advisory', evidence: 'preferred', validation: 'advisory' },
    },
  }
  const inspection = buildGateInspection(card, 'design')
  assert.equal(inspection.ready, true)
  assert.deepEqual(inspection.preferredShortfalls, ['preferred evidence reference-rationale'])
})
