import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi } from '../api'
import { isLiveNow } from './liveUrl'
import { uploadImage } from './RichEditor'
import { blankBlog, MAX_BLOG_WORDS, readingMinutes, toLocalInput, wordCount, type Taxon } from './types'
import { useContentForm } from './useContentForm'

const TinyBodyEditor = lazy(() => import('./TinyBodyEditor').then((m) => ({ default: m.TinyBodyEditor })))
const SITE = 'codinghubs.in'
const list = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean)

function Label({ htmlFor, children, required, note }: { htmlFor?: string; children: ReactNode; required?: boolean; note?: string }) {
  return <label className="cx-label" htmlFor={htmlFor}>{children}{required && <span className="cx-req"> *</span>}{note && <span className="cx-note"> {note}</span>}</label>
}

/** Single-page blog form: title, URL, SEO, category, image, excerpt, article, status. */
export function BlogEditor() {
  // Every post is dated the moment it is written; publishing a draft uses the day it goes live.
  const blank = useMemo(() => ({ ...blankBlog, published_at: toLocalInput(new Date().toISOString()) }), [])
  const api = useContentForm('blogs', blank)
  const { form, set, errors, busy, dirty, loading, notice, recover } = api
  const [cats, setCats] = useState<Taxon[]>([])
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState('')
  const [keywordsText, setKeywordsText] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    adminApi.get<Taxon[]>('/blog-categories/').then((r) => setCats(r.data)).catch(() => undefined)
  }, [])

  const live = form.status === 'published' || form.status === 'scheduled'
  const liveNow = isLiveNow(form.status, form.published_at)
  const future = !!form.published_at && new Date(form.published_at).getTime() > Date.now()
  const navigate = useNavigate()
  const [intent, setIntent] = useState<'draft' | 'publish' | 'schedule'>('draft')
  useEffect(() => { setIntent(form.status === 'scheduled' && future ? 'schedule' : live ? 'publish' : 'draft') }, [form.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const words = wordCount(form.content)
  const disabled = busy || uploading

  // What search engines get when the optional SEO fields are left empty (mirrors backend services.seo_for).
  const seoTitle = form.seo_title || (form.title ? `${form.title} | Coding Hubs School of AI` : '')

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
      return void publishAndNext(form.published_at)
    }
    return void publishAndNext()
  }
  // Publish Now: go live, then open a fresh, empty form for the next post (updates to a live post stay on the page).
  const publishAndNext = async (when?: string) => {
    const wasLive = live
    const data = await api.publish(when, { stay: !wasLive })
    if (!data || wasLive) return
    const text = data.status === 'scheduled' ? `Scheduled: “${data.title}”. It goes live automatically at the chosen time.` : `Published: “${data.title}” is now live on the website. Write your next post below.`
    navigate('/blogs/create', { state: { flash: text, at: Date.now() } })
    window.scrollTo({ top: 0 })
  }
  const primaryLabel = intent === 'schedule' ? 'Schedule Post' : live ? 'Update Post' : 'Publish Now'
  const focusOnBlur = () => {
    // One main phrase only; extra comma-separated phrases move to Meta keywords.
    const [first = '', ...rest] = list(form.focus_keyword)
    if (!rest.length && first.length <= 120) return
    set('focus_keyword', first.slice(0, 120))
    const seen = new Set<string>()
    const merged = [...form.secondary_keywords, ...rest].filter((k) => {
      const key = k.toLowerCase()
      if (seen.has(key) || key === first.toLowerCase()) return false
      seen.add(key)
      return true
    })
    set('secondary_keywords', merged.slice(0, 10))
  }

  if (loading) return <p role="status">Loading post…</p>
  const err = (k: keyof typeof errors) => errors[k] && <p className="cx-error" role="alert">{errors[k]}</p>
  return (
    <form className="cx cx-form" noValidate onSubmit={(e) => { e.preventDefault(); if (!disabled) primary() }}>
      <div className="cx-card">
        <header className="cx-card-head">
          <h1><span className="cx-plus" aria-hidden="true">+</span>{form.id ? 'Edit Blog Post' : 'Write New Blog Post'}</h1>
          <div className="cx-head-actions">
            {form.id && liveNow && <a className="cx-btn-outline" href={`https://${SITE}/blog/${form.slug}`} target="_blank" rel="noopener noreferrer">↗ View Live</a>}
            <Link className="cx-btn-outline" to="/blogs">← All Posts</Link>
          </div>
        </header>

        <div className="cx-body">
          {recover && <div className="ad-banner" role="status"><span>Pichle session ka ek unsaved draft mila hai.</span>
            <button type="button" className="ad-btn" onClick={api.acceptDraft}>Restore draft</button>
            <button type="button" className="ad-link" onClick={api.dropDraft}>Discard</button></div>}
          {notice && <div className={`ad-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</div>}

          <div className="cx-field">
            <Label htmlFor="title" required>Post title</Label>
            <input id="title" className="cx-input" required maxLength={200} placeholder="e.g. Data Science Career Guide 2026 — Jobs, Skills & Salaries" value={form.title} onChange={(e) => set('title', e.target.value)} />
            {err('title')}
          </div>

          <div className="cx-field">
            <Label htmlFor="slug" note="(auto-generated)">URL slug</Label>
            <input id="slug" className="cx-input" placeholder="data-science-career-guide-2026" value={form.slug} onChange={(e) => api.setSlug(e.target.value)} />
            <span className="cx-urlpill">🔗 {SITE}/blog/{form.slug || 'your-post-slug'}</span>
            {err('slug')}
          </div>

          <section className="cx-seo" aria-label="SEO preview">
            <h2>✎ SEO Preview (Auto-Generated)</h2>
            <p className="cx-seo-label">Meta Title:</p>
            <p className={`cx-seo-box${seoTitle ? '' : ' empty'}`}>{seoTitle || 'Title likho — auto-set hoga'}</p>
            <p className="cx-seo-label">Focus Keyword:</p>
            <p className={`cx-seo-box${form.focus_keyword ? '' : ' empty'}`}>{form.focus_keyword || 'Neeche Focus Keyword likho — yahan dikhega'}</p>
          </section>

          <hr className="cx-rule" />

          <div className="cx-grid-3">
            <div className="cx-field">
              <Label htmlFor="category">Category</Label>
              <select id="category" className="cx-input" value={form.category} onChange={(e) => set('category', e.target.value ? Number(e.target.value) : '')}>
                <option value="">— Category choose karo —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>📚 {c.name}</option>)}
              </select>
            </div>
            <div className="cx-field">
              <Label htmlFor="author_name">Author name</Label>
              <input id="author_name" className="cx-input" placeholder="Coding Hubs School of AI" value={form.author_name} onChange={(e) => set('author_name', e.target.value)} />
            </div>
            <div className="cx-field">
              <Label htmlFor="read_time">Read time</Label>
              <input id="read_time" className="cx-input" readOnly value={`${readingMinutes(form.content)} min`} title="Article ke words se apne aap calculate hota hai" />
            </div>
          </div>

          <div className="cx-grid-2">
            <div className="cx-field">
              <Label htmlFor="seo_title" note="(optional)">Meta title</Label>
              <input id="seo_title" className="cx-input" maxLength={70} placeholder="Auto-set hoga — override karo if needed" value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} />
            </div>
            <div className="cx-field">
              <Label htmlFor="focus_keyword">Focus keyword</Label>
              <input id="focus_keyword" className="cx-input" maxLength={400} placeholder="e.g. data science course Delhi" value={form.focus_keyword} onChange={(e) => set('focus_keyword', e.target.value)} onBlur={focusOnBlur} />
              {err('focus_keyword')}
            </div>
          </div>

          <div className="cx-field">
            <Label htmlFor="meta_description" note="(optional — auto from content)">Meta description</Label>
            <textarea id="meta_description" className="cx-input" rows={3} maxLength={320} placeholder="Auto-generate hoga... (150-160 characters ideal)" value={form.meta_description} onChange={(e) => set('meta_description', e.target.value)} />
            {err('meta_description')}
          </div>

          <div className="cx-field">
            <Label htmlFor="secondary_keywords" note="(comma separated)">Meta keywords</Label>
            <input id="secondary_keywords" className="cx-input" placeholder="data science, machine learning, python course delhi" value={keywordsText ?? form.secondary_keywords.join(', ')} onChange={(e) => setKeywordsText(e.target.value)} onBlur={() => { if (keywordsText !== null) { set('secondary_keywords', list(keywordsText).slice(0, 10)); setKeywordsText(null) } }} />
          </div>

          <hr className="cx-rule" />

          <div className="cx-field">
            <Label htmlFor="featured_image">Thumbnail image URL</Label>
            <input id="featured_image" className="cx-input" type="url" placeholder="https://images.unsplash.com/photo-xxxx" value={form.featured_image} onChange={(e) => set('featured_image', e.target.value)} />
            <div className="cx-chips">
              <span className="cx-chips-label">Free images:</span>
              <a className="cx-chip" href="https://unsplash.com/" target="_blank" rel="noopener noreferrer">🌄 Unsplash</a>
              <a className="cx-chip" href="https://www.pexels.com/" target="_blank" rel="noopener noreferrer">📷 Pexels</a>
              <a className="cx-chip" href="https://pixabay.com/" target="_blank" rel="noopener noreferrer">🖼️ Pixabay</a>
              <button type="button" className="cx-chip cx-chip-upload" disabled={uploading} onClick={() => fileInput.current?.click()}>⇪ {uploading ? 'Uploading…' : 'Computer se upload'}</button>
              <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Thumbnail image file" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
            </div>
            {form.featured_image && (
              <div className="cx-thumb-preview">
                <img src={form.featured_image} alt="" />
                <button type="button" className="ad-link ad-danger" onClick={() => set('featured_image', '')}>Remove image</button>
              </div>
            )}
            {(imageError || errors.featured_image) && <p className="cx-error" role="alert">{imageError || errors.featured_image}</p>}
          </div>

          <div className="cx-field">
            <Label htmlFor="excerpt" required>Excerpt (short description)</Label>
            <textarea id="excerpt" className="cx-input" rows={3} maxLength={400} placeholder="150-200 characters ka summary — Google search mein dikhega..." value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
            <span className="cx-hint">ⓘ Target keyword zaroor include karo.</span>
            {err('excerpt')}
          </div>

          <hr className="cx-rule" />

          <div className="cx-field">
            <Label required>Blog content</Label>
            <div className="cx-tip"><span aria-hidden="true">ⓘ</span> <strong>Google Docs/Word se paste?</strong> Header/footer/nav automatically remove ho jayega. Server-side cleaning bhi hoti hai.</div>
            <Suspense fallback={<div className="cx-editor-loading" role="status">Editor load ho raha hai…</div>}>
              <TinyBodyEditor value={form.content} onChange={(v) => set('content', v)} onBusy={setUploading} />
            </Suspense>
            <p className={`cx-count${words > MAX_BLOG_WORDS ? ' over' : words > MAX_BLOG_WORDS * 0.9 ? ' near' : ''}`} role="status">{words.toLocaleString()} / {MAX_BLOG_WORDS.toLocaleString()} words · {readingMinutes(form.content)} min read</p>
            {(errors.content || words > MAX_BLOG_WORDS) && <p className="cx-error" role="alert">{errors.content || `Article mein maximum ${MAX_BLOG_WORDS.toLocaleString()} words ho sakte hain. ${(words - MAX_BLOG_WORDS).toLocaleString()} words kam karo.`}</p>}
          </div>

          <hr className="cx-rule" />

          <div className="cx-grid-2">
            <div className="cx-field">
              <Label htmlFor="status">Status</Label>
              <select id="status" className="cx-input" value={intent} onChange={(e) => setIntent(e.target.value as typeof intent)}>
                <option value="draft">📝 Draft — Abhi publish mat karo</option>
                <option value="publish">✅ {live ? 'Published — Website par live hai' : 'Publish — Abhi live karo'}</option>
                <option value="schedule">🕒 Scheduled — Baad mein publish karo</option>
              </select>
              {intent === 'schedule' && <input id="published_at" type="datetime-local" className="cx-input cx-gap" value={form.published_at} onChange={(e) => set('published_at', e.target.value)} aria-label="Publish date and time" />}
              {err('published_at')}
            </div>
            <div className="cx-field">
              <Label>Featured post?</Label>
              <label className="cx-check"><input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> ⭐ Blog listing mein featured dikhao</label>
            </div>
          </div>

          {notice && <div className={`ad-notice ${notice.type} cx-action-notice`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.type === 'ok' ? '✅ ' : '⚠️ '}{notice.text}</div>}
          <div className="cx-actions">
            <button type="button" className="cx-btn-light" disabled={disabled} onClick={() => void saveDraft()}>💾 Save as Draft</button>
            <button type="button" className="cx-btn-primary" disabled={disabled} onClick={() => (intent === 'schedule' ? primary() : void publishAndNext())}>➤ {primaryLabel}</button>
            <span className="cx-hint" role="status">{uploading ? 'Image upload ho rahi hai…' : busy ? 'Saving…' : dirty ? 'Unsaved changes' : form.id ? 'All changes saved' : ''}</span>
          </div>
        </div>
      </div>
    </form>
  )
}
