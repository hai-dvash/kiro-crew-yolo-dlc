export const CARD_STATUS_ORDER = [
  'terminal',
  'cancelling',
  'blocked',
  'error',
  'waiting-gate',
  'running-observed',
  'pending-unconfirmed',
  'queued',
  'ready',
  'idle',
]

export const CARD_STATUS_META = {
  terminal: { label: 'Terminal', color: 'var(--ok)' },
  cancelling: { label: 'Cancelling', color: 'var(--warn)' },
  blocked: { label: 'Blocked', color: 'var(--danger)' },
  error: { label: 'Error', color: 'var(--danger)' },
  'waiting-gate': { label: 'Waiting at gate', color: 'var(--warn)' },
  'running-observed': { label: 'Running · observed', color: 'var(--ok)' },
  'pending-unconfirmed': { label: 'Pending · unconfirmed', color: 'var(--accent)' },
  queued: { label: 'Queued', color: 'var(--info)' },
  ready: { label: 'Ready', color: 'var(--accent)' },
  idle: { label: 'Idle / unstarted', color: 'var(--muted)' },
}

const TERMINAL_LIFECYCLES = new Set(['retired', 'merged'])
const CANCEL_LIFECYCLES = new Set(['cancelled', 'canceled', 'superseded', 'parked'])

function currentNode(card) {
  const schedule = card?.execution_schedule
  if (!schedule || typeof schedule !== 'object') return null
  const nodes = schedule.nodes
  if (!nodes || typeof nodes !== 'object') return null
  const id = schedule.current_node_id
  if (typeof id === 'string' && nodes[id] && typeof nodes[id] === 'object') return nodes[id]
  return Object.values(nodes).find(node => node && typeof node === 'object' && node.step === card.stage) || null
}

function reasonFor(card, field) {
  const values = card?.[field]
  const value = values && typeof values === 'object' ? values[card.stage] : null
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function deriveCardStatus(card, { isGate = false, liveObserved = false } = {}) {
  const stage = typeof card?.stage === 'string' ? card.stage : ''
  const lifecycle = typeof card?.lifecycle === 'string' ? card.lifecycle.toLowerCase() : ''
  const stepStatus = card?.step_status && typeof card.step_status === 'object'
    ? String(card.step_status[stage] || '')
    : ''
  const node = currentNode(card)
  const nodeStatus = typeof node?.status === 'string' ? node.status : ''
  const pointer = card?.step_sessions && typeof card.step_sessions === 'object'
    ? card.step_sessions[stage]
    : null
  const cancellationRequested = CANCEL_LIFECYCLES.has(lifecycle)
    || nodeStatus === 'cancelling'
    || pointer?.writes_allowed === false
    || !!pointer?.cancel_requested_at
  const terminalObserved = stage === 'done'
    || TERMINAL_LIFECYCLES.has(lifecycle)
    || ['completed', 'cancelled', 'superseded'].includes(nodeStatus)

  let kind
  let reason = null
  if (terminalObserved) {
    kind = 'terminal'
    reason = nodeStatus === 'cancelled' || CANCEL_LIFECYCLES.has(lifecycle)
      ? `terminal ${lifecycle || nodeStatus}`
      : lifecycle || nodeStatus || stage || null
  } else if (cancellationRequested) {
    kind = 'cancelling'
    reason = 'writes revoked; awaiting terminal observation'
  } else if (stepStatus === 'blocked' || nodeStatus === 'blocked') {
    kind = 'blocked'
    reason = reasonFor(card, 'block_reason') || (node?.wait_reasons || [])[0] || 'step blocked'
  } else if (stepStatus === 'error' || nodeStatus === 'failed') {
    kind = 'error'
    reason = reasonFor(card, 'error_reason') || node?.dispatch_error || 'step error'
  } else if (isGate || nodeStatus === 'gate-wait') {
    kind = 'waiting-gate'
  } else if (liveObserved) {
    kind = 'running-observed'
  } else if (stepStatus === 'pending' || nodeStatus === 'running') {
    kind = 'pending-unconfirmed'
    reason = 'no current live observation'
  } else if (['queued', 'dependency-wait', 'permit-wait'].includes(nodeStatus)) {
    kind = 'queued'
    reason = Array.isArray(node?.wait_reasons) ? node.wait_reasons.join(' · ') : null
  } else if (nodeStatus === 'ready') {
    kind = 'ready'
  } else {
    kind = 'idle'
  }

  return { kind, reason, ...CARD_STATUS_META[kind] }
}
