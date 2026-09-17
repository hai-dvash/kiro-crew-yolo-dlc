// Pipeline-wide event aggregator (pipeline-event-tree-spec). Folds every recorded event source
// across ALL cards of a pipeline + top-level webhook history into ONE time-ordered, actor-tagged
// stream. Pure + deterministic. A READ projection — never writes state, never fabricates a node
// for an unrecorded fact (cron/crew derive from what IS recorded, badged inferred).
//
// Grounded in the real on-disk shapes:
//   card.execution_schedule.nodes[id] = {id,kind,card_id,step,status,created_at,...}
//   card.event_outbox[] = {id,type,subject,time,run_id,correlation_id,envelope_id,terminal_status}
//   card.history[] = {from,to,at,agent}
//   card.decisions[] = {id,step,kind,question,status,resolution,at?,envelope_id}
//   card.gate_history[] = {gate,decision,actor,at,notes}
//   card.orchestrator_session = {session_key,slot_key,name,at}
//   card.orchestrator_trigger = {status,at,session_key}
//   top.github_webhook_history[] = {delivery_id,event,action,repository,issue_number,card_id,status,at?}

export const ACTORS = ['webhook', 'loop', 'orchestrator', 'crew', 'step-agent', 'human']

const ACTOR_GLYPH = {
  webhook: '⬇', loop: '⚙', orchestrator: '🧠', crew: '👥', 'step-agent': '🤖', human: '🧑',
}

function _at(v) { return typeof v === 'string' ? v : '' }
function _short(id) { return String(id || '').slice(0, 8) }

// Fold one card's recorded events. `push` collects into the shared list.
function _foldCard(card, push) {
  const cid = card.id

  // 1) execution_schedule node transitions — the event spine
  const nodes = card.execution_schedule?.nodes || {}
  for (const [nid, n] of Object.entries(nodes)) {
    if (!n || typeof n !== 'object') continue
    const at = _at(n.terminal_at) || _at(n.session_at) || _at(n.ready_at) || _at(n.created_at)
    push({
      id: `sched:${nid}`, at, actor: 'step-agent', kind: `step-${n.status || 'node'}`,
      cardId: cid, step: n.step, node_id: nid,
      headline: `${n.step || n.kind || 'step'} · ${n.status || 'node'}`,
      detail: n.concurrency_class ? `class ${n.concurrency_class}` : '',
    })
  }

  // 2) event_outbox — native terminal events with real causal keys
  for (const e of card.event_outbox || []) {
    if (!e || typeof e !== 'object') continue
    push({
      id: e.id || `outbox:${cid}:${e.subject}:${e.time}`, at: _at(e.time),
      actor: 'step-agent', kind: (e.type || '').split('.').pop() || 'event',
      cardId: cid, step: e.subject, run_id: e.run_id, envelope_id: e.envelope_id,
      caused_by: e.correlation_id && e.correlation_id !== cid ? e.correlation_id : undefined,
      headline: `${e.subject || 'step'} → ${e.terminal_status || e.type || 'event'}`,
      detail: e.observed_status ? `observed: ${e.observed_status}` : (e.run_id ? `run ${_short(e.run_id)}` : ''),
    })
  }

  // 3) stage transitions — history carries the ACTOR (advance-cron, human, …)
  for (const h of card.history || []) {
    if (!h || typeof h !== 'object') continue
    const agent = h.agent || ''
    // a cron-driven promotion is the loop lane; a human one is the human lane
    const actor = /cron|advance/i.test(agent) ? 'loop' : (/human|user/i.test(agent) ? 'human' : 'loop')
    push({
      id: `hist:${cid}:${h.at}:${h.to}`, at: _at(h.at), actor, kind: 'promoted',
      cardId: cid, step: h.to, inferred: actor === 'loop' && /cron|advance/i.test(agent) ? false : undefined,
      headline: `advanced ${h.from || '?'} → ${h.to || '?'}`,
      detail: agent ? `by ${agent}` : '',
    })
  }

  // 4) orchestration decisions
  for (const dec of card.decisions || []) {
    if (!dec || typeof dec !== 'object') continue
    const resolved = dec.status === 'resolved' || !!dec.chosen || !!dec.resolved_at
    push({
      id: `dec:${dec.id || cid + dec.step}`, at: _at(dec.at) || _at(dec.resolved_at),
      actor: 'orchestrator', kind: resolved ? 'decision-resolved' : 'decision-open',
      cardId: cid, step: dec.step, envelope_id: dec.envelope_id,
      needs_human: !resolved && (dec.resolution === 'human-required'),
      headline: resolved ? `decision resolved: ${dec.kind || 'fork'}` : `decision: ${dec.kind || 'fork'}`,
      detail: (dec.question || '').slice(0, 160),
    })
  }

  // 5) gate commands / human gate decisions
  for (const g of card.gate_history || []) {
    if (!g || typeof g !== 'object') continue
    const human = /user|human/i.test(g.actor || '')
    push({
      id: `gate:${cid}:${g.at}:${g.gate}`, at: _at(g.at), actor: human ? 'human' : 'orchestrator',
      kind: g.decision === 'rejected' ? 'gate-rejected' : 'gate-approved', cardId: cid, step: g.gate,
      headline: `${human ? 'human' : g.actor || 'system'} ${g.decision || 'acted'} ${g.gate}`,
      detail: g.notes || (g.result_revision != null ? `rev ${g.result_revision}` : ''),
    })
  }

  // 6) orchestrator session/trigger — the orchestrator CALL
  const os = card.orchestrator_session
  if (os && os.at) {
    push({
      id: `orch:${cid}:${os.session_key || os.at}`, at: _at(os.at), actor: 'orchestrator',
      kind: 'orchestrator-session', cardId: cid, session_key: os.session_key,
      headline: `orchestrator session`, detail: os.name || os.slot_key || '',
    })
  }
  const ot = card.orchestrator_trigger
  if (ot && ot.at && (!os || ot.at !== os.at)) {
    push({
      id: `orchtrig:${cid}:${ot.at}`, at: _at(ot.at), actor: 'orchestrator', kind: 'orchestrator-trigger',
      cardId: cid, session_key: ot.session_key, headline: `orchestrator trigger · ${ot.status || ''}`, detail: '',
    })
  }

  // 7) step sessions → crew/agent lane (derived from the session record we DO have)
  for (const [step, s] of Object.entries(card.step_sessions || {})) {
    if (!s || typeof s !== 'object' || !s.at) continue
    push({
      id: `sess:${cid}:${step}:${s.at}`, at: _at(s.at), actor: 'crew', kind: 'session',
      cardId: cid, step, session_key: s.slot_key || s.session_key,
      headline: `crew session · ${step}`, detail: s.executor || s.working_dir || '', inferred: true,
    })
  }
}

