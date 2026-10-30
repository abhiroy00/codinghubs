import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../api'

const LEVELS: { value: string; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

interface Question {
  id: number
  course_slug: string
  course_name: string
  level: string
  topic: string
  question: string
  answer: string
  explanation: string
  example: string
  coding_prompt: string
  coding_solution: string
  is_published: boolean
  created_at: string
  updated_at: string
}

interface Paged<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export function QuestionManager() {
  const [q, setQ] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [publishedFilter, setPublishedFilter] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<Question> | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Question | null>(null)
  const [creating, setCreating] = useState(false)
  const [busyIds, setBusyIds] = useState<Record<number, boolean>>({})
  const dq = useDebounced(q, 350)

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (dq) p.q = dq
    if (courseFilter) p.course_slug = courseFilter
    if (levelFilter) p.level = levelFilter
    if (publishedFilter !== '') p.is_published = publishedFilter
    return p
  }, [dq, courseFilter, levelFilter, publishedFilter])

  useEffect(() => setPage(1), [params])

  const load = useCallback(() => {
    adminApi
      .get<Paged<Question>>('/questions/', { params: { ...params, page } })
      .then((r) => {
        setData(r.data)
        setError('')
      })
      .catch(() => setError('Could not load questions.'))
  }, [params, page])
  useEffect(load, [load])

  const courses = useMemo(() => {
    const set = new Set<string>()
    data?.results.forEach((r) => set.add(r.course_slug + '|' + r.course_name))
    return [...set].map((s) => { const [slug, name] = s.split('|'); return { slug, name } })
  }, [data?.results])

  async function saveQuestion(qData: Partial<Question>, isNew: boolean) {
    setBusyIds({ ...busyIds, [isNew ? 0 : (qData.id ?? 0)]: true })
    try {
      if (isNew) {
        await adminApi.post('/questions/', qData)
      } else {
        await adminApi.patch(`/questions/${qData.id}/`, qData)
      }
      setEditing(null)
      setCreating(false)
      load()
    } catch {
      setError('Failed to save the question. Please try again.')
    } finally {
      setBusyIds({ ...busyIds, [isNew ? 0 : (qData.id ?? 0)]: false })
    }
  }

  async function togglePublish(q: Question) {
    setBusyIds({ ...busyIds, [q.id]: true })
    try {
      await adminApi.patch(`/questions/${q.id}/`, { is_published: !q.is_published })
      load()
    } catch {
      setError('Failed to update publish status.')
    } finally {
      setBusyIds({ ...busyIds, [q.id]: false })
    }
  }

  async function removeQuestion(q: Question) {
    if (!window.confirm(`Delete the question “${q.question.slice(0, 60)}…”? This cannot be undone.`)) return
    setBusyIds({ ...busyIds, [q.id]: true })
    try {
      await adminApi.delete(`/questions/${q.id}/`)
      load()
    } catch {
      setError('Failed to delete the question.')
    } finally {
      setBusyIds({ ...busyIds, [q.id]: false })
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.count / 25)) : 1

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Interview Questions</h1>
        {creating || editing ? null : (
          <>
            <button type="button" className="ad-btn ad-btn-primary" onClick={() => setCreating(true)}>
              + Add Question
            </button>
            <button type="button" className="ad-btn" onClick={() => setEditing(null) !== null && load()}>
              Refresh
            </button>
          </>
        )}
      </div>

      {creating && <QuestionForm onSave={(d) => saveQuestion(d, true)} onCancel={() => setCreating(false)} />}

      {editing && <QuestionForm question={editing} onSave={(d) => saveQuestion(d, false)} onCancel={() => setEditing(null)} />}

      {!creating && !editing && (
        <>
          {error && <p className="ad-error">{error}</p>}
          <div className="ad-filters">
            <input type="search" placeholder="Search question, topic, course…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search questions" />
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} aria-label="Course">
              <option value="">All courses</option>
              {courses.map((c) => (<option key={c.slug}>{c.name}</option>))}
            </select>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} aria-label="Level">
              <option value="">All levels</option>
              {LEVELS.map((l) => (<option key={l.value}>{l.label}</option>))}
            </select>
            <select value={publishedFilter} onChange={(e) => setPublishedFilter(e.target.value)} aria-label="Published">
              <option value="">All</option>
              <option value="true">Published</option>
              <option value="false">Unpublished</option>
            </select>
          </div>
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Level</th>
                  <th>Topic</th>
                  <th>Question</th>
                  <th>Published</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data?.results.map((q) => (
                  <tr key={q.id}>
                    <td className="wrap">{q.course_name}</td>
                    <td>
                      <span className={`ad-badge st-${q.level}`}>{q.level.charAt(0).toUpperCase() + q.level.slice(1)}</span>
                    </td>
                    <td className="wrap">{q.topic}</td>
                    <td className="wrap">{q.question}</td>
                    <td>
                      <button type="button" className={`ad-switch${q.is_published ? ' on' : ''}`} role="switch" aria-checked={q.is_published} onClick={() => togglePublish(q)} disabled={busyIds[q.id]}>
                        <i />
                      </button>
                    </td>
                    <td className="nowrap">{new Date(q.updated_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      {editing?.id === q.id ? null : (
                        <>
                          <button type="button" className="ad-link" onClick={() => setEditing(q)}>Edit</button>
                          {' | '}
                          <button type="button" className="ad-link ad-danger" onClick={() => removeQuestion(q)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {data && data.results.length === 0 && (
                  <tr>
                    <td colSpan={7} className="ad-muted">No questions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="ad-pager">
            <span>{data ? `${data.count} question${data.count === 1 ? '' : 's'}` : 'Loading…'}</span>
            <div>
              <button type="button" className="ad-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span>Page {page} of {pages}</span>
              <button type="button" className="ad-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function QuestionForm({ question, onSave, onCancel }: { question?: Question; onSave: (d: Partial<Question>) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Partial<Question>>({
    course_slug: question?.course_slug ?? '',
    course_name: question?.course_name ?? '',
    level: question?.level ?? 'basic',
    topic: question?.topic ?? '',
    question: question?.question ?? '',
    answer: question?.answer ?? '',
    explanation: question?.explanation ?? '',
    example: question?.example ?? '',
    coding_prompt: question?.coding_prompt ?? '',
    coding_solution: question?.coding_solution ?? '',
    is_published: question?.is_published ?? true,
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.course_slug || !form.topic || !form.question || !form.answer || !form.explanation) {
      setError('Course, topic, question, answer and explanation are required.')
      return
    }
    setBusy(true)
    try {
      await onSave(form as Partial<Question>)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ad-modal" role="dialog" aria-modal="true" aria-label={question ? 'Edit question' : 'Add question'} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="ad-modal-card">
        <h2>{question ? 'Edit Interview Question' : 'Add Interview Question'}</h2>
        <p className="ad-muted">{question ? `Course: ${question.course_name} · Level: ${question.level}` : 'Add a new interview question for a course.'}</p>
        {error && <p className="ad-error" role="alert">{error}</p>}
        <form onSubmit={submit} noValidate>
          <div className="ad-grid2">
            <Field label="Course slug" htmlFor="qs-slug" required>
              <input id="qs-slug" className="ad-input" value={form.course_slug ?? ''} onChange={(e) => setForm({ ...form, course_slug: e.target.value })} placeholder="e.g. generative-ai" />
              <p className="ad-hint">Use the course URL slug (e.g. generative-ai, python-full-stack).</p>
            </Field>
            <Field label="Course name" htmlFor="qs-name" required>
              <input id="qs-name" className="ad-input" value={form.course_name ?? ''} onChange={(e) => setForm({ ...form, course_name: e.target.value })} placeholder="e.g. Generative AI" />
            </Field>
          </div>
          <div className="ad-grid2">
            <Field label="Level" htmlFor="qs-level" required>
              <select id="qs-level" className="ad-input" value={form.level ?? 'basic'} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                {LEVELS.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
              </select>
            </Field>
            <Field label="Topic" htmlFor="qs-topic" required>
              <input id="qs-topic" className="ad-input" value={form.topic ?? ''} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Prompt engineering" />
            </Field>
          </div>
          <Field label="Question" htmlFor="qs-question" required textarea rows={3}>
            <textarea id="qs-question" className="ad-input" value={form.question ?? ''} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </Field>
          <Field label="Answer" htmlFor="qs-answer" required textarea rows={4}>
            <textarea id="qs-answer" className="ad-input" value={form.answer ?? ''} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
          </Field>
          <Field label="Explanation" htmlFor="qs-explanation" required textarea rows={4}>
            <textarea id="qs-explanation" className="ad-input" value={form.explanation ?? ''} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
          </Field>
          <Field label="Example / use case (optional)" htmlFor="qs-example" textarea rows={3}>
            <textarea id="qs-example" className="ad-input" value={form.example ?? ''} onChange={(e) => setForm({ ...form, example: e.target.value })} />
          </Field>
          <Field label="Coding prompt (optional)" htmlFor="qs-prompt" textarea rows={3}>
            <textarea id="qs-prompt" className="ad-input" value={form.coding_prompt ?? ''} onChange={(e) => setForm({ ...form, coding_prompt: e.target.value })} />
          </Field>
          <Field label="Coding solution (optional)" htmlFor="qs-solution" textarea rows={5}>
            <textarea id="qs-solution" className="ad-input" value={form.coding_solution ?? ''} onChange={(e) => setForm({ ...form, coding_solution: e.target.value })} />
          </Field>
          <Field label="Publish">
            <label className="ad-check ad-check-box" htmlFor="qs-published">
              <input id="qs-published" type="checkbox" checked={form.is_published ?? true} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publish immediately
            </label>
          </Field>
          <div className="ad-modal-actions">
            <button type="button" className="ad-btn" onClick={onCancel}>Cancel</button>
            <button type="submit" className="ad-btn ad-btn-primary" disabled={busy}>{busy ? 'Saving…' : question ? 'Save changes' : 'Create question'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ children, label, htmlFor, required, hint, textarea, rows }: { children: React.ReactNode; label: string; htmlFor: string; required?: boolean; hint?: string; textarea?: boolean; rows?: number }) {
  return (
    <div className="ad-field">
      <label htmlFor={htmlFor} className="ad-label">{label}{required ? ' *' : ''}</label>
      {textarea ? (
        <textarea id={htmlFor} className="ad-input" rows={rows} />
      ) : (
        children
      )}
      {hint && <p className="ad-hint">{hint}</p>}
    </div>
  )
}

function useDebounced(value: string, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
