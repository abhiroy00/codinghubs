import manifestData from './prep-generated/manifest.json'
import type { Lesson } from './DayLesson'
export type PrepSource = { curriculum: string; primary: string; availableDays: number; complete: boolean; sourceHash: string }
export const PREP_SOURCES: Record<string, PrepSource> = manifestData
export type PrepGuide = {
  curriculum: string; summary: string; complete: boolean; missingDays: number[]
  roadmap: { day: number; title: string; module: string; level: string }[]
  samples: Pick<Lesson, 'day' | 'title' | 'level' | 'definition' | 'objectives' | 'interview' | 'example' | 'takeaways'>[]
  firstLesson: Lesson
}
const modules: Record<string, () => Promise<{ default: PrepGuide }>> = import.meta.env.SSR ? {} : import.meta.glob<{ default: PrepGuide }>(['./prep-generated/*.json', '!./prep-generated/manifest.json'])
const cache = new Map<string, PrepGuide>()
export const getPrepGuide = (slug: string) => cache.get(PREP_SOURCES[slug]?.curriculum)
export async function loadPrepGuide(slug: string) {
  const source = PREP_SOURCES[slug]
  if (!source) return null
  if (cache.has(source.curriculum)) return cache.get(source.curriculum)!
  const mod = await modules['./prep-generated/' + source.curriculum + '.json']()
  cache.set(source.curriculum, mod.default)
  return mod.default
}
