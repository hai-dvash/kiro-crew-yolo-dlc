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

// Classify HOW HEAVY a block is for the human, so the badge scales its color + label instead of
// always shouting red. A block is only alarming (danger/red) when it needs real lifting; a
// "pick one of these good options" pause is a chill, low-stakes prompt.
//   decision  → a raised decisions[] with options: "Choose an option" — light, accent (not red)
//   approval  → needs a gate yes/no or an acknowledgement — medium, warn
//   attention → default human block (needs-info, re-spec) — medium, warn
//   hard      → capability-gap / needs external fix — heavy, danger (red)
function classifyBlock(card, reasonText) {
  const stage = typeof card?.stage === 'string' ? card.stage : ''
  const pending = Array.isArray(card?.decisions)
    ? card.decisions.filter(d => d && !d.chosen && !d.resolved_at
        && (d.step === stage || !d.step) && Array.isArray(d.options) && d.options.length)
    : []
  const r = (reasonText || '').toLowerCase()
  if (pending.length) {
    return { severity: 'decision', label: 'Choose an option', color: 'var(--accent)' }
  }
  if (/capability|missing|not in inventory|no crew|external|unavailable|cannot proceed without a tool/.test(r)) {
    return { severity: 'hard', label: 'Blocked · needs setup', color: 'var(--danger)' }
  }
  if (/approv|confirm|sign.?off|awaiting.*human|needs.?you/.test(r)) {
    return { severity: 'approval', label: 'Needs approval', color: 'var(--warn)' }
  }
  return { severity: 'attention', label: 'Needs input', color: 'var(--warn)' }
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
  let severity = null
  let labelOverride = null
  let colorOverride = null
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
    // Scale the badge to how heavy the ask is — a "choose an option" pause is not red.
    const cls = classifyBlock(card, reason)
    severity = cls.severity
    labelOverride = cls.label
    colorOverride = cls.color
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

  const meta = CARD_STATUS_META[kind]
  return {
    kind,
    reason,
    severity,
    label: labelOverride || meta.label,
    color: colorOverride || meta.color,
  }
}
