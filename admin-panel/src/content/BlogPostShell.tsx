import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDelete } from './EditorShell'
import { Field } from './fields'
import { fmtDate } from './format'
import type { BlogForm } from './types'
import type { useContentForm } from './useContentForm'

type BlogApi = ReturnType<typeof useContentForm<BlogForm>>

export function BlogPostShell({ api, children, uploading = false }: { api: BlogApi; children: ReactNode; uploading?: boolean }) {
  const { form, busy, dirty, loading, notice, recover, revisions, errors } = api
  const [confirm, setConfirm] = useState(false)
  const disabled = busy || uploading
  const live = form.status === 'published' || form.status === 'scheduled'
  const future = !!form.published_at && new Date(form.published_at).getTime() > Date.now()
  if (loading) return <p role="status">Loading post…</p>
  return (
    <form className="ad-post ad-blog-post" noValidate onSubmit={(e) => { e.preventDefault(); if (!disabled) void api.save() }}>
      <header className="ad-blog-heading">
        <div>
          <Link to="/blogs" className="ad-blog-back">← All posts</Link>
          <h1>{form.id ? 'Edit post' : 'Write a post'}</h1>
          <p>Add your story, choose a cover, and publish.</p>
        </div>
        <span className={`ad-badge st-${form.status}`}>{form.status}</span>
      </header>
      {recover && <div className="ad-banner" role="status">
        <span>You have an unsaved draft from an earlier session.</span>
        <button type="button" className="ad-btn" onClick={api.acceptDraft}>Restore draft</button>
        <button type="button" className="ad-link" onClick={api.dropDraft}>Discard</button>
      </div>}
      {notice && <div className={`ad-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</div>}
      <div className="ad-post-card"><div className="ad-post-body">{children}</div></div>
      <details className="ad-section ad-blog-options" open={!!errors.published_at}>
        <summary>Publishing options <span className="ad-muted">Optional</span></summary>
        <div className="ad-section-body">
          <Field label="Publish date" htmlFor="published_at" error={errors.published_at} hint="Leave empty to publish now. Choose a future date to schedule.">
            <input id="published_at" type="datetime-local" className="ad-input" value={form.published_at} onChange={(e) => api.set('published_at', e.target.value)} />
          </Field>
          <label className="ad-check"><input type="checkbox" checked={form.is_featured} onChange={(e) => api.set('is_featured', e.target.checked)} />Feature this post on the blog</label>
          {form.id && <div className="ad-blog-manage">
            {live && <button type="button" className="ad-btn" disabled={disabled} onClick={() => void api.action('unpublish', 'Post unpublished. It is now a draft.')}>Unpublish</button>}
            {form.status !== 'archived' && <button type="button" className="ad-btn" disabled={disabled} onClick={() => void api.action('archive', 'Post archived.')}>Archive</button>}
            <button type="button" className="ad-link ad-danger" disabled={disabled} onClick={() => setConfirm(true)}>Delete post</button>
          </div>}
        </div>
      </details>
      {revisions.length > 0 && <details className="ad-section ad-blog-options">
        <summary>Version history</summary>
        <ul className="ad-revs ad-section-body">{revisions.slice(0, 8).map((r) => <li key={r.id}>
          <span>{fmtDate(r.created_at, true)}</span>
          <button type="button" className="ad-link" disabled={disabled} onClick={() => window.confirm('Restore this version? Your current saved version will be kept in history.') && void api.restoreRevision(r.id)}>Restore</button>
        </li>)}</ul>
      </details>}
      <footer className="ad-blog-actions">
        <span className="ad-muted" role="status">{uploading ? 'Uploading image…' : busy ? 'Saving…' : dirty ? 'Unsaved changes' : form.id ? 'All changes saved' : 'Your new post starts as a draft'}</span>
        <div>
          <button type="submit" className="ad-btn" disabled={disabled}>{live ? 'Save changes' : 'Save draft'}</button>
          <button type="button" className="ad-btn" disabled={disabled} onClick={() => void api.preview()}>Preview</button>
          <button type="button" className="ad-btn ad-btn-primary" disabled={disabled} onClick={() => void api.publish(form.published_at || undefined)}>{future ? 'Schedule post' : live ? 'Update post' : 'Publish post'}</button>
        </div>
      </footer>
      {confirm && <ConfirmDelete title={form.title} onCancel={() => setConfirm(false)} onConfirm={() => void api.remove()} />}
    </form>
  )
}
