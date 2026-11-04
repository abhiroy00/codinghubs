import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { EvaluationResult } from './AnswerEvaluation'
import { AiPage, Busy, Callout, DimensionBars, ErrorBox, Points, ScoreRing, errorMessage, formatDate } from './ai-shared'

type Interview = {
  id: number; job_role: string; technology: string; interview_type: string; difficulty: string; current_difficulty: string
  total_questions: number; answered: number; status: string; overall_score: number | null; created_at: string
}
type Question = { number: number; text: string; kind: string; category: string }
type Feedback = { skipped: boolean; evaluation: Parameters<typeof EvaluationResult>[0]['result'] | null; next_action: 'next_question' | 'end'; remaining_questions: number; current_difficulty: string }
type Report = {
  overall_score: number; verdict: string; questions_asked: number; answered: number; skipped: number; dimension_averages: Record<string, number>
  questions: { number: number; question: string; score: number | null; skipped: boolean; kind: string }[]
  summary: string; strengths: string[]; weaknesses: string[]; topics_to_revise: string[]; next_steps: string[]
  communication_feedback: string; readiness_note: string; score_method: string
}

const label = (value: string) => value.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())

function ReportView({ report, onNew }: { report: Report; onNew: () => void }) {
  return (
    <section className="learn-section ai-result">
      <h2>Your interview report</h2>
      <div className="ai-summary">
        <ScoreRing value={report.overall_score} label="Overall score" />
        <div>
          <h3>{report.verdict}</h3>
          <p>{report.answered} answered, {report.skipped} skipped, {report.questions_asked} questions in total.</p>
          <p className="ai-note">{report.score_method}</p>
        </div>
      </div>
      {Object.keys(report.dimension_averages).length > 0 && <><h3>Average by skill</h3><DimensionBars scores={report.dimension_averages} /></>}
      <p>{report.summary}</p>
      <div className="ai-columns">
        <Points title="Strengths" items={report.strengths} kind="good" />
        <Points title="Weaknesses" items={report.weaknesses} kind="bad" />
        <Points title="Topics to revise" items={report.topics_to_revise} kind="warn" />
        <Points title="Next steps" items={report.next_steps} />
      </div>
      {report.communication_feedback && <Callout title="Communication">{report.communication_feedback}</Callout>}
      {report.readiness_note && <Callout title="How ready you look">{report.readiness_note}</Callout>}
      <div className="ai-table-wrap">
        <table className="ai-table">
          <thead><tr><th>#</th><th>Question</th><th>Score</th></tr></thead>
          <tbody>{report.questions.map((q) => <tr key={q.number}><td>{q.number}</td><td>{q.question}{q.kind === 'follow_up' && <> <span className="ai-badge">Follow-up</span></>}</td><td>{q.skipped ? 'Skipped' : `${q.score} / 10`}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="ai-note">This report is an AI estimate to help you practise. It is not a prediction of the result of a real interview.</p>
      <div className="learn-card-actions"><button className="learn-button" onClick={onNew}>Start a new interview</button></div>
    </section>
  )
}

export function MockInterview() {
  const [interview, setInterview] = useState<Interview | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState<Interview[]>([])
  const [form, setForm] = useState({ job_role: '', technology: '', experience_level: 'fresher', difficulty: 'intermediate', interview_type: 'technical', number_of_questions: 5 })

  const loadHistory = useCallback(() => api.get<Interview[]>('/ai/mock-interview/history/').then(({ data }) => setHistory(data)).catch(() => undefined), [])
  useEffect(() => { void loadHistory() }, [loadHistory])

  async function run<T>(what: string, work: () => Promise<T>): Promise<T | undefined> {
    setBusy(what); setError('')
    try { return await work() } catch (e) { setError(errorMessage(e)); return undefined } finally { setBusy('') }
  }

  const reset = () => { setInterview(null); setQuestion(null); setFeedback(null); setReport(null); setAnswer(''); setError(''); void loadHistory() }

  async function start(event: FormEvent) {
    event.preventDefault()
    const data = await run('Preparing your first question…', async () => (await api.post<{ interview: Interview; question: Question }>('/ai/mock-interview/start/', form)).data)
    if (data) { setInterview(data.interview); setQuestion(data.question); setFeedback(null); setReport(null); setAnswer('') }
  }

  async function submit(skip = false) {
    if (!interview) return
    const data = await run(skip ? 'Skipping…' : 'Evaluating your answer. This can take up to 30 seconds.', async () =>
      (await api.post<Feedback>('/ai/mock-interview/submit-answer/', { interview_id: interview.id, answer, skip })).data)
    if (data) { setFeedback(data); setInterview({ ...interview, answered: interview.answered + 1, current_difficulty: data.current_difficulty }) }
  }

  async function next(id = interview?.id) {
    if (!id) return
    const data = await run('Getting your next question…', async () => (await api.post<{ interview: Interview; question: Question }>('/ai/mock-interview/next-question/', { interview_id: id })).data)
    if (data) { setInterview(data.interview); setQuestion(data.question); setFeedback(null); setAnswer('') }
  }

  async function finish(id = interview?.id) {
    if (!id) return
    const data = await run('Writing your report. This can take up to 30 seconds.', async () => (await api.post<{ report: Report }>('/ai/mock-interview/end/', { interview_id: id })).data)
    if (data) { setReport(data.report); setQuestion(null); setFeedback(null) }
  }

  async function viewReport(id: number) {
    const data = await run('Loading…', async () => (await api.get<{ interview: Interview; report: Report }>(`/ai/mock-interview/history/${id}/`)).data)
    if (data?.report) { setInterview(data.interview); setReport(data.report); setQuestion(null); setFeedback(null) }
  }

  const progress = interview ? Math.round((interview.answered / interview.total_questions) * 100) : 0
  const active = interview && question && !report
  return (
    <AiPage kicker="AI MOCK INTERVIEW" title="Practise a real interview" intro="The AI interviewer asks one question at a time, follows up on your answers and writes a report at the end. Answer in your own words, as you would in a real interview.">
      {report ? <ReportView report={report} onNew={reset} /> : active ? (
        <section className="learn-section">
          <div className="ai-meta">
            <span className="ai-badge">{interview.job_role} · {interview.technology}</span>
            <span className="ai-badge">Level now: {label(interview.current_difficulty)}</span>
            <span className="ai-note">{interview.answered} of {interview.total_questions} questions answered</span>
          </div>
          <div className="ai-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress}%` }} /></div>
          <div className="ai-question">
            <div className="ai-meta"><b>Question {question.number}</b><span className="ai-badge">{question.category === 'hr' ? 'HR' : 'Technical'}</span>{question.kind === 'follow_up' && <span className="ai-badge">Follow-up</span>}</div>
            <p>{question.text}</p>
          </div>
          {!feedback ? (
            <form className="ai-form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
              <label className="ai-field"><span>Your answer</span>
                <textarea value={answer} maxLength={5000} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer here…" />
                <small>{answer.trim().length} / 5000 characters. At least 10 are needed.</small>
              </label>
              <div className="learn-card-actions">
                <button className="learn-button" disabled={!!busy || answer.trim().length < 10}>Submit answer</button>
                <button type="button" className="learn-button learn-button-quiet" disabled={!!busy} onClick={() => void submit(true)}>Skip question</button>
                <button type="button" className="learn-button learn-button-quiet" disabled={!!busy} onClick={() => void finish()}>End interview and get report</button>
              </div>
            </form>
          ) : (
            <div className="ai-result">
              {feedback.skipped || !feedback.evaluation ? <p className="ai-note">You skipped this question. It counts as 0 in your report.</p> : <EvaluationResult result={feedback.evaluation} />}
              <div className="learn-card-actions">
                {feedback.next_action === 'next_question'
                  ? <button className="learn-button" disabled={!!busy} onClick={() => void next()}>Next question</button>
                  : <button className="learn-button" disabled={!!busy} onClick={() => void finish()}>Finish and get my report</button>}
                {feedback.next_action === 'next_question' && <button className="learn-button learn-button-quiet" disabled={!!busy} onClick={() => void finish()}>End interview now</button>}
              </div>
            </div>
          )}
          {busy && <Busy text={busy} />}
          <ErrorBox message={error} />
        </section>
      ) : (
        <>
          <section className="learn-section">
            <h2>Start an interview</h2>
            <form className="ai-form" onSubmit={start}>
              <div className="ai-row">
                <label className="ai-field"><span>Job role</span><input value={form.job_role} minLength={2} maxLength={80} required onChange={(e) => setForm({ ...form, job_role: e.target.value })} placeholder="Backend Developer" /></label>
                <label className="ai-field"><span>Technology</span><input value={form.technology} minLength={2} maxLength={80} required onChange={(e) => setForm({ ...form, technology: e.target.value })} placeholder="Python and Django" /></label>
              </div>
              <div className="ai-row">
                <label className="ai-field"><span>Experience</span>
                  <select value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })}>
                    <option value="fresher">Fresher (0 to 1 years)</option><option value="junior">Junior (1 to 3 years)</option><option value="mid">Mid-level (3 to 5 years)</option><option value="senior">Senior (5+ years)</option>
                  </select></label>
                <label className="ai-field"><span>Difficulty</span>
                  <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                    <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
                  </select></label>
                <label className="ai-field"><span>Interview type</span>
                  <select value={form.interview_type} onChange={(e) => setForm({ ...form, interview_type: e.target.value })}>
                    <option value="technical">Technical</option><option value="hr">HR</option><option value="mixed">Mixed</option>
                  </select></label>
                <label className="ai-field"><span>Number of questions</span>
                  <input type="number" min={3} max={15} value={form.number_of_questions} onChange={(e) => setForm({ ...form, number_of_questions: Math.min(15, Math.max(3, Number(e.target.value) || 5)) })} />
                  <small>3 to 15, including follow-ups.</small></label>
              </div>
              <div className="learn-card-actions"><button className="learn-button" disabled={!!busy}>Start interview</button></div>
            </form>
            {busy && <Busy text={busy} />}
            <ErrorBox message={error} />
          </section>
          <section className="learn-section">
            <h2>Your interviews</h2>
            {history.length === 0 ? <p className="ai-note">Nothing yet. Your interviews and reports will appear here.</p> : (
              <ul className="ai-list">
                {history.map((item) => (
                  <li key={item.id}>
                    <span><b>{item.job_role}</b> · {item.technology} · {formatDate(item.created_at)}</span>
                    {item.status === 'completed'
                      ? <button type="button" className="link" onClick={() => void viewReport(item.id)}>View report ({item.overall_score} / 10)</button>
                      : <span className="ai-meta">
                        <button type="button" className="link" onClick={() => void next(item.id)}>Continue ({item.answered} / {item.total_questions} answered)</button>
                        <button type="button" className="link" onClick={() => void finish(item.id)}>End and get report</button>
                      </span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AiPage>
  )
}
