import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { adminApi, type Paged } from './api'

interface Job {
  id: number
  slug: string
  title: string
  company_name: string
  company_logo: string
  company_about: string
  location: string
  work_mode: string
  job_type: string
  job_type_label: string
  experience_level: string
  experience: string
  salary: string
  description: string
  responsibilities: string[]
  skills: string[]
  qualifications: string[]
  benefits: string[]
  how_to_apply: string
  application_url: string
  application_email: string
  application_deadline: string | null
  is_published: boolean
  is_expired: boolean
  is_open: boolean
  published_at: string | null
  updated_at: string
}

type JobForm = Omit<Job, 'id' | 'slug' | 'job_type_label' | 'is_open' | 'published_at' | 'updated_at' | 'responsibilities' | 'skills' | 'qualifications' | 'benefits' | 'application_deadline'> & {
  responsibilities: string
  skills: string
  qualifications: string
  benefits: string
  application_deadline: string
}

const EMPTY_FORM: JobForm = {
  title: '',
  company_name: '',
  company_logo: '',
  company_about: '',
  location: '',
  work_mode: 'onsite',
  job_type: 'full_time',
  experience_level: 'fresher',
  experience: '',
  salary: '',
  description: '',
  responsibilities: '',
  skills: '',
  qualifications: '',
  benefits: '',
  how_to_apply: '',
  application_url: '',
  application_email: '',
  application_deadline: '',
  is_published: false,
  is_expired: false,
}

const WORK_MODES = [['onsite', 'On-site'], ['hybrid', 'Hybrid'], ['remote', 'Remote']]
const JOB_TYPES = [['full_time', 'Full-time'], ['part_time', 'Part-time'], ['internship', 'Internship'], ['contract', 'Contract']]
const LEVELS = [['fresher', 'Fresher (0–1 years)'], ['junior', 'Junior (1–3 years)'], ['mid', 'Mid-level (3–5 years)'], ['senior', 'Senior (5+ years)']]

function jobError(error: unknown) {
  const data = (error as { response?: { data?: unknown } }).response?.data
  if (data && typeof data === 'object') {
    for (const [field, value] of Object.entries(data as Record<string, unknown>)) {
      const label = field === 'detail' || field === 'non_field_errors' ? '' : `${field.replace(/_/g, ' ')}: `
      if (typeof value === 'string') return `${label}${value}`
      if (Array.isArray(value) && typeof value[0] === 'string') return `${label}${value[0]}`
    }
  }
  return 'The request could not be completed. Please try again.'
}

const lines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean)

function formFromJob(job: Job): JobForm {
  return {
    ...EMPTY_FORM,
    ...Object.fromEntries(Object.keys(EMPTY_FORM).map((field) => [field, job[field as keyof Job] ?? ''])),
    responsibilities: job.responsibilities.join('\n'),
    skills: job.skills.join('\n'),
    qualifications: job.qualifications.join('\n'),
    benefits: job.benefits.join('\n'),
    application_deadline: job.application_deadline ?? '',
    is_published: job.is_published,
    is_expired: job.is_expired,
  } as JobForm
}

function JobStatus({ job }: { job: Job }) {
  if (!job.is_published) return <span className="ad-badge st-draft">Unpublished</span>
  if (job.is_expired) return <span className="ad-badge st-closed">Expired</span>
  if (!job.is_open) return <span className="ad-badge st-closed">Deadline passed</span>
  return <span className="ad-badge st-published">Live</span>
}

