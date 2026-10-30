import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { api } from '../lib/api'
import { COURSE_CATALOG, COURSE_BY_SLUG } from './catalog'
import './learning.css'
import './learning-extra.css'

type ProgressRow = { course_slug: string; current_day: number; completed_days: number[]; completed_challenges: number[]; completed_questions: number[]; completed_projects: string[]; quiz_scores: Record<string, number>; last_learning_date: string | null }
type CertificateRecord = { course_slug: string; course_name: string; user_name: string; certificate_id: string; completed_at: string }

function localProgress(slug: string): ProgressRow {
  try {
    const data = JSON.parse(localStorage.getItem(`ch_learning_${slug}`) || '{}')
    return { course_slug: slug, current_day: data.currentDay || 1, completed_days: data.done || [], completed_challenges: data.challenge || [], completed_questions: data.questions || [], completed_projects: data.projects || [], quiz_scores: data.scores || {}, last_learning_date: data.lastLearningDate || null }
  } catch {
    return { course_slug: slug, current_day: 1, completed_days: [], completed_challenges: [], completed_questions: [], completed_projects: [], quiz_scores: {}, last_learning_date: null }
  }
}

export function CertificatesPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [progress, setProgress] = useState<Record<string, ProgressRow>>({})
  const [certificates, setCertificates] = useState<Record<string, CertificateRecord>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const local: Record<string, ProgressRow> = {}
    COURSE_CATALOG.forEach((course) => { local[course.slug] = localProgress(course.slug) })
    setProgress(local)
    if (!user) { setLoading(false); return }
    Promise.all([api.get('/courses/learning/progress/'), api.get('/courses/certificates/')]).then(([progressResponse, certificateResponse]) => {
      const rows: Record<string, ProgressRow> = { ...local }
      for (const row of progressResponse.data as ProgressRow[]) rows[row.course_slug] = row
      const issued: Record<string, CertificateRecord> = {}
      for (const record of certificateResponse.data as CertificateRecord[]) issued[record.course_slug] = record
      setProgress(rows)
      setCertificates(issued)
    }).catch(() => undefined).finally(() => setLoading(false))
  }, [user])
  const selected = slug ? COURSE_BY_SLUG.get(slug) : null
  const certificate = slug ? certificates[slug] : null
  const completion = slug ? progress[slug]?.completed_days.length || 0 : 0
  const courses = useMemo(() => COURSE_CATALOG.map((course) => ({ course, progress: progress[course.slug] || localProgress(course.slug), certificate: certificates[course.slug] })), [progress, certificates])

  if (slug && !selected) return <main className="learn-shell"><h1>Course not found</h1><Link to="/certificates/">Browse certificates</Link></main>
  if (slug && certificate) return <main className="learn-shell certificate-page"><article className="certificate-paper"><p className="learn-kicker">CODING HUBS SCHOOL OF AI</p><h1>Certificate of Completion</h1><p>This certificate is presented to</p><h2>{certificate.user_name}</h2><p>for completing the 30-day interview preparation roadmap for</p><h2>{certificate.course_name}</h2><p className="certificate-date">Completed {new Date(certificate.completed_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p><p className="certificate-id">Certificate ID: {certificate.certificate_id}</p><p className="certificate-signature">Coding Hubs School of AI</p></article><div className="certificate-actions"><button className="learn-button" onClick={() => window.print()}>Print or save as PDF</button><Link className="learn-button learn-button-quiet" to="/certificates/">All certificates</Link></div></main>
  if (slug && selected) return <main className="learn-shell"><header className="learn-hero"><p className="learn-kicker">COURSE CERTIFICATE</p><h1>{selected.name}</h1><p>{certificate ? 'Your certificate is unlocked.' : `Complete all 30 roadmap days to unlock this certificate. Current progress: ${completion}/30 days.`}</p></header><div className="learn-content">{certificate ? <Link className="learn-button" to={`/certificates/${slug}/`}>View certificate</Link> : <div className="certificate-locked"><b>Certificate locked</b><p>{completion}/30 days complete · {Math.round(completion / 30 * 100)}%</p><div className="learn-progress"><div><i style={{ width: `${completion / 30 * 100}%` }}/></div></div><p>{user ? 'Complete and save each day in the interview preparation roadmap. The certificate is issued when all 30 days are recorded.' : 'Sign in to save your course progress and unlock a certificate.'}</p><Link className="learn-button" to={`/interview-prep/${slug}/`}>Continue roadmap</Link>{!user && <Link className="learn-button learn-button-quiet" to="/login">Sign in</Link>}</div>}</div></main>

  return <main className="learn-shell"><header className="learn-hero"><p className="learn-kicker">YOUR ACHIEVEMENTS</p><h1>Certificates</h1><p>Each course certificate unlocks when your saved account progress includes all 30 completed roadmap days.</p></header><div className="learn-directory"><section className="learn-course-grid certificate-grid">{courses.map(({ course, progress: row, certificate: record }) => { const days = row.completed_days.length; return <article className="learn-course-card" key={course.slug}><span>{course.category}</span><h2>{course.name}</h2>{record ? <><p>Unlocked · completed {new Date(record.completed_at).toLocaleDateString('en-IN')}</p><Link className="learn-button" to={`/certificates/${course.slug}/`}>View certificate</Link></> : <><p>{days}/30 days · {Math.round(days / 30 * 100)}% complete</p><div className="learn-progress"><div><i style={{ width: `${days / 30 * 100}%` }}/></div></div><p>Locked until all 30 roadmap days are completed{!user ? ' and saved to your account.' : '.'}</p><Link className="learn-button learn-button-quiet" to={`/interview-prep/${course.slug}/`}>Continue roadmap</Link></>}</article> })}</section>{loading && <p className="learn-muted">Syncing account progress…</p>}</div></main>
}