// Top-level webhook arrivals
function _foldWebhooks(topLevel, push) {
  for (const w of (topLevel?.github_webhook_history || [])) {
    if (!w || typeof w !== 'object') continue
    push({
      id: `wh:${w.delivery_id}`, at: _at(w.at) || _at(w.received_at) || _at(w.time),
      actor: 'webhook', kind: `webhook-${w.status || 'received'}`, cardId: w.card_id,
      caused_by: undefined, headline: `${w.event}.${w.action} #${w.issue_number ?? '?'}`,
      detail: `${w.repository || ''}${w.status ? ` · ${w.status}` : ''}${w.reason ? ` (${w.reason})` : ''}`,
    })
  }
}

// Main entry. Returns { events: [...ordered], actors: [...used], now: schedulerSnapshot }.
export function projectPipelineEvents(pipeline, cards, topLevel) {
  const pid = pipeline?.id
  const mine = (cards || []).filter(c => c && (c.pipeline_id === pid || (!c.pipeline_id && c.source?.repo === pipeline?.repo)))
  const events = []
  const push = (e) => { if (e && e.at) events.push({ glyph: ACTOR_GLYPH[e.actor] || '•', ...e }) }
  for (const c of mine) _foldCard(c, push)
  _foldWebhooks(topLevel, push)
  // stable order: time asc, then actor order, then id
  const actorRank = Object.fromEntries(ACTORS.map((a, i) => [a, i]))
  events.sort((a, b) =>
    (a.at < b.at ? -1 : a.at > b.at ? 1 : 0) ||
    ((actorRank[a.actor] ?? 9) - (actorRank[b.actor] ?? 9)) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const usedActors = ACTORS.filter(a => events.some(e => e.actor === a))
  return { events, actors: usedActors, now: topLevel?.scheduler_state || null }
}

export { ACTOR_GLYPH }
