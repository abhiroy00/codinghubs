import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { COURSE_CATALOG, COURSE_CATEGORIES, type CourseDefinition, type CourseTrack } from './catalog'
import { COURSES } from '../pages/free-session/data'
import { FsIcon } from '../pages/free-session/icons'
import thumbnails from './course-thumbnails.json'
import './course-showcase.css'
import { HeroVideo } from '../components/HeroVideo'
import { AnimatedCard, Reveal, Section } from '../components/ui'
import { useRegisterPopup } from '../lib/register-popup'
import { useCustomCourses } from './customCourses'

/** Hand-written blurbs and icons for the flagship courses shown on the homepage. */
const FLAGSHIP = new Map(COURSES.map((c) => [c.title, c]))
const TRACK_ICON: Record<CourseTrack, string> = {
  ai: 'i-spark', development: 'i-code', data: 'i-line', cloud: 'i-layers',
  security: 'i-shield', program: 'i-brief', design: 'i-pen', marketing: 'i-mega',
}
const blurb = (c: CourseDefinition) => FLAGSHIP.get(c.name)?.desc ?? c.introduction.split('. ')[0] + '.'
const icon = (c: CourseDefinition) => FLAGSHIP.get(c.name)?.icon ?? TRACK_ICON[c.track]

/** Local artwork follows catalogue slugs; failed images retain a track illustration or icon. */
function CourseThumbnail({ c }: { c: CourseDefinition }) {
  const [failedSources, setFailedSources] = useState<string[]>([])
  const primary = (thumbnails as Record<string, string>)[c.slug]
  const fallback = `/assets/courses/track-${c.track}.webp`
  const src = [primary, fallback].find(source => source && !failedSources.includes(source))
  return (
    <div className={`csx-art art-${c.track}`}>
      {src ? <img src={src} alt={`${c.name} course at Coding Hub`} width={960} height={540} loading="lazy" decoding="async"
        onError={() => setFailedSources(sources => [...sources, src])} />
        : <span className="csx-glyph"><FsIcon id={icon(c)} /></span>}
    </div>
  )
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/** Course directory hero with the supplied robot animation beside the introduction and course links. */
export function CoursesHero() {
  return (
    <header className="csx-hero csx-hero-robot hv-host"><HeroVideo clip="courses" />
      <div className="csx-aurora" aria-hidden="true"><span className="a1" /><span className="a2" /><span className="a3" /></div>
      <div className="csx-hero-copy">
        <p className="csx-kicker">Introducing</p>
        <h1>
          <span>Practical AI &amp; Tech Courses</span>
          <span>with <em>Certification</em></span>
        </h1>
        <p className="csx-lead">Live, mentor-led courses in AI, full stack development, cloud, data, security and design. Start with a free 2-hour demo class.</p>
        <div className="csx-hero-actions">
          <a className="ui-btn ui-btn-primary" href="#catalogue">Start Learning <Arrow /></a>
          <a className="ui-btn ui-btn-ghost" href="/#register">Book free demo</a>
        </div>
        <ul className="csx-strip" aria-label="Highlights">
          <li>Mentor-led live classes</li>
          <li>Certificate on completion</li>
          <li>Real portfolio projects</li>
          <li>{COURSE_CATALOG.length}+ courses</li>
        </ul>
      </div>
      <img className="csx-robot" src="/assets/coding-hubs-ai-courses.gif" alt="Animated Coding Hubs AI robot" width={760} height={800} loading="lazy" decoding="async" />
    </header>
  )
}

const FEATURES = [
  { title: 'Free Demo Class', text: 'Try a 2-hour live session before you decide. No payment needed.', art: 'tri' },
  { title: 'Industry-Relevant Content', text: 'Built around real tools, real projects and day-to-day workflows.', art: 'rings' },
  { title: 'Completion Certificate', text: 'Finish the 30-day roadmap to earn your course certificate.', art: 'slash' },
  { title: 'Interview', text: 'Daily lessons, questions and challenges to get job-ready.', art: 'bars' },
] as const

function FeatureArt({ kind }: { kind: (typeof FEATURES)[number]['art'] }) {
  return (
    <svg className="csx-feat-art" viewBox="0 0 260 70" preserveAspectRatio="none" aria-hidden="true">
      {kind === 'tri' && <><path d="M10 70 130 18 250 70" /><path d="M70 70 130 44 190 70" /></>}
      {kind === 'rings' && <><circle cx="80" cy="80" r="52" /><circle cx="130" cy="80" r="52" /><circle cx="180" cy="80" r="52" /></>}
      {kind === 'slash' && <path d="M20 10 70 70M70 10 120 70M120 10 170 70M170 10 220 70" />}
      {kind === 'bars' && <path d="M20 70V18h220v52M64 18v52M108 18v52M152 18v52M196 18v52" />}
    </svg>
  )
}

export function CoursesFeatures() {
  return (
    <Section id="csx-feat" className="csx-features" tone="soft" badge="Why Coding Hub" title="Everything You Need To Start Learning"
      subtitle="Mentor-led classes at Coding Hub, Pitampura, built to take you from first lesson to job-ready portfolio.">
      <Reveal as="ul" stagger>
        {FEATURES.map((f) => (
          <li key={f.title}>
            <AnimatedCard as="div" className="csx-feature">
              <h3>{f.title}</h3>
              <p>{f.text}</p>
              <FeatureArt kind={f.art} />
            </AnimatedCard>
          </li>
        ))}
      </Reveal>
    </Section>
  )
}

/* Real learner ratings from the public testimonials feed, averaged per course; fetched once per page load. */
type Rating = { avg: number; count: number }
let ratingsCache: Promise<Map<string, Rating>> | null = null
function loadRatings() {
  ratingsCache ??= fetch('/api/testimonials/', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : []))
    .then((rows: { course?: string; rating?: number | null }[]) => {
      const sums = new Map<string, { total: number; count: number }>()
      for (const row of Array.isArray(rows) ? rows : []) {
        if (!row.course || !row.rating) continue
        const key = row.course.trim().toLowerCase()
        const cur = sums.get(key) ?? { total: 0, count: 0 }
        sums.set(key, { total: cur.total + row.rating, count: cur.count + 1 })
      }
      return new Map([...sums].map(([k, v]) => [k, { avg: v.total / v.count, count: v.count }]))
    })
    .catch(() => new Map())
  return ratingsCache
}
function useCourseRatings() {
  const [ratings, setRatings] = useState<Map<string, Rating>>(new Map())
  useEffect(() => { let live = true; loadRatings().then((m) => live && setRatings(m)); return () => { live = false } }, [])
  return ratings
}

