import type { Seo } from '../content-pages/api'
import { SITE_URL } from '../locations/registry'
import { LOGO_URL, organizationNode } from './site'
import { getRobotsDirective, guideStatus, placeholderPhrases } from './robots'

const textOf = (value: unknown): string => typeof value === 'string' ? value.replace(/<[^>]+>/g, ' ')
  : Array.isArray(value) ? value.map(textOf).join(' ') : value && typeof value === 'object' ? Object.values(value).map(textOf).join(' ') : ''

/** Shared by prerendering and browser navigation; /guides/ is not a course slug. */
export function interviewGuideMeta(guide: { slug: string; title: string; summary: string; sections?: unknown; exercise?: unknown }): Seo {
  const title = guide.title.length > 47 ? guide.title.slice(0, 44) + '… | Coding Hubs' : guide.title + ' | Coding Hubs'
  const canonical = `${SITE_URL}/interview/guides/${guide.slug}/`
  const body = textOf([guide.sections, guide.exercise])
  const robots = getRobotsDirective({ kind: 'content', status: guideStatus({ words: body.split(/\s+/).filter(Boolean).length, placeholder: placeholderPhrases(body).length > 0 }) })
  return {
    title, description: guide.summary, canonical, robots,
    og: { type: 'website', title, description: guide.summary, image: LOGO_URL, url: canonical },
    json_ld: { '@context': 'https://schema.org', '@graph': [organizationNode(), {
      '@type': 'LearningResource', name: guide.title, url: canonical, description: guide.summary,
      inLanguage: 'en-IN', isAccessibleForFree: true,
    }] },
  }
}
