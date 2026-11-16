import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageFrame } from '../content-pages/shared'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import type { Enrollment } from '../lib/types'
import { COURSE_BY_SLUG, COURSE_CATALOG } from '../learning/catalog'
import { COURSES } from './free-session/data'
import './dashboard.css'

type Tab = 'overview' | 'courses' | 'progress' | 'certificates'
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'courses', label: 'My Courses' },
  { id: 'progress', label: 'Learning Progress' },
  { id: 'certificates', label: 'Certificates' },
]

interface ProgressRow { course_slug: string; current_day: number; completed_days: number[]; last_learning_date?: string | null; updated_at?: string }
interface Certificate { course_slug: string; course_name: string; certificate_id: string; completed_at: string }
type Load<T> = { state: 'loading' } | { state: 'error' } | { state: 'ready'; rows: T[] }

const unwrap = <T,>(data: unknown): T[] => (Array.isArray(data) ? data : Array.isArray((data as { results?: T[] })?.results) ? (data as { results: T[] }).results : [])
const fmtDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const courseName = (slug: string) => COURSE_BY_SLUG.get(slug)?.name ?? slug.replace(/-/g, ' ')
const FLAGSHIP = new Map(COURSES.map((c) => [c.title, c.desc]))

function useList<T>(path: string) {
  const [value, setValue] = useState<Load<T>>({ state: 'loading' })
  useEffect(() => {
    let live = true
    api.get(path).then(({ data }) => live && setValue({ state: 'ready', rows: unwrap<T>(data) })).catch(() => live && setValue({ state: 'error' }))
    return () => { live = false }
  }, [path])
  return value
}

