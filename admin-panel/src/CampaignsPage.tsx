import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { adminApi } from './api'

/** Admin view of a course offer (backend: apps/leads Campaign, /api/admin/campaigns/). */
interface Campaign {
  id: number
  title: string
  offer_text: string
  offer_label: string
  coupon_code: string
  terms: string
  cta_label: string
  cta_url: string
  status: 'draft' | 'published' | 'paused'
  starts_at: string
  ends_at: string | null
  presentation: 'bar' | 'card' | 'modal'
  target_type: 'all' | 'course' | 'category' | 'page'
  target_values: string[]
  priority: number
  frequency: 'once' | 'daily' | 'session'
  show_countdown: boolean
  lead_count: number
  state: 'draft' | 'paused' | 'scheduled' | 'live' | 'expired'
  updated_at: string
}

type Form = Omit<Campaign, 'id' | 'lead_count' | 'state' | 'updated_at' | 'starts_at' | 'ends_at' | 'target_values'> & {
  starts_at: string
  ends_at: string
  target_values: string
}

/** Admins always read and type times in India Standard Time, whatever the computer's own time zone is. */
const IST = 'Asia/Kolkata'
function toIstInput(iso: string | null) {
  if (!iso) return ''
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
const fromIstInput = (value: string) => (value ? `${value}:00+05:30` : null)
const showIst = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: IST, dateStyle: 'medium', timeStyle: 'short' }) + ' IST' : 'No end')

const EMPTY: Form = {
  title: '', offer_text: '', offer_label: '', coupon_code: '', terms: '', cta_label: 'Book a free demo', cta_url: '#demo',
  status: 'draft', starts_at: toIstInput(new Date().toISOString()), ends_at: '', presentation: 'bar', target_type: 'all',
  target_values: '', priority: 0, frequency: 'once', show_countdown: false,
}

const STATE_LABEL: Record<Campaign['state'], string> = { draft: 'Draft', paused: 'Paused', scheduled: 'Scheduled', live: 'Live', expired: 'Expired' }
const TARGET_HINT: Record<Form['target_type'], string> = {
  all: 'Shown on every public page.',
  course: 'One course slug per line, e.g. data-science or python-full-stack (as in /courses/<slug>/).',
  category: 'One course category per line, exactly as shown on the Courses page.',
  page: 'One page path per line, e.g. / or /blog/*  (a trailing * matches every page under that path).',
}

function errorText(error: unknown) {
  const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data
  if (!data) return 'Please check your connection and try again.'
  return Object.entries(data).map(([key, value]) => `${key === 'detail' ? '' : key.replace('_', ' ') + ': '}${Array.isArray(value) ? value.join(' ') : String(value)}`).join(' · ')
}

function Preview({ form }: { form: Form }) {
  return (
    <div className={`ad-offer-preview ad-offer-${form.presentation}`} aria-label="Offer preview">
      <span className="ad-muted">Preview ({form.presentation === 'bar' ? 'announcement bar' : form.presentation === 'card' ? 'offer card' : 'modal'})</span>
      <div>
        {form.offer_label && <span className="ad-offer-label">{form.offer_label}</span>}
        <strong>{form.title || 'Offer title'}</strong> <span>{form.offer_text || 'Short offer copy'}</span>
        {form.coupon_code && <span> · Code <b>{form.coupon_code}</b></span>}
        {form.show_countdown && form.ends_at && <span> · Ends {showIst(fromIstInput(form.ends_at))}</span>}
      </div>
      <button type="button" className="ad-btn ad-btn-primary" tabIndex={-1}>{form.cta_label || 'Call to action'}</button>
    </div>
  )
}

