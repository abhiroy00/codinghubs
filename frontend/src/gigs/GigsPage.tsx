import { PageBannerArt } from '../components/PageBannerArt'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { PageFrame, useSeo } from '../content-pages/shared'
import './gigs.css'

type Brief = { slug: string; title: string; scope: string; deliverable: string; skills: string[]; status?: string }
type Proposal = { id: number; gig_slug: string; gig_title: string; pitch: string; created_at: string }
type Paged<T> = { results: T[]; count: number; next: string | null; previous: string | null }
const emptyPage: Paged<Brief> = { results: [], count: 0, next: null, previous: null }
function errorText(error: unknown) {
  const e = error as { response?: { status?: number; data?: { detail?: string } } }
  if (e.response?.status === 429) return 'Too many requests. Please try again later.'
  if (e.response?.status === 401) return 'Please sign in again.'
  if (typeof e.response?.data?.detail === 'string') return e.response.data.detail
  return 'The request could not be completed. Check your input and try again.'
}
function BriefForm({ brief, onSave, busy }: { brief?: Brief; onSave: (value: Omit<Brief, 'slug' | 'status'>) => void; busy: boolean }) {
  const [title, setTitle] = useState(brief?.title ?? '')
  const [scope, setScope] = useState(brief?.scope ?? '')
  const [deliverable, setDeliverable] = useState(brief?.deliverable ?? '')
  const [skills, setSkills] = useState(brief?.skills.join(', ') ?? '')
  function submit(event: FormEvent) {
    event.preventDefault()
    onSave({ title, scope, deliverable, skills: skills.split(',').map(s => s.trim()).filter(Boolean) })
  }
  return <form className="gig-form" onSubmit={submit}><p>Use plain text. Do not include contact details, credentials or confidential client data. Saving edits withdraws an approved brief for a fresh review.</p><label>Project title<input required minLength={10} maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label><label>Scope and constraints<textarea required minLength={80} maxLength={5000} rows={6} value={scope} onChange={e => setScope(e.target.value)} /></label><label>Expected deliverable<textarea required minLength={20} maxLength={1200} rows={3} value={deliverable} onChange={e => setDeliverable(e.target.value)} /></label><label>Skills, separated by commas (1–8, each 2–40 characters)<input required maxLength={326} value={skills} onChange={e => setSkills(e.target.value)} /></label><button disabled={busy} type="submit">Save draft</button></form>
}

