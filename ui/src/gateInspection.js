const TERMINAL_PRODUCER_STATUSES = new Set(['done', 'advanced'])
const COMPLETE_CHILD_STATUSES = new Set([
  'done', 'advanced', 'completed', 'consumed', 'integrated', 'waived', 'omitted',
])

const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value)
const asRecord = value => isRecord(value) ? value : {}
const asArray = value => Array.isArray(value) ? value : value == null ? [] : [value]
const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '')

export function gateValue(value) {
  if (value === undefined || value === null || value === '') return 'unobservable'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.length ? value.map(gateValue).join(' · ') : 'none'
  if (isRecord(value)) {
    const entries = Object.entries(value)
    return entries.length
      ? entries.map(([key, item]) => `${key}: ${gateValue(item)}`).join(' · ')
      : 'none'
  }
  return String(value)
}

export function normalizeGateEntries(value) {
  return asArray(value).map((item, index) => {
    if (!isRecord(item)) {
      return { key: `item-${index}`, title: gateValue(item), detail: null, status: null, level: null, ref: null, url: null }
    }
    const title = first(
      item.title, item.label, item.name, item.requirement, item.question,
      item.check, item.kind, item.id, item.path, item.ref,
    ) || `item ${index + 1}`
    const detail = first(
      item.summary, item.detail, item.description, item.rationale, item.result,
      item.note, item.reason, item.path, item.ref,
    )
    const level = first(item.enforcement, item.level, item.priority,
      item.required === true ? 'required' : undefined)
    const status = first(item.status, item.outcome, item.state, item.passed === true ? 'passed' : undefined,
      item.passed === false ? 'failed' : undefined)
    const ref = first(item.url, item.path, item.ref)
    const url = typeof ref === 'string' && /^https?:\/\//.test(ref) ? ref : null
    return {
      key: String(first(item.id, item.key, item.path, item.ref, `item-${index}`)),
      title: String(title),
      detail: detail == null || String(detail) === String(title) ? null : gateValue(detail),
      status: status == null ? null : String(status),
      level: level == null ? null : String(level),
      ref: ref == null ? null : String(ref),
      url,
    }
  })
}

