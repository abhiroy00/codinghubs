import { COURSE_BY_SLUG } from '../learning/catalog'
import { PREP_SOURCES } from '../learning/prep-content'
import { LOGO_URL, ORG_ID, organizationNode } from './site'
import { SITE_URL } from '../locations/registry'
import type { Seo } from '../content-pages/api'
import { GENAI_LEVELS, genaiPath } from '../learning/genai-content'
import { courseLevelPath } from '../learning/roadmap-paths'
import roadmapSummary from './roadmap-summary.json'
const COURSE_ROADMAPS: Record<string,{primary:string;levels:{level:number;title:string}[]}> = roadmapSummary
const shortNames: Record<string, string> = {
  'java-full-stack-developer-gen-ai': 'Java Full Stack + Gen AI',
  'azure-solutions-architect-expert-az-305': 'Azure Architect AZ-305',
  'azure-administrator-az-104': 'Azure Admin AZ-104',
  'aws-certified-solutions-architect': 'AWS Certified Solutions Architect',
}
export function learningMeta(kind: 'courses' | 'interview', slug?: string): Seo {
  const course = slug ? COURSE_BY_SLUG.get(slug) : undefined
  const prep = kind === 'interview'
  const source = slug ? PREP_SOURCES[slug] : undefined
  const name = course?.name ?? (prep ? 'Interview preparation' : 'Courses')
  const shortName = course ? shortNames[course.slug] ?? course.name : name
  const path = '/' + kind + '/' + (course ? course.slug + '/' : '')
  const canonicalPath = prep && source ? '/interview/' + source.primary + '/' : path
  const canonical = SITE_URL + canonicalPath
  // The exporter already rejects placeholder lessons. Published, source-backed guides
  // are public resources even when the rest of their 30-day plan is unfinished.
  // Workspaces without a substantive source remain excluded.
  const indexable = (!slug || !!course) && (!prep || !course || (source?.availableDays ?? 0) > 0)
  const description = course
    ? prep ? 'Prepare for ' + course.name + ' interviews with topic-wise answers, practical examples and ' + (source?.complete ? 'a 30-day study roadmap.' : 'available subject-specific lessons.')
      : 'Explore ' + course.name + ': learning topics, tools, project ideas and related interview preparation resources from Coding Hubs School of AI, Delhi.'
    : prep ? 'Browse subject-specific interview guides, questions, worked examples and available study lessons. Read without an account and save progress optionally.'
      : 'Explore Coding Hubs courses in AI, full-stack development, data, cloud, security and design, with learning paths and related interview preparation.'
  const courseLabel = /\bcourse$/i.test(shortName) ? shortName : shortName + ' Course'
  // The institute is in Delhi; the title names its location without claiming where each course is taught.
  const courseTitle = [`${courseLabel} | Coding Hubs School of AI, Delhi`, `${courseLabel} | Coding Hubs, Delhi`, `${courseLabel} | Coding Hubs`].find(t => t.length <= 65) ?? `${courseLabel} | Coding Hubs`
  const title = course ? (prep ? shortName + ': Interview | Coding Hubs' : courseTitle)
    : prep ? 'Interview Guides & Practice Topics | Coding Hubs' : 'AI, Coding & Data Courses | Coding Hubs School of AI, Delhi'
  const trail = [['Home', '/'], [prep ? 'Interview' : 'Courses', '/' + kind + '/'], ...(course ? [[name, path]] : [])]
  const graph: Record<string, unknown>[] = [organizationNode(),
    { '@type':'WebPage', '@id':canonical + '#webpage', url:canonical, name:title, description, inLanguage:'en-IN', about:{ '@id':ORG_ID } },
    { '@type':'BreadcrumbList', itemListElement:trail.map(([label, url], i) => ({ '@type':'ListItem', position:i+1, name:label, item:SITE_URL+url })) },
  ]
  if (course && !prep) graph.push({ '@type':'Course', name, description, url:canonical, provider:{ '@id':ORG_ID }, inLanguage:'en-IN' })
  if (prep && slug === 'generative-ai') graph.push({
    '@type': 'ItemList', '@id': canonical + '#roadmap', name: '30-day Generative AI learning roadmap', numberOfItems: GENAI_LEVELS.length,
    itemListElement: GENAI_LEVELS.map((level, i) => ({ '@type': 'ListItem', position: i + 1, name: level.title, url: SITE_URL + genaiPath(level.level) })),
  })
  if (prep && slug && COURSE_ROADMAPS[slug]) graph.push({
    '@type':'ItemList', '@id':canonical+'#roadmap', name:course?.name+' learning roadmap', numberOfItems:4,
    itemListElement:COURSE_ROADMAPS[slug].levels.map((level,i)=>({'@type':'ListItem',position:i+1,name:level.title,url:SITE_URL+courseLevelPath(COURSE_ROADMAPS[slug].primary,level.level)})),
  })
  return { title, description, canonical, robots:indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow',
    og:{ type:'website', title, description, image:LOGO_URL, url:canonical, alt:'Coding Hubs School of AI' }, json_ld:{ '@context':'https://schema.org', '@graph':graph } }
}
