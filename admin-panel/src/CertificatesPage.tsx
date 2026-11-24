import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { adminApi } from './api'

/** Institute certificates (backend: apps/certificates). Every application is reviewed here before anything is issued. */
interface HistoryEvent { id: number; action: string; actor: string; note: string; at: string }
interface Application {
  id: number; full_name: string; course_name: string; batch: string; completed_on: string; phone: string; note: string
  status: 'pending' | 'approved' | 'rejected'; staff_note: string; user_email: string; reviewed_by: string; reviewed_at: string | null
  created_at: string; certificate_code: string; events: HistoryEvent[]
}
interface Certificate {
  id: number; code: string; recipient_name: string; course_name: string; completed_on: string; issued_on: string
  status: 'valid' | 'revoked' | 'replaced'; status_note: string; user_email: string; issued_by: string
  replaces_code: string; replaced_by_code: string; created_at: string; events: HistoryEvent[]
}
type Dialog =
  | { kind: 'review'; item: Application }
  | { kind: 'issue' }
  | { kind: 'reissue'; item: Certificate }
  | { kind: 'revoke'; item: Certificate }
  | { kind: 'history'; title: string; events: HistoryEvent[] }

const list = <T,>(data: T[] | { results: T[] }) => (Array.isArray(data) ? data : data.results)
const day = (value: string | null) => (value ? new Date(value.length === 10 ? `${value}T00:00:00+05:30` : value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }) : '')
const when = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST'
const ACTION_LABEL: Record<string, string> = { applied: 'Applied', approved: 'Approved', rejected: 'Rejected', issued: 'Issued', reissued: 'Reissued', revoked: 'Revoked', restored: 'Restored', link_created: 'Download link created' }

function errorText(error: unknown) {
  const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data
  if (!data) return 'Please check your connection and try again.'
  return Object.entries(data).map(([key, value]) => `${key === 'detail' ? '' : key.replace(/_/g, ' ') + ': '}${Array.isArray(value) ? value.join(' ') : String(value)}`).join(' · ')
}

function History({ events }: { events: HistoryEvent[] }) {
  if (!events.length) return <p className="ad-muted">No history yet.</p>
  return (
    <ol className="ad-cert-history">
      {events.map((e) => (
        <li key={e.id}><b>{ACTION_LABEL[e.action] ?? e.action}</b> · {when(e.at)}{e.actor ? ` · ${e.actor}` : ''}{e.note && <span>{e.note}</span>}</li>
      ))}
    </ol>
  )
}

