import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { adminApi, type Paged } from './api'

interface Tutor {
  id: number
  full_name: string
  profile_image: string
  designation: string
  bio: string
  experience: string
  expertise: string[]
  courses: string[]
  teaching_approach: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface TutorForm {
  full_name: string
  profile_image: string
  designation: string
  bio: string
  experience: string
  expertise: string
  courses: string
  teaching_approach: string
  is_active: boolean
}

const EMPTY_FORM: TutorForm = {
  full_name: '',
  profile_image: '',
  designation: '',
  bio: '',
  experience: '',
  expertise: '',
  courses: '',
  teaching_approach: '',
  is_active: true,
}

function tutorError(error: unknown) {
  const data = (error as { response?: { data?: unknown } }).response?.data
  if (data && typeof data === 'object') {
    const fields = data as Record<string, unknown>
    for (const [field, value] of Object.entries(fields)) {
      if (typeof value === 'string') return `${field === 'detail' ? '' : `${field}: `}${value}`
      if (Array.isArray(value) && typeof value[0] === 'string') return `${field}: ${value[0]}`
    }
  }
  return 'The request could not be completed. Please try again.'
}

function splitItems(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
}

function formFromTutor(tutor: Tutor): TutorForm {
  return {
    full_name: tutor.full_name,
    profile_image: tutor.profile_image,
    designation: tutor.designation,
    bio: tutor.bio,
    experience: tutor.experience,
    expertise: tutor.expertise.join('\n'),
    courses: tutor.courses.join('\n'),
    teaching_approach: tutor.teaching_approach,
    is_active: tutor.is_active,
  }
}

export function TutorsPage() {
  const [data, setData] = useState<Paged<Tutor> | null>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Tutor | null | undefined>(undefined)
  const [form, setForm] = useState<TutorForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => setPage(1), [debouncedQuery])

  const loadTutors = useCallback(async () => {
    try {
      const { data: result } = await adminApi.get<Paged<Tutor>>('/tutors/', {
        params: { q: debouncedQuery || undefined, page },
      })
      setData(result)
      setError('')
    } catch (requestError) {
      setError(`Could not load tutor profiles. ${tutorError(requestError)}`)
    }
  }, [debouncedQuery, page])

  useEffect(() => {
    void loadTutors()
  }, [loadTutors])

  function openForm(tutor?: Tutor) {
    setEditing(tutor ?? null)
    setForm(tutor ? formFromTutor(tutor) : EMPTY_FORM)
    setError('')
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const body = new FormData()
    body.append('file', file)
    setUploading(true)
    setError('')
    try {
      const { data: result } = await adminApi.post<{ url: string }>('/tutors/upload-image/', body)
      setForm((current) => ({ ...current, profile_image: result.url }))
    } catch (uploadError) {
      setError(`Could not upload the photo. ${tutorError(uploadError)}`)
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
      expertise: splitItems(form.expertise),
      courses: splitItems(form.courses),
    }
    try {
      if (editing) {
        await adminApi.patch(`/tutors/${editing.id}/`, payload)
      } else {
        await adminApi.post('/tutors/', payload)
      }
      setEditing(undefined)
      await loadTutors()
    } catch (saveError) {
      setError(`Could not save tutor profile. ${tutorError(saveError)}`)
    } finally {
      setSaving(false)
    }
  }

  const pageCount = data ? Math.max(1, Math.ceil(data.count / 25)) : 1

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Tutors</h1>
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => openForm()}>Add tutor</button>
      </div>
      <p className="ad-muted">Manage tutor profiles shown on the public Book a Tutor page.</p>
      <div className="ad-filters">
        <input type="search" placeholder="Search tutor name…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search tutor name" />
      </div>
      {error && <p className="ad-error" role="alert">{error}</p>}
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead><tr><th>Photo</th><th>Tutor</th><th>Expertise</th><th>Courses</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {data?.results.map((tutor) => (
              <tr key={tutor.id}>
                <td>{tutor.profile_image ? <img className="ad-tutor-thumb" src={tutor.profile_image} alt="" /> : <span className="ad-muted">No photo</span>}</td>
                <td><strong>{tutor.full_name}</strong><small>{tutor.designation}</small></td>
                <td>{tutor.expertise.join(', ') || '—'}</td>
                <td>{tutor.courses.join(', ') || '—'}</td>
                <td><span className={`ad-badge ${tutor.is_active ? 'st-published' : 'st-draft'}`}>{tutor.is_active ? 'Active' : 'Inactive'}</span></td>
                <td><button type="button" className="ad-btn" onClick={() => openForm(tutor)}>Edit</button></td>
              </tr>
            ))}
            {data?.results.length === 0 && <tr><td colSpan={6} className="ad-muted">No tutor profiles found.</td></tr>}
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
          <section className="ad-modal-card ad-tutor-form-card" role="dialog" aria-modal="true" aria-labelledby="tutor-form-title">
            <h2 id="tutor-form-title">{editing ? 'Edit tutor profile' : 'Add tutor profile'}</h2>
            <form onSubmit={submit}>
              <label className="ad-field"><span>Full name *</span><input className="ad-input" required maxLength={160} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
              <label className="ad-field"><span>Designation *</span><input className="ad-input" required maxLength={160} value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} placeholder="e.g. Python and AI Tutor" /></label>
              <div className="ad-field">
                <label htmlFor="tutor-photo">Profile photo</label>
                {form.profile_image && <img className="ad-tutor-preview" src={form.profile_image} alt="Tutor profile preview" />}
                <input id="tutor-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={uploading} />
                <input className="ad-input" aria-label="Photo URL" value={form.profile_image} onChange={(event) => setForm({ ...form, profile_image: event.target.value })} placeholder="Or paste an https:// or /media/ image URL" />
                <span className="ad-hint">{uploading ? 'Uploading photo…' : 'JPEG, PNG or WebP; maximum 5 MB.'}</span>
              </div>
              <label className="ad-field"><span>Short description *</span><textarea className="ad-input" required rows={3} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
              <label className="ad-field"><span>Experience</span><input className="ad-input" maxLength={100} value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} placeholder="e.g. 5+ years" /></label>
              <label className="ad-field"><span>Expertise</span><textarea className="ad-input" rows={2} value={form.expertise} onChange={(event) => setForm({ ...form, expertise: event.target.value })} placeholder="One item per line" /></label>
              <label className="ad-field"><span>Courses</span><textarea className="ad-input" rows={2} value={form.courses} onChange={(event) => setForm({ ...form, courses: event.target.value })} placeholder="One course per line" /></label>
              <label className="ad-field"><span>Teaching approach</span><textarea className="ad-input" rows={3} value={form.teaching_approach} onChange={(event) => setForm({ ...form, teaching_approach: event.target.value })} /></label>
              <label className="ad-check"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Show this profile on the public tutor page</label>
              <div className="ad-modal-actions">
                <button type="button" className="ad-btn" onClick={() => setEditing(undefined)} disabled={saving}>Cancel</button>
                <button type="submit" className="ad-btn ad-btn-primary" disabled={saving || uploading}>{saving ? 'Saving…' : 'Save tutor'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
