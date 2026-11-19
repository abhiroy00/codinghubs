import { useState } from 'react'
import { Link } from 'react-router-dom'
import { COURSE_CATALOG, COURSE_CATEGORIES, type CourseDefinition, type CourseTrack } from './catalog'
import { COURSES } from '../pages/free-session/data'
import { FsIcon } from '../pages/free-session/icons'
import thumbnails from './course-thumbnails.json'
import './course-showcase.css'
import { HeroVideo } from '../components/HeroVideo'

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
    <div className={`csx-art art-${c.track}`} aria-hidden="true">
      {src ? <img src={src} alt="" width={960} height={540} loading="lazy" decoding="async"
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

/** Hero: spaced kicker, two-line headline over a slow-moving aurora, CTAs and a highlight strip. */
export function CoursesHero() {
  return (
    <header className="csx-hero hv-host"><HeroVideo clip="courses" />
      <div className="csx-aurora" aria-hidden="true"><span className="a1" /><span className="a2" /><span className="a3" /></div>
      <p className="csx-kicker">Introducing</p>
      <h1>
        <span>Practical AI &amp; Tech Courses</span>
        <span>with <em>Certification</em></span>
      </h1>
      <p className="csx-lead">Live, mentor-led courses in AI, full stack development, cloud, data, security and design. Start with a free 2-hour demo class.</p>
      <div className="csx-hero-actions">
        <a className="csx-pill" href="#catalogue">Start Learning <Arrow /></a>
        <a className="csx-pill csx-pill-ghost" href="/#register">Book free demo</a>
      </div>
      <ul className="csx-strip" aria-label="Highlights">
        <li>Mentor-led live classes</li>
        <li>Certificate on completion</li>
        <li>Real portfolio projects</li>
        <li>{COURSE_CATALOG.length}+ courses</li>
      </ul>
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
    <section className="csx-features" aria-labelledby="csx-feat-title">
      <h2 id="csx-feat-title">Everything You Need To Start Learning</h2>
      <ul>
        {FEATURES.map((f) => (
          <li key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
            <FeatureArt kind={f.art} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function CourseCard({ c }: { c: CourseDefinition }) {
  const tags = [c.category, ...c.tools.slice(0, 2)]
  return (
    <article className="csx-card">
      <CourseThumbnail c={c} />
      <div className="csx-pbody">
        <div className="csx-ptop">
          <h3><Link to={`/courses/${c.slug}/`}>{c.name}</Link></h3>
          <ul className="csx-tags" aria-label="Topics">
            {tags.map((t, i) => (<li key={t} className={`t${i}`}>{t}</li>))}
          </ul>
        </div>
        <ul className="csx-pmeta">
          <li>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
            {c.modules.length} Modules
          </li>
          <li>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            30-day path
          </li>
          <li>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16v10H4zM8 20h8M12 16v4" /></svg>
            Live online
          </li>
        </ul>
        <p className="csx-pdesc">{blurb(c)}</p>
        <p className="csx-outcome"><strong>You will practise:</strong> {c.skills.slice(0, 3).join(', ')}</p>
        <div className="csx-pactions">
          <Link className="csx-start" to={`/courses/${c.slug}/`} aria-label={`View ${c.name} course`}>View course <Arrow /></Link>
          <a className="csx-demo" href="/#register" aria-label={`Book a free demo for ${c.name}`}>or try a free demo</a>
        </div>
      </div>
    </article>
  )
}

/** Every course is visible as a card; category filters narrow the same catalogue. */
export function CoursesShowcase() {
  const [filter, setFilter] = useState('')
  const visible = filter ? COURSE_CATALOG.filter((c) => c.category === filter) : COURSE_CATALOG

  return (
    <section id="catalogue" className="csx-courses" aria-labelledby="csx-courses-title">
      <h2 id="csx-courses-title">All Courses</h2>
      <p className="csx-sub">Explore our courses, compare learning paths and find the right next step for you.</p>
      <div className="csx-chips" role="group" aria-label="Filter by category">
        <button type="button" className={!filter ? 'on' : ''} aria-pressed={!filter} onClick={() => setFilter('')}>
          All <span>{COURSE_CATALOG.length}</span>
        </button>
        {COURSE_CATEGORIES.map((cat) => (
          <button key={cat.name} type="button" className={filter === cat.name ? 'on' : ''} aria-pressed={filter === cat.name} onClick={() => setFilter(cat.name)}>
            {cat.name} <span>{cat.courses.length}</span>
          </button>
        ))}
      </div>

      <p className="csx-count" role="status">Showing {visible.length} of {COURSE_CATALOG.length} courses{filter ? ` in ${filter}` : ''}</p>

      <ul className="csx-grid" aria-label="Courses">
        {visible.map((c) => <li key={c.slug}><CourseCard c={c} /></li>)}
      </ul>
    </section>
  )
}

export function CoursesCta() {
  return (
    <section className="csx-cta" aria-labelledby="csx-cta-title">
      <div>
        <p className="csx-cta-kicker">Free demo class</p>
        <h2 id="csx-cta-title">Not sure which course fits you?</h2>
        <p>Join a free 2-hour live session, meet a mentor and get your questions answered before you enrol.</p>
      </div>
      <div className="csx-cta-actions">
        <a className="csx-pill" href="/#register">Book free demo <Arrow /></a>
        <a className="csx-pill csx-pill-ghost" href="/#contact">Talk to a counsellor</a>
      </div>
    </section>
  )
}
