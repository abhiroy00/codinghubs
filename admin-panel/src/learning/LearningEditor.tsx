import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminApi, type Paged } from '../api'
import { PartEditor } from './PartEditor'
import { CATEGORIES, PART_LABELS, PARTS, type HistoryRow, type Lesson, type Metadata, type Part } from './types'
import './learning-admin.css'

function errorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: unknown } }).response
  if (response?.status === 409) return 'Another editor changed this lesson. Your text is still here. Export your draft before reloading, then merge it with the latest revision.'
  if (response?.status === 403) return 'Your account does not have permission for this action.'
  return response?.data ? JSON.stringify(response.data) : 'The request failed. Your text is still here; check your connection before retrying.'
}

function DraftPreview({ lesson }: { lesson: Lesson }) {
  return <article className="la-preview"><p className="ad-notice">Preview of the current editor text. This has not been published or automatically verified.</p><h1>{lesson.title}</h1><p>{lesson.seo_description}</p>{PARTS.map((part, i) => <section key={part}><h2>{i + 1}. {PART_LABELS[i]}</h2>{lesson.content[part].blocks.map((block, index) => <section key={index}><h3>{block.title}</h3>{block.type === 'text' ? block.body.split('\n\n').map((p, j) => <p key={j}>{p}</p>) : <pre>{block.body}</pre>}{block.type === 'code' && block.expected_output && <details><summary>Reviewed expected output</summary><pre>{block.expected_output}</pre></details>}</section>)}{part === 'assessment' && <>{lesson.content.assessment.quiz?.map((q, index) => <section key={index}><h3>{q.question}</h3><ol>{q.options.map((o, j) => <li key={j}>{o}</li>)}</ol><details><summary>Answer and explanation</summary><p>Option {q.answer + 1}: {q.explanation}</p></details></section>)}{CATEGORIES.map(category => <section key={category}><h3>{category}</h3>{lesson.content.assessment[category]?.map((q, j) => <details key={j}><summary>{q.question}</summary><p>{q.answer}</p></details>)}</section>)}<h3>Mini assignment</h3>{Object.entries(lesson.content.assessment.assignment ?? {}).map(([key, value]) => <section key={key}><h4>{key.replaceAll('_', ' ')}</h4><p>{value}</p></section>)}<h3>Self assessment</h3><ul>{lesson.content.assessment.self_assessment?.map((v, j) => <li key={j}>{v}</li>)}</ul></>}</section>)}</article>
}

