// Pure builder + validation for native maintenance requests (ui-parity-and-operations-spec §8.2,
// parity-full-2.2 §2). The UI appends these to card.interjection[]; the deterministic advance-cron
// pass _process_maintenance_requests consumes them. Kinds + shape MUST match the runtime handler.
// This module is pure (node-test covered) — no React, no I/O.

export const REQUEST_KINDS = [
  'request:re-spec', 'request:retry', 'request:back-step', 'request:park', 'request:cancel',
]

export const TEXT_MAX = 500  // bounded user rationale

// §8.3 confirmation rules, as data the UI renders.
export const REQUEST_META = {
  'request:retry':     { label: 'Retry step',   reasonRequired: false, confirm: 'Re-run this failed step?' },
  'request:re-spec':   { label: 'Re-spec',      reasonRequired: false, confirm: 'Ask the orchestrator to re-scope this card?' },
  'request:back-step': { label: 'Back-step',    reasonRequired: false, confirm: 'Propose stepping this card back a level?' },
  'request:park':      { label: 'Park',         reasonRequired: false, confirm: 'Park this card to the backlog?' },
  'request:cancel':    { label: 'Cancel',       reasonRequired: false,
    confirm: 'Cancel cooperatively: writes are revoked, the live turn may NOT stop immediately, and the permit/worktree are retained until terminal observation. Continue?' },
}

// Stable-random id, generated ONCE before the read/re-read write (dedupe by id).
export function newRequestId() {
  const rand = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 16)
  return `ui-${rand}`
}

// Validate before building. Returns { ok, error }.
export function validateRequest(kind, text) {
  if (!REQUEST_KINDS.includes(kind)) return { ok: false, error: `unknown request kind: ${kind}` }
  const meta = REQUEST_META[kind]
  const trimmed = String(text || '').trim()
  if (meta.reasonRequired && !trimmed) return { ok: false, error: 'a reason is required for this request' }
  if (trimmed.length > TEXT_MAX) return { ok: false, error: `reason exceeds ${TEXT_MAX} chars` }
  return { ok: true }
}

// Build the exact §8.2 shape. `card` supplies the expected snapshot (lost-update guard).
// `id` and `at` are passed in so the caller generates the id ONCE before the write.
export function buildRequest({ id, kind, text, card, now, boundary }) {
  const v = validateRequest(kind, text)
  if (!v.ok) throw new Error(v.error)
  const stage = card?.stage
  const stepStatus = (card?.step_status && typeof card.step_status === 'object')
    ? (card.step_status[stage] ?? null) : null
  const req = {
    id, at: now, step: stage, kind,
    text: String(text || '').trim().slice(0, TEXT_MAX),
    by: 'user', status: 'pending',
    expected: { stage: stage ?? null, step_status: stepStatus },
  }
  if (kind === 'request:back-step' && boundary) req.boundary = boundary
  return req
}

// Idempotent append (dedupe by id) — mirrors the runtime's dedupe.
export function appendRequest(interjections, req) {
  const list = Array.isArray(interjections) ? interjections : []
  if (list.some(e => e && e.id === req.id)) return list
  return [...list, req]
}
