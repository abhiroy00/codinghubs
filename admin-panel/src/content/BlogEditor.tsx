import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../api'
import { isLiveNow } from './liveUrl'
import { uploadImage } from './RichEditor'
import { blankBlog, MAX_BLOG_WORDS, readingMinutes, toLocalInput, wordCount, type Taxon } from './types'
import { useContentForm } from './useContentForm'

const BlogBodyEditor = lazy(() => import('./BlogBodyEditor').then((m) => ({ default: m.BlogBodyEditor })))
const SITE = 'codinghubs.in'
const plain = (html: string) => (new DOMParser().parseFromString(html || '', 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim()
const clip = (t: string, n: number) => (t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…')
const list = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean)

function Label({ htmlFor, children, required, note }: { htmlFor?: string; children: ReactNode; required?: boolean; note?: string }) {
  return <label className="wp-label" htmlFor={htmlFor}>{children}{required && <span className="wp-req"> *</span>}{note && <span className="wp-note"> {note}</span>}</label>
}

/** Single-page blog form: title, URL, SEO, category, image, excerpt, article, status. */
export function BlogEditor() {
  // Every post is dated the moment it is written; publishing a draft uses the day it goes live.
  const blank = useMemo(() => ({ ...blankBlog, published_at: toLocalInput(new Date().toISOString()) }), [])
  const api = useContentForm('blogs', blank)
  const { form, set, errors, busy, dirty, loading, notice, recover } = api
  const [cats, setCats] = useState<Taxon[]>([])
  const [uploading, setUploading] = useState(false)
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload')
  const [imageError, setImageError] = useState('')
  const [tagsText, setTagsText] = useState<string | null>(null)
  const [keywordsText, setKeywordsText] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    adminApi.get<Taxon[]>('/blog-categories/').then((r) => setCats(r.data)).catch(() => undefined)
  }, [])

  const live = form.status === 'published' || form.status === 'scheduled'
  const liveNow = isLiveNow(form.status, form.published_at)
  const future = !!form.published_at && new Date(form.published_at).getTime() > Date.now()
  const [intent, setIntent] = useState<'draft' | 'publish' | 'schedule'>('draft')
  useEffect(() => { setIntent(form.status === 'scheduled' && future ? 'schedule' : live ? 'publish' : 'draft') }, [form.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const words = wordCount(form.content)
  const disabled = busy || uploading

  // What search engines get when the optional SEO fields are left empty (mirrors backend services.seo_for).
  const seoTitle = form.seo_title || (form.title ? `${form.title} | Coding Hubs School of AI` : '')
  const seoDescription = form.meta_description || clip(form.excerpt || plain(form.content), 158)

  const upload = async (file?: File) => {
    if (!file) return
    setUploading(true)
    setImageError('')
    try { set('featured_image', await uploadImage(file, file.name)) }
    catch { setImageError('Could not upload the image. Choose a JPG, PNG, WebP or GIF under 5 MB.') }
    finally { setUploading(false) }
  }

  const saveDraft = async () => {
    if (liveNow && !window.confirm('Save as draft will take this post off the website. Continue?')) return
    const saved = await api.save(undefined, 'Saved as draft.')
    if (saved && live) await api.action('unpublish', 'Saved as draft. The post is no longer on the website.')
  }
  const primary = () => {
    if (intent === 'draft') return void saveDraft()
    if (intent === 'schedule') {
      if (!future) { api.setNotice({ type: 'error', text: 'Choose a future date and time to schedule the post.' }); return }
      return void api.publish(form.published_at)
    }
    return void api.publish()
  }
  const primaryLabel = intent === 'schedule' ? 'Schedule Post' : intent === 'draft' ? 'Save as Draft' : live ? 'Update Post' : 'Publish Now'

  if (loading) return <p role="status">Loading post…</p>
  return (
    <form className="wp" noValidate onSubmit={(e) => { e.preventDefault(); if (!disabled) primary() }}>
      <div className="wp-card">
        <header className="wp-card-head">
          <h1><span className="wp-plus" aria-hidden="true">+</span>{form.id ? 'Edit Blog Post' : 'Write New Blog Post'}</h1>
          <div className="wp-head-actions">
            {form.id && liveNow && <a className="wp-btn-outline" href={`https://${SITE}/blog/${form.slug}`} target="_blank" rel="noopener noreferrer">View live post</a>}
            <Link className="wp-btn-outline" to="/blogs">← All Posts</Link>
          </div>
        </header>

        <div className="wp-body">
          {recover && <div className="ad-banner" role="status"><span>You have an unsaved draft from an earlier session.</span>
            <button type="button" className="ad-btn" onClick={api.acceptDraft}>Restore draft</button>
            <button type="button" className="ad-link" onClick={api.dropDraft}>Discard</button></div>}
          {notice && <div className={`ad-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</div>}

          <div className="wp-field">
            <Label htmlFor="title" required>Post title</Label>
            <input id="title" className="wp-input" required maxLength={200} placeholder="e.g. Python Developer Roadmap for Beginners" value={form.title} onChange={(e) => set('title', e.target.value)} />
            {errors.title && <p className="wp-error" role="alert">{errors.title}</p>}
          </div>

          <div className="wp-field">
            <Label htmlFor="slug" note="(auto-generated)">URL slug</Label>
            <input id="slug" className="wp-input" placeholder="python-developer-roadmap" value={form.slug} onChange={(e) => api.setSlug(e.target.value)} />
            <span className="wp-urlpill">🔗 {SITE}/blog/{form.slug || 'your-post-slug'}</span>
            {errors.slug && <p className="wp-error" role="alert">{errors.slug}</p>}
          </div>

          <section className="wp-seo-preview" aria-label="SEO preview">
            <h2>✎ SEO Preview (Auto-Generated)</h2>
            <p><strong>Meta Title:</strong> {seoTitle || '–'}</p>
            <p><strong>Meta Description:</strong> {seoDescription || '–'}</p>
            <p><strong>Focus Keyword:</strong> {form.focus_keyword || '–'}</p>
            <p className="wp-hint">These are filled automatically from the title, excerpt and article. You can change them below.</p>
          </section>

          <hr className="wp-rule" />

          <div className="wp-grid-3">
            <div className="wp-field">
              <Label htmlFor="category">Category</Label>
              <select id="category" className="wp-input" value={form.category} onChange={(e) => set('category', e.target.value ? Number(e.target.value) : '')}>
                <option value="">No category</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="wp-field">
              <Label htmlFor="author_name">Author name</Label>
              <input id="author_name" className="wp-input" placeholder="Coding Hubs Team" value={form.author_name} onChange={(e) => set('author_name', e.target.value)} />
            </div>
            <div className="wp-field">
              <Label htmlFor="read_time">Read time</Label>
              <input id="read_time" className="wp-input" readOnly value={`${readingMinutes(form.content)} min`} aria-describedby="read-time-hint" />
              <span id="read-time-hint" className="wp-hint">{words.toLocaleString()} words · calculated automatically</span>
            </div>
          </div>

          <div className="wp-field">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <input id="tags" className="wp-input" placeholder="Python, career, interview" value={tagsText ?? form.tag_names.join(', ')} onChange={(e) => setTagsText(e.target.value)} onBlur={() => { if (tagsText !== null) { set('tag_names', list(tagsText).slice(0, 15)); setTagsText(null) } }} />
          </div>

          <div className="wp-grid-2">
            <div className="wp-field">
              <Label htmlFor="seo_title" note="(optional)">Meta title</Label>
              <input id="seo_title" className="wp-input" maxLength={70} placeholder="Leave empty to use the post title" value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} />
              <span className="wp-hint">{form.seo_title.length}/60 characters</span>
            </div>
            <div className="wp-field">
              <Label htmlFor="focus_keyword" note="(primary)">Focus keyword</Label>
              <input id="focus_keyword" className="wp-input" placeholder="e.g. python course in Delhi" value={form.focus_keyword} onChange={(e) => set('focus_keyword', e.target.value)} />
            </div>
          </div>

          <div className="wp-field">
            <Label htmlFor="meta_description" note="(optional — auto from excerpt or content if empty)">Meta description</Label>
            <textarea id="meta_description" className="wp-input" rows={3} maxLength={320} placeholder="150–160 characters that make people want to click…" value={form.meta_description} onChange={(e) => set('meta_description', e.target.value)} />
            <span className="wp-hint">ⓘ If left empty, the excerpt (or the start of the article) is used. {form.meta_description.length}/160</span>
            {errors.meta_description && <p className="wp-error" role="alert">{errors.meta_description}</p>}
          </div>

          <div className="wp-field">
            <Label htmlFor="secondary_keywords" note="(optional)">Meta keywords</Label>
            <input id="secondary_keywords" className="wp-input" placeholder="python roadmap, learn python, python projects" value={keywordsText ?? form.secondary_keywords.join(', ')} onChange={(e) => setKeywordsText(e.target.value)} onBlur={() => { if (keywordsText !== null) { set('secondary_keywords', list(keywordsText).slice(0, 10)); setKeywordsText(null) } }} />
            <span className="wp-hint">Up to 10 related phrases, separated by commas.</span>
          </div>

          <hr className="wp-rule" />

          <div className="wp-field">
            <Label>Thumbnail image</Label>
            <div className="wp-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={imageTab === 'upload'} className={imageTab === 'upload' ? 'on' : ''} onClick={() => setImageTab('upload')}>⇪ Upload from Computer</button>
              <button type="button" role="tab" aria-selected={imageTab === 'url'} className={imageTab === 'url' ? 'on' : ''} onClick={() => setImageTab('url')}>🔗 Paste URL</button>
            </div>
            {imageTab === 'upload' ? (
              <div className="wp-drop" role="button" tabIndex={0} onClick={() => fileInput.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click() } }}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void upload(e.dataTransfer.files?.[0]) }}>
                {form.featured_image ? <img src={form.featured_image} alt="" className="wp-drop-preview" /> : <span className="wp-drop-icon" aria-hidden="true">☁</span>}
                <strong>{uploading ? 'Uploading…' : form.featured_image ? 'Click to replace image' : 'Click to choose image'}</strong>
                <small>JPG, PNG, WEBP, GIF — max 5 MB · 1200 × 630 recommended</small>
                <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Thumbnail image file" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
              </div>
            ) : (
              <>
                <input className="wp-input" type="url" placeholder="https://… or /media/…" value={form.featured_image} onChange={(e) => set('featured_image', e.target.value)} aria-label="Thumbnail image URL" />
                {form.featured_image && <img src={form.featured_image} alt="" className="wp-drop-preview wp-url-preview" />}
              </>
            )}
            {(imageError || errors.featured_image) && <p className="wp-error" role="alert">{imageError || errors.featured_image}</p>}
            {form.featured_image && (
              <div className="wp-grid-2 wp-image-text">
                <div className="wp-field">
                  <Label htmlFor="featured_image_alt">Image alt text</Label>
                  <input id="featured_image_alt" className="wp-input" maxLength={200} placeholder="Describe the image for people who cannot see it" value={form.featured_image_alt} onChange={(e) => set('featured_image_alt', e.target.value)} />
                  {errors.featured_image_alt && <p className="wp-error" role="alert">{errors.featured_image_alt}</p>}
                </div>
                <div className="wp-field">
                  <Label htmlFor="featured_image_caption" note="(optional)">Image caption</Label>
                  <input id="featured_image_caption" className="wp-input" maxLength={300} placeholder="Shown under the image" value={form.featured_image_caption} onChange={(e) => set('featured_image_caption', e.target.value)} />
                </div>
                <button type="button" className="ad-link ad-danger" onClick={() => set('featured_image', '')}>Remove image</button>
              </div>
            )}
          </div>

          <div className="wp-field">
            <Label htmlFor="excerpt" required>Excerpt (short description)</Label>
            <textarea id="excerpt" className="wp-input" rows={3} maxLength={400} placeholder="Two or three sentences that tell readers what they will learn…" value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
            <span className="wp-hint">📈 Important for SEO — include the focus keyword naturally. {form.excerpt.length}/400</span>
            {errors.excerpt && <p className="wp-error" role="alert">{errors.excerpt}</p>}
          </div>

          <hr className="wp-rule" />

          <div className="wp-field">
            <Label required>Blog content</Label>
            <div className="wp-tip"><strong>Pasting from Google Docs or Word?</strong> Paste into the editor below; headings, lists and tables are kept and unsafe code is removed when you save. Use Heading 2 / Heading 3 for sections — they become the article's contents list.</div>
            <Suspense fallback={<p role="status">Loading article editor…</p>}>
              <BlogBodyEditor value={form.content} onChange={(v) => set('content', v)} onBusy={setUploading} />
            </Suspense>
            <p className={`wp-count${words > MAX_BLOG_WORDS ? ' over' : words > MAX_BLOG_WORDS * 0.9 ? ' near' : ''}`} role="status">{words.toLocaleString()} / {MAX_BLOG_WORDS.toLocaleString()} words · {readingMinutes(form.content)} min read</p>
            {(errors.content || words > MAX_BLOG_WORDS) && <p className="wp-error" role="alert">{errors.content || `The article can have up to ${MAX_BLOG_WORDS.toLocaleString()} words. Remove ${(words - MAX_BLOG_WORDS).toLocaleString()} words to save.`}</p>}
          </div>

          <hr className="wp-rule" />

          <div className="wp-grid-2">
            <div className="wp-field">
              <Label htmlFor="status">Status</Label>
              <select id="status" className="wp-input" value={intent} onChange={(e) => setIntent(e.target.value as typeof intent)}>
                <option value="draft">📝 Draft — save, don't publish yet</option>
                <option value="publish">✅ {live ? 'Published — live on the website' : 'Publish — goes live now'}</option>
                <option value="schedule">🕒 Scheduled — publish at a later time</option>
              </select>
              {intent === 'schedule' && <input id="published_at" type="datetime-local" className="wp-input wp-gap" value={form.published_at} onChange={(e) => set('published_at', e.target.value)} aria-label="Publish date and time" />}
              {errors.published_at && <p className="wp-error" role="alert">{errors.published_at}</p>}
            </div>
            <div className="wp-field">
              <Label>Featured post?</Label>
              <label className="wp-check"><input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> ⭐ Show this post in the featured spot on the blog page</label>
            </div>
          </div>

          <div className="wp-actions">
            <button type="button" className="wp-btn-light" disabled={disabled} onClick={() => void saveDraft()}>💾 Save as Draft</button>
            {intent !== 'draft' && <button type="submit" className="wp-btn-primary" disabled={disabled}>➤ {primaryLabel}</button>}
            <span className="wp-hint" role="status">{uploading ? 'Uploading image…' : busy ? 'Saving…' : dirty ? 'Unsaved changes' : form.id ? 'All changes saved' : ''}</span>
          </div>
        </div>
      </div>
    </form>
  )
}
