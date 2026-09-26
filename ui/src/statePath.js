export const STATE_POINTER = '~/.dlc-yolo/.statepath'
export const DURABLE_STATE = '~/.dlc-yolo/state.json'
export const TMP_STATE = '/tmp/dlc-yolo/state.json'
// Uncapped backend state endpoint (proxied to the app backend's GET /api/state). Unlike the host
// /api/file-read (which truncates at 512000 bytes and blanks the board once state.json grows past
// ~500KB — the recurring "pipeline ghosting"), this returns the full state with no size cap. It is
// the PRIMARY source when available; file-read tiers remain as fallback for pre-restart installs.
export const STATE_ENDPOINT = '/apps/dlc-yolo/api/state'

const POINTER_SCHEMA_VERSION = 1
const POINTER_MAX_BYTES = 4096
const PATH_MAX_CHARS = 3072

export function statePathFromPointer(value) {
  let pointer = value
  if (typeof value === 'string') {
    if (new TextEncoder().encode(value).length > POINTER_MAX_BYTES) return null
    try {
      pointer = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!pointer || typeof pointer !== 'object' || Array.isArray(pointer)) return null
  let encoded
  try {
    encoded = JSON.stringify(pointer)
  } catch {
    return null
  }
  if (new TextEncoder().encode(encoded).length > POINTER_MAX_BYTES) return null
  const keys = Object.keys(pointer).sort()
  if (keys.length !== 2 || keys[0] !== 'path' || keys[1] !== 'schema_version') return null
  if (pointer.schema_version !== POINTER_SCHEMA_VERSION || typeof pointer.path !== 'string') return null
  const path = pointer.path
  if (!path.startsWith('/') || path.length === 0 || path.length > PATH_MAX_CHARS) return null
  if (path.includes('\0') || path.includes('\r') || path.includes('\n')) return null
  if (path.split('/').some(part => part === '.' || part === '..')) return null
  return path
}

export async function resolveStateFile(readFile, readEndpoint) {
  const trace = []
  // 0) Uncapped backend endpoint — PREFERRED. No 512KB truncation, so it never ghosts.
  if (typeof readEndpoint === 'function') {
    try {
      const data = await readEndpoint(STATE_ENDPOINT)
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          && (Array.isArray(parsed.cards) || Array.isArray(parsed.pipelines))) {
        return { path: STATE_ENDPOINT, data: parsed, source: 'endpoint' }
      }
      trace.push('endpoint read returned non-card body — falling through')
    } catch (e) {
      trace.push(`endpoint read FAILED (pre-restart?): ${e && e.message ? e.message : e}`)
    }
  }
  // 1) The pointer is authoritative and carries the absolute path — prefer it.
  try {
    const pointer = await readFile(STATE_POINTER)
    const target = statePathFromPointer(pointer)
    trace.push(`pointer-read OK, target=${target || 'INVALID'}`)
    if (target) {
      try {
        return { path: target, data: await readFile(target), source: 'pointer' }
      } catch (e) {
        // A stale/missing target never displaces the established fallback probes below.
        trace.push(`pointer-target read FAILED: ${e && e.message ? e.message : e}`)
      }
    }
  } catch (e) {
    trace.push(`pointer read FAILED: ${e && e.message ? e.message : e}`)
  }

  // 2) Durable tier (~/.dlc-yolo/state.json).
  try {
    return { path: DURABLE_STATE, data: await readFile(DURABLE_STATE), source: 'durable' }
  } catch (e) {
    trace.push(`durable read FAILED: ${e && e.message ? e.message : e}`)
  }

  // 3) Legacy scratch tier — LAST resort, guarded so it never throws out of resolve.
  try {
    return { path: TMP_STATE, data: await readFile(TMP_STATE), source: 'scratch' }
  } catch (e) {
    trace.push(`scratch read FAILED: ${e && e.message ? e.message : e}`)
    // eslint-disable-next-line no-console
    console.warn('[dlc-yolo] all state tiers failed:', trace.join(' | '))
    return { path: DURABLE_STATE, data: { cards: [], pipelines: [], config: {} }, source: 'unresolved' }
  }
}

export async function readCurrentState(readFile, currentPath, readEndpoint) {
  // Prefer the uncapped endpoint on the steady-state poll too, so a growing state file never
  // silently re-crosses the cap between reconciles.
  if (typeof readEndpoint === 'function') {
    try {
      const data = await readEndpoint(STATE_ENDPOINT)
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          && (Array.isArray(parsed.cards) || Array.isArray(parsed.pipelines))) {
        return { path: STATE_ENDPOINT, data: parsed, source: 'endpoint' }
      }
    } catch { /* fall through to file read */ }
  }
  try {
    return { path: currentPath, data: await readFile(currentPath), source: 'current' }
  } catch {
    return resolveStateFile(readFile, readEndpoint)
  }
}
