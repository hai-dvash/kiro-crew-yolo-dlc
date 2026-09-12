const REPOSITORY = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/

export function repositoriesFromText(value) {
  const unique = new Map()
  for (const token of String(value || '').split(/[\n,]/)) {
    const repo = token.trim()
    if (REPOSITORY.test(repo) && !unique.has(repo.toLowerCase())) {
      unique.set(repo.toLowerCase(), repo)
    }
  }
  return [...unique.values()].sort((left, right) =>
    left.toLowerCase().localeCompare(right.toLowerCase()))
}
