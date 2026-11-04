import { useState, type ChangeEvent } from 'react'
import { api } from '../lib/api'
import { AiPage, Busy, Callout, Chips, ConsentBox, ErrorBox, Points, errorMessage, formatDate, useResumes } from './ai-shared'

type Analysis = {
  candidate: { name: string; email: string; phone: string; links: string[] }
  summary: string; technical_skills: string[]; tools_and_technologies: string[]
  education: { institution: string; degree: string; year: string }[]
  experience: { company: string; role: string; duration: string; highlights: string[] }[]
  projects: { name: string; description: string; technologies: string[] }[]
  certifications: string[]
  structure: { sections_found: string[]; length_note: string; formatting_notes: string[] }
  strengths: string[]; weaknesses: string[]; missing_skills: string[]; ats_feedback: string[]; improvement_suggestions: string[]
  recommended_roles: string[]; technical_questions: string[]; project_questions: string[]
  ats_disclaimer: string; unverified_items_removed: number
}
type AnalysisResponse = { id: number; target_role: string; created_at: string; cached: boolean; analysis: Analysis }

const MAX_BYTES = 5 * 1024 * 1024

export function ResumeAnalyzer() {
  const { resumes, loading, reload } = useResumes()
  const [selected, setSelected] = useState<number | null>(null)
  const [targetRole, setTargetRole] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<AnalysisResponse | null>(null)

  async function run<T>(what: string, work: () => Promise<T>): Promise<T | undefined> {
    setBusy(what); setError('')
    try { return await work() } catch (e) { setError(errorMessage(e)); return undefined } finally { setBusy('') }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) { setError('Please choose a PDF file.'); return }
    if (file.size > MAX_BYTES) { setError('The file is larger than 5 MB.'); return }
    const form = new FormData()
    form.append('file', file)
    const data = await run('Uploading and reading your PDF…', async () => (await api.post<{ id: number }>('/ai/resume/upload/', form)).data)
    if (data) { setSelected(data.id); setResult(null); await reload() }
  }

  async function analyze(force = false) {
    if (selected === null) return
    const data = await run('Analysing your resume. This can take up to 30 seconds.', async () =>
      (await api.post<AnalysisResponse>('/ai/resume/analyze/', { resume_id: selected, target_role: targetRole, consent, force })).data)
    if (data) { setResult(data); await reload() }
  }

  async function openSaved(id: number) {
    setSelected(id)
    const data = await run('Loading…', async () => (await api.get<{ latest_analysis: AnalysisResponse | null }>(`/ai/resume/${id}/`)).data)
    setResult(data?.latest_analysis ?? null)
  }

  async function remove(id: number) {
    if (!window.confirm('Delete this resume and its analyses? This cannot be undone.')) return
    const done = await run('Deleting…', async () => { await api.delete(`/ai/resume/${id}/`); return true })
    if (done) { if (selected === id) { setSelected(null); setResult(null) } await reload() }
  }

  async function download(format: 'md' | 'json') {
    if (selected === null) return
    const blob = await run('Preparing the file…', async () => (await api.get<Blob>(`/ai/resume/${selected}/download/`, { params: { format }, responseType: 'blob' })).data)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `resume-analysis.${format}`
    link.click()
    URL.revokeObjectURL(url)
  }

  const a = result?.analysis
  return (
    <AiPage kicker="AI RESUME ANALYZER" title="Get feedback on your resume" intro="Upload your resume as a PDF. You get a summary, strengths and gaps, ATS-oriented tips and interview questions based on your own projects.">
      <section className="learn-section">
        <h2>1. Your resume</h2>
        <label className="ai-field"><span>Upload a PDF (up to 5 MB, 10 pages, with selectable text)</span><input type="file" accept="application/pdf,.pdf" onChange={(e) => void upload(e)} disabled={!!busy} /></label>
        {!loading && resumes.length > 0 && (
          <ul className="ai-list">
            {resumes.map((r) => (
              <li key={r.id}>
                <label><input type="radio" name="resume" checked={selected === r.id} onChange={() => void openSaved(r.id)} /> <b>{r.original_name}</b> <span className="ai-note">{r.page_count} page{r.page_count === 1 ? '' : 's'} · uploaded {formatDate(r.created_at)}{r.analyses > 0 && ' · analysed'}</span></label>
                <button type="button" className="link" onClick={() => void remove(r.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
        <p className="ai-note">Your PDF is stored privately and only you can see it. You can delete it at any time.</p>
      </section>
      <section className="learn-section">
        <h2>2. Analyse it</h2>
        <div className="ai-form">
          <label className="ai-field"><span>Target role (optional)</span><input value={targetRole} maxLength={80} onChange={(e) => setTargetRole(e.target.value)} placeholder="For example: Python Developer" /></label>
          <ConsentBox checked={consent} onChange={setConsent} />
          <div className="learn-card-actions">
            <button className="learn-button" disabled={!!busy || selected === null || !consent} onClick={() => void analyze(false)}>Analyse my resume</button>
            {result && <button className="learn-button learn-button-quiet" disabled={!!busy || !consent} onClick={() => void analyze(true)}>Analyse again</button>}
          </div>
          {selected === null && <p className="ai-note">Upload or select a resume first.</p>}
        </div>
        {busy && <Busy text={busy} />}
        <ErrorBox message={error} />
      </section>
      {a && result && (
        <section className="learn-section ai-result">
          <div className="ai-meta">
            <h2 style={{ margin: 0 }}>Your resume analysis</h2>
            {result.cached && <span className="ai-badge">Saved result</span>}
            <button className="learn-button learn-button-quiet" onClick={() => void download('md')}>Download (.md)</button>
            <button className="learn-button learn-button-quiet" onClick={() => void download('json')}>Download (.json)</button>
          </div>
          <Callout title={a.candidate.name || 'Candidate'}>{[a.candidate.email, a.candidate.phone, ...a.candidate.links].filter(Boolean).join('  ·  ') || 'No contact details found in the PDF.'}</Callout>
          <p>{a.summary}</p>
          <div className="ai-columns">
            <Chips title="Technical skills" items={a.technical_skills} />
            <Chips title="Tools and technologies" items={a.tools_and_technologies} />
            <Chips title="Certifications" items={a.certifications} />
            <Chips title="Recommended roles" items={a.recommended_roles} />
          </div>
          {a.education.length > 0 && <Points title="Education" items={a.education.map((e) => [e.degree, e.institution, e.year].filter(Boolean).join(', '))} />}
          {a.experience.length > 0 && <div className="ai-points"><h4>Experience</h4><ul className="lesson-list">{a.experience.map((e, i) => <li key={i}><b>{e.role}</b> at {e.company} {e.duration && `(${e.duration})`}{e.highlights?.length > 0 && <ul>{e.highlights.map((h, n) => <li key={n}>{h}</li>)}</ul>}</li>)}</ul></div>}
          {a.projects.length > 0 && <div className="ai-points"><h4>Projects</h4><ul className="lesson-list">{a.projects.map((p, i) => <li key={i}><b>{p.name}</b>: {p.description} {p.technologies?.length > 0 && <span className="ai-note">({p.technologies.join(', ')})</span>}</li>)}</ul></div>}
          <div className="ai-columns">
            <Points title="Strengths" items={a.strengths} kind="good" />
            <Points title="Weaknesses" items={a.weaknesses} kind="bad" />
            <Points title="Skills to add" items={a.missing_skills} kind="warn" />
            <Points title="How to improve" items={a.improvement_suggestions} />
          </div>
          <Points title="Structure and formatting" items={[a.structure.length_note, ...(a.structure.formatting_notes ?? [])].filter(Boolean)} />
          <Points title="ATS-oriented feedback" items={a.ats_feedback} />
          <p className="ai-note">{a.ats_disclaimer}</p>
          <div className="ai-columns">
            <Points title="Technical questions you may be asked" items={a.technical_questions} />
            <Points title="Questions about your projects and work" items={a.project_questions} />
          </div>
          {a.unverified_items_removed > 0 && <p className="ai-note">{a.unverified_items_removed} item(s) the AI suggested were removed because they are not in your resume.</p>}
        </section>
      )}
    </AiPage>
  )
}
