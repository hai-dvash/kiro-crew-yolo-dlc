// Presentation-only projection of the dashboard's real chat_chunk stream.
// Keep only a bounded suffix; response text is never written to pipeline state.
export const LIVE_TAIL_BUFFER_CHARS = 512

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
