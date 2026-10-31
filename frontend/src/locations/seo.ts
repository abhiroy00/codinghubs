import { SITE_URL, locationPath } from './registry'
import { LOGO_URL, ORG_ID, organizationNode } from '../seo/site'
import type { LocationContent, LocationMeta } from './types'

export { LOGO_URL }

export const INDEX_TITLE = 'AI Course Locations in Delhi NCR | Coding Hubs School of AI'
export const INDEX_DESCRIPTION =
  'Find AI course information for your area in Delhi NCR: Delhi, Noida, Gurugram, Faridabad and nearby. Official head office at Netaji Subhash Place, Delhi.'

export function locationJsonLd(meta: LocationMeta, content: LocationContent) {
  const url = `${SITE_URL}${locationPath(meta.slug)}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizationNode(),
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: content.metaTitle,
        description: content.metaDescription,
        inLanguage: 'en-IN',
        about: { '@id': ORG_ID },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Locations', item: `${SITE_URL}/locations/` },
          { '@type': 'ListItem', position: 3, name: meta.label, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: content.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }
}

export function indexJsonLd() {
  const url = `${SITE_URL}/locations/`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizationNode(),
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: INDEX_TITLE,
        description: INDEX_DESCRIPTION,
        inLanguage: 'en-IN',
      },
    ],
  }
}
