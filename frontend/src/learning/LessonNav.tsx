import { Link } from 'react-router-dom'
import guides from '../interview/guides.json'
import { COURSE_ROADMAPS, courseLevelPath } from './course-roadmap-content'
import { GENAI_LEVELS, genaiPath } from './genai-content'
import { COURSE_BY_SLUG } from './catalog'

type Step = { to: string; title: string }

/** Topic guides that suit each course track; plain links so every lesson reaches them in server HTML. */
const GUIDES_BY_TRACK: Record<string, string[]> = {
  development: ['javascript-event-loop', 'http-retries', 'database-indexes'],
  data: ['database-indexes', 'sliding-window', 'behavioral-evidence'],
  ai: ['cache-aside', 'http-retries', 'behavioral-evidence'],
  cloud: ['http-retries', 'cache-aside', 'processes-threads'],
  security: ['http-retries', 'processes-threads', 'behavioral-evidence'],
}

/** Published lessons of a course in curriculum order (articles only: day URLs redirect to them). */
export function courseLessons(slug: string): Step[] {
  if (slug === 'generative-ai') return GENAI_LEVELS.flatMap(l => l.articleSlugs.map(a => ({ to: genaiPath(l.level) + `articles/${a.slug}/`, title: a.title })))
  return (COURSE_ROADMAPS[slug]?.levels ?? []).flatMap(l => l.articles.map(a => ({ to: courseLevelPath(slug, l.level) + `articles/${a.slug}/`, title: a.title })))
}

export function LessonNav({ slug, current }: { slug: string; current: string }) {
  const lessons = courseLessons(slug)
  const i = lessons.findIndex(l => l.to === current)
  const prev = i > 0 ? lessons[i - 1] : undefined, next = i >= 0 ? lessons[i + 1] : undefined
  const track = slug === 'generative-ai' ? 'ai' : COURSE_BY_SLUG.get(slug)?.track ?? ''
  const related = (GUIDES_BY_TRACK[track] ?? ['behavioral-evidence']).map(s => guides.find(g => g.slug === s)).filter(g => !!g)
  return <nav className="lesson-nav" aria-label="Lesson navigation">
    <div className="lesson-nav-steps">
      {prev ? <Link rel="prev" to={prev.to}><small>← Previous lesson</small>{prev.title}</Link> : <span />}
      {next ? <Link rel="next" to={next.to}><small>Next lesson →</small>{next.title}</Link> : <span />}
    </div>
    {related.length > 0 && <>
      <h2>Related interview guides</h2>
      <ul>{related.map(g => <li key={g.slug}><Link to={`/interview/guides/${g.slug}/`}>{g.title}</Link></li>)}</ul>
    </>}
  </nav>
}