export function LearningEditor() {
  const { id } = useParams()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [part, setPart] = useState<Part>('concept')
  const [history, setHistory] = useState<Paged<HistoryRow> | null>(null)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTick, setHistoryTick] = useState(0)
  const [historyError, setHistoryError] = useState('')
  const [revision, setRevision] = useState<{ id: number; edit_version: number; snapshot: unknown } | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [preview, setPreview] = useState(false)
  const [codeChecked, setCodeChecked] = useState(false)
  const [prerequisiteSearch, setPrerequisiteSearch] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true); setLesson(null); setError(''); setNotice(''); setDirty(false); setRevision(null); setCodeChecked(false); setHistoryPage(1)
    Promise.all([adminApi.get<Lesson>(`/learning/concepts/${id}/`), adminApi.get<Metadata>('/learning/metadata/')]).then(([l, m]) => {
      if (active) { setLesson(l.data); setMetadata(m.data) }
    }).catch(e => { if (active) setError(errorMessage(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    let active = true
    setHistoryError('')
    adminApi.get<Paged<HistoryRow>>(`/learning/concepts/${id}/history/`, { params: { page: historyPage } }).then(r => { if (active) setHistory(r.data) }).catch(() => { if (active) setHistoryError('History could not be loaded. Reload before restoring a revision.') })
    return () => { active = false }
  }, [id, historyPage, historyTick])

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const guardLink = (event: MouseEvent) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (link && link.getAttribute('target') !== '_blank' && !window.confirm('Leave this lesson with unsaved changes? Export or save your draft first if you need to keep them.')) {
        event.preventDefault(); event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', guardLink, true)
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', guardLink, true) }
  }, [dirty])

  function change(next: Lesson) { setLesson(next); setDirty(true); setCodeChecked(false); setNotice('') }

  function accept(next: Lesson, text: string) {
    setLesson(next); setDirty(false); setNotice(text); setCodeChecked(false); setRevision(null)
    setHistoryPage(1); setHistoryTick(n => n + 1)
  }

  async function save() {
    if (!lesson) return
    setBusy(true); setError(''); setNotice('')
    try {
      const { data } = await adminApi.patch<Lesson>(`/learning/concepts/${id}/`, {
        edit_version: lesson.edit_version, title: lesson.title, difficulty: lesson.difficulty,
        seo_description: lesson.seo_description, outcomes: lesson.outcomes.map(v => v.trim()).filter(Boolean),
        references: lesson.references, prerequisites: lesson.prerequisites, content: lesson.content,
        status: ['approved', 'published'].includes(lesson.status) ? 'draft' : lesson.status,
      })
      accept(data, 'Draft saved. The previous saved state is available in history. Published content is unchanged.')
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  async function action(name: 'approve' | 'publish' | 'restore', revisionId?: number) {
    if (!lesson) return
    if (name === 'restore' && !window.confirm('Restore this saved revision as a new draft? The current saved state will also remain in history. Unsaved editor changes will be replaced.')) return
    if (name === 'publish' && !window.confirm('Publish this approved draft as a new live lesson version? Learners will be asked to review the updated version.')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const { data } = await adminApi.post<Lesson>(`/learning/concepts/${id}/${name}/`, { edit_version: lesson.edit_version, code_verified: codeChecked, ...(revisionId ? { revision_id: revisionId } : {}) })
      accept(data, name === 'restore' ? 'Restored as a draft. Fresh review is required before publication.' : name === 'approve' ? 'Review recorded. This approved version is ready for the separate publish action.' : 'Published a new lesson version.')
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  function exportDraft() {
    if (!lesson) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(lesson, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `${lesson.slug}-draft-${lesson.edit_version}.json`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (loading) return <p role="status">Loading lesson editor…</p>
  if (!lesson) return <div><p className="ad-error" role="alert">{error || 'Lesson not found.'}</p><Link to="/learning">Back to curriculum</Link></div>
  return <div className="la-workspace"><header><Link to="/learning">← Generative AI curriculum</Link><h1>{lesson.title}</h1><p>Draft revision {lesson.edit_version} · {lesson.status.replaceAll('_', ' ')} · {lesson.published_version ? `Published version ${lesson.published_version} remains live` : 'Not published'}</p></header>
    <div className="la-toolbar"><button type="button" className="ad-btn ad-btn-primary" disabled={busy || !lesson.can_edit} onClick={() => void save()}>Save draft</button><button type="button" className="ad-btn" onClick={() => setPreview(p => !p)}>{preview ? 'Return to editor' : 'Preview current text'}</button><button type="button" className="ad-btn" onClick={exportDraft}>Export draft JSON</button><a className="ad-btn" href={`${lesson.public_url}?preview=1`} target="_blank" rel="noreferrer">Open saved draft workspace</a>{dirty && <strong>Unsaved changes</strong>}{busy && <span role="status">Saving…</span>}</div>
    {error && <p role="alert" className="ad-error la-feedback">{error}</p>}{notice && <p role="status" className="ad-notice">{notice}</p>}
    {preview ? <DraftPreview lesson={lesson} /> : <><fieldset disabled={busy || !lesson.can_edit} className="la-fields"><legend>Lesson metadata</legend><label>Title<input className="ad-input" maxLength={180} value={lesson.title} onChange={e => change({ ...lesson, title: e.target.value })} /></label><p className="ad-hint">Public URL: {lesson.public_url}</p><label>SEO description<textarea className="ad-input" rows={3} maxLength={300} value={lesson.seo_description} onChange={e => change({ ...lesson, seo_description: e.target.value })} /></label><div className="la-filters"><label>Difficulty<select className="ad-input" value={lesson.difficulty} onChange={e => change({ ...lesson, difficulty: e.target.value })}>{['beginner', 'intermediate', 'advanced'].map(v => <option key={v}>{v}</option>)}</select></label><label>Draft workflow<select className="ad-input" value={lesson.status} onChange={e => change({ ...lesson, status: e.target.value })}>{['not_started', 'draft', 'in_review'].map(v => <option key={v} value={v}>{v.replaceAll('_', ' ')}</option>)}{['approved', 'published'].includes(lesson.status) && <option value={lesson.status}>{lesson.status} — saving creates a draft</option>}</select></label></div><label>Learning outcomes (one per line)<textarea className="ad-input" rows={5} value={lesson.outcomes.join('\n')} onChange={e => change({ ...lesson, outcomes: e.target.value.split('\n') })} /></label><h3>References</h3>{lesson.references.map((reference, i) => <div className="la-block" key={i}><label>Reference title<input className="ad-input" value={reference.title} onChange={e => change({ ...lesson, references: lesson.references.map((r, j) => i === j ? { ...r, title: e.target.value } : r) })} /></label><label>HTTPS URL<input className="ad-input" type="url" value={reference.url} onChange={e => change({ ...lesson, references: lesson.references.map((r, j) => i === j ? { ...r, url: e.target.value } : r) })} /></label><button type="button" className="ad-btn" onClick={() => change({ ...lesson, references: lesson.references.filter((_, j) => i !== j) })}>Remove reference {i + 1}</button></div>)}<button type="button" className="ad-btn" onClick={() => change({ ...lesson, references: [...lesson.references, { title: '', url: '' }] })}>Add reference</button><details><summary>Prerequisite concepts ({lesson.prerequisites.length} selected)</summary><label>Search prerequisites<input className="ad-input" value={prerequisiteSearch} onChange={e => setPrerequisiteSearch(e.target.value)} /></label><div className="la-prerequisites">{metadata?.concepts.filter(c => c.id !== lesson.id && c.title.toLowerCase().includes(prerequisiteSearch.toLowerCase())).map(c => <label key={c.id}><input type="checkbox" checked={lesson.prerequisites.includes(c.id)} onChange={e => change({ ...lesson, prerequisites: e.target.checked ? [...lesson.prerequisites, c.id] : lesson.prerequisites.filter(v => v !== c.id) })} /> {c.title}</label>)}</div></details></fieldset>
    <nav className="la-part-tabs" aria-label="Four learning parts">{PARTS.map((p, i) => <button type="button" className="ad-btn" key={p} aria-pressed={p === part} onClick={() => setPart(p)}>{i + 1}. {PART_LABELS[i]}</button>)}</nav><h2>{PART_LABELS[PARTS.indexOf(part)]}</h2><PartEditor key={part} value={lesson.content[part]} assessment={part === 'assessment'} disabled={busy || !lesson.can_edit} onChange={v => change({ ...lesson, content: { ...lesson.content, [part]: v } })} /></>}
    <section className="la-quality"><h2>Quality checks for the saved draft</h2>{dirty && <p>These checks describe the last saved revision. Save your changes to refresh them.</p>}<dl>{PARTS.map((p, i) => <div key={p}><dt>Part {i + 1}</dt><dd>{lesson.quality.words[p]} / {lesson.quality.minimum_words[p]} minimum prose words</dd></div>)}</dl>{lesson.quality.issues.length ? <details><summary>{lesson.quality.issues.length} items need attention</summary><ul>{lesson.quality.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></details> : <p>Structural checks pass. Independent editorial and code review are still required.</p>}<p className="ad-hint">These checks cannot establish technical accuracy, originality or learning effectiveness.</p>{lesson.can_publish && <><label className="la-attestation"><input type="checkbox" checked={codeChecked} disabled={dirty || busy} onChange={e => setCodeChecked(e.target.checked)} /> I have reviewed this saved draft and executed its code examples, checking their expected outputs.</label><div className="la-actions"><button type="button" className="ad-btn" disabled={busy || dirty || !codeChecked || !lesson.quality.ready_for_review || lesson.status === 'published'} onClick={() => void action('approve')}>Approve reviewed draft</button><button type="button" className="ad-btn ad-btn-primary" disabled={busy || dirty || lesson.status !== 'approved'} onClick={() => void action('publish')}>Publish approved draft</button></div></>}{!lesson.can_publish && <p>Your account can {lesson.can_edit ? 'edit drafts' : 'read this content'}; approval and publication require an additional permission.</p>}</section>
    <section><h2>Saved draft history</h2><p>Restoring creates a new draft and preserves the current saved state. Published lesson versions are kept separately.</p>{historyError && <p role="alert">{historyError}</p>}{history?.results.length === 0 && <p>No earlier draft revisions yet.</p>}<ol className="la-history">{history?.results.map(r => <li key={r.id}><span>Revision {r.edit_version} · {r.reason} · {r.editor} · {new Date(r.created_at).toLocaleString()}</span><button type="button" className="ad-btn" disabled={busy} onClick={async () => { setError(''); try { const { data } = await adminApi.get(`/learning/concepts/${id}/history/${r.id}/`); setRevision(data) } catch (e) { setError(errorMessage(e)) } }}>Inspect revision {r.edit_version}</button></li>)}</ol><nav aria-label="Draft history pages" className="la-actions"><button type="button" className="ad-btn" disabled={historyPage === 1 || busy} onClick={() => setHistoryPage(p => p - 1)}>Newer revisions</button><span>Page {historyPage}</span><button type="button" className="ad-btn" disabled={!history?.next || busy} onClick={() => setHistoryPage(p => p + 1)}>Older revisions</button></nav>{revision && <section className="la-revision"><h3>Saved revision {revision.edit_version}</h3><pre>{JSON.stringify(revision.snapshot, null, 2)}</pre><div className="la-actions"><button type="button" className="ad-btn" onClick={() => setRevision(null)}>Close revision</button><button type="button" className="ad-btn" disabled={busy || !lesson.can_edit} onClick={() => void action('restore', revision.id)}>Restore as a new draft</button></div></section>}</section>
  </div>
}
