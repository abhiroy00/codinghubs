import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { fmtDate } from './format'
import { Field } from './fields'
import type { Common, Kind, Revision, Status } from './types'
import type { useContentForm } from './useContentForm'

type Api<T extends Common> = ReturnType<typeof useContentForm<T>>

export const KIND_LABEL: Record<Kind, string> = { blogs: 'Blogs', 'case-studies': 'Case studies', projects: 'Projects', 'project-guides': 'Project guides', products: 'Products' }
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', scheduled: 'Scheduled', published: 'Published', archived: 'Archived' }

export function ConfirmDelete({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="ad-modal" role="dialog" aria-modal="true" aria-label="Confirm delete" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="ad-modal-card">
        <h2>Delete permanently?</h2>
        <p>
          “{title || 'Untitled'}” will be removed for good. This cannot be undone. To hide it without deleting, use Unpublish or Archive instead.
        </p>
        <div className="ad-modal-actions">
          <button type="button" className="ad-btn" onClick={onCancel} autoFocus>
            Keep it
          </button>
          <button type="button" className="ad-btn ad-btn-danger" onClick={onConfirm}>
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  )
}

export function EditorShell<T extends Common>({ kind, api, noun, children, side, layout = 'split', publishBlock }: { kind: Kind; api: Api<T>; noun: string; children: ReactNode; side?: ReactNode; layout?: 'split' | 'single'; publishBlock?: string }) {
  const { form, dirty, busy, notice, loading, recover, revisions } = api
  const [confirm, setConfirm] = useState(false)
  if (loading) return <p className="ad-muted" role="status">Loading…</p>

  const future = form.published_at && new Date(form.published_at).getTime() > Date.now()
  const live = form.status === 'published' || form.status === 'scheduled'
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    void api.save()
  }

  if (layout === 'single') {
    return <SinglePost kind={kind} api={api} noun={noun} onSubmit={submit} publishBlock={publishBlock}>{children}</SinglePost>
  }

  return (
    <form className="ad-editor" onSubmit={submit} noValidate>
      <div className="ad-head">
        <div>
          {kind !== 'projects' && kind !== 'project-guides' && (
            <p className="ad-crumb">
              <Link to={`/${kind}`}>{KIND_LABEL[kind]}</Link> › {form.id ? 'Edit' : 'New'}
            </p>
          )}
          <h1 className="ad-h1">{form.title || `New ${noun}`}</h1>
        </div>
        <span className={`ad-badge st-${form.status}`}>{STATUS_LABEL[form.status]}</span>
      </div>

      {recover && (
        <div className="ad-banner" role="status">
          <span>We found unsaved changes from an earlier session in this browser.</span>
          <button type="button" className="ad-btn" onClick={api.acceptDraft}>Restore them</button>
          <button type="button" className="ad-btn" onClick={api.dropDraft}>Discard</button>
        </div>
      )}
      {notice && (
        <div className={`ad-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      )}

      <div className="ad-editor-grid">
        <div className="ad-editor-main">{children}</div>
        <aside className="ad-editor-side">
          <section className="ad-panel ad-sticky">
            <h2>Publish</h2>
            <Field label="Publish date and time" htmlFor="published_at" error={api.errors.published_at} hint="Leave empty to publish now. A future time schedules it; it goes live by itself, no one needs to be logged in.">
              <input id="published_at" type="datetime-local" className="ad-input" value={form.published_at} onChange={(e) => api.set('published_at' as keyof T, e.target.value as T[keyof T])} />
            </Field>
            <div className="ad-publish-actions">
              <button type="submit" className="ad-btn" disabled={busy}>
                {busy ? 'Working…' : form.status === 'draft' || !form.id ? 'Save draft' : 'Save changes'}
              </button>
              <button type="button" className="ad-btn" disabled={busy} onClick={() => void api.preview()}>
                Preview
              </button>
              {(!live || form.status === 'archived') && (
                <button type="button" className="ad-btn ad-btn-primary" disabled={busy} onClick={() => void api.publish(form.published_at || undefined)}>
                  {future ? 'Schedule' : 'Publish now'}
                </button>
              )}
              {live && form.status !== 'archived' && (
                <>
                  <button type="button" className="ad-btn ad-btn-primary" disabled={busy} onClick={() => void api.publish(form.published_at || undefined)}>
                    {future ? 'Reschedule' : 'Update live page'}
                  </button>
                  <button type="button" className="ad-btn" disabled={busy} onClick={() => void api.action('unpublish', 'Unpublished. It is no longer on the website.')}>
                    Unpublish
                  </button>
                </>
              )}
              {form.id && form.status !== 'archived' && (
                <button type="button" className="ad-btn" disabled={busy} onClick={() => void api.action('archive', 'Archived.')}>
                  Archive
                </button>
              )}
            </div>
            {dirty && <p className="ad-unsaved">You have unsaved changes.</p>}
            {form.id && (
              <button type="button" className="ad-link ad-danger" onClick={() => setConfirm(true)}>
                Delete…
              </button>
            )}
          </section>
          {side}
          {revisions.length > 0 && <Revisions list={revisions} onRestore={(id) => void api.restoreRevision(id)} />}
        </aside>
      </div>
      {confirm && <ConfirmDelete title={form.title} onCancel={() => setConfirm(false)} onConfirm={() => void api.remove()} />}
    </form>
  )
}

function Revisions({ list, onRestore }: { list: Revision[]; onRestore: (id: number) => void }) {
  return (
    <section className="ad-panel">
      <h2>Earlier versions</h2>
      <ul className="ad-revs">
        {list.slice(0, 8).map((r) => (
          <li key={r.id}>
            <span>{fmtDate(r.created_at, true)}</span>
            <button type="button" className="ad-link" onClick={() => window.confirm('Replace the current text with this earlier version? (The current text is kept as a version too.)') && onRestore(r.id)}>
              Restore
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}


const STATUS_OPTIONS: [Status, string][] = [
  ['draft', 'Draft — save only, do not publish'],
  ['published', 'Published — live on the website'],
  ['scheduled', 'Scheduled — goes live at the chosen time'],
  ['archived', 'Archived — hidden, kept for later'],
]

/** One wide card, fields top to bottom, status + buttons at the end (the layout editors know from other CMSs). */
function SinglePost<T extends Common>({ kind, api, noun, onSubmit, children, publishBlock }: { kind: Kind; api: Api<T>; noun: string; onSubmit: (e: React.FormEvent) => void; children: ReactNode; publishBlock?: string }) {
  const { form, dirty, busy, notice, recover, revisions } = api
  const [confirm, setConfirm] = useState(false)
  const future = !!form.published_at && new Date(form.published_at).getTime() > Date.now()
  const live = form.status === 'published' || form.status === 'scheduled'
  const heading = form.id ? `Edit ${noun}` : `Write New ${noun.replace(/\b\w/g, (c) => c.toUpperCase())}`
  const back = kind === 'blogs' ? 'All Posts' : kind === 'products' ? 'All Products' : 'All Case Studies'
  return (
    <form className="ad-post" onSubmit={onSubmit} noValidate>
      <div className="ad-post-card">
        <header className="ad-post-head">
          <h1><span className="ad-post-ico" aria-hidden="true">{form.id ? '✎' : '+'}</span> {heading}</h1>
          <span className={`ad-badge st-${form.status}`}>{STATUS_LABEL[form.status]}</span>
          <Link className="ad-btn-outline" to={`/${kind}`}>← {back}</Link>
        </header>
        {recover && (
          <div className="ad-banner" role="status">
            <span>We found unsaved changes from an earlier session in this browser.</span>
            <button type="button" className="ad-btn" onClick={api.acceptDraft}>Restore them</button>
            <button type="button" className="ad-btn" onClick={api.dropDraft}>Discard</button>
          </div>
        )}
        {notice && <div className={`ad-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</div>}
        <div className="ad-post-body">
          {children}
          <hr className="ad-hr" />
          <div className="ad-two">
            <Field label="Status" htmlFor="status" error={api.errors.status}>
              <select id="status" className="ad-input" value={form.status} onChange={(e) => api.set('status' as keyof T, e.target.value as T[keyof T])}>
                {STATUS_OPTIONS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
              </select>
            </Field>
            <div className="ad-field">
              <span className="ad-label">Featured {noun}?</span>
              <label className="ad-check ad-check-box" htmlFor="is_featured">
                <input id="is_featured" type="checkbox" checked={form.is_featured} onChange={(e) => api.set('is_featured' as keyof T, e.target.checked as T[keyof T])} /> ⭐ Show in the featured section
              </label>
            </div>
          </div>
          {(form.status === 'scheduled' || form.published_at) && (
            <Field label={form.status === 'scheduled' ? 'Go live on' : 'Publish date and time'} htmlFor="published_at" error={api.errors.published_at} hint="Leave empty to publish now. A future date and time schedules it; it goes live by itself, no one needs to be logged in.">
              <input id="published_at" type="datetime-local" className="ad-input" value={form.published_at} onChange={(e) => api.set('published_at' as keyof T, e.target.value as T[keyof T])} />
            </Field>
          )}
          {!form.published_at && form.status !== 'scheduled' && (
            <button type="button" className="ad-link" onClick={() => api.set('published_at' as keyof T, new Date(Date.now() + 3600_000 - (Date.now() % 60000)).toISOString().slice(0, 16) as T[keyof T])}>Schedule for a later date…</button>
          )}
          <div className="ad-post-actions">
            <button type="button" className="ad-btn ad-btn-soft" disabled={busy} onClick={() => void (live ? api.save() : api.save({ status: 'draft' } as Partial<T>))}>
              💾 {live ? 'Save Changes' : 'Save as Draft'}
            </button>
            <button type="button" className="ad-btn ad-btn-blue" disabled={busy || (!!publishBlock && !live)} title={publishBlock} onClick={() => void api.publish(form.published_at || undefined)}>
              ➤ {live ? (future ? 'Reschedule' : 'Update Live Page') : future ? 'Schedule' : 'Publish Now'}
            </button>
            <button type="button" className="ad-btn" disabled={busy} onClick={() => void api.preview()}>Preview</button>
            {live && <button type="button" className="ad-btn" disabled={busy} onClick={() => void api.action('unpublish', 'Unpublished. It is no longer on the website.')}>Unpublish</button>}
            {form.id && <button type="button" className="ad-link ad-danger" onClick={() => setConfirm(true)}>Delete…</button>}
            {dirty && <span className="ad-unsaved">Unsaved changes</span>}
          </div>
          {publishBlock && !live && <p className="ad-hint">{publishBlock}</p>}
          {revisions.length > 0 && <Revisions list={revisions} onRestore={(id) => void api.restoreRevision(id)} />}
        </div>
      </div>
      {confirm && <ConfirmDelete title={form.title} onCancel={() => setConfirm(false)} onConfirm={() => void api.remove()} />}
    </form>
  )
}