export function CampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Campaign | null | undefined>(undefined)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.get<Campaign[] | { results: Campaign[] }>('/campaigns/')
      setItems(Array.isArray(data) ? data : data.results)
      setError('')
    } catch (e) {
      setError(`Could not load offers. ${errorText(e)}`)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  function open(c?: Campaign) {
    setEditing(c ?? null)
    setForm(c ? { ...c, starts_at: toIstInput(c.starts_at), ends_at: toIstInput(c.ends_at), target_values: c.target_values.join('\n') } : EMPTY)
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      starts_at: fromIstInput(form.starts_at),
      ends_at: fromIstInput(form.ends_at),
      target_values: form.target_type === 'all' ? [] : form.target_values.split('\n').map((v) => v.trim()).filter(Boolean),
    }
    try {
      if (editing) await adminApi.patch(`/campaigns/${editing.id}/`, payload)
      else await adminApi.post('/campaigns/', payload)
      setEditing(undefined)
      await load()
    } catch (e) {
      setError(`Could not save the offer. ${errorText(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(c: Campaign, status: Campaign['status']) {
    try {
      await adminApi.patch(`/campaigns/${c.id}/`, { status })
      await load()
    } catch (e) {
      setError(`Could not update the offer. ${errorText(e)}`)
    }
  }

  async function remove(c: Campaign) {
    if (!window.confirm(`Delete the offer “${c.title}”? Enquiries that used it are kept.`)) return
    try {
      await adminApi.delete(`/campaigns/${c.id}/`)
      await load()
    } catch (e) {
      setError(`Could not delete the offer. ${errorText(e)}`)
    }
  }

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Course Offers</h1>
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => open()}>New offer</button>
      </div>
      <p className="ad-muted">
        A published offer shows on matching public pages between its start and end time (IST), as a bar, a card or a modal.
        When several offers match a page, the highest priority wins. Visitors who dismiss an offer do not see it again
        according to its frequency. Enquiries sent from an offer are linked to it in Manage Leads.
      </p>
      {error && <p className="ad-error" role="alert">{error}</p>}
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead><tr><th>Offer</th><th>Status</th><th>Window (IST)</th><th>Shown on</th><th>Priority</th><th>Enquiries</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.title}</strong><small>{c.offer_label ? `${c.offer_label} · ` : ''}{c.presentation}</small></td>
                <td><span className={`ad-badge ad-offer-state-${c.state}`}>{STATE_LABEL[c.state]}</span></td>
                <td><small>{showIst(c.starts_at)}<br />→ {showIst(c.ends_at)}</small></td>
                <td><small>{c.target_type === 'all' ? 'All pages' : `${c.target_type}: ${c.target_values.join(', ')}`}</small></td>
                <td>{c.priority}</td>
                <td>{c.lead_count}</td>
                <td>
                  <div className="ad-actions">
                    <button type="button" className="ad-btn" onClick={() => open(c)}>Edit</button>
                    {c.status === 'published'
                      ? <button type="button" className="ad-btn" onClick={() => setStatus(c, 'paused')}>Pause</button>
                      : <button type="button" className="ad-btn" onClick={() => setStatus(c, 'published')}>Publish</button>}
                    <button type="button" className="ad-btn ad-btn-danger" onClick={() => remove(c)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="ad-muted">No offers yet. New offers start as drafts and are not shown until published.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <div className="ad-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setEditing(undefined)}>
          <section className="ad-modal-card ad-tutor-form-card" role="dialog" aria-modal="true" aria-labelledby="offer-form-title">
            <h2 id="offer-form-title">{editing ? 'Edit offer' : 'New offer'}</h2>
            <form onSubmit={submit}>
              <Preview form={form} />
              <div className="ad-two">
                <label className="ad-field"><span>Title *</span><input className="ad-input" required maxLength={90} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Early-bird admissions" /></label>
                <label className="ad-field"><span>Offer label</span><input className="ad-input" maxLength={40} value={form.offer_label} onChange={(e) => set('offer_label', e.target.value)} placeholder="e.g. ₹2,000 off" /></label>
              </div>
              <label className="ad-field"><span>Offer copy *</span><input className="ad-input" required maxLength={200} value={form.offer_text} onChange={(e) => set('offer_text', e.target.value)} placeholder="One or two short lines" /></label>
              <div className="ad-two">
                <label className="ad-field"><span>Coupon code</span><input className="ad-input" maxLength={30} value={form.coupon_code} onChange={(e) => set('coupon_code', e.target.value.toUpperCase())} /></label>
                <label className="ad-field"><span>Priority</span><input className="ad-input" type="number" min={0} max={999} value={form.priority} onChange={(e) => set('priority', Number(e.target.value))} /></label>
              </div>
              <label className="ad-field"><span>Terms</span><textarea className="ad-input" rows={2} value={form.terms} onChange={(e) => set('terms', e.target.value)} placeholder="Eligibility, validity and any limits" /></label>
              <div className="ad-two">
                <label className="ad-field"><span>Button label *</span><input className="ad-input" required maxLength={40} value={form.cta_label} onChange={(e) => set('cta_label', e.target.value)} /></label>
                <label className="ad-field"><span>Button destination *</span><input className="ad-input" required maxLength={300} value={form.cta_url} onChange={(e) => set('cta_url', e.target.value)} /><span className="ad-hint">#demo opens the free-demo form; or a path such as /courses/data-science/, or an https:// link.</span></label>
              </div>
              <div className="ad-two">
                <label className="ad-field"><span>Starts (IST) *</span><input className="ad-input" type="datetime-local" required value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} /></label>
                <label className="ad-field"><span>Ends (IST)</span><input className="ad-input" type="datetime-local" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} /><span className="ad-hint">Leave empty for no end date. The offer disappears automatically at this time.</span></label>
              </div>
              <div className="ad-two">
                <label className="ad-field"><span>Show as</span><select className="ad-input" value={form.presentation} onChange={(e) => set('presentation', e.target.value as Form['presentation'])}><option value="bar">Announcement bar</option><option value="card">Offer card</option><option value="modal">Modal (opens over the page)</option></select></label>
                <label className="ad-field"><span>After a visitor dismisses it</span><select className="ad-input" value={form.frequency} onChange={(e) => set('frequency', e.target.value as Form['frequency'])}><option value="once">Never show it again</option><option value="daily">Show again after a day</option><option value="session">Show again in a new browser session</option></select></label>
              </div>
              <div className="ad-two">
                <label className="ad-field"><span>Show on</span><select className="ad-input" value={form.target_type} onChange={(e) => set('target_type', e.target.value as Form['target_type'])}><option value="all">All public pages</option><option value="course">Specific courses</option><option value="category">Course categories</option><option value="page">Specific pages</option></select></label>
                <label className="ad-field"><span>Status</span><select className="ad-input" value={form.status} onChange={(e) => set('status', e.target.value as Form['status'])}><option value="draft">Draft</option><option value="published">Published</option><option value="paused">Paused</option></select></label>
              </div>
              {form.target_type !== 'all' && (
                <label className="ad-field"><span>Targets *</span><textarea className="ad-input" rows={3} value={form.target_values} onChange={(e) => set('target_values', e.target.value)} /><span className="ad-hint">{TARGET_HINT[form.target_type]}</span></label>
              )}
              <label className="ad-check"><input type="checkbox" checked={form.show_countdown} onChange={(e) => set('show_countdown', e.target.checked)} /> Show a countdown to the end time (needs an end time)</label>
              {error && <p className="ad-error" role="alert">{error}</p>}
              <div className="ad-modal-actions">
                <button type="button" className="ad-btn" onClick={() => setEditing(undefined)}>Cancel</button>
                <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save offer'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
