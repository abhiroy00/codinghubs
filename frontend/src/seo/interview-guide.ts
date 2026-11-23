import type { Seo } from '../content-pages/api'
import { SITE_URL } from '../locations/registry'
import { LOGO_URL, organizationNode } from './site'

/** Shared by prerendering and browser navigation; /guides/ is not a course slug. */
export function interviewGuideMeta(guide: { slug: string; title: string; summary: string }): Seo {
  const title = guide.title.length > 47 ? guide.title.slice(0, 44) + '… | Coding Hubs' : guide.title + ' | Coding Hubs'
  const canonical = `${SITE_URL}/interview/guides/${guide.slug}/`
  return {
    title, description: guide.summary, canonical, robots: 'index, follow, max-image-preview:large',
    og: { type: 'website', title, description: guide.summary, image: LOGO_URL, url: canonical },
    json_ld: { '@context': 'https://schema.org', '@graph': [organizationNode(), {
      '@type': 'LearningResource', name: guide.title, url: canonical, description: guide.summary,
      inLanguage: 'en-IN', isAccessibleForFree: true,
    }] },
  }
}
