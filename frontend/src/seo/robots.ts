/**
 * The single indexing rule for every public page.
 *
 * A page is indexed only when it is COMPLETE and its canonical is itself. Everything else is
 * `noindex, follow` (crawlers may still follow its links); private application screens are
 * `noindex, nofollow`. This module has no imports so build scripts (sync exporters, the content
 * audit) can load it directly and apply exactly the same thresholds as the rendered pages.
 */

export const INDEX = 'index, follow, max-image-preview:large'
export const NOINDEX = 'noindex, follow'
export const PRIVATE = 'noindex, nofollow'

/** Thresholds that define a COMPLETE page. Change them here only. */
export const COMPLETENESS = {
  /** Unique teaching words in a lesson (explanation, example, Q&A, practice), excluding template text. */
  lessonMinWords: 600,
  /** Subject-specific interview questions with written answers. */
  lessonMinQuestions: 5,
  /**
   * Unique words in a standalone single-topic guide. Lower than a lesson because a guide answers one
   * interview question in depth (with an exercise) rather than teaching a day's syllabus.
   */
  guideMinWords: 400,
  /** A course hub or level page needs at least this many COMPLETE lessons to be worth indexing. */
  hubMinCompleteLessons: 1,
  /** Share of a page's 8-word phrases found in another page above which it counts as a duplicate. */
  maxDuplicateContainment: 0.8,
} as const

/**
 * Phrases that mark unfinished or scaffolded content. The first group is the wording the site's own
 * templates use for unfinished days (a bare "pending" is avoided: lessons legitimately discuss pending
 * promises and pending pods). The second group is the generated filler that
 * `prep_schema.PLACEHOLDER_MARKERS` rejects in lesson sources.
 */
export const PLACEHOLDER_PHRASES = [
  'reference solution pending', 'are pending', 'lessons pending', 'in preparation', 'not yet available', 'not yet published', 'coming soon',
  'curriculum development in progress', 'self-guided study brief',
  'is a core concept in', 'it improves reliability, maintainability and clarity', 'an unrelated concept',
] as const

export type ContentStatus = 'COMPLETE' | 'THIN' | 'PLACEHOLDER'

export interface LessonEvidence {
  /** Unique teaching words. */
  words: number
  /** Subject-specific answered interview questions. */
  questions: number
  /** True when placeholder phrases or generated filler were found. */
  placeholder: boolean
  /** True when another (preferred) URL already carries the same lesson. */
  duplicate?: boolean
}

export function lessonStatus(e: LessonEvidence): ContentStatus {
  if (e.placeholder) return 'PLACEHOLDER'
  if (e.duplicate || e.words < COMPLETENESS.lessonMinWords || e.questions < COMPLETENESS.lessonMinQuestions) return 'THIN'
  return 'COMPLETE'
}

export function guideStatus(e: { words: number; placeholder: boolean }): ContentStatus {
  if (e.placeholder) return 'PLACEHOLDER'
  return e.words < COMPLETENESS.guideMinWords ? 'THIN' : 'COMPLETE'
}

/** Hubs list lessons (and honestly label the unfinished ones), so placeholder wording does not count against them. */
export function hubStatus(completeLessons: number): ContentStatus {
  return completeLessons >= COMPLETENESS.hubMinCompleteLessons ? 'COMPLETE' : 'PLACEHOLDER'
}

const PHRASE_RES = PLACEHOLDER_PHRASES.map(p => new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'))

/** Whole-word match, so "appending" is not "pending". */
export function placeholderPhrases(text: string): string[] {
  return PLACEHOLDER_PHRASES.filter((_, i) => PHRASE_RES[i].test(text))
}

export const hasPlaceholderPhrase = (text: string) => placeholderPhrases(text).length > 0

export interface RobotsInput {
  /** `private`: account, login, studio and other application screens. */
  kind: 'private' | 'content'
  status?: ContentStatus
  /** Whether the page's canonical URL is the page itself (not an alias pointing elsewhere). */
  selfCanonical?: boolean
}

export function getRobotsDirective(page: RobotsInput): string {
  if (page.kind === 'private') return PRIVATE
  return page.status === 'COMPLETE' && page.selfCanonical !== false ? INDEX : NOINDEX
}

export const isIndexable = (robots: string) => /^index\b/.test(robots.trim())

/** Tracking and session parameters never belong in a canonical URL. */
const TRACKING = /^(utm_[a-z_]+|gclid|fbclid|msclkid|dclid|yclid|mc_[a-z]+|_ga|_gl|ref|igshid|si|next|review)$/i

export function cleanCanonical(url: string): string {
  const u = new URL(url)
  for (const key of [...u.searchParams.keys()]) if (TRACKING.test(key)) u.searchParams.delete(key)
  u.hash = ''
  return u.toString()
}
