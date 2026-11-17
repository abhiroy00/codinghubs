import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { Header } from '../components/Header'
import { labels, parts, type Block, type Lesson, type Module, type Part, type Progress } from './types'
import './reviewed-learning.css'
import { AssessmentWorkspace } from './AssessmentWorkspace'
import { LearningSummary } from './LearningSummary'
import type { AcademyCourse } from './Academy'
import { LessonDiagram } from './DiagramPlayer'
import { useAcademySeo } from './useAcademySeo'


function CodeEditor({ block }: { block: Block }) {
  const [code, setCode] = useState(block.body)
  const [message, setMessage] = useState('')
  return <section className="rw-code"><header><span>Python · editable example</span><div><button onClick={() => { setCode(block.body); setMessage('Code reset.') }}>Reset</button><button onClick={async () => { try { await navigator.clipboard.writeText(code); setMessage('Copied.') } catch { setMessage('Copy unavailable. Select the code to copy it.') } }}>Copy code</button></div></header><div className="rw-editor"><pre aria-hidden="true">{code.split('\n').map((_, i) => i + 1).join('\n')}</pre><textarea aria-label={block.title || 'Python example'} spellCheck={false} value={code} onChange={e => setCode(e.target.value)} /></div><p>Execution is not configured. Copy this example into your local Python environment.</p>{block.expected_output && <details><summary>Expected output from the reviewed example</summary><pre>{block.expected_output}</pre></details>}<span role="status">{message}</span></section>
}

