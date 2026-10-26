import { HEAD_OFFICE, SITE_URL, locationPath } from './registry'
import type { LocationContent, LocationMeta } from './types'
import { INSTITUTE } from '../pages/free-session/data'

export const LOGO_URL = `${SITE_URL}/assets/coding-hubs-school-of-ai-logo.jpeg`

export const INDEX_TITLE = 'AI Course Locations in Delhi NCR | Coding Hubs School of AI'
export const INDEX_DESCRIPTION =
  'Find AI course information for your area in Delhi NCR: Delhi, Noida, Gurugram, Faridabad and nearby. Official head office at Netaji Subhash Place, Delhi.'

const ORG_ID = `${SITE_URL}/#organization`

function organization() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: INSTITUTE.name,
    url: `${SITE_URL}/`,
    logo: LOGO_URL,
    email: INSTITUTE.email,
    telephone: INSTITUTE.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: HEAD_OFFICE.street,
      addressLocality: HEAD_OFFICE.locality,
      postalCode: HEAD_OFFICE.postalCode,
      addressCountry: HEAD_OFFICE.country,
    },
  }
}

export function locationJsonLd(meta: LocationMeta, content: LocationContent) {
  const url = `${SITE_URL}${locationPath(meta.slug)}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization(),
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
          { '@type': 'ListItem', position: 3, name: meta.short, item: url },
          { '@type': 'ListItem', position: 4, name: 'AI Course' },
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
      organization(),
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: INDEX_TITLE,
        description: INDEX_DESCRIPTION,
        inLanguage: 'en-IN',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Locations', item: url },
        ],
      },
    ],
  }
}
