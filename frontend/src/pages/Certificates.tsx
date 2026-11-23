import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LearnFrame } from '../learning/LearnFrame'
import { CourseTiles, useCertificates } from '../learning/certificates'
import { COURSE_BY_SLUG } from '../learning/catalog'
import { CERTIFICATES_META, pageSeo } from '../seo/site'

const TOTAL_DAYS = 30

/** /certificates/: how certificates are earned, plus the visitor's issued certificates and course progress. */
export function Certificates() {
  const { user, days, certificates, loading } = useCertificates()
  const seo = useMemo(() => pageSeo(CERTIFICATES_META), [])
  const issued = Object.values(certificates)
  const inProgress = Object.entries(days)
    .filter(([slug, done]) => done > 0 && !certificates[slug] && COURSE_BY_SLUG.has(slug))
    .sort((a, b) => b[1] - a[1])

  return (
    <LearnFrame metadata={seo} trail={[{ label: 'Certificates' }]}>
      <div className="learn-shell certificates-page">
        <header className="learn-hero">
          <p className="learn-kicker">CERTIFICATE OF COMPLETION</p>
          <h1>Course certificates</h1>
          <p>
            Complete a course&apos;s 30-day roadmap and save every day of it to earn a Coding Hubs School of AI
            certificate of completion with its own certificate ID. You can view, print or save it as a PDF from the course.
          </p>
        </header>

        <section className="learn-section" aria-labelledby="cert-how">
          <h2 id="cert-how">How to earn a certificate</h2>
          <ol className="certificates-steps">
            <li><b>Choose a course roadmap.</b> Pick a course below; each has a 30-day roadmap of lessons, practice and quizzes.</li>
            <li><b>Complete and save all 30 days.</b> Sign in so your progress is saved to your account on every device.</li>
            <li><b>Get your certificate.</b> It is issued automatically when all 30 days are recorded and stays in your account.</li>
          </ol>
        </section>

        <section className="learn-section" aria-labelledby="cert-mine">
          <h2 id="cert-mine">Your certificates</h2>
          {!user ? (
            <div className="certificate-locked">
              <b>Sign in to see your certificates</b>
              <p>Certificates are linked to your account. Progress saved in this browser is shown below.</p>
              <Link className="learn-button" to="/login?next=%2Fcertificates%2F">Sign in</Link>
            </div>
          ) : loading ? null : issued.length ? (
            <ul className="certificates-list">
              {issued.map((record) => (
                <li key={record.certificate_id}>
                  <b>{record.course_name}</b>
                  <span>Completed {new Date(record.completed_at).toLocaleDateString('en-IN', { dateStyle: 'long' })} · ID {record.certificate_id}</span>
                  <Link className="learn-button" to={`/interview/${record.course_slug}/#certificate`}>View certificate</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="learn-muted">No certificates yet. Finish a course roadmap to earn your first one.</p>
          )}
        </section>

        {inProgress.length > 0 && (
          <section className="learn-section" aria-labelledby="cert-progress">
            <h2 id="cert-progress">In progress</h2>
            <ul className="certificates-list">
              {inProgress.map(([slug, done]) => (
                <li key={slug}>
                  <b>{COURSE_BY_SLUG.get(slug)!.name}</b>
                  <span>{done}/{TOTAL_DAYS} days complete · {Math.round((done / TOTAL_DAYS) * 100)}%</span>
                  <div className="learn-progress"><div><i style={{ width: `${(done / TOTAL_DAYS) * 100}%` }} /></div></div>
                  <Link className="learn-button learn-button-quiet" to={`/interview/${slug}/`}>Continue roadmap</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <CourseTiles />
      </div>
    </LearnFrame>
  )
}
