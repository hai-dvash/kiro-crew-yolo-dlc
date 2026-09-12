// Card timeline projector (legibility-and-event-tree-spec §3/§7): fold the card's existing
// arrays into ONE ordered, actor-tagged, human-readable event list — a read PROJECTION, never
// authority. Works on current cards with no backend timeline write (the spec's client-side
// backfill). Each event: { id, at, actor, kind, step?, cls, needs_human, headline, detail }.

const ACTOR = { LOOP: 'loop', STEP: 'step-agent', ORCH: 'orchestrator', HUMAN: 'human' }

function _iso(v) { return typeof v === 'string' ? v : '' }

// Build events from the card's durable arrays. Deterministic, no side effects.
export function projectCardTimeline(card) {
  if (!card || typeof card !== 'object') return []
  const events = []
  const push = (e) => { if (e && e.at) events.push(e) }

  // Stage transitions (history[] = {from,to,at,agent}) → promotions, actor=loop
  for (const h of card.history || []) {
    if (!h || typeof h !== 'object') continue
    push({
      id: `hist:${h.at}:${h.to}`, at: _iso(h.at), actor: ACTOR.LOOP, kind: 'promoted',
      step: h.to, cls: 'notification', needs_human: false,
      headline: `advanced ${h.from || '?'} → ${h.to || '?'}`,
      detail: h.agent ? `by ${h.agent}` : '',
    })
  }

  // Per-step summaries → the human-readable "what happened" for each step (actor=step-agent)
  for (const [step, s] of Object.entries(card.step_summaries || {})) {
    if (!s || typeof s !== 'object' || !s.headline) continue
    const blocked = s.status === 'blocked'
    push({
      id: `summ:${step}:${s.at || s.status}`, at: _iso(s.at) || _iso(card.updated_at),
      actor: ACTOR.STEP, kind: blocked ? 'blocked' : (s.status === 'error' ? 'error' : 'step-done'),
      step, cls: blocked ? 'notification' : 'notification', needs_human: !!s.needs_human,
      headline: s.headline, detail: s.description || '', executor: s.executor || null,
    })
  }

  // Gate decisions by a human (gate_history[] = {gate,decision,at,notes})
  for (const g of card.gate_history || []) {
    if (!g || typeof g !== 'object') continue
    push({
      id: `gate:${g.at}:${g.gate}`, at: _iso(g.at), actor: ACTOR.HUMAN,
      kind: g.decision === 'rejected' ? 'rejected' : (g.decision === 'approved' ? 'approved' : 'gate'),
      step: g.gate, cls: 'decision', needs_human: false,
      headline: `you ${g.decision || 'acted on'} ${g.gate}`, detail: g.notes || '',
    })
  }

  // Orchestrator decisions raised (decisions[] = {id,at,step,kind,question,chosen,action,resolved_at})
  for (const d of card.decisions || []) {
    if (!d || typeof d !== 'object') continue
    const resolved = !!d.chosen || !!d.resolved_at
    push({
      id: `dec:${d.id || d.at}`, at: _iso(d.at), actor: ACTOR.ORCH,
      kind: resolved ? 'resolved' : 'decision', step: d.step,
      cls: 'decision', needs_human: !resolved,
      headline: resolved
        ? `resolved: ${d.chosen || d.action || d.kind || 'decision'}`
        : `decision needed: ${d.question || d.kind || 'a fork'}`,
      detail: d.rationale || d.question || '',
    })
  }

  // Back-steps (backstep_history[] = {from,to,reason,at}) actor=orchestrator
  for (const b of card.backstep_history || []) {
    if (!b || typeof b !== 'object') continue
    push({
      id: `back:${b.at}`, at: _iso(b.at), actor: ACTOR.ORCH, kind: 'back-stepped',
      step: b.to, cls: 'notification', needs_human: false,
      headline: `stepped back ${b.from || '?'} → ${b.to || '?'}`, detail: b.reason || '',
    })
  }

  // Parked ideas (parked[] = {note,issue_url,at,phase})
  for (const p of card.parked || []) {
    if (!p || typeof p !== 'object') continue
    push({
      id: `park:${p.id || p.at}`, at: _iso(p.at), actor: ACTOR.ORCH, kind: 'parked',
      step: p.phase, cls: 'notification', needs_human: false,
      headline: `parked to backlog: ${p.note || 'idea'}`, detail: p.issue_url || '',
    })
  }

  // Stable order: by timestamp, then keep insertion order for equal/missing timestamps.
  return events
    .map((e, i) => ({ ...e, _i: i }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a._i - b._i))
    .map(({ _i, ...e }) => e)
}

// Does the card have anything a human must act on right now?
export function timelineNeedsHuman(card) {
  return projectCardTimeline(card).some(e => e.needs_human)
}

// Fan-out linkage. The parent→child relationship is encoded in the child title as
// "[<parent-id> · fN] <title>" (the live convention), and MAY also appear in
// topology.children on the parent. Resolve from whichever exists — title first, since
// topology is frequently absent/empty on real cards.
const _CHILD_TITLE_RE = /^\[([a-z0-9-]+)\s*[·.]\s*f?\d+\]\s*(.*)$/i

export function childTagFromTitle(title) {
  const m = _CHILD_TITLE_RE.exec(String(title || ''))
  return m ? { parentId: m[1], rest: m[2] } : null
}

// Given a card and the full card list, return its fan-out children (as light records).
export function resolveChildren(card, allCards) {
  if (!card) return []
  const out = []
  const seen = new Set()
  const add = (c) => { if (c && !seen.has(c.id)) { seen.add(c.id); out.push(c) } }
  // 1) topology.children (authoritative when present)
  for (const ref of (card.topology?.children || [])) {
    const id = typeof ref === 'string' ? ref : ref?.card_id
    const c = (allCards || []).find(x => x.id === id)
    if (c) add({ id: c.id, title: c.title, stage: c.stage, lifecycle: c.lifecycle, required: ref?.required !== false })
  }
  // 2) title-convention children (the actual encoding on live cards)
  for (const c of allCards || []) {
    const tag = childTagFromTitle(c.title)
    if (tag && tag.parentId === card.id) add({ id: c.id, title: c.title, stage: c.stage, lifecycle: c.lifecycle, required: true })
  }
  return out
}

// Given a card, return its parent id if it is itself a fan-out child.
export function resolveParentId(card) {
  const tag = childTagFromTitle(card?.title)
  if (tag) return tag.parentId
  return card?.topology?.integration_owner || card?.parent_card || null
}