export function JobsPage() {
  const [data, setData] = useState<Paged<Job> | null>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Job | null | undefined>(undefined)
  const [form, setForm] = useState<JobForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => setPage(1), [debouncedQuery, status])

  const loadJobs = useCallback(async () => {
    try {
      const { data: result } = await adminApi.get<Paged<Job>>('/jobs/', {
        params: { q: debouncedQuery || undefined, status: status || undefined, page },
      })
      setData(result)
      setError('')
    } catch (requestError) {
      setError(`Could not load jobs. ${jobError(requestError)}`)
    }
  }, [debouncedQuery, status, page])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  function openForm(job?: Job) {
    setEditing(job ?? null)
    setForm(job ? formFromJob(job) : EMPTY_FORM)
    setError('')
  }

  const set = <K extends keyof JobForm>(field: K, value: JobForm[K]) => setForm((current) => ({ ...current, [field]: value }))

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const body = new FormData()
    body.append('file', file)
    setUploading(true)
    setError('')
    try {
      const { data: result } = await adminApi.post<{ url: string }>('/jobs/upload-logo/', body)
      set('company_logo', result.url)
    } catch (uploadError) {
      setError(`Could not upload the logo. ${jobError(uploadError)}`)
    } finally {
      setUploading(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      responsibilities: lines(form.responsibilities),
      skills: lines(form.skills),
      qualifications: lines(form.qualifications),
      benefits: lines(form.benefits),
      application_deadline: form.application_deadline || null,
    }
    try {
      if (editing) await adminApi.patch(`/jobs/${editing.id}/`, payload)
      else await adminApi.post('/jobs/', payload)
      setEditing(undefined)
      await loadJobs()
    } catch (saveError) {
      setError(`Could not save the job. ${jobError(saveError)}`)
    } finally {
      setSaving(false)
    }
  }

  async function update(job: Job, changes: Partial<Pick<Job, 'is_published' | 'is_expired'>>) {
    try {
      await adminApi.patch(`/jobs/${job.id}/`, changes)
      await loadJobs()
    } catch (updateError) {
      setError(`Could not update the job. ${jobError(updateError)}`)
    }
  }

  async function remove(job: Job) {
    if (!window.confirm(`Delete “${job.title}” at ${job.company_name}? This cannot be undone.`)) return
    try {
      await adminApi.delete(`/jobs/${job.id}/`)
      await loadJobs()
    } catch (deleteError) {
      setError(`Could not delete the job. ${jobError(deleteError)}`)
    }
  }

  const pageCount = data ? Math.max(1, Math.ceil(data.count / 25)) : 1

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Latest Jobs</h1>
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => openForm()}>Add job</button>
      </div>
      <p className="ad-muted">Published jobs appear on the public Latest Jobs page, newest first. Expired jobs and jobs past their deadline are hidden from the listing.</p>
      <div className="ad-filters">
        <input type="search" placeholder="Search title or company…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search title or company" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
          <option value="">All jobs</option>
          <option value="published">Published</option>
          <option value="draft">Unpublished</option>
          <option value="expired">Marked expired</option>
        </select>
      </div>
      {error && <p className="ad-error" role="alert">{error}</p>}
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead><tr><th>Logo</th><th>Job</th><th>Type</th><th>Deadline</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {data?.results.map((job) => (
              <tr key={job.id}>
                <td>{job.company_logo ? <img className="ad-tutor-thumb ad-job-logo" src={job.company_logo} alt="" /> : <span className="ad-muted">No logo</span>}</td>
                <td><strong>{job.title}</strong><small>{job.company_name} · {job.location}</small></td>
                <td>{job.job_type_label}</td>
                <td>{job.application_deadline ? new Date(`${job.application_deadline}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                <td><JobStatus job={job} /></td>
                <td>
                  <div className="ad-actions">
                    <button type="button" className="ad-btn" onClick={() => openForm(job)}>Edit</button>
                    <button type="button" className="ad-btn" onClick={() => update(job, { is_published: !job.is_published })}>{job.is_published ? 'Unpublish' : 'Publish'}</button>
                    <button type="button" className="ad-btn" onClick={() => update(job, { is_expired: !job.is_expired })}>{job.is_expired ? 'Reopen' : 'Mark expired'}</button>
                    {job.is_published && job.is_open && <a className="ad-btn" href={`/latest-jobs/${job.slug}/`} target="_blank" rel="noopener noreferrer">View ↗</a>}
                    <button type="button" className="ad-btn ad-btn-danger" onClick={() => remove(job)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.results.length === 0 && <tr><td colSpan={6} className="ad-muted">No jobs found.</td></tr>}
          </tbody>
        </table>
      </div>
      {data && pageCount > 1 && (
        <div className="ad-pagination">
          <button type="button" className="ad-btn" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <span>Page {page} of {pageCount}</span>
          <button type="button" className="ad-btn" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button>
        </div>
      )}

      {editing !== undefined && (
        <div className="ad-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditing(undefined)}>
          <section className="ad-modal-card ad-tutor-form-card ad-job-form-card" role="dialog" aria-modal="true" aria-labelledby="job-form-title">
            <h2 id="job-form-title">{editing ? 'Edit job' : 'Add job'}</h2>
            <form onSubmit={submit}>
              <div className="ad-two">
                <label className="ad-field"><span>Job title *</span><input className="ad-input" required maxLength={160} value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="e.g. Python Developer" /></label>
                <label className="ad-field"><span>Company name *</span><input className="ad-input" required maxLength={160} value={form.company_name} onChange={(event) => set('company_name', event.target.value)} /></label>
              </div>
              <div className="ad-field">
                <label htmlFor="job-logo">Company logo</label>
                {form.company_logo && <img className="ad-tutor-preview ad-job-logo" src={form.company_logo} alt="Company logo preview" />}
                <input id="job-logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadLogo} disabled={uploading} />
                <input className="ad-input" aria-label="Logo URL" value={form.company_logo} onChange={(event) => set('company_logo', event.target.value)} placeholder="Or paste an https:// or /media/ image URL" />
                <span className="ad-hint">{uploading ? 'Uploading logo…' : 'JPEG, PNG or WebP; maximum 5 MB.'}</span>
              </div>
              <label className="ad-field"><span>About the company</span><textarea className="ad-input" rows={2} value={form.company_about} onChange={(event) => set('company_about', event.target.value)} /></label>
              <div className="ad-two">
                <label className="ad-field"><span>Location *</span><input className="ad-input" required maxLength={160} value={form.location} onChange={(event) => set('location', event.target.value)} placeholder="e.g. Noida, Uttar Pradesh" /></label>
                <label className="ad-field"><span>Work mode *</span><select className="ad-input" value={form.work_mode} onChange={(event) => set('work_mode', event.target.value)}>{WORK_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="ad-field"><span>Job type *</span><select className="ad-input" value={form.job_type} onChange={(event) => set('job_type', event.target.value)}>{JOB_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="ad-field"><span>Experience level *</span><select className="ad-input" value={form.experience_level} onChange={(event) => set('experience_level', event.target.value)}>{LEVELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="ad-field"><span>Experience required</span><input className="ad-input" maxLength={100} value={form.experience} onChange={(event) => set('experience', event.target.value)} placeholder="e.g. 0–2 years" /></label>
                <label className="ad-field"><span>Salary / stipend</span><input className="ad-input" maxLength={100} value={form.salary} onChange={(event) => set('salary', event.target.value)} placeholder="e.g. ₹4–6 LPA" /></label>
              </div>
              <label className="ad-field"><span>Job description *</span><textarea className="ad-input" required rows={4} value={form.description} onChange={(event) => set('description', event.target.value)} /></label>
              <div className="ad-two">
                <label className="ad-field"><span>Responsibilities</span><textarea className="ad-input" rows={4} value={form.responsibilities} onChange={(event) => set('responsibilities', event.target.value)} placeholder="One per line" /></label>
                <label className="ad-field"><span>Required skills</span><textarea className="ad-input" rows={4} value={form.skills} onChange={(event) => set('skills', event.target.value)} placeholder="One per line" /></label>
                <label className="ad-field"><span>Qualifications</span><textarea className="ad-input" rows={3} value={form.qualifications} onChange={(event) => set('qualifications', event.target.value)} placeholder="One per line" /></label>
                <label className="ad-field"><span>Benefits</span><textarea className="ad-input" rows={3} value={form.benefits} onChange={(event) => set('benefits', event.target.value)} placeholder="One per line (optional)" /></label>
              </div>
              <label className="ad-field"><span>How to apply</span><textarea className="ad-input" rows={2} value={form.how_to_apply} onChange={(event) => set('how_to_apply', event.target.value)} placeholder="e.g. Send your CV with the subject line “Python Developer”." /></label>
              <div className="ad-two">
                <label className="ad-field"><span>Application link</span><input className="ad-input" type="url" maxLength={500} value={form.application_url} onChange={(event) => set('application_url', event.target.value)} placeholder="https://…" /></label>
                <label className="ad-field"><span>Application email</span><input className="ad-input" type="email" value={form.application_email} onChange={(event) => set('application_email', event.target.value)} placeholder="careers@company.com" /></label>
              </div>
              <span className="ad-hint">Add at least one: the link is used for Apply Now when both are given.</span>
              <label className="ad-field"><span>Application deadline</span><input className="ad-input" type="date" value={form.application_deadline} onChange={(event) => set('application_deadline', event.target.value)} /></label>
              <label className="ad-check"><input type="checkbox" checked={form.is_published} onChange={(event) => set('is_published', event.target.checked)} /> Publish on the Latest Jobs page</label>
              <label className="ad-check"><input type="checkbox" checked={form.is_expired} onChange={(event) => set('is_expired', event.target.checked)} /> Mark as expired (closes applications)</label>
              <div className="ad-modal-actions">
                <button type="button" className="ad-btn" onClick={() => setEditing(undefined)} disabled={saving}>Cancel</button>
                <button type="submit" className="ad-btn ad-btn-primary" disabled={saving || uploading}>{saving ? 'Saving…' : 'Save job'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
