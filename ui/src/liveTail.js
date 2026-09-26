// Presentation-only projection of the dashboard's real chat_chunk stream.
// Keep only a bounded suffix; response text is never written to pipeline state.
// The small peek (LiveMiniPane) renders `tail` (last few tokens); the full session wing renders
// `buffer` (the whole bounded suffix), so this cap governs how many lines the wing can show.
// Configurable via localStorage 'dlc-live-buffer-chars' (falls back to the default).
const _DEFAULT_BUFFER_CHARS = 16000
export const LIVE_TAIL_BUFFER_CHARS = (() => {
  try {
    const v = Number(typeof localStorage !== 'undefined' && localStorage.getItem('dlc-live-buffer-chars'))
    return Number.isFinite(v) && v >= 512 ? v : _DEFAULT_BUFFER_CHARS
  } catch { return _DEFAULT_BUFFER_CHARS }
})()

const DISPLAY_TOKEN = /\p{L}[\p{L}\p{N}_'’-]*|\p{N}+(?:[.,]\p{N}+)*|[^\s\p{L}\p{N}]/gu
const CLOSE_PUNCT = /^[.,!?;:%)\]}]$/u
const OPEN_PUNCT = /^[(\[{]$/u

export function lastDisplayTokens(text, count = 3) {
  const tokens = String(text || '').match(DISPLAY_TOKEN) || []
  const tail = tokens.slice(-Math.max(0, count))
  return tail.reduce((out, token, index) => {
    if (index === 0) return token
    const previous = tail[index - 1]
    if (CLOSE_PUNCT.test(token) || OPEN_PUNCT.test(previous)) return out + token
    return out + ' ' + token
  }, '')
}

export function beginLiveThinking(previous, restart = false) {
  // Repeated slots.running snapshots must not replace a newer generated tail.
  // An explicit chat_status is a real new-turn boundary and may reset stale state.
  if (previous?.active && !restart) return previous
  return { buffer: '', tail: '', active: true, phase: 'thinking', seq: 0 }
}

export function appendLiveTail(previous, content, seq) {
  if (!content) return previous
  if (previous?.active && Number.isFinite(seq) && Number.isFinite(previous.seq) && seq <= previous.seq) {
    return previous
  }
  const prefix = previous?.active ? previous.buffer : ''
  const buffer = (prefix + content).slice(-LIVE_TAIL_BUFFER_CHARS)
  return { buffer, tail: lastDisplayTokens(buffer, 3), active: true, phase: 'generating', seq: Number(seq) || 0 }
}

export function finishLiveTail(previous) {
  return previous ? { ...previous, active: false, phase: 'idle' } : previous
}

// Project the agent-authored progress trail (card.step_progress[step], step-progress-trail-spec)
// into the same shape LiveMiniPane renders. Cron slots emit NO live chat_chunk, so this is the
// ONLY liveness source for a step session: checkpoints between tool calls, not token streaming.
// Presentation-only. Returns null when there is no usable trail (caller shows a fallback line).
export function projectProgressTrail(entry) {
  if (!entry || typeof entry !== 'object') return null
  const lines = Array.isArray(entry.lines) ? entry.lines : []
  if (!lines.length) return null
  // Stable order: seq first, then the RFC3339 timestamp (lexically sortable), then original
  // index. Two writers append here — the agent's own checkpoints and the backend crew-fold — and
  // they are NOT seq-synchronized against each other, so a seq COLLISION is possible. A bare
  // (seq - seq) comparator leaves colliding lines in unstable order (plausible-but-wrong); the
  // `at` tiebreak restores true wall-clock order, and the index tiebreak keeps insertion order
  // when timestamps are identical too. Presentation-only, but order is the whole point of the trail.
  const ordered = lines
    .map((l, _i) => ({ l, _i }))
    .sort((a, b) => {
      const s = (Number(a.l?.seq) || 0) - (Number(b.l?.seq) || 0)
      if (s) return s
      const at = String(a.l?.at || '').localeCompare(String(b.l?.at || ''))
      if (at) return at
      return a._i - b._i
    })
    .map(x => x.l)
  const buffer = ordered.map(l => String(l?.note || '')).filter(Boolean).join(' · ').slice(-LIVE_TAIL_BUFFER_CHARS)
  if (!buffer) return null
  const last = ordered[ordered.length - 1] || {}
  return {
    buffer,
    tail: buffer,                    // whole trail suffix — it is already short, human sentences
    active: true,
    phase: String(last.phase || 'running'),
    seq: Number(last.seq) || ordered.length,
    source: 'progress-trail',
  }
}

