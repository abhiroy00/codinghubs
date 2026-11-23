import { INSTITUTE } from '../pages/free-session/data'
import { PROGRAMS, type Program } from '../pages/free-session/programs'
import { HEAD_OFFICE, SITE_URL } from '../locations/registry'
import type { Seo } from '../content-pages/api'
import { getRobotsDirective } from './robots'

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

/** Use the same metadata for build-time HTML and browser navigation. */
export function pageSeo(meta: PageMeta): Seo {
  const canonical = meta.indexable ? `${SITE_URL}${meta.path}` : ''
  return {
    title: meta.title, description: meta.description, canonical,
    // `indexable` is the editorial decision for a static page (e.g. the FAQ awaits business review).
    robots: getRobotsDirective({ kind: 'content', status: meta.indexable ? 'COMPLETE' : 'THIN' }),
    og: { type: 'website', title: meta.title, description: meta.description, image: meta.image, url: canonical },
    json_ld: meta.jsonLd ?? null,
  }
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
      addressRegion: 'Delhi',
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
  title: 'AI Institute in Delhi | Free AI Demo Class | Coding Hubs',
  description:
    'AI training institute in Netaji Subhash Place, Delhi. Join a free 2-hour live online demo of AI, development, data and design courses at Coding Hubs.',
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
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [organizationNode()],
  },
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

export const JOBS_META: PageMeta = {
  path: '/latest-jobs/',
  title: 'Latest Jobs | Coding Hubs School of AI',
  description: 'Explore the latest job openings in AI, data science and software development, with location, work mode, experience and how to apply.',
  image: LOGO_URL,
  indexable: true,
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [organizationNode()],
  },
}

export const STUDIO_META: PageMeta = {
  path: '/interview-studio', title: 'Interview Studio | Coding Hubs',
  description: 'Think clearly. Code confidently. Interview better. Original coding practice, AI mock interviews and design workspaces from Coding Hubs.',
  image: LOGO_URL, indexable: true,
  jsonLd: { '@context': 'https://schema.org', '@graph': [organizationNode(), {
    '@type': 'LearningResource', name: 'Coding Hubs Interview Studio',
    url: `${SITE_URL}/interview-studio`, description: 'Original coding practice, AI mock interviews and design workspaces.',
    inLanguage: 'en-IN', provider: { '@id': ORG_ID },
  }] },
}

export const NOT_FOUND_META: PageMeta = {
  path: '/404',
  title: 'Page not found | Coding Hubs School of AI',
  description: 'This page does not exist. Go back to the Coding Hubs School of AI home page or browse AI course locations.',
  image: LOGO_URL,
  indexable: false,
}


export const PROGRAM_METAS = PROGRAMS.map(programMeta)