function Stars({ rating }: { rating?: Rating }) {
  if (!rating) return <p className="csx-rating csx-rating-new">New batch · be the first to review</p>
  const rounded = Math.round(rating.avg * 10) / 10
  return (
    <p className="csx-rating">
      <span className="csx-stars" role="img" aria-label={`Rated ${rounded} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= Math.round(rating.avg) ? 'on' : ''} aria-hidden="true">★</span>)}
      </span>
      <strong>{rounded.toFixed(1)}</strong> ({rating.count} review{rating.count === 1 ? '' : 's'})
    </p>
  )
}

function CourseCard({ c, rating }: { c: CourseDefinition; rating?: Rating }) {
  const { openEnrollment } = useRegisterPopup()
  return (
    <AnimatedCard className="csx-card" media={<CourseThumbnail c={c} />}>
      <div className="csx-badges">
        <span className="csx-cat">{c.category}</span>
        {c.level && <span className="ui-chip ui-chip-brand">{c.level}</span>}
        {c.custom ? c.duration && <span className="ui-chip">{c.duration}</span> : <span className="ui-chip">30 days</span>}
        <span className="ui-chip">{c.modules.length} modules</span>
      </div>
      <h3 className="csx-title"><Link to={`/courses/${c.slug}/`}>{c.name}</Link></h3>
      <p className="csx-pdesc">{blurb(c)}</p>
      <Stars rating={rating} />
      <div className="csx-pactions">
        <button type="button" className="ui-btn ui-btn-primary" aria-haspopup="dialog" onClick={() => openEnrollment(c.name)}>
          Enroll Now <Arrow />
        </button>
        <Link className="ui-btn ui-btn-ghost" to={`/courses/${c.slug}/`} aria-label={`View details of ${c.name}`}>View Details</Link>
      </div>
    </AnimatedCard>
  )
}

/** Every course is visible as a card; search and category filters (sidebar on desktop) narrow the same catalogue. */
export function CoursesShowcase() {
  const [filter, setFilter] = useState('')
  const [query, setQuery] = useState('')
  const { open: openDemo } = useRegisterPopup()
  const ratings = useCourseRatings()
  const custom = useCustomCourses()
  const all = [...COURSE_CATALOG, ...custom]
  const categories = [...COURSE_CATEGORIES.map((cat) => ({ name: cat.name, count: all.filter((c) => c.category === cat.name).length })),
    ...[...new Set(custom.map((c) => c.category))].filter((name) => !COURSE_CATEGORIES.some((cat) => cat.name === name))
      .map((name) => ({ name, count: custom.filter((c) => c.category === name).length }))]
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const visible = all.filter((c) => (!filter || c.category === filter)
    && words.every((w) => `${c.name} ${c.category} ${blurb(c)}`.toLowerCase().includes(w)))

  return (
    <Section id="catalogue" titleId="csx-courses-title" className="csx-courses" align="left" badge={`${all.length}+ courses`} title="All Courses"
      subtitle="Explore Coding Hub courses in AI, data science, GenAI, development and more. Compare paths and find the right next step for you.">
      <div className="csx-layout">
        <aside className="csx-side" aria-label="Find a course">
          <div className="csx-box csx-search">
            <label htmlFor="csx-q">Search courses</label>
            <input id="csx-q" type="search" placeholder="e.g. Python, AWS, GenAI" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="csx-box">
            <h3 id="csx-cat-title">Categories</h3>
            <div className="csx-chips" role="group" aria-labelledby="csx-cat-title">
              <button type="button" className={!filter ? 'on' : ''} aria-pressed={!filter} onClick={() => setFilter('')}>
                All <span>{all.length}</span>
              </button>
              {categories.map((cat) => (
                <button key={cat.name} type="button" className={filter === cat.name ? 'on' : ''} aria-pressed={filter === cat.name} onClick={() => setFilter(cat.name)}>
                  {cat.name} <span>{cat.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="csx-box csx-next">
            <h3>Before you choose</h3>
            <ul>
              <li><Link to="/brochures/">Download a course brochure</Link></li>
              <li><Link to="/certificates/">How certificates work</Link></li>
              <li><Link to="/locations/">Classrooms in NSP &amp; Pitampura</Link></li>
              <li><Link to="/blog">Career guides on the blog</Link></li>
            </ul>
            <button type="button" className="ui-btn ui-btn-primary" onClick={() => openDemo()}>Book a free demo</button>
          </div>
        </aside>

        <div className="csx-results">
          <p className="csx-count" role="status">Showing {visible.length} of {all.length} courses{filter ? ` in ${filter}` : ''}{words.length ? ` matching “${query.trim()}”` : ''}</p>
          <Reveal as="ul" stagger key={filter} className="csx-grid" aria-label="Courses">
            {visible.map((c) => <li key={c.slug}><CourseCard c={c} rating={ratings.get(c.name.trim().toLowerCase())} /></li>)}
          </Reveal>
          {visible.length === 0 && <p className="csx-none">No course matches. Try a shorter keyword, or <button type="button" className="csx-linkbtn" onClick={() => { setQuery(''); setFilter('') }}>show all courses</button>.</p>}
        </div>
      </div>
    </Section>
  )
}