function Ico({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
}
const I = {
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm0 14a2 2 0 0 1 2-2h13',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  check: 'M20 6 9 17l-5-5',
  cal: 'M7 3v3m10-3v3M4 8h16M5 5h14v15H5z',
  bag: 'M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2',
}

function Status({ load, error, empty, children }: { load: Load<unknown>; error: string; empty: React.ReactNode; children: React.ReactNode }) {
  if (load.state === 'loading') return <p className="db-muted" role="status">Loading…</p>
  if (load.state === 'error') return <p className="db-error" role="alert">{error}</p>
  if (!load.rows.length) return <div className="db-empty">{empty}</div>
  return <>{children}</>
}

function Bar({ done }: { done: number }) {
  const pct = Math.round((Math.min(done, 30) / 30) * 100)
  return (
    <div className="db-bar" role="progressbar" aria-valuemin={0} aria-valuemax={30} aria-valuenow={Math.min(done, 30)} aria-label={`${done} of 30 days completed`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

function ContinueCard({ progress }: { progress: Load<ProgressRow> }) {
  const active = useMemo(() => {
    if (progress.state !== 'ready') return undefined
    const open = progress.rows.filter((r) => r.completed_days.length < 30)
    return open.sort((a, b) => String(b.last_learning_date || b.updated_at || '').localeCompare(String(a.last_learning_date || a.updated_at || '')))[0]
  }, [progress])
  return (
    <section className="db-card" aria-labelledby="db-continue">
      <h2 id="db-continue" className="db-card-title"><Ico d={I.book} />Continue Learning</h2>
      <Status
        load={progress}
        error="We couldn’t load your learning progress. Please refresh the page."
        empty={<><p><strong>No roadmap in progress yet.</strong></p><p>Pick a course and start its 30-day interview roadmap — your progress shows up here.</p><Link className="db-btn" to="/interview-prep/">Start a 30-day roadmap</Link></>}
      >
        {active ? (
          <div className="db-feature">
            <span className="db-tag">{COURSE_BY_SLUG.get(active.course_slug)?.category ?? 'Course'}</span>
            <h3>{courseName(active.course_slug)}</h3>
            <p className="db-sub">30-day interview preparation roadmap</p>
            <ul className="db-meta">
              <li><Ico d={I.clock} />Day {active.current_day} of 30</li>
              <li><Ico d={I.check} />{active.completed_days.length} day{active.completed_days.length === 1 ? '' : 's'} completed</li>
              {active.last_learning_date && <li><Ico d={I.cal} />Last studied {fmtDate(active.last_learning_date)}</li>}
            </ul>
            <Bar done={active.completed_days.length} />
            <Link className="db-btn" to={`/interview-prep/${active.course_slug}/`}>Continue Day {active.current_day}</Link>
          </div>
        ) : (
          <div className="db-empty"><p><strong>All your roadmaps are complete.</strong></p><p>Collect your certificates or start a new course.</p><Link className="db-btn" to="/dashboard?tab=certificates">View certificates</Link></div>
        )}
      </Status>
    </section>
  )
}

function EnrollmentsTable({ enrollments, compact = false }: { enrollments: Load<Enrollment>; compact?: boolean }) {
  return (
    <Status
      load={enrollments}
      error="We couldn’t load your enrollments. Please refresh the page."
      empty={<><p><strong>You haven’t enrolled in a course yet.</strong></p><p>Explore the courses or start with a free 2-hour live demo class.</p><div className="db-row"><Link className="db-btn" to="/courses/">Explore courses</Link><a className="db-btn db-btn-ghost" href="/#register">Book free demo</a></div></>}
    >
      {enrollments.state === 'ready' && (
        <table className="db-table">
          <thead><tr><th scope="col">Course</th><th scope="col">Status</th><th scope="col">Enrolled on</th></tr></thead>
          <tbody>
            {(compact ? enrollments.rows.slice(0, 3) : enrollments.rows).map((e) => (
              <tr key={e.id}>
                <td data-label="Course">{e.course_name}</td>
                <td data-label="Status"><span className={`db-pill ${e.payment_status === 'paid' ? 'ok' : ''}`}>{e.payment_status === 'paid' ? 'Paid' : e.payment_status}</span></td>
                <td data-label="Enrolled on">{fmtDate(e.enrolled_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Status>
  )
}

function Recommended({ progress, enrollments }: { progress: Load<ProgressRow>; enrollments: Load<Enrollment> }) {
  const taken = new Set<string>([
    ...(progress.state === 'ready' ? progress.rows.map((r) => r.course_slug) : []),
    ...(enrollments.state === 'ready' ? enrollments.rows.map((e) => e.course_slug) : []),
  ])
  const picks = COURSE_CATALOG.filter((c) => FLAGSHIP.has(c.name) && !taken.has(c.slug)).slice(0, 3)
  return (
    <aside className="db-recs" aria-labelledby="db-recs-title">
      <h2 id="db-recs-title">Recommended for You</h2>
      {picks.length ? (
        <ul>
          {picks.map((c) => (
            <li key={c.slug} className="db-rec">
              <span className="db-tag">{c.category}</span>
              <h3>{c.name}</h3>
              <p>{FLAGSHIP.get(c.name)}</p>
              <Link to={`/courses/${c.slug}/`} className="db-link">Learn more <span aria-hidden="true">→</span></Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="db-muted">You’ve started every featured course. <Link to="/courses/">Browse all courses</Link>.</p>
      )}
    </aside>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') as Tab | null
  const tab: Tab = TABS.some((t) => t.id === requested) ? (requested as Tab) : 'overview'
  const progress = useList<ProgressRow>('/courses/learning/progress/')
  const certificates = useList<Certificate>('/courses/certificates/')
  const enrollments = useList<Enrollment>('/enrollments/me/')
  useEffect(() => { document.title = 'Your dashboard | Coding Hubs School of AI' }, [])

  const name = user?.first_name || user?.username || 'there'
  const started = progress.state === 'ready' ? progress.rows.filter((r) => r.completed_days.length > 0 || r.current_day > 1) : []

  return (
    <PageFrame wide>
      <div className="db">
        <header className="db-hello">
          <h1>Hi {name} <span aria-hidden="true">👋</span></h1>
          <p>Welcome back to Coding Hubs</p>
        </header>

        <nav className="db-tabs" aria-label="Dashboard sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setParams(t.id === 'overview' ? {} : { tab: t.id })}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <div className="db-overview">
            <div className="db-col">
              <ContinueCard progress={progress} />
              <section className="db-card" aria-labelledby="db-enrolled">
                <div className="db-card-head">
                  <h2 id="db-enrolled" className="db-card-title"><Ico d={I.bag} />My Enrollments</h2>
                  {enrollments.state === 'ready' && enrollments.rows.length > 3 && <Link className="db-link" to="/dashboard?tab=courses">View all</Link>}
                </div>
                <EnrollmentsTable enrollments={enrollments} compact />
              </section>
            </div>
            <Recommended progress={progress} enrollments={enrollments} />
          </div>
        )}

        {tab === 'courses' && (
          <section className="db-card" aria-labelledby="db-courses"><h2 id="db-courses" className="db-card-title"><Ico d={I.bag} />My Courses</h2><EnrollmentsTable enrollments={enrollments} /></section>
        )}

        {tab === 'progress' && (
          <section className="db-card" aria-labelledby="db-progress">
            <h2 id="db-progress" className="db-card-title"><Ico d={I.book} />Learning Progress</h2>
            <Status load={progress} error="We couldn’t load your learning progress. Please refresh the page." empty={<><p><strong>No progress saved yet.</strong></p><p>Open a course’s 30-day roadmap and your completed days will appear here.</p><Link className="db-btn" to="/interview-prep/">Browse roadmaps</Link></>}>
              {started.length ? (
                <ul className="db-progress">
                  {started.map((r) => (
                    <li key={r.course_slug}>
                      <div>
                        <h3>{courseName(r.course_slug)}</h3>
                        <p className="db-muted">{r.completed_days.length}/30 days{r.last_learning_date ? ` · last studied ${fmtDate(r.last_learning_date)}` : ''}</p>
                      </div>
                      <Bar done={r.completed_days.length} />
                      <Link className="db-link" to={`/interview-prep/${r.course_slug}/`}>{r.completed_days.length >= 30 ? 'Review' : `Continue Day ${r.current_day}`} <span aria-hidden="true">→</span></Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="db-empty"><p><strong>No completed days yet.</strong></p><Link className="db-btn" to="/interview-prep/">Browse roadmaps</Link></div>
              )}
            </Status>
          </section>
        )}

        {tab === 'certificates' && (
          <section className="db-card" aria-labelledby="db-certs">
            <h2 id="db-certs" className="db-card-title"><Ico d={I.check} />Certificates</h2>
            <Status load={certificates} error="We couldn’t load your certificates. Please refresh the page." empty={<><p><strong>No certificates yet.</strong></p><p>Finish all 30 days of a course roadmap to receive its certificate.</p><Link className="db-btn" to="/interview-prep/">Go to interview prep</Link></>}>
              {certificates.state === 'ready' && (
                <ul className="db-certs">
                  {certificates.rows.map((c) => (
                    <li key={c.certificate_id} className="db-rec">
                      <span className="db-tag">Certificate</span>
                      <h3>{c.course_name}</h3>
                      <p>Issued {fmtDate(c.completed_at)} · ID {c.certificate_id}</p>
                      <Link className="db-link" to={`/interview-prep/${c.course_slug}/#certificate`}>View certificate <span aria-hidden="true">→</span></Link>
                    </li>
                  ))}
                </ul>
              )}
            </Status>
          </section>
        )}
      </div>
    </PageFrame>
  )
}
