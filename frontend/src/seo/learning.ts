import { COURSE_BY_SLUG } from '../learning/catalog'
import { PREP_SOURCES } from '../learning/prep-content'
import { LOGO_URL, ORG_ID, organizationNode } from './site'
import { SITE_URL } from '../locations/registry'
import type { Seo } from '../content-pages/api'
import { GENAI_LEVELS, genaiPath } from '../learning/genai-content'
import { courseLevelPath } from '../learning/roadmap-paths'
import roadmapSummary from './roadmap-summary.json'
import { getRobotsDirective, hubStatus, type ContentStatus } from './robots'
const COURSE_ROADMAPS: Record<string,{primary:string;completeLessons:number;levels:{level:number;title:string}[]}> = roadmapSummary
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
  // Course pages and the two directories are editorial pages. An interview course hub is worth indexing
  // once it has a COMPLETE lesson (the exporters publish only COMPLETE lessons as articles); alias hubs
  // keep that status and point rel=canonical at their primary course.
  const completeLessons = !prep || !course ? 0 : course.slug === 'generative-ai'
    ? GENAI_LEVELS.flatMap(l => l.articleSlugs).filter(a => a.status === 'COMPLETE').length
    : COURSE_ROADMAPS[course.slug]?.completeLessons ?? 0
  const status: ContentStatus = slug && !course ? 'PLACEHOLDER' : prep && course ? hubStatus(completeLessons) : 'COMPLETE'
  const robots = getRobotsDirective({ kind: 'content', status })
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
  return { title, description, canonical, robots,
    og:{ type:'website', title, description, image:LOGO_URL, url:canonical, alt:'Coding Hubs School of AI' }, json_ld:{ '@context':'https://schema.org', '@graph':graph } }
}