function artifactRows(value) {
  return asArray(value).filter(item => item !== undefined && item !== null).map((item, index) => {
    const record = asRecord(item)
    const ref = isRecord(item)
      ? first(record.url, record.path, record.ref, record.id)
      : String(item)
    const label = isRecord(item)
      ? first(record.label, record.name, record.kind, record.id, record.path, record.ref, `artifact ${index + 1}`)
      : String(item)
    const rawUrl = first(record.url, typeof ref === 'string' && /^https?:\/\//.test(ref) ? ref : undefined)
    const preview = first(record.preview, record.summary, record.description, record.evidence, record.detail)
    return {
      key: String(first(record.id, record.path, record.ref, `artifact-${index}`)),
      label: String(label),
      ref: ref == null ? null : String(ref),
      url: typeof rawUrl === 'string' && /^https?:\/\//.test(rawUrl) ? rawUrl : null,
      preview: preview == null ? null : gateValue(preview),
      kind: record.kind == null ? null : String(record.kind),
      status: record.status == null ? null : String(record.status),
    }
  })
}

function childRows(topology) {
  const rows = asArray(topology.children)
  return rows.map((item, index) => {
    const record = asRecord(item)
    const required = record.required !== false && !['optional', 'preferred', 'advisory'].includes(
      String(first(record.enforcement, record.level, 'required')).toLowerCase(),
    )
    const status = String(first(record.status, record.state, 'unobservable'))
    return {
      key: String(first(record.id, record.card_id, record.issue, `child-${index}`)),
      label: String(first(record.title, record.name, record.card_id, record.id, record.issue, `child ${index + 1}`)),
      required,
      status,
      complete: COMPLETE_CHILD_STATUSES.has(status.toLowerCase()),
    }
  })
}

const RESULT_COMPLETE_STATUSES = new Set([
  'done', 'completed', 'covered', 'satisfied', 'validated', 'met', 'passed', 'approved',
])

function envelopeForStep(card, producerStep) {
  const current = asRecord(card?.execution_envelope)
  if (current.step === producerStep) return current
  return asArray(card?.execution_envelope_history)
    .map(asRecord)
    .reverse()
    .find(item => item.step === producerStep) || {}
}

function hasRecordRef(value) {
  if (typeof value === 'string') return value.trim().length > 0
  if (!isRecord(value)) return false
  return ['ref', 'id', 'url', 'path', 'artifact_id', 'artifact_ref', 'evidence_refs',
    'requirement_refs', 'design_refs', 'task_refs', 'refs']
    .some(key => value[key] !== undefined && value[key] !== null && value[key] !== '' &&
      (!Array.isArray(value[key]) || value[key].length > 0))
}

function matchingResultRecords(bundle, expected) {
  const records = asArray(bundle.validation_and_evidence).map(asRecord)
  return asArray(expected).map(String).filter(need => !records.some(record => {
    const kind = String(first(record.kind, record.type, record.id, '')).toLowerCase()
    const status = String(first(record.status, '')).toLowerCase()
    return (kind === need.toLowerCase() || asArray(record.satisfies).map(String).includes(need)) &&
      RESULT_COMPLETE_STATUSES.has(status) && hasRecordRef(record)
  }))
}

function researchRecordComplete(record, citationsRequired) {
  const findings = asArray(record.findings).map(asRecord)
  if (!findings.length) return false
  if (!citationsRequired) return true
  const sources = asArray(first(record.sources, record.consulted_sources)).map(asRecord)
    .filter(source => typeof source.url === 'string' && /^https?:\/\//.test(source.url) &&
      source.title && source.accessed_at && first(source.source_type, source.type))
  const ids = new Set(sources.flatMap(source => [source.id && String(source.id), source.url]).filter(Boolean))
  return ids.size > 0 && findings.every(finding => {
    const refs = asArray(first(finding.source_ids, finding.sources)).map(String)
    return finding.claim && refs.some(ref => ids.has(ref))
  })
}

function priority5Assessment(card, producerStep, review, bundle) {
  const integrity = asRecord(card?.intent_integrity)
  const integrityMissing = integrity.status === 'violation'
    ? [`intent integrity (${asArray(integrity.violations).join(', ')})`] : []
  const envelope = envelopeForStep(card, producerStep)
  const controls = asArray(asRecord(envelope.observations).controls_runtime)
  if (Number(envelope.schema_version || 0) < 2 || !controls.includes('result_scope')) {
    return { missing: integrityMissing, preferredShortfalls: [] }
  }
  const missing = [...integrityMissing]
  const preferredShortfalls = []
  if (review.envelope_id !== envelope.id) missing.push('result bound to the active envelope revision')

  const decisions = asArray(card?.decisions).map(asRecord).filter(decision => {
    if (decision.step && decision.step !== producerStep) return false
    if (decision.envelope_id && decision.envelope_id !== envelope.id) return false
    return decision.question || ['intent-fidelity', 'scope-drift', 'technical-fork',
      'capability-gap', 'qualitative-direction', 'visual-direction'].includes(decision.kind)
  })
  const pending = decisions.filter(decision => {
    const status = String(first(decision.status, '')).toLowerCase()
    return decision.chosen === undefined && decision.resolved_at == null &&
      !['resolved', 'answered', 'accepted', 'declined', 'superseded'].includes(status)
  })
  const questionPolicy = asRecord(envelope.questions)
  if (pending.length) missing.push('all qualified questions resolved before completion')
  if (pending.length > 1 && questionPolicy.cadence === 'one-at-a-time') {
    missing.push('one-at-a-time question cadence')
  }
  if (Number.isInteger(questionPolicy.max_rounds) && decisions.length > questionPolicy.max_rounds) {
    missing.push(`question rounds within max_rounds=${questionPolicy.max_rounds}`)
  }

  const scope = asRecord(envelope.result_scope)
  const enforcement = asRecord(scope.enforcement)
  const coverage = new Map(asArray(bundle.intent_and_requirement_coverage).map(asRecord)
    .filter(item => first(item.intent_id, item.constraint_id, item.id))
    .map(item => [String(first(item.intent_id, item.constraint_id, item.id)), item]))
  for (const id of [...asArray(scope.required_outcome_ids), ...asArray(scope.hard_constraint_ids)]) {
    const item = coverage.get(String(id)) || {}
    const status = String(first(item.status, '')).toLowerCase()
    const refs = asArray(first(item.evidence_refs, item.requirement_refs, item.refs))
    if (!RESULT_COMPLETE_STATUSES.has(status) || !refs.some(hasRecordRef)) {
      missing.push(`required intent coverage ${id}`)
    }
  }

  const alternatives = asArray(bundle.alternatives)
  if (Number.isInteger(scope.alternatives) && alternatives.length < scope.alternatives) {
    const label = `${scope.alternatives} material alternatives`
    if (enforcement.alternatives === 'required') missing.push(label)
    else if (enforcement.alternatives === 'preferred') preferredShortfalls.push(label)
  }
  const evidenceMissing = matchingResultRecords(bundle, scope.evidence)
  const validationMissing = matchingResultRecords(bundle, scope.validation)
  if (enforcement.evidence === 'required') {
    missing.push(...evidenceMissing.map(item => `required evidence ${item.toLowerCase()}`))
  } else if (enforcement.evidence === 'preferred') {
    preferredShortfalls.push(...evidenceMissing.map(item => `preferred evidence ${item.toLowerCase()}`))
  }
  if (enforcement.validation === 'required') {
    missing.push(...validationMissing.map(item => `required validation ${item.toLowerCase()}`))
  } else if (enforcement.validation === 'preferred') {
    preferredShortfalls.push(...validationMissing.map(item => `preferred validation ${item.toLowerCase()}`))
  }

  const researchPolicy = asRecord(envelope.research_policy)
  const storedResearch = asRecord(card?.research_artifacts)[producerStep]
  const research = asArray(first(bundle.research_and_citations, storedResearch)).map(asRecord)
  const completeResearch = research.filter(item => researchRecordComplete(
    item, researchPolicy.citations === 'required'))
  if (researchPolicy.mode === 'required' && !completeResearch.length) {
    missing.push('required research with claim-level citations')
  }
  if (Number.isInteger(researchPolicy.max_passes) && research.length > researchPolicy.max_passes) {
    missing.push(`research passes within max_passes=${researchPolicy.max_passes}`)
  }
  if (researchPolicy.mode === 'on-demand' && research.length && !completeResearch.length) {
    preferredShortfalls.push('complete citations for used research')
  }
  return {
    missing: [...new Set(missing)],
    preferredShortfalls: [...new Set(preferredShortfalls)],
  }
}

function runtimeRouting(card, producerStep, bundle) {
  const handshakes = asRecord(card.runtime_handshakes)
  const legacy = asRecord(card.runtime_handshake)
  const handshake = asRecord(handshakes[producerStep] ||
    (legacy.step == null || legacy.step === producerStep ? legacy : {}))
  const assignment = asRecord(handshake.assignment)
  const capabilities = asRecord(handshake.capabilities)
  const tools = asRecord(capabilities.tools)
  const skills = asRecord(capabilities.skills)
  const routing = asRecord(handshake.routing)
  const model = asRecord(routing.model)
  const effort = asRecord(routing.reasoning_effort)
  const scope = asRecord(handshake.scope)
  const worktree = asRecord(scope.worktree)
  const bundleRouting = asRecord(bundle.routing_and_provenance)
  const bundleModel = asRecord(bundleRouting.model)
  const bundleEffort = asRecord(bundleRouting.reasoning_effort)
  const bundleAssignment = asRecord(bundleRouting.assignment)

  const declaredTools = first(tools.profile_declared, tools.declared, bundleRouting.declared_tools)
  const actualTools = first(tools.actual, bundleRouting.actual_tools)
  const declaredSkills = first(skills.profile_declared, skills.declared, bundleRouting.declared_skills)
  const actualSkills = first(skills.actual, bundleRouting.actual_skills)

  return {
    assignedProfile: first(bundleAssignment.assigned_profile, bundleRouting.assigned_profile,
      assignment.assigned_profile) ?? null,
    effectiveProfile: first(bundleAssignment.effective_profile, bundleRouting.effective_profile,
      assignment.effective_profile) ?? null,
    model: {
      requested: first(bundleModel.requested, bundleRouting.requested_model, model.requested) ?? null,
      applied: first(bundleModel.applied, bundleRouting.applied_model, model.applied) ?? null,
      provider: first(bundleModel.provider, bundleRouting.resolved_provider, model.provider) ?? null,
      version: first(bundleModel.version, bundleRouting.model_version, model.version) ?? null,
      status: first(bundleModel.status, bundleRouting.model_resolution_status, model.status,
        first(bundleModel.applied, bundleRouting.applied_model, model.applied) != null ? 'observed' : 'unobservable'),
    },
    effort: {
      requested: first(bundleEffort.requested, bundleRouting.requested_effort, effort.requested) ?? null,
      applied: first(bundleEffort.applied, bundleRouting.applied_effort, effort.applied) ?? null,
      status: first(bundleEffort.status, bundleRouting.effort_resolution_status, effort.status,
        first(bundleEffort.applied, bundleRouting.applied_effort, effort.applied) != null ? 'observed' : 'unobservable'),
    },
    tools: {
      declared: declaredTools == null ? null : asArray(declaredTools),
      actual: actualTools == null ? null : asArray(actualTools),
      status: first(tools.status, bundleRouting.tools_status, actualTools != null ? 'observed' : 'unobservable'),
    },
    skills: {
      declared: declaredSkills == null ? null : asArray(declaredSkills),
      actual: actualSkills == null ? null : asArray(actualSkills),
      status: first(skills.status, bundleRouting.skills_status, actualSkills != null ? 'observed' : 'unobservable'),
    },
    network: asRecord(scope.network),
    write: asRecord(scope.write),
    worktree: Object.keys(worktree).length ? worktree : null,
  }
}

export function buildGateInspection(card, resolvedProducerStep) {
  const review = asRecord(card?.gate_review)
  const bundle = asRecord(review.bundle)
  const gate = first(review.gate, card?.stage)
  const producerStep = first(review.producer_step, resolvedProducerStep)
  const sessionPointers = asRecord(card?.step_sessions)
  const revision = Number.isInteger(review.result_revision) ? review.result_revision : null
  const reviewStatus = first(review.status, 'unobservable')
  const producerStatus = producerStep ? asRecord(card?.step_status)[producerStep] : undefined
  const artifacts = artifactRows(bundle.artifacts)
  const topology = asRecord(bundle.card_topology)
  const children = childRows(topology)
  const action = first(topology.action, 'unobservable')
  const requiresFanIn = ['fan-in', 'unify'].includes(String(action).toLowerCase())
  const incompleteRequiredChildren = requiresFanIn
    ? children.filter(child => child.required && !child.complete)
    : []

  const missing = []
  if (!card?.gate_review || !isRecord(card.gate_review)) missing.push('result bundle record')
  if (!review.bundle || !isRecord(review.bundle)) missing.push('declared result bundle')
  if (!producerStep) missing.push('producer binding')
  if (revision === null) missing.push('result revision')
  if (gate && card?.stage && gate !== card.stage) missing.push('gate binding matches current stage')
  if (reviewStatus !== 'awaiting-review') missing.push(`review status awaiting-review (currently ${reviewStatus})`)
  if (!TERMINAL_PRODUCER_STATUSES.has(String(producerStatus || '').toLowerCase())) {
    missing.push(`terminal producer status (currently ${producerStatus || 'unobservable'})`)
  }
  if (!first(bundle.summary)) missing.push('result summary')
  if (artifacts.length === 0) missing.push('referenced artifact')
  const unreferencedArtifacts = artifacts.filter(artifact => !artifact.ref)
  if (unreferencedArtifacts.length > 0) {
    missing.push(`artifact reference (${unreferencedArtifacts.length} missing)`)
  }
  if (requiresFanIn && children.length === 0) missing.push('declared fan-in child set')
  if (incompleteRequiredChildren.length > 0) {
    missing.push(`required child fan-in (${incompleteRequiredChildren.length} incomplete)`)
  }
  const scopeAssessment = priority5Assessment(card, producerStep, review, bundle)
  missing.push(...scopeAssessment.missing)

  const unresolvedCardDecisions = asArray(card?.decisions).filter(item => {
    const decision = asRecord(item)
    return !decision.chosen && (!producerStep || !decision.step || decision.step === producerStep)
  })
  const decisions = normalizeGateEntries([
    ...asArray(bundle.decisions_and_questions),
    ...unresolvedCardDecisions,
  ])
  const routing = runtimeRouting(card || {}, producerStep, bundle)

  return {
    gate: gate || null,
    producerStep: producerStep || null,
    producerSessionRef: first(
      review.producer_session_ref,
      producerStep && isRecord(sessionPointers[producerStep])
        ? `step_sessions.${producerStep}` : undefined,
    ) || null,
    envelopeId: first(review.envelope_id) || null,
    revision,
    reviewStatus,
    createdAt: first(review.created_at) || null,
    ready: missing.length === 0,
    missing,
    summary: first(bundle.summary) || null,
    changes: normalizeGateEntries(bundle.changes_since_prior),
    artifacts,
    coverage: normalizeGateEntries(bundle.intent_and_requirement_coverage),
    alternatives: normalizeGateEntries(bundle.alternatives),
    research: normalizeGateEntries(first(
      bundle.research_and_citations,
      producerStep && asRecord(card?.research_artifacts)[producerStep],
    )),
    preferredShortfalls: scopeAssessment.preferredShortfalls,
    decisions,
    topology: {
      action,
      integrationOwner: first(topology.integration_owner, topology.owner) || null,
      integrationStatus: first(topology.integration_status, topology.status) || null,
      children,
      incompleteRequiredChildren,
    },
    budget: {
      allocated: asRecord(bundle.budget).allocated ?? null,
      consumed: asRecord(bundle.budget).consumed ?? null,
      remaining: asRecord(bundle.budget).remaining ?? null,
    },
    routing,
    validation: normalizeGateEntries(bundle.validation_and_evidence),
    risks: normalizeGateEntries(bundle.known_risks),
    deviations: normalizeGateEntries(bundle.omissions_and_deviations),
  }
}
