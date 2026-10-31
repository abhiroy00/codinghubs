import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { api } from '../lib/api'
import { COURSE_BY_SLUG, COURSE_CATALOG } from './catalog'
import './learning.css'
import './learning-extra.css'

type ProgressRow = { course_slug: string; current_day: number; completed_days: number[] }
type CertificateRecord = { course_slug: string; course_name: string; user_name: string; certificate_id: string; completed_at: string }

function localDays(slug: string): number[] {
  try {
    return JSON.parse(localStorage.getItem(`ch_learning_${slug}`) || '{}').done || []
  } catch {
    return []
  }
}

/** Progress (30-day roadmap) and issued certificates for the signed-in learner; guests see the progress saved in this browser. */
export function useCertificates() {
  const { user } = useAuth()
  const [days, setDays] = useState<Record<string, number>>({})
  const [certificates, setCertificates] = useState<Record<string, CertificateRecord>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const local: Record<string, number> = {}
    COURSE_CATALOG.forEach((course) => { local[course.slug] = localDays(course.slug).length })
    setDays(local)
    if (!user) { setLoading(false); return }
    Promise.all([api.get('/courses/learning/progress/'), api.get('/courses/certificates/')])
      .then(([progress, issued]) => {
        const rows = { ...local }
        for (const row of progress.data as ProgressRow[]) rows[row.course_slug] = row.completed_days.length
        const records: Record<string, CertificateRecord> = {}
        for (const record of issued.data as CertificateRecord[]) records[record.course_slug] = record
        setDays(rows)
        setCertificates(records)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [user])
  return { user, days, certificates, loading }
}

/** The certificate overview that sits inside the Interview Prep dashboard. */
export function CertificateGrid() {
  const { user, days, certificates, loading } = useCertificates()
  const courses = useMemo(() => COURSE_CATALOG.map((course) => ({ course, done: days[course.slug] ?? 0, record: certificates[course.slug] })), [days, certificates])
  return (
    <section id="certificates" className="learn-prep-intro" aria-labelledby="certs-title">
      <h2 id="certs-title">Certificates</h2>
      <p className="learn-muted">A course certificate unlocks when your saved progress includes all 30 roadmap days.</p>
      <div className="learn-course-grid certificate-grid">
        {courses.map(({ course, done, record }) => (
          <article className="learn-course-card" key={course.slug}>
            <span>{course.category}</span>
            <h3>{course.name}</h3>
            {record ? (
              <>
                <p>Unlocked · completed {new Date(record.completed_at).toLocaleDateString('en-IN')}</p>
                <Link className="learn-button" to={`/interview-prep/${course.slug}/#certificate`}>View certificate</Link>
              </>
            ) : (
              <>
                <p>{done}/30 days · {Math.round((done / 30) * 100)}% complete</p>
                <div className="learn-progress"><div><i style={{ width: `${(done / 30) * 100}%` }} /></div></div>
                <p>Locked until all 30 roadmap days are completed{!user ? ' and saved to your account.' : '.'}</p>
                <Link className="learn-button learn-button-quiet" to={`/interview-prep/${course.slug}/#certificate`}>Open roadmap</Link>
              </>
            )}
          </article>
        ))}
      </div>
      {loading && <p className="learn-muted">Syncing account progress…</p>}
    </section>
  )
}

/** The certificate of one course, shown at the end of its interview-prep roadmap (locked until all 30 days are done). */
export function CertificateSection({ slug }: { slug: string }) {
  const { user, days, certificates } = useCertificates()
  const course = COURSE_BY_SLUG.get(slug)
  const record = certificates[slug]
  const done = days[slug] ?? 0
  if (!course) return null
  return (
    <section id="certificate" className="learn-section" aria-labelledby="cert-title">
      <h2 id="cert-title">Course certificate</h2>
      {record ? (
        <>
          <article className="certificate-paper">
            <p className="learn-kicker">CODING HUBS SCHOOL OF AI</p>
            <h3>Certificate of Completion</h3>
            <p>This certificate is presented to</p>
            <h4>{record.user_name}</h4>
            <p>for completing the 30-day interview preparation roadmap for</p>
            <h4>{record.course_name}</h4>
            <p className="certificate-date">Completed {new Date(record.completed_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
            <p className="certificate-id">Certificate ID: {record.certificate_id}</p>
            <p className="certificate-signature">Coding Hubs School of AI</p>
          </article>
          <div className="certificate-actions">
            <button type="button" className="learn-button" onClick={() => window.print()}>Print or save as PDF</button>
          </div>
        </>
      ) : (
        <div className="certificate-locked">
          <b>Certificate locked</b>
          <p>{done}/30 days complete · {Math.round((done / 30) * 100)}%</p>
          <div className="learn-progress"><div><i style={{ width: `${(done / 30) * 100}%` }} /></div></div>
          <p>{user ? 'Complete and save each day of the roadmap above. The certificate is issued when all 30 days are recorded.' : 'Sign in to save your progress and unlock the certificate.'}</p>
          {!user && <Link className="learn-button learn-button-quiet" to="/login">Sign in</Link>}
        </div>
      )}
    </section>
  )
}
