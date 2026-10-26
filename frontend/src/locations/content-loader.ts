import type { LocationContent } from './types'

const loaders = import.meta.glob<{ default: LocationContent }>('./content/*.ts')

const cache = new Map<string, LocationContent>()

export function getCachedContent(slug: string) {
  return cache.get(slug)
}

/** Loads one locality's article on demand so the ~4,000-word bodies are not bundled together. */
export async function loadContent(slug: string): Promise<LocationContent | null> {
  const hit = cache.get(slug)
  if (hit) return hit
  const loader = loaders[`./content/${slug}.ts`]
  if (!loader) return null
  const mod = await loader()
  cache.set(slug, mod.default)
  return mod.default
}
