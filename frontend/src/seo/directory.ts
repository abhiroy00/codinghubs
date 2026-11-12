import type { Seo } from '../content-pages/api'
import { JOBS_META, NOT_FOUND_META, TUTOR_META, pageSeo } from './site'

export const TUTOR_SEO = pageSeo(TUTOR_META)
export const JOBS_SEO = pageSeo(JOBS_META)
export const MISSING_SEO = pageSeo(NOT_FOUND_META)

/** Only public directory records are embedded by the server. Never read account state. */
export function directoryInitial<T>(kind: string): T | null {
  if (typeof document === 'undefined') return null
  try {
    const data = JSON.parse(document.getElementById('__CONTENT__')?.textContent || 'null')
    return data?.kind === kind ? data as T : null
  } catch { return null }
}

/** Fallback supports a rolling deployment where an older API omits the SEO field. */
export function recordSeo(path: string, title: string, description: string, indexable = true): Seo {
  return pageSeo({ path, title, description: description.replace(/\s+/g, ' ').trim().slice(0, 160), image: TUTOR_META.image, indexable })
}
