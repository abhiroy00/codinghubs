import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageFrame, SearchIcon } from '../content-pages/shared'
import { useSeo } from '../seo/useSeo'
import { pageSeo } from '../seo/site'
import { NotFound } from '../pages/NotFound'
import { NOTE_COUNT, NOTE_SUBJECTS, notesMeta, type NoteArticle, type NoteSubject, type NoteTopic } from './catalog'
import './notes.css'
import { HeroVideo } from '../components/HeroVideo'
import '../learning/course-showcase.css'

const GLYPHS: Record<string, string> = { python: 'Py', sql: 'SQL', 'machine-learning': 'ML', dl: 'DL', 'agentic-ai': 'AI', html: '</>', 'generative-ai': 'Gen' }

function ArticleBody({ subject, topic }: { subject: NoteSubject; topic: NoteTopic }) {
  const [article, setArticle] = useState<NoteArticle | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/notes-content/${subject.slug}/${topic.slug}.json`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Unavailable')
        return response.json() as Promise<NoteArticle>
      })
      .then(data => {
        if (data.slug !== topic.slug || data.subject !== subject.slug || typeof data.html !== 'string') throw new Error('Invalid note')
        if (!controller.signal.aborted) { setArticle(data); setFailed(false) }
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [subject.slug, topic.slug, attempt])

  if (failed) return <div className="nt-message" role="alert">
    <h3>This note couldn’t be loaded.</h3>
    <p>Check your connection and try again. Your place in the notebook is saved.</p>
    <button className="nt-button" type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Try again</button>
  </div>
  if (!article) return <div className="nt-loading" role="status"><span>Opening your note…</span><i /><i /><i /></div>
  // Only repository-owned content processed by scripts/import-notes.py and checked by validate:notes is rendered here.
  return <>
    <p className="nt-reading-meta">{Math.max(1, Math.ceil(article.wordCount / 220))} min read <span>·</span> Free learning note</p>
    <div className="nt-article-body" dangerouslySetInnerHTML={{ __html: article.html }} />
  </>
}

/** The Courses page banner (same markup and styles, with the robot), for the library and each notebook. */
function NotesBanner({ kicker, title, accent, lead, action, highlights }: { kicker: string; title: string; accent: string; lead: string; action: { href: string; label: string }; highlights: string[] }) {
  return (
    <header className="csx-hero csx-hero-robot hv-host"><HeroVideo clip="courses" />
      <div className="csx-hero-copy">
        <p className="csx-kicker">{kicker}</p>
        <h1 id="nt-title"><span>{title}</span> <span><em>{accent}</em></span></h1>
        <p className="csx-lead">{lead}</p>
        <div className="csx-hero-actions">
          <a className="ui-btn ui-btn-primary" href={action.href}>{action.label} <span aria-hidden="true">→</span></a>
          <a className="ui-btn ui-btn-ghost" href="/#register">Book free demo</a>
        </div>
        <ul className="csx-strip" aria-label="Highlights">{highlights.map(item => <li key={item}>{item}</li>)}</ul>
      </div>
      <img className="csx-robot" src="/assets/coding-hubs-ai-courses.gif" alt="Animated Coding Hubs AI robot" width={760} height={800} decoding="async" />
    </header>
  )
}

function Notebook({ subject }: { subject: NoteSubject }) {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const navigate = useNavigate()
  const heading = useRef<HTMLHeadingElement>(null)
  const chosen = params.get('topic')
  const selected = chosen ? subject.topics.find(topic => topic.slug === chosen) : subject.topics[0]
  const selectedIndex = subject.topics.findIndex(topic => topic.slug === selected?.slug)
  const visible = subject.topics.filter(topic => `${topic.title} ${topic.description}`.toLowerCase().includes(query.trim().toLowerCase()))
  const closePath = `/notes/#subject-${subject.slug}`

  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [subject.slug])

  function selectTopic(topic: NoteTopic) {
    setCopyStatus('')
    setParams({ topic: topic.slug }, { preventScrollReset: true })
  }

  async function copyLink() {
    try {
      const url = new URL(window.location.href)
      if (selected) url.searchParams.set('topic', selected.slug)
      await navigator.clipboard.writeText(url.href)
      setCopyStatus('Link copied')
    } catch { setCopyStatus('Copy this page’s address to share the note.') }
  }

  return <section className="nt-workspace" id="nt-notebook" aria-labelledby="nt-notebook-title" onKeyDown={event => {
    if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); navigate(closePath) }
  }}>
    <header className="nt-workspace-head">
      <div className={`nt-glyph nt-glyph--${subject.slug}`} aria-hidden="true">{GLYPHS[subject.slug]}</div>
      <div><p>THE {subject.title.toUpperCase()} NOTEBOOK</p><h2 id="nt-notebook-title" ref={heading} tabIndex={-1}>{subject.title} notes</h2><span>{subject.topics.length} topics. One place to learn.</span></div>
      <Link className="nt-close" to={closePath} aria-label="Close notebook">×</Link>
    </header>
    <div className="nt-workspace-grid">
      <aside className="nt-sidebar" aria-label={`${subject.title} topics`} data-lenis-prevent>
        <label className="nt-search"><SearchIcon /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a topic…" aria-label="Search topics" /></label>
        <p className="nt-topic-count" role="status">{visible.length} of {subject.topics.length} topics</p>
        <nav className="nt-topic-list" aria-label="Notebook topics">
          {visible.map(topic => <Link key={topic.slug} to={`?topic=${topic.slug}`} preventScrollReset aria-current={selected?.slug === topic.slug ? 'page' : undefined} onClick={() => setCopyStatus('')}>
            <span>{String(subject.topics.indexOf(topic) + 1).padStart(2, '0')}</span><span>{topic.title}</span><span aria-hidden="true">↗</span>
          </Link>)}
          {visible.length === 0 && <div className="nt-no-topics"><p>No topics found.</p><button type="button" onClick={() => setQuery('')}>Clear search</button></div>}
        </nav>
      </aside>
      <article className="nt-article" aria-label={selected?.title ?? 'Unknown topic'}>
        {selected ? <>
          <div className="nt-article-toolbar"><span>NOTE {String(selectedIndex + 1).padStart(2, '0')} / {subject.topics.length}</span><button type="button" onClick={copyLink}>Copy link <span aria-hidden="true">↗</span></button></div>
          <span className="nt-copy-status" role="status">{copyStatus}</span>
          <h2>{selected.title}</h2>
          {selected.description && <p className="nt-article-description">{selected.description}</p>}
          <ArticleBody key={selected.slug} subject={subject} topic={selected} />
          <nav className="nt-article-pagination" aria-label="Adjacent notes">
            {selectedIndex > 0 ? <button type="button" onClick={() => selectTopic(subject.topics[selectedIndex - 1])}>← Previous note</button> : <span />}
            {selectedIndex < subject.topics.length - 1 && <button type="button" onClick={() => selectTopic(subject.topics[selectedIndex + 1])}>Next note →</button>}
          </nav>
        </> : <div className="nt-message"><h2>That topic isn’t in this notebook.</h2><p>Choose a topic from the list to continue reading.</p><button className="nt-button" type="button" onClick={() => selectTopic(subject.topics[0])}>Open the first note</button></div>}
      </article>
    </div>
  </section>
}

