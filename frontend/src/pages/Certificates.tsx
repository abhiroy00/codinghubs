import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LearnFrame } from '../learning/LearnFrame'
import { HeroVideo } from '../components/HeroVideo'
import { useCertificates } from '../learning/certificates'
import { COURSE_BY_SLUG, COURSE_CATALOG } from '../learning/catalog'
import { api } from '../lib/api'
import { CERTIFICATES_FAQ, CERTIFICATES_META, pageSeo } from '../seo/site'
import './certificates.css'

const TOTAL_DAYS = 30

interface Application { id: number; course_name: string; completed_on: string; status: 'pending' | 'approved' | 'rejected'; staff_note: string; created_at: string }
interface InstituteCertificate { code: string; recipient_name: string; course_name: string; completed_on: string; issued_on: string; status: 'valid' | 'revoked' | 'replaced' }

const longDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long' })
const STATUS_TEXT: Record<Application['status'], string> = { pending: 'Under review', approved: 'Approved', rejected: 'Not approved' }

function errorText(error: unknown) {
  const response = (error as { response?: { status?: number; data?: Record<string, unknown> } }).response
  if (response?.status === 429) return 'Too many attempts. Please wait a few minutes and try again.'
  if (!response?.data) return 'Could not reach the server. Please check your connection and try again.'
  return Object.values(response.data).flat().map(String).join(' ')
}

/** Verify form: sends the visitor to the noindex result page. */
export function VerifyForm({ initial = '' }: { initial?: string }) {
  const navigate = useNavigate()
  const [code, setCode] = useState(initial)
  return (
    <form className="cert-verify-form" role="search" onSubmit={(e) => { e.preventDefault(); if (code.trim()) navigate(`/certificates/verify/?id=${encodeURIComponent(code.trim())}`) }}>
      <label htmlFor="cert-code">Certificate ID</label>
      <div>
        <input id="cert-code" name="id" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CH-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} maxLength={24} required />
        <button type="submit" className="learn-button">Verify</button>
      </div>
    </form>
  )
}

/** The blank certificate of completion, as supplied by the institute. */
function CertificatePreview() {
  return (
    <figure className="cert-preview">
      <img src="/assets/certificate-of-completion.jpg" alt="Blank Coding Hubs School of AI certificate of completion" width={1200} height={848} decoding="async" />
      <figcaption>Certificate of Completion</figcaption>
    </figure>
  )
}

function ApplyForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ full_name: '', course_name: '', batch: '', completed_on: '', phone: '', note: '' })
  const [state, setState] = useState<{ busy: boolean; error: string }>({ busy: false, error: '' })
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))
  const today = new Date().toISOString().slice(0, 10)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setState({ busy: true, error: '' })
    try {
      await api.post('/certificates/applications/', form)
      setForm({ full_name: '', course_name: '', batch: '', completed_on: '', phone: '', note: '' })
      setState({ busy: false, error: '' })
      onDone()
    } catch (error) {
      setState({ busy: false, error: errorText(error) })
    }
  }

  return (
    <form className="cert-form" onSubmit={submit}>
      <label><span>Full name for the certificate *</span><input required maxLength={80} autoComplete="name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></label>
      <label><span>Course *</span><input required maxLength={120} list="cert-courses" value={form.course_name} onChange={(e) => set('course_name', e.target.value)} placeholder="Start typing your course" /></label>
      <datalist id="cert-courses">{COURSE_CATALOG.map((c) => <option key={c.slug} value={c.name} />)}</datalist>
      <label><span>Course completed on *</span><input type="date" required max={today} value={form.completed_on} onChange={(e) => set('completed_on', e.target.value)} /></label>
      <label><span>Batch or trainer</span><input maxLength={80} value={form.batch} onChange={(e) => set('batch', e.target.value)} placeholder="e.g. Weekend batch, NSP, Jan 2026" /></label>
      <label><span>Phone</span><input type="tel" maxLength={20} autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="If our team needs to reach you" /></label>
      <label className="cert-form-wide"><span>Anything we should know</span><textarea rows={2} maxLength={500} value={form.note} onChange={(e) => set('note', e.target.value)} /></label>
      {state.error && <p className="cert-error cert-form-wide" role="alert">{state.error}</p>}
      <div className="cert-form-wide"><button type="submit" className="learn-button" disabled={state.busy}>{state.busy ? 'Sending…' : 'Submit application'}</button></div>
    </form>
  )
}

