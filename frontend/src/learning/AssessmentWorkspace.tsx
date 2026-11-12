import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { Lesson } from './types'

interface Paged<T> { count: number; next: string | null; previous: string | null; results: T[]; pending_current?: boolean }
interface Submission { id: string; title: string; concept_version: number; is_current_version: boolean; status: 'submitted' | 'reviewed'; score: number | null; passed: boolean; acceptance_confirmed: boolean; feedback: string; reviewer: string | null; review_version: number; response: string; repository_url: string; submitted_at: string; reviewed_at: string | null; assignment_snapshot: { title: string; assignment: Record<string, string> } }
interface Attempt { id: number; version: number; is_current_version: boolean; score: number; correct_count: number; question_count: number; created_at: string }

function failure(error: unknown) {
  const data = (error as { response?: { data?: unknown } }).response?.data
  return data ? JSON.stringify(data) : 'The request failed. Your draft is still here. Check your connection before retrying.'
}

export function AssessmentWorkspace({ lesson, refreshKey, onRefresh }: { lesson: Lesson; refreshKey: number; onRefresh: () => void }) {
  const [submissions, setSubmissions] = useState<Paged<Submission> | null>(null)
  const [attempts, setAttempts] = useState<Paged<Attempt> | null>(null)
  const [submissionPage, setSubmissionPage] = useState(1)
  const [attemptPage, setAttemptPage] = useState(1)
  const [tick, setTick] = useState(0)
  const [response, setResponse] = useState('')
  const [repository, setRepository] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const requestKey = useRef<string | null>(null)
  const [retryPending, setRetryPending] = useState(false)
  const submittedPayload = useRef<{ request_key: string; version: number; response: string; repository_url: string } | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    Promise.all([
      api.get<Paged<Submission>>(`/learning/concepts/${lesson.slug}/submissions/`, { params: { page: submissionPage } }),
      api.get<Paged<Attempt>>(`/learning/concepts/${lesson.slug}/quiz-attempts/`, { params: { page: attemptPage } }),
    ]).then(([s, a]) => { if (active) { setSubmissions(s.data); setAttempts(a.data) } }).catch(e => { if (active) setError(failure(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [lesson.slug, refreshKey, tick, submissionPage, attemptPage])

  useEffect(() => {
    if (!response.trim() && !repository.trim()) return
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [response, repository])

  async function submit() {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (!requestKey.current) requestKey.current = crypto.randomUUID()
      if (!submittedPayload.current) submittedPayload.current = { request_key: requestKey.current, version: lesson.version, response, repository_url: repository }
      await api.post(`/learning/concepts/${lesson.slug}/submissions/`, submittedPayload.current)
      setResponse(''); setRepository(''); setRetryPending(false); requestKey.current = null; submittedPayload.current = null
      setSubmissionPage(1); setTick(v => v + 1); onRefresh()
      setNotice('Assignment submitted for human review. No automatic grade has been awarded.')
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status
      // A lost response may mean the server saved the work. Keep the original request intact for an idempotent retry.
      const uncertain = !status || status >= 500
      setRetryPending(uncertain)
      if (!uncertain) { requestKey.current = null; submittedPayload.current = null }
      setError(failure(e))
    } finally { setBusy(false) }
  }

  const pendingCurrent = submissions?.pending_current ?? false
  return <section className="rw-assessments"><h2>Your assessed work</h2><p>Reading and quiz completion are separate from practical mastery. Mastery requires a reviewed assignment score of at least 80% and confirmed acceptance checks for this lesson version.</p>
    {lesson.content.assessment.assignment && <><h3>Submit the mini assignment</h3><p>Paste your implementation, test results and explanation. You may include an HTTPS repository link. Submissions are private to you and authorized reviewers. Code is stored as text and is not executed here. Do not include API keys or other secrets.</p><label htmlFor="assignment-response">Implementation and evidence</label><textarea id="assignment-response" className="rw-submission-text" rows={12} maxLength={50000} value={response} disabled={busy || retryPending} onChange={e => setResponse(e.target.value)} /><label htmlFor="assignment-repository">Repository URL (optional, HTTPS)</label><input id="assignment-repository" className="rw-submission-input" type="url" maxLength={500} placeholder="https://github.com/…" value={repository} disabled={busy || retryPending} onChange={e => setRepository(e.target.value)} />{retryPending && <p>The server response was interrupted. Retry the original submission to check whether it was saved; your text is locked until that retry resolves.</p>}<button type="button" disabled={busy || (!retryPending && (loading || !submissions || pendingCurrent || response.trim().length < 20))} onClick={() => void submit()}>{busy ? 'Submitting…' : retryPending ? 'Retry original submission' : 'Submit for review'}</button>{pendingCurrent && <p>A submission for this version is awaiting review. You can submit a new attempt after it is graded.</p>}</>}
    {error && <p role="alert" className="rw-notice">{error}</p>}{notice && <p role="status">{notice}</p>}<div className="rw-actions"><button type="button" disabled={loading || busy} onClick={() => { setTick(v => v + 1); onRefresh() }}>Refresh feedback and history</button>{loading && <span role="status">Loading assessment history…</span>}</div>
    <h3>Assignment submissions</h3>{submissions?.count === 0 && <p>No submissions yet.</p>}{submissions?.results.map(s => <details key={s.id}><summary>{s.status === 'submitted' ? 'Awaiting review' : `${s.score}% · ${s.passed ? 'Accepted' : 'Needs more work'}`} · version {s.concept_version}{!s.is_current_version && ' · earlier lesson version'}</summary><p>Submitted {new Date(s.submitted_at).toLocaleString()}</p>{s.status === 'reviewed' && <><p>Reviewer: {s.reviewer ?? 'Former reviewer'} · review revision {s.review_version}</p><p className="rw-feedback-text">{s.feedback}</p><p>Required acceptance checks: {s.acceptance_confirmed ? 'Confirmed by reviewer' : 'Not confirmed'}</p></>}<details><summary>Your submitted work</summary><pre className="rw-evidence">{s.response}</pre>{s.repository_url.startsWith('https://') && <a href={s.repository_url} target="_blank" rel="noopener noreferrer">Open submitted repository</a>}</details><details><summary>Assignment and rubric at submission time</summary>{Object.entries(s.assignment_snapshot.assignment).map(([key, text]) => <div key={key}><h4>{key.replaceAll('_', ' ')}</h4><p>{text}</p></div>)}</details></details>)}<nav aria-label="Assignment history pages" className="rw-actions"><button disabled={submissionPage === 1 || loading} onClick={() => setSubmissionPage(p => p - 1)}>Newer submissions</button><span>Page {submissionPage}</span><button disabled={!submissions?.next || loading} onClick={() => setSubmissionPage(p => p + 1)}>Older submissions</button></nav>
    <h3>Quiz attempt history</h3>{attempts?.count === 0 && <p>No recorded quiz attempts yet. Older aggregate scores may predate attempt tracking.</p>}<ul>{attempts?.results.map(a => <li key={a.id}>{a.score}% ({a.correct_count}/{a.question_count}) · version {a.version}{!a.is_current_version && ' · earlier lesson version'} · {new Date(a.created_at).toLocaleString()}</li>)}</ul><nav aria-label="Quiz history pages" className="rw-actions"><button disabled={attemptPage === 1 || loading} onClick={() => setAttemptPage(p => p - 1)}>Newer attempts</button><span>Page {attemptPage}</span><button disabled={!attempts?.next || loading} onClick={() => setAttemptPage(p => p + 1)}>Older attempts</button></nav>
  </section>
}
