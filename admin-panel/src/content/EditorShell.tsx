import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { fmtDate } from './format'
import { Field } from './fields'
import type { Common, Kind, Revision } from './types'
import type { useContentForm } from './useContentForm'

type Api<T extends Common> = ReturnType<typeof useContentForm<T>>

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

export function EditorShell<T extends Common>({ kind, api, noun, children, side }: { kind: Kind; api: Api<T>; noun: string; children: ReactNode; side: ReactNode }) {
  const { form, dirty, busy, notice, loading, recover, revisions } = api
  const [confirm, setConfirm] = useState(false)
  if (loading) return <p className="ad-muted" role="status">Loading…</p>

  const future = form.published_at && new Date(form.published_at).getTime() > Date.now()
  const live = form.status === 'published' || form.status === 'scheduled'
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    void api.save()
  }

  return (
    <form className="ad-editor" onSubmit={submit} noValidate>
      <div className="ad-head">
        <div>
          <p className="ad-crumb">
            <Link to={`/${kind}`}>{kind === 'blogs' ? 'Blogs' : 'Case studies'}</Link> › {form.id ? 'Edit' : 'New'}
          </p>
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
