import { GENAI_LEVELS, genaiPath } from './genai-content'
import { SITE_URL } from '../locations/registry'
import { LOGO_URL, ORG_ID, organizationNode } from '../seo/site'
import type { Seo } from '../content-pages/api'

function snippet(text: string) {
  return text.length <= 165 ? text : text.slice(0, 162).replace(/\s+\S*$/, '') + '…'
}

/** Browser and prerender metadata describe the same visible learning material. */
export function genaiMeta(level: number, article?: string, day?: number): Seo {
  const entry = GENAI_LEVELS.find(l => l.level === level)
  const reading = entry?.articleSlugs.find(a => a.slug === article)
  const daily = entry?.days.find(d => d.day === day)
  const valid = !!entry && (!article || !!reading) && (day === undefined || !!daily)
  const name = reading?.title ?? (daily ? `Day ${daily.day}: ${daily.title}` : entry?.title ?? 'Learning page unavailable')
  const title = reading ? `${reading.title} | GenAI Guide`
    : daily ? `Day ${daily.day}: GenAI Learning & Practice | Coding Hubs`
      : `GenAI Level ${level}: ${['Foundations', 'Transformers', 'RAG & Agents', 'Production & Interviews'][level - 1] ?? 'Unavailable'} | Coding Hubs`
  const path = genaiPath(level) + (article ? `articles/${article}/` : day !== undefined ? `days/${day}/` : '')
  const canonical = SITE_URL + path
  const description = snippet(reading ? reading.summary
    : daily ? `Day ${daily.day}: study ${daily.title.toLowerCase()}. Explore worked Python examples, interview answers, a practical assignment and revision checklist.`
      : `Study ${entry?.title.toLowerCase() ?? 'GenAI'} with ${entry?.articleCount ?? 0} articles, ${entry?.questionCount ?? 0} original interview questions, Python exercises and a daily learning plan.`)
  const trail = [['Home', '/'], ['Interview Prep', '/interview-prep/'], ['Generative AI', '/interview-prep/generative-ai/'], [`Level ${level}`, genaiPath(level)], ...(article || day !== undefined ? [[name, path]] : [])]
  const resourceId = canonical + '#learning-resource'
  const graph: Record<string, unknown>[] = [organizationNode(), {
    '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: title, description,
    inLanguage: 'en-IN', about: { '@id': ORG_ID }, ...(valid ? { mainEntity: { '@id': resourceId } } : {}),
  }, {
    '@type': 'BreadcrumbList', itemListElement: trail.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE_URL + url })),
  }]
  if (valid && entry) {
    graph.push({
      '@type': 'LearningResource', '@id': resourceId, url: canonical, name, description,
      inLanguage: 'en-IN', publisher: { '@id': ORG_ID },
      learningResourceType: reading ? 'Concept guide and worked examples' : daily ? 'Daily lesson and assignment' : 'Interview preparation study guide',
      educationalLevel: ['Beginner', 'Intermediate', 'Intermediate', 'Advanced'][level - 1],
      teaches: reading?.title ?? daily?.title ?? entry.title, isAccessibleForFree: true,
      ...(reading ? { citation: reading.sources } : {}),
      ...(reading || daily ? { isPartOf: { '@type': 'LearningResource', name: entry.title, url: SITE_URL + genaiPath(level) } } : {
        hasPart: entry.articleSlugs.map(a => ({ '@type': 'LearningResource', name: a.title, url: SITE_URL + genaiPath(level) + `articles/${a.slug}/` })),
      }),
    })
    if (!reading && !daily) graph.push({
      '@type': 'ItemList', '@id': canonical + '#articles', name: `${entry.title}: articles`, numberOfItems: entry.articleCount,
      itemListElement: entry.articleSlugs.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.title, url: SITE_URL + genaiPath(level) + `articles/${a.slug}/` })),
    })
  }
  return { title, description, canonical, robots: valid ? 'index, follow, max-image-preview:large' : 'noindex, follow',
    og: { title, description, type: 'website', image: LOGO_URL, url: canonical, alt: 'Coding Hubs School of AI' },
    json_ld: { '@context': 'https://schema.org', '@graph': graph } }
}
