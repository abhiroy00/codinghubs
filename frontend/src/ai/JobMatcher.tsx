import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { AiPage, Busy, Callout, ConsentBox, ErrorBox, Points, ScoreRing, errorMessage, formatDate, useResumes } from './ai-shared'

type Skill = { name: string; importance: string; status: 'matched' | 'partial' | 'missing'; evidence: string; note: string }
type Match = {
  id: number; job_title: string; match_percentage: number; summary: string; skills: Skill[]; matched_skills: string[]; partially_matched_skills: string[]
  missing_skills: string[]; skill_gaps: string[]; score_explanation: string; points: { earned: number; possible: number }
  experience: { required_years?: number; candidate_years?: number; assessment: string; explanation?: string }
  project_relevance?: { project: string; relevance: string }[]; recommended_topics: string[]; recommended_projects: string[]; interview_questions: string[]
  preparation_roadmap: { timeframe?: string; focus?: string; actions: string[] }[]; unverified_items: { requirements_removed: number; claims_downgraded_to_missing: number }
}
type HistoryRow = { id: number; job_title: string; match_percentage: number; created_at: string }

const ASSESSMENT: Record<string, string> = { meets: 'Meets the requirement', partial: 'Partly meets the requirement', not_met: 'Does not meet it yet', unclear: 'Cannot tell from the resume' }
const MIN_JD = 80

