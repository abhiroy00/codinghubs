import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminApi, type Paged } from '../api'
import './learning-admin.css'

interface SubmissionRow { id: string; title: string; concept: string; learner: string; concept_version: number; is_current_version: boolean; status: string; score: number | null; passed: boolean; submitted_at: string; review_version: number }
interface Review { version: number; score: number; acceptance_confirmed: boolean; feedback: string; reviewer: string | null; created_at: string }
interface Submission extends SubmissionRow { response: string; repository_url: string; assignment_snapshot: { title: string; assignment: Record<string, string> }; feedback: string; acceptance_confirmed: boolean; reviewer: string | null; can_grade: boolean; reviews: Review[] }

function errorText(error: unknown): string {
  const r = (error as { response?: { status?: number; data?: unknown } }).response
  if (r?.status === 409) return 'A reviewer saved a newer grade. Your feedback is still here; copy it before reloading and reconciling the review.'
  if (r?.status === 403) return 'Your account does not have permission to review this work. Reviewers cannot grade their own submissions.'
  return r?.data ? JSON.stringify(r.data) : 'The request failed. Your feedback has not been cleared.'
}

export function AssignmentReviewQueue() {
  const [data, setData] = useState<Paged<SubmissionRow> | null>(null)
  const [status, setStatus] = useState('submitted')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    adminApi.get<Paged<SubmissionRow>>('/learning/submissions/', { params: { status, page } }).then(r => { if (active) setData(r.data) }).catch(e => { if (active) setError(errorText(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [status, page, tick])
  return <div className="la-workspace"><h1>Practical assignment reviews</h1><p>Review the submitted evidence against the frozen assignment and rubric. Saving a grade does not run code or issue a certificate.</p><div className="la-filters"><label>Review status<select className="ad-input" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="submitted">Awaiting review</option><option value="reviewed">Reviewed</option><option value="">All submissions</option></select></label></div><button className="ad-btn" disabled={loading} onClick={() => setTick(v => v + 1)}>Refresh queue</button>{error && <p className="ad-error" role="alert">{error}</p>}{loading && <p role="status">Loading submissions…</p>}<div className="la-table"><table><thead><tr><th>Assignment</th><th>Learner</th><th>Lesson version</th><th>Status</th><th>Score</th><th>Submitted</th></tr></thead><tbody>{data?.results.map(s => <tr key={s.id}><td><Link to={`/learning-reviews/${s.id}`}>{s.title}</Link></td><td>{s.learner}</td><td>{s.concept_version}{!s.is_current_version && ' (earlier)'}</td><td>{s.status}</td><td>{s.score === null ? 'Not graded' : `${s.score}% · ${s.passed ? 'Accepted' : 'Needs work'}`}</td><td>{new Date(s.submitted_at).toLocaleString()}</td></tr>)}</tbody></table></div>{data?.count === 0 && <p>No matching submissions.</p>}<nav className="la-actions" aria-label="Review queue pages"><button className="ad-btn" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} · {data?.count ?? 0} submissions</span><button className="ad-btn" disabled={!data?.next || loading} onClick={() => setPage(p => p + 1)}>Next</button></nav></div>
}

export function AssignmentReviewEditor() {
  const { id } = useParams()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dirty, setDirty] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let active = true
    setSubmission(null); setError('')
    adminApi.get<Submission>(`/learning/submissions/${id}/`).then(r => { if (active) { setSubmission(r.data); setScore(r.data.score?.toString() ?? ''); setFeedback(r.data.feedback); setConfirmed(r.data.acceptance_confirmed); setDirty(false) } }).catch(e => { if (active) setError(errorText(e)) })
    return () => { active = false }
  }, [id, tick])
  useEffect(() => {
    if (!dirty) return
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])

  async function grade() {
    if (!submission || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      await adminApi.post(`/learning/submissions/${id}/`, { review_version: submission.review_version, score: Number(score), feedback, acceptance_confirmed: confirmed })
      setDirty(false); setNotice('Grade and feedback saved with a new review-history entry.'); setTick(v => v + 1)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  const validScore = score !== '' && Number.isInteger(Number(score)) && Number(score) >= 0 && Number(score) <= 100
  return <div className="la-workspace"><Link to="/learning-reviews" onClick={e => { if (dirty && !window.confirm('Leave with unsaved review feedback? Copy it first if needed.')) e.preventDefault() }}>← Assignment queue</Link>{error && <p role="alert" className="ad-error la-feedback">{error}</p>}{notice && <p role="status" className="ad-notice">{notice}</p>}{submission ? <><h1>{submission.title}</h1><p>Learner: {submission.learner} · lesson version {submission.concept_version} · {submission.status} · review revision {submission.review_version}</p>{!submission.is_current_version && <p className="ad-notice">This submission belongs to an earlier published lesson version. Grade it using the captured rubric below; it will not satisfy mastery of the current version.</p>}<section><h2>Assignment at submission time</h2>{Object.entries(submission.assignment_snapshot.assignment).map(([key, value]) => <div key={key}><h3>{key.replaceAll('_', ' ')}</h3><p className="la-review-text">{value}</p></div>)}</section><section><h2>Submitted implementation and evidence</h2><pre className="la-review-code">{submission.response}</pre>{submission.repository_url.startsWith('https://') && <a href={submission.repository_url} target="_blank" rel="noopener noreferrer">Open learner-provided repository</a>}<p className="ad-hint">The server has not fetched this repository or executed the submitted code. Independently verify evidence in an appropriate environment before confirming acceptance.</p></section><fieldset className="la-fields" disabled={busy || !submission.can_grade}><legend>Human review</legend><label>Score out of 100<input className="ad-input" type="number" min={0} max={100} step={1} value={score} onChange={e => { setScore(e.target.value); setDirty(true) }} /></label><label>Specific feedback and reasons<textarea className="ad-input" rows={8} minLength={20} maxLength={20000} value={feedback} onChange={e => { setFeedback(e.target.value); setDirty(true) }} /></label><label><input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setDirty(true) }} /> I verified the assignment acceptance criteria, including any mandatory tests and rubric conditions.</label><p>A score of at least 80 requires confirmed acceptance checks. The reviewer may not grade their own work.</p><button type="button" className="ad-btn ad-btn-primary" disabled={busy || !validScore || feedback.trim().length < 20 || (Number(score) >= 80 && !confirmed)} onClick={() => void grade()}>{busy ? 'Saving review…' : submission.review_version ? 'Save revised grade' : 'Save grade and feedback'}</button></fieldset>{!submission.can_grade && <p>Your account can inspect this submission but cannot grade it.</p>}<div className="la-actions"><button className="ad-btn" disabled={busy} onClick={() => { if (!dirty || window.confirm('Reload and discard unsaved grading changes?')) setTick(v => v + 1) }}>Reload latest review</button>{dirty && <span>Unsaved review feedback</span>}</div><h2>Review history</h2>{submission.reviews.length ? submission.reviews.map(r => <section className="la-block" key={r.version}><h3>Revision {r.version}: {r.score}%</h3><p>{r.reviewer ?? 'Former reviewer'} · {new Date(r.created_at).toLocaleString()} · acceptance checks {r.acceptance_confirmed ? 'confirmed' : 'not confirmed'}</p><p className="la-review-text">{r.feedback}</p></section>) : <p>This assignment has not been graded yet.</p>}</> : !error && <p role="status">Loading submitted work…</p>}</div>
}
