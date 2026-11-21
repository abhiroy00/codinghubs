import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi } from './api'

/** Create or edit a course whose public page is built from these fields (backend apps/courses/pages.py). */
type Module = { title: string; description: string; topics: string[] }
type Project = { name: string; description: string; skills: string[] }
type Faq = { question: string; answer: string }
interface CourseForm {
  id?: number
  name: string
  slug: string
  category?: number
  category_name: string
  level: string
  duration_display: string
  is_active: boolean
  summary: string
  introduction: string
  tools: string[]
  skills: string[]
  careers: string[]
  modules: Module[]
  projects: Project[]
  faqs: Faq[]
  seo_title: string
  meta_description: string
  is_custom?: boolean
}

const BLANK: CourseForm = {
  name: '', slug: '', category_name: '', level: 'Beginner', duration_display: '', is_active: true, summary: '', introduction: '',
  tools: [], skills: [], careers: [], modules: [{ title: '', description: '', topics: [] }], projects: [], faqs: [], seo_title: '', meta_description: '',
}
const SITE = 'https://codinghubs.in'
const slugify = (v: string) => v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
const lines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean)

function Field({ label, hint, children, error }: { label: string; hint?: string; children: ReactNode; error?: string }) {
  return <label className="ad-ce-field"><span>{label}</span>{children}{hint && <small className="ad-muted">{hint}</small>}{error && <small className="ad-error">{error}</small>}</label>
}

