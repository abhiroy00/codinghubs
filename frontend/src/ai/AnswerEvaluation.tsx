import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { AiPage, Busy, Callout, DimensionBars, ErrorBox, Points, ScoreRing, errorMessage, formatDate } from './ai-shared'

type Evaluation = {
  id: number; question: string; answer: string; score: number; scores: Record<string, number>
  strengths: string[]; missing_concepts: string[]; mistakes: string[]; improvement_suggestions: string[]
  improved_answer: string; ideal_answer: string; practical_example: string; used_reference?: boolean
}
type HistoryRow = { id: number; question: string; score: number; created_at: string }

export function EvaluationResult({ result }: { result: Evaluation }) {
  return (
    <div className="ai-result">
      <div className="ai-summary">
        <ScoreRing value={result.score} label="Overall score" unit="" />
        <div>
          <h3>Your score: {result.score} / 10</h3>
          <p className="ai-note">Calculated from the six scores below: technical accuracy counts most and communication least, so small grammar mistakes do not lower a correct answer.</p>
        </div>
      </div>
      <DimensionBars scores={result.scores} />
      <div className="ai-columns">
        <Points title="What you did well" items={result.strengths} kind="good" />
        <Points title="Missing concepts" items={result.missing_concepts} kind="warn" />
        <Points title="Mistakes" items={result.mistakes} kind="bad" />
        <Points title="How to improve" items={result.improvement_suggestions} />
      </div>
      <Callout title="Your answer, improved">{result.improved_answer}</Callout>
      <Callout title="Ideal interview answer">{result.ideal_answer}</Callout>
      <Callout title="Practical example">{result.practical_example}</Callout>
    </div>
  )
}

export function AnswerEvaluation() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [level, setLevel] = useState('intermediate')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Evaluation | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])

  const loadHistory = () => api.get<HistoryRow[]>('/ai/evaluate-answer/history/').then(({ data }) => setHistory(data)).catch(() => undefined)
  useEffect(() => { void loadHistory() }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError(''); setResult(null)
    try {
      const { data } = await api.post<Evaluation>('/ai/evaluate-answer/', { question, answer, level })
      setResult(data)
      void loadHistory()
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  async function open(id: number) {
    setError('')
    try { setResult((await api.get<Evaluation>(`/ai/evaluate-answer/${id}/`)).data) } catch (e) { setError(errorMessage(e)) }
  }

  const ready = question.trim().length >= 5 && answer.trim().length >= 10
  return (
    <AiPage kicker="AI ANSWER EVALUATION" title="Get your interview answer evaluated" intro="Type an interview question and your own answer. You get a score, what you missed, and a model answer to learn from.">
      <section className="learn-section">
        <form className="ai-form" onSubmit={submit}>
          <label className="ai-field"><span>Interview question</span>
            <input value={question} maxLength={1000} onChange={(e) => setQuestion(e.target.value)} placeholder="For example: What is the difference between a list and a tuple in Python?" required />
          </label>
          <label className="ai-field"><span>Your answer</span>
            <textarea value={answer} maxLength={5000} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer the way you would in a real interview." required />
            <small>{answer.trim().length} / 5000 characters. At least 10 are needed.</small>
          </label>
          <label className="ai-field"><span>Your level</span>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="beginner">Beginner / fresher</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced / experienced</option>
            </select>
          </label>
          <div className="learn-card-actions"><button className="learn-button" disabled={busy || !ready}>{busy ? 'Evaluating…' : 'Evaluate my answer'}</button></div>
        </form>
        {busy && <Busy text="Evaluating your answer. This usually takes 5 to 30 seconds." />}
        <ErrorBox message={error} />
      </section>
      {result && <section className="learn-section"><EvaluationResult result={result} /></section>}
      <section className="learn-section">
        <h2>Your recent evaluations</h2>
        {history.length === 0 ? <p className="ai-note">Nothing yet. Your evaluated answers will appear here.</p> : (
          <ul className="ai-list">
            {history.map((row) => (
              <li key={row.id}><button type="button" className="link" onClick={() => void open(row.id)}>{row.question}</button><span className="ai-note">{row.score} / 10 · {formatDate(row.created_at)}</span></li>
            ))}
          </ul>
        )}
      </section>
    </AiPage>
  )
}