export function CertificatesPage() {
  const [tab, setTab] = useState<'applications' | 'certificates'>('applications')
  const [appStatus, setAppStatus] = useState<'pending' | 'approved' | 'rejected' | ''>('pending')
  const [certStatus, setCertStatus] = useState<'' | 'valid' | 'revoked' | 'replaced'>('')
  const [query, setQuery] = useState('')
  const [applications, setApplications] = useState<Application[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [form, setForm] = useState({ recipient_name: '', course_name: '', completed_on: '', user_email: '', note: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      if (tab === 'applications') {
        const { data } = await adminApi.get('/certificate-applications/', { params: { status: appStatus || undefined, q: query || undefined } })
        setApplications(list<Application>(data))
      } else {
        const { data } = await adminApi.get('/certificates/', { params: { status: certStatus || undefined, q: query || undefined } })
        setCertificates(list<Certificate>(data))
      }
      setError('')
    } catch (e) {
      setError(`Could not load. ${errorText(e)}`)
    }
  }, [tab, appStatus, certStatus, query])
  useEffect(() => { const t = setTimeout(() => void load(), 250); return () => clearTimeout(t) }, [load])

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  function openDialog(next: Dialog) {
    setError('')
    if (next.kind === 'review') setForm({ recipient_name: next.item.full_name, course_name: next.item.course_name, completed_on: next.item.completed_on, user_email: '', note: '' })
    else if (next.kind === 'reissue') setForm({ recipient_name: next.item.recipient_name, course_name: next.item.course_name, completed_on: next.item.completed_on, user_email: '', note: '' })
    else setForm({ recipient_name: '', course_name: '', completed_on: '', user_email: '', note: '' })
    setDialog(next)
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
      setDialog(null)
      await load()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent, decision?: 'approve' | 'reject') {
    event.preventDefault()
    if (!dialog) return
    if (dialog.kind === 'review' && decision === 'reject') {
      if (!form.note.trim()) { setError('Add a short reason for the learner.'); return }
      void run(() => adminApi.post(`/certificate-applications/${dialog.item.id}/reject/`, { note: form.note }))
    } else if (dialog.kind === 'review') {
      void run(() => adminApi.post(`/certificate-applications/${dialog.item.id}/approve/`, { recipient_name: form.recipient_name, course_name: form.course_name, completed_on: form.completed_on, note: form.note }))
    } else if (dialog.kind === 'issue') {
      void run(() => adminApi.post('/certificates/', form))
    } else if (dialog.kind === 'reissue') {
      void run(() => adminApi.post(`/certificates/${dialog.item.id}/reissue/`, form))
    } else if (dialog.kind === 'revoke') {
      void run(() => adminApi.post(`/certificates/${dialog.item.id}/revoke/`, { note: form.note, revoke: dialog.item.status === 'valid' }))
    }
  }

  async function download(c: Certificate) {
    try {
      const { data } = await adminApi.post<{ url: string }>(`/certificates/${c.id}/link/`)
      window.location.assign(data.url)
    } catch (e) {
      setError(`Could not download. ${errorText(e)}`)
    }
  }

  const fields = (
    <>
      <div className="ad-two">
        <label className="ad-field"><span>Name on certificate *</span><input className="ad-input" required maxLength={80} value={form.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} /></label>
        <label className="ad-field"><span>Course *</span><input className="ad-input" required maxLength={120} value={form.course_name} onChange={(e) => set('course_name', e.target.value)} /></label>
      </div>
      <label className="ad-field"><span>Completed on *</span><input className="ad-input" type="date" required value={form.completed_on} onChange={(e) => set('completed_on', e.target.value)} /></label>
    </>
  )

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Certificates</h1>
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => openDialog({ kind: 'issue' })}>Issue certificate</button>
      </div>
      <p className="ad-muted">
        Learners apply from codinghubs.in/certificates/. Nothing is issued until you approve an application. Each certificate gets a
        random ID (CH-XXXX-XXXX-XXXX) that anyone can check at /certificates/verify/; the public result shows only the course, dates and
        the name&apos;s initials. A correction is a reissue with a new ID; the old ID then verifies as “replaced”.
      </p>
      <div className="ad-toolbar">
        <div className="ad-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'applications'} className={tab === 'applications' ? 'on' : ''} onClick={() => setTab('applications')}>Applications</button>
          <button type="button" role="tab" aria-selected={tab === 'certificates'} className={tab === 'certificates' ? 'on' : ''} onClick={() => setTab('certificates')}>Issued certificates</button>
        </div>
        {tab === 'applications'
          ? <select className="ad-input" aria-label="Application status" value={appStatus} onChange={(e) => setAppStatus(e.target.value as typeof appStatus)}><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="">All</option></select>
          : <select className="ad-input" aria-label="Certificate status" value={certStatus} onChange={(e) => setCertStatus(e.target.value as typeof certStatus)}><option value="">All</option><option value="valid">Valid</option><option value="revoked">Revoked</option><option value="replaced">Replaced</option></select>}
        <input className="ad-input" type="search" placeholder={tab === 'applications' ? 'Search name, course, email, phone' : 'Search ID, name, course, email'} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {error && !dialog && <p className="ad-error" role="alert">{error}</p>}

      <div className="ad-tablewrap">
        {tab === 'applications' ? (
          <table className="ad-table">
            <thead><tr><th>Learner</th><th>Course</th><th>Completed</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.full_name}</strong><small>{a.user_email}{a.phone ? ` · ${a.phone}` : ''}</small></td>
                  <td>{a.course_name}<small>{a.batch}</small></td>
                  <td>{day(a.completed_on)}</td>
                  <td><small>{when(a.created_at)}</small></td>
                  <td><span className={`ad-badge ad-cert-${a.status}`}>{a.status}</span>{a.certificate_code && <small>{a.certificate_code}</small>}</td>
                  <td><div className="ad-actions">
                    {a.status === 'pending' && <button type="button" className="ad-btn ad-btn-primary" onClick={() => openDialog({ kind: 'review', item: a })}>Review</button>}
                    <button type="button" className="ad-btn" onClick={() => openDialog({ kind: 'history', title: `${a.full_name} · ${a.course_name}`, events: a.events })}>History</button>
                  </div></td>
                </tr>
              ))}
              {applications.length === 0 && <tr><td colSpan={6} className="ad-muted">No applications here.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="ad-table">
            <thead><tr><th>Certificate ID</th><th>Name</th><th>Course</th><th>Issued</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {certificates.map((c) => (
                <tr key={c.id}>
                  <td><code>{c.code}</code>{c.replaces_code && <small>Reissue of {c.replaces_code}</small>}{c.replaced_by_code && <small>Replaced by {c.replaced_by_code}</small>}</td>
                  <td><strong>{c.recipient_name}</strong><small>{c.user_email || 'No account linked'}</small></td>
                  <td>{c.course_name}<small>Completed {day(c.completed_on)}</small></td>
                  <td>{day(c.issued_on)}<small>{c.issued_by}</small></td>
                  <td><span className={`ad-badge ad-cert-${c.status}`}>{c.status}</span></td>
                  <td><div className="ad-actions">
                    {c.status === 'valid' && <button type="button" className="ad-btn" onClick={() => void download(c)}>Download PDF</button>}
                    {c.status !== 'replaced' && <button type="button" className="ad-btn" onClick={() => openDialog({ kind: 'reissue', item: c })}>Reissue</button>}
                    {c.status !== 'replaced' && <button type="button" className={`ad-btn${c.status === 'valid' ? ' ad-btn-danger' : ''}`} onClick={() => openDialog({ kind: 'revoke', item: c })}>{c.status === 'valid' ? 'Revoke' : 'Restore'}</button>}
                    <button type="button" className="ad-btn" onClick={() => openDialog({ kind: 'history', title: c.code, events: c.events })}>History</button>
                  </div></td>
                </tr>
              ))}
              {certificates.length === 0 && <tr><td colSpan={6} className="ad-muted">No certificates here.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {dialog && (
        <div className="ad-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setDialog(null)}>
          <section className="ad-modal-card ad-tutor-form-card" role="dialog" aria-modal="true" aria-labelledby="cert-dialog-title">
            {dialog.kind === 'history' ? (
              <>
                <h2 id="cert-dialog-title">History · {dialog.title}</h2>
                <History events={dialog.events} />
                <div className="ad-modal-actions"><button type="button" className="ad-btn" onClick={() => setDialog(null)}>Close</button></div>
              </>
            ) : (
              <form onSubmit={(e) => submit(e)}>
                <h2 id="cert-dialog-title">
                  {dialog.kind === 'review' ? 'Review application' : dialog.kind === 'issue' ? 'Issue a certificate' : dialog.kind === 'reissue' ? `Reissue ${dialog.item.code}` : `${dialog.item.status === 'valid' ? 'Revoke' : 'Restore'} ${dialog.item.code}`}
                </h2>
                {dialog.kind === 'review' && (
                  <dl className="ad-cert-facts">
                    <dt>Account</dt><dd>{dialog.item.user_email}</dd>
                    {dialog.item.phone && <><dt>Phone</dt><dd>{dialog.item.phone}</dd></>}
                    {dialog.item.batch && <><dt>Batch</dt><dd>{dialog.item.batch}</dd></>}
                    {dialog.item.note && <><dt>Learner note</dt><dd>{dialog.item.note}</dd></>}
                  </dl>
                )}
                {dialog.kind === 'review' && <p className="ad-muted">Check attendance and fees in your records first. You can correct the name, course or date before issuing.</p>}
                {dialog.kind === 'reissue' && <p className="ad-muted">The new certificate gets a new ID. The current ID will verify as “replaced”.</p>}
                {dialog.kind === 'revoke' && <p className="ad-muted">{dialog.item.status === 'valid' ? 'Verification will show this ID as revoked and it can no longer be downloaded. The reason stays internal.' : 'The certificate becomes valid again.'}</p>}
                {dialog.kind !== 'revoke' && fields}
                {dialog.kind === 'issue' && <label className="ad-field"><span>Learner account email</span><input className="ad-input" type="email" value={form.user_email} onChange={(e) => set('user_email', e.target.value)} /><span className="ad-hint">Optional. Links the certificate to the learner&apos;s account so they can download it.</span></label>}
                <label className="ad-field">
                  <span>{dialog.kind === 'review' ? 'Note (required to reject; shown to the learner)' : dialog.kind === 'issue' ? 'Internal note' : 'Reason (internal) *'}</span>
                  <textarea className="ad-input" rows={2} maxLength={500} required={dialog.kind === 'reissue' || dialog.kind === 'revoke'} value={form.note} onChange={(e) => set('note', e.target.value)} />
                </label>
                {error && <p className="ad-error" role="alert">{error}</p>}
                <div className="ad-modal-actions">
                  <button type="button" className="ad-btn" onClick={() => setDialog(null)}>Cancel</button>
                  {dialog.kind === 'review' && <button type="button" className="ad-btn ad-btn-danger" disabled={busy} onClick={(e) => submit(e, 'reject')}>Reject</button>}
                  <button type="submit" className={`ad-btn ${dialog.kind === 'revoke' && dialog.item.status === 'valid' ? 'ad-btn-danger' : 'ad-btn-primary'}`} disabled={busy}>
                    {busy ? 'Saving…' : dialog.kind === 'review' ? 'Approve & issue' : dialog.kind === 'issue' ? 'Issue' : dialog.kind === 'reissue' ? 'Reissue' : dialog.item.status === 'valid' ? 'Revoke' : 'Restore'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  )
}
