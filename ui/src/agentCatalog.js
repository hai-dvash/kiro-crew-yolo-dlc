export const DLC_AGENT_PROFILE_NAMES = Object.freeze([
  'pipeline-orchestrator',
  'intent-agent',
  'spec-agent',
  'design-agent',
  'impl-agent',
  'review-agent',
  'dlcyolo-readonly',
  'dlcyolo-authoring',
  'dlcyolo-builder',
  'dlcyolo-coordinator',
])

const PROFILE_NAME = /^[A-Za-z0-9._-]{1,128}$/

export function isSafeProfileName(value) {
  return typeof value === 'string' && PROFILE_NAME.test(value)
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function stringList(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()))]
    : []
}

export function normalizeCrewRecords(rawAgents) {
  if (!rawAgents || typeof rawAgents !== 'object' || Array.isArray(rawAgents)) return []
  return Object.entries(rawAgents)
    .filter(([name, value]) => isSafeProfileName(name) && value && typeof value === 'object' && !Array.isArray(value))
    .map(([name, value]) => ({
      name,
      kiroAgent: isSafeProfileName(value.kiro_agent) ? value.kiro_agent : undefined,
      workspace: optionalString(value.workspace),
      memoryStore: optionalString(value.memory_store ?? value.memoryStore),
      model: optionalString(value.model),
      description: optionalString(value.description),
      triggers: stringList(value.triggers),
      source: optionalString(value.source),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function catalogProfileNames(crews, builtIns = DLC_AGENT_PROFILE_NAMES) {
  const names = []
  for (const name of builtIns) {
    if (isSafeProfileName(name) && !names.includes(name)) names.push(name)
  }
  const referenced = (Array.isArray(crews) ? crews : [])
    .map(crew => crew?.kiroAgent)
    .filter(isSafeProfileName)
    .sort((left, right) => left.localeCompare(right))
  for (const name of referenced) {
    if (!names.includes(name)) names.push(name)
  }
  return names
}

export function profileDeclarationPath(name, crews, builtIns = DLC_AGENT_PROFILE_NAMES) {
  if (!isSafeProfileName(name)) return undefined
  if (builtIns.includes(name)) return `~/.kiro/crew/apps/dlc-yolo/agents/${name}.json`

  const namespaces = [...new Set(
    (Array.isArray(crews) ? crews : [])
      .filter(crew => crew?.kiroAgent === name)
      .map(crew => crew?.source)
      .filter(isSafeProfileName),
  )]
  if (namespaces.length !== 1) return undefined
  return `~/.kiro/agents/${namespaces[0]}--${name}.json`
}

export function normalizeAgentProfile(raw, fallbackName, sourcePath) {
  const safeFallback = isSafeProfileName(fallbackName) ? fallbackName : 'unknown'
  const loaded = !!raw && typeof raw === 'object' && !Array.isArray(raw)
  const rawName = loaded && isSafeProfileName(raw.name) ? raw.name : safeFallback
  const mcpServers = loaded && raw.mcpServers && typeof raw.mcpServers === 'object'
    ? Object.keys(raw.mcpServers).filter(isSafeProfileName)
    : []
  return {
    name: rawName,
    description: loaded ? optionalString(raw.description) : undefined,
    prompt: loaded ? optionalString(raw.prompt) : undefined,
    model: loaded ? optionalString(raw.model) : undefined,
    tools: loaded ? stringList(raw.tools) : [],
    allowedTools: loaded ? stringList(raw.allowedTools) : [],
    resources: loaded ? stringList(raw.resources) : [],
    mcpServers,
    status: loaded ? 'loaded' : 'unavailable',
    sourcePath: optionalString(sourcePath),
  }
}

export function capabilityForProfile(profileName) {
  const match = /^dlcyolo-(readonly|authoring|builder|coordinator)$/.exec(profileName || '')
  return match?.[1]
}

export function applyAgentProfileToDraft(draft, profile) {
  if (!profile || !isSafeProfileName(profile.name)) return { ...draft }
  const capability = capabilityForProfile(profile.name)
  return {
    ...draft,
    name: profile.name,
    tools: [...(profile.tools || [])],
    model: profile.model || 'auto',
    ...(capability ? { capability } : {}),
  }
}
