import { INSTITUTE } from '../pages/free-session/data'
import { PROGRAMS, type Program } from '../pages/free-session/programs'
import { HEAD_OFFICE, SITE_URL } from '../locations/registry'

export const LOGO_URL = `${SITE_URL}/assets/coding-hubs-school-of-ai-logo.jpeg`
export const ORG_ID = `${SITE_URL}/#organization`
export const SITE_ID = `${SITE_URL}/#website`

export interface PageMeta {
  /** Route path as served (no trailing slash for html-file routes, trailing slash for directory routes). */
  path: string
  title: string
  description: string
  /** Absolute image URL for Open Graph / Twitter. */
  image: string
  indexable: boolean
  jsonLd?: unknown
}

/** Organization node. Only verified facts: one head office, the contact details published on the site, real social profiles. */
export function organizationNode() {
  return {
    '@type': 'EducationalOrganization',
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
    sameAs: Object.values(INSTITUTE.social),
  }
}

const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/')
const imageUrl = (p: string) => `${SITE_URL}${encodePath(p)}`

export const HOME_META: PageMeta = {
  path: '/',
  title: 'Free 2-Hour Live AI Demo Session | Coding Hubs School of AI',
  description:
    'Join a free 2-hour live online demo of AI, development, data analytics, design and marketing courses at Coding Hubs School of AI, Delhi. Explore before you decide.',
  image: LOGO_URL,
  indexable: true,
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      organizationNode(),
      { '@type': 'WebSite', '@id': SITE_ID, url: `${SITE_URL}/`, name: INSTITUTE.name, inLanguage: 'en-IN', publisher: { '@id': ORG_ID } },
    ],
  },
}

const PROGRAM_DESCRIPTIONS: Record<string, string> = {
  'vibe-coding-with-ai':
    'Build real working apps by pairing with AI coding assistants. See the 15-day, day-by-day plan of this live online program at Coding Hubs School of AI.',
  'data-analytics-with-ai':
    'Go from spreadsheets to real analysis with Python, SQL, dashboards and AI. See the 15-day live online plan at Coding Hubs School of AI.',
  'ai-for-all':
    'Practical AI skills for students, professionals and business owners, no coding needed. See the 15-day live online plan at Coding Hubs School of AI.',
}

export function programMeta(p: Program): PageMeta {
  const url = `${SITE_URL}/program/${p.slug}`
  return {
    path: `/program/${p.slug}`,
    title: `${p.title}: 15-Day Program | Coding Hubs School of AI`,
    description: PROGRAM_DESCRIPTIONS[p.slug] ?? p.tagline,
    image: imageUrl(p.image),
    indexable: true,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        organizationNode(),
        {
          '@type': 'Course',
          '@id': `${url}#course`,
          name: p.title,
          description: p.tagline,
          url,
          inLanguage: 'en-IN',
          provider: { '@id': ORG_ID },
          hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: 'P15D' },
        },
      ],
    },
  }
}

export const POLICIES_META: PageMeta = {
  path: '/policies',
  title: 'Privacy, Terms & Rescheduling Policy | Coding Hubs School of AI',
  description: 'Read the privacy policy, terms and conditions, cookie notice and rescheduling policy of Coding Hubs School of AI.',
  image: LOGO_URL,
  indexable: true,
}

export const TUTOR_META: PageMeta = {
  path: '/book-a-tutor/',
  title: 'Book an Online Tutor | Coding Hubs School of AI',
  description: 'Explore tutor profiles and request a one-to-one online session in Python, AI, data science or software development with Coding Hubs School of AI.',
  image: LOGO_URL,
  indexable: true,
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [organizationNode()],
  },
}

export const NOT_FOUND_META: PageMeta = {
  path: '/404',
  title: 'Page not found | Coding Hubs School of AI',
  description: 'This page does not exist. Go back to the Coding Hubs School of AI home page or browse AI course locations.',
  image: LOGO_URL,
  indexable: false,
}

export const CERTIFICATES_META: PageMeta = {
  path: '/certificates/',
  title: 'Certificates: Unlock Your Course Completion | Coding Hubs School of AI',
  description: 'View and download your certificates after completing the 30-day interview preparation roadmap for any course at Coding Hubs School of AI.',
  image: LOGO_URL,
  indexable: true,
}

export const PROGRAM_METAS = PROGRAMS.map(programMeta)