export function CourseEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<CourseForm>(BLANK)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [slugTouched, setSlugTouched] = useState(!!id)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(!!id)

  useEffect(() => {
    adminApi.get<{ id: number; name: string }[]>('/course-categories/').then((r) => setCategories(r.data)).catch(() => undefined)
    if (id) adminApi.get<CourseForm>(`/courses/${id}/`).then((r) => setForm({ ...BLANK, ...r.data, category_name: '' })).catch(() => setNotice('Could not load this course.')).finally(() => setLoading(false))
  }, [id])

  const set = <K extends keyof CourseForm>(key: K, value: CourseForm[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setItem = <K extends 'modules' | 'projects' | 'faqs'>(key: K, i: number, patch: Partial<CourseForm[K][number]>) =>
    setForm((f) => ({ ...f, [key]: (f[key] as object[]).map((row, n) => (n === i ? { ...row, ...patch } : row)) }))
  const removeItem = (key: 'modules' | 'projects' | 'faqs', i: number) => setForm((f) => ({ ...f, [key]: (f[key] as object[]).filter((_, n) => n !== i) }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setNotice('')
    const body: Record<string, unknown> = { ...form }
    if (!form.category) delete body.category
    try {
      const r = id ? await adminApi.patch<CourseForm>(`/courses/${id}/`, body) : await adminApi.post<CourseForm>('/courses/', body)
      setNotice(id ? 'Course saved.' : 'Course created and published.')
      if (!id) navigate(`/courses/${r.data.id}/edit`, { replace: true })
      else setForm({ ...BLANK, ...r.data, category_name: '' })
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string[] | string> } })?.response?.data ?? {}
      setErrors(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : String(v)])))
      setNotice('Please fix the highlighted fields.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p role="status">Loading course…</p>
  if (id && form.is_custom === false) {
    return <><h1 className="ad-h1">{form.name}</h1><p>This catalogue course keeps its content in the website code. You can show or hide it from the <Link to="/courses">Courses</Link> list.</p></>
  }
  const liveUrl = form.slug ? `${SITE}/courses/${form.slug}/` : ''
  return (
    <form className="ad-ce" onSubmit={save} noValidate>
      <div className="ad-head">
        <h1 className="ad-h1">{id ? `Edit course: ${form.name}` : 'Add a course'}</h1>
        <div className="ad-head-actions">
          <Link className="ad-btn" to="/courses">← All courses</Link>
          {id && form.is_active && <a className="ad-btn" href={liveUrl} target="_blank" rel="noopener noreferrer">View live page</a>}
          <button type="submit" className="ad-btn ad-btn-primary" disabled={busy}>{busy ? 'Saving…' : id ? 'Save course' : 'Create course'}</button>
        </div>
      </div>
      {notice && <div className={`ad-notice ${Object.keys(errors).length ? 'error' : 'ok'}`} role="status">{notice}</div>}
      <p className="ad-muted">Only add facts you can confirm. Fees are not shown on the page; learners ask the team about fees and batches.</p>

      <section className="ad-ce-card">
        <h2>Basics</h2>
        <div className="ad-ce-grid">
          <Field label="Course name" error={errors.name}><input className="ad-input" required maxLength={120} value={form.name} onChange={(e) => { set('name', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)) }} /></Field>
          <Field label="Page URL" hint={liveUrl || 'codinghubs.in/courses/your-course/'} error={errors.slug}><input className="ad-input" required maxLength={50} value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)) }} /></Field>
          <Field label="Category" error={errors.category}>
            <select className="ad-input" value={form.category ?? ''} onChange={(e) => set('category', e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">New category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {!form.category && <Field label="New category name" hint="For example: Automation & Testing"><input className="ad-input" maxLength={80} value={form.category_name} onChange={(e) => set('category_name', e.target.value)} /></Field>}
          <Field label="Level" error={errors.level}>
            <select className="ad-input" value={form.level} onChange={(e) => set('level', e.target.value)}>
              <option value="">Not specified</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </select>
          </Field>
          <Field label="Duration (optional)" hint="Only if confirmed, e.g. 3 months"><input className="ad-input" maxLength={40} value={form.duration_display} onChange={(e) => set('duration_display', e.target.value)} /></Field>
        </div>
        <label className="ad-check"><input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Visible on the website</label>
        <Field label="Summary" hint="One or two sentences shown on course cards and at the top of the page." error={errors.summary}><textarea className="ad-input" rows={2} maxLength={300} value={form.summary} onChange={(e) => set('summary', e.target.value)} /></Field>
        <Field label="Introduction" hint="Each line becomes a paragraph." error={errors.introduction}><textarea className="ad-input" rows={4} value={form.introduction} onChange={(e) => set('introduction', e.target.value)} /></Field>
      </section>

      <section className="ad-ce-card">
        <h2>Skills, tools and careers</h2>
        <div className="ad-ce-grid ad-ce-grid-3">
          {([['skills', 'What you will learn'], ['tools', 'Tools and technologies'], ['careers', 'Career directions']] as const).map(([key, label]) => (
            <Field key={key} label={label} hint="One per line" error={errors[key]}><textarea className="ad-input" rows={6} value={form[key].join('\n')} onChange={(e) => set(key, lines(e.target.value))} /></Field>
          ))}
        </div>
      </section>

      <section className="ad-ce-card">
        <h2>Curriculum modules</h2>
        {errors.modules && <p className="ad-error">{errors.modules}</p>}
        {form.modules.map((m, i) => (
          <div className="ad-row-card" key={i}>
            <div className="ad-ce-grid">
              <Field label={`Module ${i + 1} title`}><input className="ad-input" value={m.title} onChange={(e) => setItem('modules', i, { title: e.target.value })} /></Field>
              <Field label="Short description"><input className="ad-input" value={m.description} onChange={(e) => setItem('modules', i, { description: e.target.value })} /></Field>
            </div>
            <Field label="Topics" hint="One per line"><textarea className="ad-input" rows={3} value={m.topics.join('\n')} onChange={(e) => setItem('modules', i, { topics: lines(e.target.value) })} /></Field>
            <button type="button" className="ad-link ad-danger" onClick={() => removeItem('modules', i)}>Remove module</button>
          </div>
        ))}
        <button type="button" className="ad-btn" onClick={() => set('modules', [...form.modules, { title: '', description: '', topics: [] }])}>+ Add module</button>
      </section>

      <section className="ad-ce-card">
        <h2>Practical projects</h2>
        {form.projects.map((p, i) => (
          <div className="ad-row-card" key={i}>
            <Field label={`Project ${i + 1} name`}><input className="ad-input" value={p.name} onChange={(e) => setItem('projects', i, { name: e.target.value })} /></Field>
            <Field label="Description"><textarea className="ad-input" rows={2} value={p.description} onChange={(e) => setItem('projects', i, { description: e.target.value })} /></Field>
            <Field label="Skills" hint="Comma separated"><input className="ad-input" value={p.skills.join(', ')} onChange={(e) => setItem('projects', i, { skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></Field>
            <button type="button" className="ad-link ad-danger" onClick={() => removeItem('projects', i)}>Remove project</button>
          </div>
        ))}
        <button type="button" className="ad-btn" onClick={() => set('projects', [...form.projects, { name: '', description: '', skills: [] }])}>+ Add project</button>
      </section>

      <section className="ad-ce-card">
        <h2>Frequently asked questions</h2>
        {form.faqs.map((f, i) => (
          <div className="ad-row-card" key={i}>
            <Field label={`Question ${i + 1}`}><input className="ad-input" value={f.question} onChange={(e) => setItem('faqs', i, { question: e.target.value })} /></Field>
            <Field label="Answer"><textarea className="ad-input" rows={2} value={f.answer} onChange={(e) => setItem('faqs', i, { answer: e.target.value })} /></Field>
            <button type="button" className="ad-link ad-danger" onClick={() => removeItem('faqs', i)}>Remove question</button>
          </div>
        ))}
        <button type="button" className="ad-btn" onClick={() => set('faqs', [...form.faqs, { question: '', answer: '' }])}>+ Add question</button>
      </section>

      <section className="ad-ce-card">
        <h2>Search engine (optional)</h2>
        <p className="ad-muted">Leave empty to use “{form.name || 'Course name'} Course | Coding Hubs School of AI, Delhi” and the summary.</p>
        <div className="ad-ce-grid">
          <Field label="SEO title" hint={`${form.seo_title.length}/65`} error={errors.seo_title}><input className="ad-input" maxLength={70} value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} /></Field>
          <Field label="Meta description" hint={`${form.meta_description.length}/160`} error={errors.meta_description}><textarea className="ad-input" rows={2} maxLength={170} value={form.meta_description} onChange={(e) => set('meta_description', e.target.value)} /></Field>
        </div>
      </section>
      <button type="submit" className="ad-btn ad-btn-primary" disabled={busy}>{busy ? 'Saving…' : id ? 'Save course' : 'Create course'}</button>
    </form>
  )
}
