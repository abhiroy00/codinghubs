import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { adminApi, type Paged } from '../api'

interface ProjectQuestion {
  id: number
  project: number
  project_title: string
  project_slug: string
  name: string
  email: string
  question: string
  answer: string
  created_at: string
  answered_at: string | null
}

export function ProjectQuestionsPage() {
  const [data, setData] = useState<Paged<ProjectQuestion> | null>(null)
  const [status, setStatus] = useState('unanswered')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const response = await adminApi.get<Paged<ProjectQuestion>>('/project-questions/', { params: { status, page } })
      setData(response.data)
    } catch {
      setError('Could not load project questions. Please check your access and try again.')
    }
  }, [page, status])

  useEffect(() => {
    void load()
  }, [load])

  async function saveAnswer(event: FormEvent<HTMLFormElement>, question: ProjectQuestion) {
    event.preventDefault()
    setBusyId(question.id)
    setError('')
    setNotice('')
    try {
      await adminApi.patch(`/project-questions/${question.id}/`, { answer: question.answer })
      setNotice('Answer saved. The question and answer are now public on the project page.')
      await load()
    } catch {
      setError('Could not save this answer. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  function updateAnswer(id: number, answer: string) {
    setData((current) => current && ({
      ...current,
      results: current.results.map((question) => question.id === id ? { ...question, answer } : question),
    }))
  }

  return (
    <div>
      <header className="ad-head"><h1 className="ad-h1">Project Questions</h1></header>
      <p className="ad-muted">Reply to learner questions. Saving an answer makes the question and reply visible on the project page.</p>
      <div className="ad-panel">
        <label className="ad-field">
          <span>Show</span>
          <select className="ad-input" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
            <option value="unanswered">Unanswered questions</option>
            <option value="answered">Answered questions</option>
            <option value="">All questions</option>
          </select>
        </label>
      </div>
      {error && <p className="ad-error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p role="status">Loading project questions…</p>}
      {data && data.results.length === 0 && <div className="ad-panel"><p>No questions found in this view.</p></div>}
      {data?.results.map((question) => (
        <article className="ad-panel" key={question.id}>
          <h2>{question.project_title}</h2>
          <p><a href={`/projects/${question.project_slug}`} target="_blank" rel="noreferrer">View project ↗</a></p>
          <p><strong>From:</strong> {question.name} · <a href={`mailto:${question.email}`}>{question.email}</a></p>
          <p><strong>Received:</strong> {new Date(question.created_at).toLocaleString()}</p>
          <blockquote>{question.question}</blockquote>
          <form onSubmit={(event) => void saveAnswer(event, question)}>
            <label className="ad-field">
              <span>Answer (plain text; visible to everyone after saving)</span>
              <textarea className="ad-input" rows={5} maxLength={5000} required value={question.answer} onChange={(event) => updateAnswer(question.id, event.target.value)} />
            </label>
            <button className="ad-btn ad-btn-primary" type="submit" disabled={busyId === question.id}>
              {busyId === question.id ? 'Saving…' : 'Save answer'}
            </button>
            {question.answered_at && <span className="ad-muted"> Last answered {new Date(question.answered_at).toLocaleString()}</span>}
          </form>
        </article>
      ))}
      {data && data.count > 20 && (
        <div className="ad-pager">
          <span>{data.count} questions</span>
          <div>
            <button className="ad-btn" disabled={!data.previous} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <span>Page {page}</span>
            <button className="ad-btn" disabled={!data.next} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