export function NotesPage() {
  const { subject: slug } = useParams()
  const { hash } = useLocation()
  const [query, setQuery] = useState('')
  const subject = NOTE_SUBJECTS.find(item => item.slug === slug)
  useSeo(slug && !subject ? null : pageSeo(notesMeta(subject)))
  const visible = NOTE_SUBJECTS.filter(item => `${item.title} ${item.description} ${item.topics.map(topic => topic.title).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    if (!slug && hash.startsWith('#subject-')) document.getElementById(hash.slice(1))?.focus({ preventScroll: true })
  }, [slug, hash])

  if (slug && !subject) return <NotFound />
  return <div className="ch-home nt-page"><PageFrame wide>
    {subject ? <>
      <NotesBanner kicker={`The ${subject.title} notebook`} title={subject.title} accent="Notes"
        lead={`Read ${subject.topics.length} free ${subject.title} notes. Search a topic and explore practical explanations and code examples.`}
        action={{ href: '#nt-notebook', label: 'Start reading' }}
        highlights={[`${subject.topics.length} notes`, 'Free to read', 'No signup']} />
      <div className="nt-subject-page"><Link className="nt-back" to="/notes/">← All notebooks</Link><Notebook key={subject.slug} subject={subject} /></div>
    </> : <>
      <NotesBanner kicker="The Coding Hub notebook" title="Free Programming & AI Notes" accent="Library"
        lead="Explore our free notes, untangle a tricky concept, or find your next “aha” moment."
        action={{ href: '#notebooks', label: 'Find your notebook' }}
        highlights={[`${NOTE_SUBJECTS.length} notebooks`, `${NOTE_COUNT.toLocaleString('en-IN')} learning notes`, 'Always free', 'No signup']} />
      <section className="nt-library" id="notebooks" aria-labelledby="nt-library-title">
        <div className="nt-library-head"><div><p className="nt-eyebrow">THE LIBRARY</p><h2 id="nt-library-title">Pick a subject. Open a world.</h2><p>{NOTE_SUBJECTS.length} notebooks <span>·</span> {NOTE_COUNT.toLocaleString('en-IN')} learning notes <span>·</span> Always free</p></div><label className="nt-search"><SearchIcon /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Python, SQL, neural networks…" aria-label="Search notebooks" /></label></div>
        <div className="nt-cards">
          {visible.map(item => <Link className={`nt-card nt-card--${item.slug}`} key={item.slug} id={`subject-${item.slug}`} to={`/notes/${item.slug}/`}>
            <div className="nt-card-top"><span className={`nt-glyph nt-glyph--${item.slug}`} aria-hidden="true">{GLYPHS[item.slug]}</span><span className="nt-card-number">/ {String(NOTE_SUBJECTS.indexOf(item) + 1).padStart(2, '0')}</span></div>
            <h3>{item.title}</h3><p>{item.description}</p><div className="nt-card-bottom"><span>{item.topics.length} notes</span><span>Open notebook <span aria-hidden="true">↗</span></span></div>
          </Link>)}
        </div>
        {visible.length === 0 && <div className="nt-message" role="status"><h3>No notebooks found.</h3><p>Try a subject or topic like Python, SQL or AI.</p><button className="nt-button" type="button" onClick={() => setQuery('')}>Show all notebooks</button></div>}
        <p className="nt-library-note"><span aria-hidden="true">✦</span> Start anywhere. Come back whenever you’re curious.</p>
      </section>
    </>}
  </PageFrame></div>
}
