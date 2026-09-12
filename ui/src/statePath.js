export const STATE_POINTER = '~/.dlc-yolo/.statepath'
export const DURABLE_STATE = '~/.dlc-yolo/state.json'
export const TMP_STATE = '/tmp/dlc-yolo/state.json'

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

export async function resolveStateFile(readFile) {
  try {
    const pointer = await readFile(STATE_POINTER)
    const target = statePathFromPointer(pointer)
    if (target) {
      try {
        return { path: target, data: await readFile(target), source: 'pointer' }
      } catch {
        // A stale/missing target never displaces the established fallback probes.
      }
    }
  } catch {
    // Missing pointer is the normal pre-bootstrap/default-install case.
  }

  try {
    return { path: DURABLE_STATE, data: await readFile(DURABLE_STATE), source: 'durable' }
  } catch {
    return { path: TMP_STATE, data: await readFile(TMP_STATE), source: 'scratch' }
  }
}

export async function readCurrentState(readFile, currentPath) {
  try {
    return { path: currentPath, data: await readFile(currentPath), source: 'current' }
  } catch {
    return resolveStateFile(readFile)
  }
}