function useInstitute(signedIn: boolean) {
  const [data, setData] = useState<{ applications: Application[]; certificates: InstituteCertificate[] } | null>(null)
  const load = useCallback(() => {
    if (!signedIn) { setData(null); return }
    api.get('/certificates/mine/').then(({ data }) => setData(data)).catch(() => setData({ applications: [], certificates: [] }))
  }, [signedIn])
  useEffect(load, [load])
  return { data, reload: load }
}

type Panel = 'apply' | 'download' | 'verify'
const ACTIONS: { id: Panel; label: string; icon: string }[] = [
  { id: 'apply', label: 'Apply for Certificate', icon: '→' },
  { id: 'download', label: 'Download Certificate', icon: '↓' },
  { id: 'verify', label: 'Verify Certificate', icon: '✓' },
]

/** The service the visitor picked. It is kept in the URL hash, so /certificates/#verify opens that form directly. */
function usePanel() {
  const [panel, setPanel] = useState<Panel | null>(null)
  useEffect(() => {
    const read = () => setPanel(ACTIONS.find((a) => `#${a.id}` === window.location.hash)?.id ?? null)
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])
  useEffect(() => {
    if (panel) document.getElementById('cert-panel')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [panel])
  const open = (id: Panel) => {
    window.history.replaceState(window.history.state, '', `#${id}`)
    setPanel(id)
  }
  return { panel, open }
}

/** /certificates/: apply for, download and verify Coding Hubs certificates, plus the online roadmap certificates. */
export function Certificates() {
  const { user, days, certificates, loading } = useCertificates()
  const seo = useMemo(() => pageSeo(CERTIFICATES_META), [])
  const institute = useInstitute(!!user)
  const [sent, setSent] = useState(false)
  const { panel, open } = usePanel()
  const [downloadError, setDownloadError] = useState('')
  const roadmap = Object.values(certificates)
  const inProgress = Object.entries(days)
    .filter(([slug, done]) => done > 0 && !certificates[slug] && COURSE_BY_SLUG.has(slug))
    .sort((a, b) => b[1] - a[1])

  async function download(code: string) {
    setDownloadError('')
    try {
      const { data } = await api.post<{ url: string }>(`/certificates/${code}/link/`)
      window.location.assign(data.url)
    } catch (error) {
      setDownloadError(errorText(error))
    }
  }

  const signIn = (section: string) => (
    <div className="certificate-locked">
      <b>Sign in to {section}</b>
      <p>Certificates are linked to your Coding Hubs account, so only you can apply for and download yours.</p>
      <Link className="learn-button" to={`/login?next=${encodeURIComponent(`/certificates/#${panel}`)}`}>Sign in</Link>
    </div>
  )

  return (
    <LearnFrame metadata={seo}>
      <div className="learn-shell certificates-page">
        <header className="learn-hero cert-hero hv-host">
          <HeroVideo clip="faq" />
          <p className="learn-kicker">CODING HUBS SCHOOL OF AI</p>
          <h1>Get Your Certificate</h1>
          <p>Apply, verify your achievement, and download your course certificate.</p>
        </header>

        <section className="cert-hub" aria-label="Certificate services">
          <div className="cert-hub-preview"><CertificatePreview /></div>
          <div className="cert-hub-actions">
            {ACTIONS.map((a) => (
              <button key={a.id} type="button" aria-expanded={panel === a.id} aria-controls={panel === a.id ? 'cert-panel' : undefined} onClick={() => open(a.id)}>
                <span>{a.label}</span><span aria-hidden="true">{a.icon}</span>
              </button>
            ))}
          </div>
        </section>

        {panel && <div id="cert-panel">
        {panel === 'verify' && (
          <section className="learn-section" aria-labelledby="cert-verify-title">
            <h2 id="cert-verify-title">Verify a certificate</h2>
            <p className="learn-muted">Enter the ID printed at the bottom of the certificate, or scan its QR code. The result shows whether it is valid, with the course, dates and the holder&apos;s initials. Full names and contact details are never shown.</p>
            <VerifyForm />
          </section>
        )}

        {panel === 'apply' && (
        <section className="learn-section" aria-labelledby="cert-apply-title">
          <h2 id="cert-apply-title">Apply for a certificate</h2>
          <div className="cert-two">
            <div className="cert-help">
              <h3>Who can apply</h3>
              <ul>
                <li>Learners who completed a classroom or live online course with Coding Hubs School of AI.</li>
                <li>You need the attendance and project or assessment requirements your trainer set for the batch.</li>
                <li>Fees for the course should be cleared.</li>
              </ul>
              <h3>What happens next</h3>
              <ol>
                <li>You submit the form once per course. You can see its status here.</li>
                <li>Our academic team checks your records. They may call you if something needs confirming.</li>
                <li>When approved, the certificate appears below under Download with its unique ID. If not approved, you will see the reason.</li>
              </ol>
            </div>
            <div>
              {!user ? signIn('apply') : (
                <>
                  {sent && <p className="cert-ok" role="status">Application received. You can follow its status below.</p>}
                  <ApplyForm onDone={() => { setSent(true); institute.reload() }} />
                </>
              )}
            </div>
          </div>
          {user && !!institute.data?.applications.length && (
            <>
              <h3>Your applications</h3>
              <ul className="certificates-list">
                {institute.data.applications.map((a) => (
                  <li key={a.id}>
                    <b>{a.course_name}</b>
                    <span>Completed {longDate(a.completed_on)} · Applied {longDate(a.created_at)} · <em className={`cert-status cert-status-${a.status}`}>{STATUS_TEXT[a.status]}</em></span>
                    {a.status === 'rejected' && a.staff_note && <span>Reason: {a.staff_note}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        )}

        {panel === 'download' && (<>
        <section className="learn-section" aria-labelledby="cert-download-title">
          <h2 id="cert-download-title">Download your certificate</h2>
          {!user ? signIn('download your certificates') : loading || !institute.data ? null : (
            <>
              {downloadError && <p className="cert-error" role="alert">{downloadError}</p>}
              {institute.data.certificates.length > 0 && (
                <ul className="certificates-list">
                  {institute.data.certificates.map((c) => (
                    <li key={c.code}>
                      <b>{c.course_name}</b>
                      <span>{c.recipient_name} · Completed {longDate(c.completed_on)} · ID <code>{c.code}</code></span>
                      {c.status === 'valid'
                        ? <button type="button" className="learn-button" onClick={() => void download(c.code)}>Download PDF</button>
                        : <span className="cert-status cert-status-rejected">This certificate was revoked. Contact us if you think this is a mistake.</span>}
                    </li>
                  ))}
                </ul>
              )}
              {roadmap.length > 0 && (
                <>
                  <h3>Online roadmap certificates</h3>
                  <ul className="certificates-list">
                    {roadmap.map((record) => (
                      <li key={record.certificate_id}>
                        <b>{record.course_name}</b>
                        <span>Completed {new Date(record.completed_at).toLocaleDateString('en-IN', { dateStyle: 'long' })} · ID {record.certificate_id}</span>
                        <Link className="learn-button learn-button-quiet" to={`/interview/${record.course_slug}/#certificate`}>View certificate</Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {!institute.data.certificates.length && !roadmap.length && <p className="learn-muted">No certificates in your account yet. Use Apply for Certificate once you finish your course.</p>}
              <p className="learn-muted">Download links work for 10 minutes. Click Download again any time for a fresh copy.</p>
            </>
          )}
        </section>

        <section className="learn-section" aria-labelledby="cert-how">
          <h2 id="cert-how">Free online roadmap certificates</h2>
          <ol className="certificates-steps">
            <li><b>Choose a course roadmap.</b> Every course in <Link to="/interview/">Interview preparation</Link> has a free 30-day roadmap of lessons, practice and quizzes.</li>
            <li><b>Complete and save all 30 days.</b> Sign in so your progress is saved to your account on every device.</li>
            <li><b>Get your roadmap certificate.</b> It is issued automatically when all 30 days are recorded and stays in your account.</li>
          </ol>
          {inProgress.length > 0 && (
            <ul className="certificates-list">
              {inProgress.map(([slug, done]) => (
                <li key={slug}>
                  <b>{COURSE_BY_SLUG.get(slug)!.name}</b>
                  <span>{done}/{TOTAL_DAYS} days complete · {Math.round((done / TOTAL_DAYS) * 100)}%</span>
                  <div className="learn-progress"><div><i style={{ width: `${(done / TOTAL_DAYS) * 100}%` }} /></div></div>
                  <Link className="learn-button learn-button-quiet" to={`/interview/${slug}/`}>Continue roadmap</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        </>)}
        </div>}

        <section className="learn-section" aria-labelledby="cert-faq-title">
          <h2 id="cert-faq-title">Certificate questions</h2>
          <div className="cert-faq">
            {CERTIFICATES_FAQ.map((item) => (
              <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>
            ))}
          </div>
        </section>
      </div>
    </LearnFrame>
  )
}