export function GigsPage({ workspace = false }: { workspace?: boolean }) {
  const { slug } = useParams()
  const { user } = useAuth()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [params, setParams] = useSearchParams()
  const rawPage = params.get('page') ?? '1'
  const page = /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) ? Number(rawPage) : 1
  const search = (params.get('q') ?? '').trim().slice(0, 100)
  const setPage = (next: number | ((current: number) => number)) => {
    const value = typeof next === 'function' ? next(page) : next
    setParams({ ...(search ? { q: search } : {}), ...(value > 1 ? { page: String(value) } : {}) })
  }
  const [listing, setListing] = useState(emptyPage)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [owned, setOwned] = useState<Brief[]>([])
  const [submitted, setSubmitted] = useState<Proposal[]>([])
  const [received, setReceived] = useState<Paged<Proposal> | null>(null)
  const [proposalBrief, setProposalBrief] = useState<Brief | null>(null)
  const [proposalPage, setProposalPage] = useState(1)
  const [editing, setEditing] = useState<Brief | null>(null)
  const [pitch, setPitch] = useState('')
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadedKey, setLoadedKey] = useState('')
  const [revision, setRevision] = useState(0)
  const requestKey = JSON.stringify([workspace, slug, page, search, revision])
  const loading = enabled === true && loadedKey !== requestKey
  const seo = useMemo(() => {
    const title = (workspace ? 'Your gigs workspace' : brief?.title ?? 'Gigs pilot') + ' | Coding Hubs'
    const description = 'Moderated project briefs and private proposals in the CodingHubs Gigs pilot. Messaging, payments and identity verification are not available.'
    return { title, description, canonical: '', robots: 'noindex, follow', og: { type: 'website', title, description, image: 'https://codinghubs.in/assets/coding-hubs-school-of-ai-logo.jpeg', url: 'https://codinghubs.in/gigs' }, json_ld: null }
  }, [workspace, brief?.title])
  useSeo(seo)
  useEffect(() => {
    let active = true
    api.get('/gigs/status/').then(r => { if (active) setEnabled(r.data.enabled) }).catch(() => { if (active) setError('The pilot status is unavailable. Please try again later.') })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!enabled) return
    let active = true
    const req = workspace ? api.get('/gigs/workspace/') : slug ? api.get('/gigs/' + slug + '/') : api.get('/gigs/', { params: { page, q: search } })
    req.then(r => { if (!active) return; setError(''); if (workspace) { setOwned(r.data.briefs); setSubmitted(r.data.proposals) } else if (slug) setBrief(r.data); else setListing(r.data) }).catch(e => { if (active) { setBrief(null); setListing(emptyPage); setError(e.response?.status === 404 ? 'This brief is unavailable.' : errorText(e)) } }).finally(() => { if (active) setLoadedKey(requestKey) })
    return () => { active = false }
  }, [enabled, workspace, slug, page, search, revision, requestKey])
  useEffect(() => {
    if (!proposalBrief) return
    let active = true
    api.get('/gigs/' + proposalBrief.slug + '/proposals/', { params: { page: proposalPage } }).then(r => { if (active) setReceived(r.data) }).catch(e => { if (active) setError(errorText(e)) })
    return () => { active = false }
  }, [proposalBrief, proposalPage])
  async function action(work: () => Promise<unknown>, success: string) {
    setBusy(true); setError(''); setFeedback('')
    try { await work(); setFeedback(success); setRevision(n => n + 1) } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  const content = enabled === false ? <p>The Gigs pilot is not open. Course learning and interview preparation remain available.</p> : enabled === null ? <p role="status">Checking pilot availability…</p> : <>
    {workspace ? <>
      <section className="gig-panel"><h2>{editing ? 'Edit draft: ' + editing.title : 'Create a client brief'}</h2><BriefForm key={editing?.slug ?? 'new'} brief={editing ?? undefined} busy={busy} onSave={data => { void action(async () => { if (editing) await api.patch('/gigs/' + editing.slug + '/', data); else await api.post('/gigs/', data); setEditing(null) }, 'Draft saved. Submit it for staff review when ready.') }} />{editing && <button type="button" onClick={() => setEditing(null)}>Cancel editing</button>}</section>
      <section><h2>Your briefs</h2><p>Showing your latest 50 briefs. Only staff-approved open briefs are public.</p>{!loading && !owned.length && <p>You have not created a brief.</p>}{owned.map(item => <article className="gig-panel" key={item.slug}><h3>{item.title}</h3><p>Status: {item.status}</p><div className="gig-actions"><button disabled={busy} onClick={() => setEditing(item)}>Edit as draft</button>{['draft', 'rejected'].includes(item.status ?? '') && <button disabled={busy} onClick={() => { void action(() => api.post('/gigs/' + item.slug + '/submit/'), 'Brief submitted for staff review.') }}>Submit for review</button>}{item.status !== 'closed' && <button disabled={busy} onClick={() => { void action(() => api.post('/gigs/' + item.slug + '/close/'), 'Brief closed.') }}>Close brief</button>}<button disabled={busy} onClick={() => { setReceived(null); setProposalPage(1); setProposalBrief(item) }}>Read private proposals</button>{item.status === 'open' && <Link to={'/gigs/' + item.slug}>View public brief</Link>}</div></article>)}</section>
      {proposalBrief && <section className="gig-panel"><h2>Private proposals: {proposalBrief.title}</h2><p>Expressions of interest only. Applicant contact details are not shared by this pilot.</p>{received?.results.map(p => <article key={p.id}><h3>Proposal {p.id}</h3><p className="gig-text">{p.pitch}</p></article>)}{received && received.count === 0 && <p>No proposals yet.</p>}<div className="gig-actions"><button disabled={!received?.previous} onClick={() => setProposalPage(n => n - 1)}>Previous proposals</button><button disabled={!received?.next} onClick={() => setProposalPage(n => n + 1)}>Next proposals</button><button onClick={() => { setReceived(null); setProposalBrief(null) }}>Close proposals</button></div></section>}
      <section><h2>Your submitted proposals</h2><p>Showing your latest 50 submissions.</p>{!loading && !submitted.length && <p>No submissions yet.</p>}{submitted.map(p => <article className="gig-panel" key={p.id}><h3>{p.gig_title}</h3><p className="gig-text">{p.pitch}</p><p>Saved {new Date(p.created_at).toLocaleDateString('en-IN')}</p></article>)}</section>
    </> : slug ? <>{!loading && brief && <><section className="gig-panel"><h2>Project scope</h2><p className="gig-text">{brief.scope}</p><h2>Expected deliverable</h2><p className="gig-text">{brief.deliverable}</p><h2>Skills</h2><ul>{brief.skills.map(skill => <li key={skill}>{skill}</li>)}</ul></section>{user ? <><form className="gig-panel gig-form" onSubmit={e => { e.preventDefault(); void action(async () => { await api.post('/gigs/' + slug + '/proposals/', { pitch }); setPitch('') }, 'Private proposal saved. Messaging and work contracts are not available in this pilot.') }}><h2>Send a private proposal</h2><label>Approach, relevant skills and limits — no contact or confidential details<textarea required minLength={40} maxLength={3000} rows={6} value={pitch} onChange={e => setPitch(e.target.value)} /></label><button disabled={busy}>Send expression of interest</button></form><form className="gig-panel gig-form" onSubmit={e => { e.preventDefault(); void action(async () => { await api.post('/gigs/' + slug + '/report/', { reason }); setReason('') }, 'Report saved for staff review.') }}><h2>Report a concern</h2><label>Describe the issue without sensitive personal information<textarea required minLength={20} maxLength={1500} rows={3} value={reason} onChange={e => setReason(e.target.value)} /></label><button disabled={busy}>Report brief</button></form></> : <p><Link to="/login">Sign in</Link> to propose or report a concern.</p>}</>}</> : <>
      <form className="gig-form" onSubmit={e => { e.preventDefault(); const query = String(new FormData(e.currentTarget).get('q') ?? '').trim().slice(0, 100); setParams(query ? { q: query } : {}) }}><label>Search project titles<input key={search} name="q" maxLength={100} defaultValue={search} /></label><button>Search</button></form><section><h2>Open project briefs</h2>{!loading && listing.results.length === 0 && <p>No approved open briefs match this view.</p>}{listing.results.map(item => <article className="gig-panel" key={item.slug}><h3><Link to={'/gigs/' + item.slug}>{item.title}</Link></h3><p>{item.scope.slice(0, 220)}{item.scope.length > 220 ? '…' : ''}</p><p>Skills: {item.skills.join(', ')}</p></article>)}</section><nav className="gig-actions" aria-label="Listing pages"><button disabled={loading || !listing.previous} onClick={() => setPage(n => n - 1)}>Previous</button><span>Page {page}</span><button disabled={loading || !listing.next} onClick={() => setPage(n => n + 1)}>Next</button></nav>
    </>}{loading && <p role="status">Loading…</p>}
  </>
  return <PageFrame wide><div className="gig-shell"><nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link> / <Link to="/gigs">Gigs pilot</Link>{workspace && ' / Workspace'}</nav><header className="gig-hero hv-host"><PageBannerArt clip="projects" /><p className="gig-kicker">CODINGHUBS · STAGED PILOT</p><h1>{workspace ? 'Your gigs workspace' : slug ? brief?.title ?? 'Project brief' : 'Gigs pilot'}</h1><p>Explore bounded project briefs and private expressions of interest. Payments, escrow, messaging, identity verification and work contracts are not provided.</p><nav className="gig-actions" aria-label="Gigs navigation"><Link to="/gigs">Browse briefs</Link><Link to="/gigs/workspace">Your workspace</Link><Link to="/interview/">Continue interview preparation</Link></nav></header>{error && <p className="gig-error" role="alert">{error}</p>}{feedback && <p className="gig-feedback" role="status">{feedback}</p>}{content}</div></PageFrame>
}