export function JobMatcher() {
  const { resumes, loading, reload } = useResumes()
  const [resumeId, setResumeId] = useState<number | null>(null)
  const [jobTitle, setJobTitle] = useState('')
  const [description, setDescription] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Match | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])

  const loadHistory = () => api.get<HistoryRow[]>('/ai/job-matcher/history/').then(({ data }) => setHistory(data)).catch(() => undefined)
  useEffect(() => { void loadHistory() }, [])
  useEffect(() => { if (resumeId === null && resumes.length > 0) setResumeId(resumes[0].id) }, [resumes, resumeId])
  useEffect(() => { void reload() }, [reload])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (resumeId === null) return
    setBusy(true); setError(''); setResult(null)
    try {
      const { data } = await api.post<Match>('/ai/job-matcher/analyze/', { resume_id: resumeId, job_description: description, job_title: jobTitle, consent })
      setResult(data)
      void loadHistory()
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  async function open(id: number) {
    setError('')
    try { setResult((await api.get<Match>(`/ai/job-matcher/history/${id}/`)).data) } catch (e) { setError(errorMessage(e)) }
  }

  const ready = resumeId !== null && description.trim().length >= MIN_JD && consent
  return (
    <AiPage kicker="AI JOB MATCHER" title="See how well you match a job" intro="Choose your resume and paste a job description. You see which skills you have, which are missing, and a plan to close the gaps.">
      <section className="learn-section">
        {!loading && resumes.length === 0 ? (
          <div className="ai-empty"><h2>Upload a resume first</h2><p>The matcher compares a job description with your resume.</p><Link className="learn-button" to="/ai/resume-analyzer">Go to the Resume Analyzer</Link></div>
        ) : (
          <form className="ai-form" onSubmit={submit}>
            <div className="ai-row">
              <label className="ai-field"><span>Resume</span>
                <select value={resumeId ?? ''} onChange={(e) => setResumeId(Number(e.target.value))}>{resumes.map((r) => <option key={r.id} value={r.id}>{r.original_name}</option>)}</select></label>
              <label className="ai-field"><span>Job title (optional)</span><input value={jobTitle} maxLength={100} onChange={(e) => setJobTitle(e.target.value)} placeholder="Generative AI Developer" /></label>
            </div>
            <label className="ai-field"><span>Job description</span>
              <textarea value={description} maxLength={8000} onChange={(e) => setDescription(e.target.value)} placeholder="Paste the full job description here." required />
              <small>{description.trim().length} / 8000 characters. At least {MIN_JD} are needed.</small></label>
            <ConsentBox checked={consent} onChange={setConsent} />
            <div className="learn-card-actions"><button className="learn-button" disabled={busy || !ready}>{busy ? 'Comparing…' : 'Match my resume'}</button></div>
          </form>
        )}
        {busy && <Busy text="Comparing your resume with the job. This can take up to a minute." />}
        <ErrorBox message={error} />
      </section>
      {result && (
        <section className="learn-section ai-result">
          <div className="ai-summary">
            <ScoreRing value={result.match_percentage} max={100} unit="%" label="Skill match" />
            <div>
              <h2 style={{ marginTop: 0 }}>{result.job_title || 'Your match'}</h2>
              <p>{result.summary}</p>
              <details><summary>How is this percentage calculated?</summary><p className="ai-note">{result.score_explanation} You earned {result.points.earned} of {result.points.possible} points.</p></details>
            </div>
          </div>
          <div className="ai-columns">
            <Points title="Skills you have" items={result.matched_skills} kind="good" />
            <Points title="Partly matched" items={result.partially_matched_skills} kind="warn" />
            <Points title="Missing" items={result.missing_skills} kind="bad" />
            <Points title="Most important gaps" items={result.skill_gaps} />
          </div>
          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead><tr><th>Skill</th><th>Needed</th><th>Result</th><th>Where your resume shows it</th></tr></thead>
              <tbody>{result.skills.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.importance === 'required' ? 'Required' : 'Nice to have'}</td><td><span className={`ai-badge ${s.status}`}>{s.status === 'matched' ? 'Matched' : s.status === 'partial' ? 'Partial' : 'Missing'}</span></td><td>{s.evidence ? `“${s.evidence}”` : s.note || '—'}</td></tr>)}</tbody>
            </table>
          </div>
          <Callout title={`Experience: ${ASSESSMENT[result.experience.assessment] ?? result.experience.assessment}`}>
            {[result.experience.required_years !== undefined && `The job asks for about ${result.experience.required_years} year(s).`, result.experience.candidate_years !== undefined && `Your resume shows about ${result.experience.candidate_years} year(s).`, result.experience.explanation].filter(Boolean).join(' ')}
          </Callout>
          {result.project_relevance && result.project_relevance.length > 0 && <div className="ai-points"><h4>Your relevant projects</h4><ul className="lesson-list">{result.project_relevance.map((p, i) => <li key={i}><b>{p.project}</b>: {p.relevance}</li>)}</ul></div>}
          <div className="ai-columns">
            <Points title="Topics to learn" items={result.recommended_topics} kind="warn" />
            <Points title="Project ideas" items={result.recommended_projects} />
            <Points title="Questions you may be asked" items={result.interview_questions} />
          </div>
          <div className="ai-points"><h4>Preparation roadmap</h4>
            <ol className="ai-steps">{result.preparation_roadmap.map((step, i) => <li key={i}><b>{[step.timeframe, step.focus].filter(Boolean).join(': ')}</b><ul className="lesson-list">{step.actions.map((action, n) => <li key={n}>{action}</li>)}</ul></li>)}</ol>
          </div>
          {(result.unverified_items.requirements_removed > 0 || result.unverified_items.claims_downgraded_to_missing > 0) && (
            <p className="ai-note">For accuracy, {result.unverified_items.requirements_removed} requirement(s) not found in the job description were removed, and {result.unverified_items.claims_downgraded_to_missing} skill(s) the AI said you had but your resume does not show were counted as missing.</p>
          )}
          <p className="ai-note">The percentage estimates skill overlap only. It does not predict whether you will be shortlisted or hired.</p>
        </section>
      )}
      <section className="learn-section">
        <h2>Your earlier matches</h2>
        {history.length === 0 ? <p className="ai-note">Nothing yet.</p> : (
          <ul className="ai-list">{history.map((row) => <li key={row.id}><button type="button" className="link" onClick={() => void open(row.id)}>{row.job_title || 'Untitled job'}</button><span className="ai-note">{row.match_percentage}% · {formatDate(row.created_at)}</span></li>)}</ul>
        )}
      </section>
    </AiPage>
  )
}