export function Learning() {
  const { slug, course = 'ai-engineering' } = useParams()
  const base = `/learn/${course}/`
  const [courseInfo, setCourseInfo] = useState<AcademyCourse | null>(null)
  const location = useLocation()
  const { user } = useAuth()
  const [modules, setModules] = useState<Module[]>([])
  const [lesson, setLesson] = useState<Lesson | null>(null)
  useAcademySeo(`${lesson?.title ?? courseInfo?.title ?? 'Learning path'} | Coding Hubs`,lesson?.seo_description ?? courseInfo?.summary ?? 'Explore the engineering learning roadmap.',`${base}${slug ? `${slug}/` : ''}`,!!lesson && !lesson.preview)
  const [progress, setProgress] = useState<Progress[]>([])
  const [progressReady, setProgressReady] = useState(false)
  const [part, setPart] = useState<Part>('concept')
  const [query, setQuery] = useState('')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(false)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [feedback, setFeedback] = useState<{ score: number; feedback: { correct: boolean; explanation: string }[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(0)
  const [assessmentTick, setAssessmentTick] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setLesson(null); setPart('concept'); setAnswers({}); setFeedback(null); setMessage('')
    Promise.all([api.get<Module[]>(`/learning/curriculum/?course=${encodeURIComponent(course)}`), slug ? api.get<Lesson>(`/learning/concepts/${slug}/?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(location.search)), course })}`) : Promise.resolve(null), api.get<AcademyCourse[]>('/learning/courses/')]).then(([m, l, catalog]) => { if (active) { setModules(m.data); setLesson(l?.data ?? null); setCourseInfo(catalog.data.find(c => c.slug === course) ?? null) } }).catch(() => { if (active) setError('This lesson is unavailable or has not been published. You can explore the curriculum below.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug, course, location.search])
  useEffect(() => {
    let active = true
    setProgress([])
    setProgressReady(false)
    if (user) api.get<Progress[]>('/learning/progress/').then(r => { if (active) { setProgress(r.data); setProgressReady(true) } }).catch(() => { if (active) setMessage('Progress could not be loaded. Please reload before making changes.') })
    return () => { active = false }
  }, [user])
  const current = progress.find(p => p.slug === slug)
  const currentParts = current?.version === lesson?.version ? current?.parts ?? [] : []
  useEffect(() => { setNotes(current?.notes ?? '') }, [current?.notes, slug])
  useEffect(() => {
    const update = () => setReading(Math.min(100, Math.round(100 * window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight))))
    window.addEventListener('scroll', update, { passive: true }); update()
    return () => window.removeEventListener('scroll', update)
  }, [lesson, part])
  useEffect(() => {
    document.title = `${lesson?.title ?? courseInfo?.title ?? 'Engineering learning path'} | CodingHubs School of AI`
  }, [lesson, courseInfo])
  async function save(patch: Partial<Progress>) {
    if (!lesson || lesson.preview) return
    if (!progressReady) { setMessage('Progress has not loaded. Please reload before saving.'); return }
    setBusy(true)
    try { const { data } = await api.patch<Progress>(`/learning/concepts/${slug}/progress/`, { ...patch, version: lesson.version }); setProgress(prev => [...prev.filter(p => p.slug !== slug), data]); setMessage('Saved to your account.') }
    catch { setMessage('Could not save. Check your connection and reload if the lesson has changed.') }
    finally { setBusy(false) }
  }
  const all = modules.flatMap(m => m.chapters.flatMap(ch => ch.concepts))
  const available = all.filter(c => c.available)
  const completed = progress.filter(p => p.completed && available.some(c => c.slug === p.slug)).length
  const index = available.findIndex(c => c.slug === slug)
  const activePart = lesson?.content[part]
  const summaryKey = `${user?.id}-${progress.filter(p => p.completed).length}-${progress.filter(p => p.mastered).length}`
  async function refreshProgress() {
    try { const { data } = await api.get<Progress[]>('/learning/progress/'); setProgress(data); setProgressReady(true) }
    catch { setMessage('Progress refresh failed. Your saved work has not been changed.') }
  }
  return <div className={`learning ${dark ? 'learning-dark' : ''}`}>
    <Header mainId="rw-main" />
    <div className="rw-header rw-tools"><Link to={base}>{courseInfo?.title ?? 'Learning library'} <small>/ Learning workspace</small></Link><div><button onClick={() => setDark(!dark)} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}>{dark ? 'Light' : 'Dark'} theme</button>{user ? <Link to="/dashboard">My account</Link> : <Link to="/login">Sign in</Link>}</div></div>
    <div className="rw-layout"><aside className="rw-sidebar" aria-label="Course navigation"><p className="rw-eyebrow">YOUR LEARNING PATH</p><h2>{courseInfo?.title ?? 'Learning path'}</h2><Link to="/learn/">? All learning paths</Link><p>{modules.length} modules · {all.length} concepts</p><label>Find a concept<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Attention, RAG, Python…" /></label><div className="rw-course-progress"><span>{completed} / {all.length} reading/quiz checkpoints</span><progress max={Math.max(1, all.length)} value={completed} /></div>{modules.map(m => <details key={m.slug} open={query ? true : undefined}><summary><b>{String(m.number).padStart(2, '0')}</b> {m.title}</summary>{m.chapters.map(ch => <div className="rw-chapter" key={ch.title}><h3>{ch.title}</h3>{ch.concepts.filter(c => c.title.toLowerCase().includes(query.toLowerCase())).map(c => <Link key={c.slug} to={`${base}${c.slug}/`} aria-current={slug === c.slug ? 'page' : undefined}>{c.title}<small>{c.available ? 'Read lesson' : c.status.replaceAll('_', ' ')}</small></Link>)}</div>)}</details>)}</aside>
    <main id="rw-main" className="rw-main"><nav aria-label="Breadcrumb"><Link to={base}>Learning path</Link>{lesson && <> / {lesson.module} / {lesson.title}</>}</nav>{loading && <p role="status">Loading your learning workspace…</p>}{error && <p role="alert" className="rw-notice">{error}</p>}
    {!lesson && !loading && <><p className="rw-eyebrow">BEGINNER TO ADVANCED</p><h1>Build understanding.<br />Then build for real.</h1><p className="rw-intro">Explore the roadmap, check prerequisites and learn through explanations, examples, real-world applications and practice. Study at your own pace.</p><div className="rw-actions"><Link to="/visual-lab/">Explore interactive diagrams ?</Link><Link to="/interview/">Existing interview preparation ?</Link></div>{courseInfo && <section><h2>{courseInfo.title}</h2><p>{courseInfo.summary}</p><p>{courseInfo.level} ? approximately {courseInfo.effort_hours} hours ? self-paced</p><details><summary>Objectives, prerequisites & projects</summary><h3>Learning outcomes</h3><ul>{courseInfo.outcomes.map(o=><li key={o}>{o}</li>)}</ul><h3>Prerequisites</h3><ul>{courseInfo.prerequisites.map(o=><li key={o}>{o}</li>)}</ul><h3>Project briefs</h3>{courseInfo.projects.map(p=><section key={p.name}><h4>{p.name}</h4><p>{p.brief}</p><ul>{p.deliverables.map(d=><li key={d}>{d}</li>)}</ul></section>)}<h3>Curriculum research references</h3><ul>{courseInfo.sources.filter(s=>s.url.startsWith('https://')).map(s=><li key={s.url}><a href={s.url} rel="noreferrer" target="_blank">{s.title}</a></li>)}</ul><p>Research references inform the roadmap. They do not certify that planned lessons have been reviewed.</p></details></section>}<div className="rw-notice"><strong>Curriculum development in progress</strong><p>{available.length} of {all.length} lessons published. Planned concepts are shown for orientation; they do not count as completed learning material.</p></div>{user && <LearningSummary key={user.id} refreshKey={summaryKey} course={course} />}<div className="rw-module-grid">{modules.map(m => <section key={m.slug}><span className="rw-eyebrow">MODULE {String(m.number).padStart(2, '0')}</span><h2>{m.title}</h2><p>{m.chapters.reduce((n, c) => n + c.concepts.length, 0)} concepts · four learning parts per concept</p><details><summary>Explore concepts and outcomes</summary>{m.chapters.map(ch => <div key={ch.title}><h3>{ch.title}</h3><ul>{ch.concepts.map(c => <li key={c.slug}><Link to={`${base}${c.slug}/`}>{c.title}</Link> <small>{c.available ? 'Published' : 'In preparation'}</small></li>)}</ul></div>)}<h3>Learning objectives</h3><ul>{m.objectives.map(o => <li key={o}>{o}</li>)}</ul></details></section>)}</div></>}
    {lesson && <>{lesson.preview && <p className="rw-notice">Staff preview · unpublished changes · progress and grading disabled.</p>}<p className="rw-eyebrow">{lesson.difficulty} · {lesson.minutes} min reading · version {lesson.version}</p><h1>{lesson.title}</h1><p className="rw-intro">{lesson.seo_description}</p><details><summary>Learning outcomes and prerequisites</summary><ul>{lesson.outcomes.map(o => <li key={o}>{o}</li>)}</ul><p>Recommended prerequisites:</p>{lesson.prerequisites.length ? lesson.prerequisites.map(p => <Link className="rw-prereq" key={p} to={`${base}${p}/`}>{all.find(c => c.slug === p)?.title ?? p}</Link>) : <p>No prior course concepts required.</p>}</details><div className="rw-tabs" aria-label="Four learning parts">{parts.map((p, i) => <button key={p} aria-pressed={p === part} onClick={() => { setPart(p); setMessage('') }}><span>{String(i + 1).padStart(2, '0')}</span>{labels[p]}{currentParts.includes(p) && ' ✓'}</button>)}</div>
    <article>{activePart?.blocks.map((b, i) => <section id={`section-${i}`} key={`${slug}-${part}-${i}`}><h2>{b.title}</h2>{b.type === 'code' ? <CodeEditor block={b} /> : b.type === 'diagram' ? <LessonDiagram body={b.body} title={b.title} /> : b.body.split('\n\n').map((p, j) => <p key={j}>{p}</p>)}</section>)}
    {part === 'assessment' && <><h2>Knowledge check</h2>{activePart?.quiz?.map((q, i) => <fieldset key={q.question}><legend>{i + 1}. {q.question}</legend>{q.options.map((o, j) => <label className="rw-option" key={j}><input type="radio" name={`q-${i}`} checked={answers[i] === j} onChange={() => { setAnswers(a => ({ ...a, [i]: j })); setFeedback(null) }} />{o}</label>)}{feedback && <p>{feedback.feedback[i].correct ? 'Correct' : 'Review this answer'}: {feedback.feedback[i].explanation}</p>}</fieldset>)}<button disabled={!user || lesson.preview || busy || Object.keys(answers).length !== activePart?.quiz?.length} onClick={async () => { setBusy(true); try { const { data } = await api.post(` /learning/concepts/${slug}/quiz/`.trim(), { version: lesson.version, answers: activePart?.quiz?.map((_, i) => answers[i]) }); setFeedback(data); setAssessmentTick(t => t + 1); setProgress(prev => [...prev.filter(p => p.slug !== slug), data.progress]) } catch { setMessage('Assessment could not be submitted. Reload and try again.') } finally { setBusy(false) } }}>Submit answers</button>{feedback && <p role="status">Score: {feedback.score}%. A score of 80% and all four parts marked complete records the reading/quiz checkpoint. Practical mastery also requires a passing reviewed assignment. This does not confer a certificate.</p>}{(['beginner', 'technical', 'scenarios', 'advanced', 'design', 'interview', 'tasks'] as const).map(category => <section key={category}><h2>{category[0].toUpperCase() + category.slice(1)}</h2>{activePart?.[category]?.map(q => <details key={q.question}><summary>{q.question}</summary><p>{q.answer}</p></details>)}</section>)}{activePart?.assignment && <section><h2>Mini assignment</h2>{Object.entries(activePart.assignment).map(([k, v]) => <div key={k}><h3>{k.replaceAll('_', ' ')}</h3><p>{v}</p></div>)}</section>}<h2>Self assessment</h2><ul>{activePart?.self_assessment?.map(q => <li key={q}>{q}</li>)}</ul></>}
    </article>{part === 'assessment' && user && !lesson.preview && <AssessmentWorkspace key={`${lesson.slug}-${lesson.version}-${user.id}`} lesson={lesson} refreshKey={assessmentTick} onRefresh={() => void refreshProgress()} />}{user ? <div className="rw-actions"><button disabled={busy || lesson.preview} onClick={() => save({ parts: currentParts.includes(part) ? currentParts.filter(p => p !== part) : [...currentParts, part] })}>{currentParts.includes(part) ? 'Mark part incomplete' : 'Mark part complete'}</button><button disabled={busy || lesson.preview} onClick={() => save({ bookmark: !current?.bookmark })}>{current?.bookmark ? 'Remove bookmark' : 'Bookmark concept'}</button></div> : <p><Link to="/login">Sign in</Link> to save progress, notes, bookmarks and quiz scores.</p>}{user && <section><label htmlFor="rw-notes">Personal notes</label><textarea id="rw-notes" maxLength={20000} rows={6} value={notes} onChange={e => setNotes(e.target.value)} /><button disabled={busy || lesson.preview} onClick={() => save({ notes })}>Save notes</button></section>}<h2>Further reading</h2><ul>{lesson.references.filter(r => /^https:\/\//.test(r.url)).map(r => <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer">{r.title}</a></li>)}</ul><nav className="rw-actions" aria-label="Previous and next concepts">{index > 0 && <Link to={`${base}${available[index - 1].slug}/`}>← {available[index - 1].title}</Link>}{index >= 0 && index + 1 < available.length && <Link to={`${base}${available[index + 1].slug}/`}>{available[index + 1].title} →</Link>}</nav></>}
    <p role="status">{message}</p></main><aside className="rw-toc" aria-label="On this page"><p className="rw-eyebrow">ON THIS PAGE</p>{lesson ? <><p>{labels[part]}</p>{activePart?.blocks.map((b, i) => <a href={`#section-${i}`} key={i}>{b.title || `Section ${i + 1}`}</a>)}<label>Page reading position <progress max={100} value={reading} /></label><p>Reading position is separate from assessed completion.</p></> : <p>Choose a concept from the learning path to begin.</p>}<div className="rw-notice"><strong>Learn with intention</strong><p>Explain it. Implement it. Apply it. Defend your decisions.</p></div></aside></div>
  </div>
}
