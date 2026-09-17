// Pure projectors for the Operations panel (ui-parity §10.1, §10.2). No React, no I/O — node-test
// covered. Truthful counts only: never label a card 'running' from age; distinguish observed vs
// unconfirmed; a missing projection status is 'unavailable', never 'healthy'.

// §10.1 — aggregate card-node status counts from cards + scheduler_state (recorded facts only).
const RUNTIME_BUCKETS = [
  'ready', 'queued', 'running', 'pending', 'blocked', 'error', 'cancelling', 'terminal',
]

export function aggregateRuntime(cards, schedulerState) {
  const counts = Object.fromEntries(RUNTIME_BUCKETS.map(b => [b, 0]))
  const sched = schedulerState && typeof schedulerState === 'object' ? schedulerState : {}
  // scheduler_state carries authoritative ready/running/blocked/selected node id sets
  counts.ready = (sched.ready_node_ids || []).length
  counts.running = (sched.running_node_ids || []).length
  counts.blocked = (sched.blocked_node_ids || []).length
  counts.queued = (sched.selected_node_ids || []).length
  // per-card observed status (does not override the scheduler's node sets; adds error/cancel/terminal)
  const waitReasons = []
  for (const c of cards || []) {
    if (!c || typeof c !== 'object') continue
    const stage = c.stage
    const ss = (c.step_status && typeof c.step_status === 'object') ? c.step_status[stage] : null
    if (c.writes_allowed === false || c.cancel_requested_at) counts.cancelling += 1
    else if (ss === 'error') counts.error += 1
    else if (ss === 'blocked') counts.blocked += 1  // observed block beyond scheduler set
    else if (ss === 'pending') counts.pending += 1  // unconfirmed
    else if (ss === 'done' || c.lifecycle === 'retired' || c.lifecycle === 'merged') counts.terminal += 1
    const br = (c.block_reason && typeof c.block_reason === 'object') ? c.block_reason[stage] : null
    if (br) waitReasons.push({ card: c.id, reason: String(br) })
  }
  return { counts, waitReasons: waitReasons.slice(0, 50) }
}

// §10.2 — interpret a validated projections/status.json into a bounded, truthful view.
// `raw` is the parsed object (or null when missing/unreadable → 'unavailable').
export function projectionStatusView(raw) {
  if (!raw || typeof raw !== 'object') {
    return { available: false, label: 'unavailable', authority_active: false, verified: false }
  }
  const authority = !!raw.authority_active
  const parity = String(raw.parity_status || '')
  const verified = parity === 'verified' || raw.verified === true
  return {
    available: true,
    authority_active: authority,
    verified,
    parity_status: parity || (verified ? 'verified' : 'unknown'),
    digest_match: raw.digest_match === undefined ? null : !!raw.digest_match,
    failure_code: raw.failure_code || raw.error || null,
    // never surface paths/prose from the minimized model
    label: !authority ? 'authority inactive' : verified ? 'verified' : 'blocked',
  }
}

export { RUNTIME_BUCKETS }
