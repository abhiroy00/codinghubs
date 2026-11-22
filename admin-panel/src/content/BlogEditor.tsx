import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../api'
import { BlogPostShell } from './BlogPostShell'
import { BlogCover } from './BlogCover'
import { Chips, Field, RowsEditor, Text, ThumbnailField } from './fields'
import { SeoSection } from './SeoSection'
import { blogChecks } from './seoTools'
import { parsePlannerPost } from './plannerImport'
import { blankBlog, MAX_BLOG_WORDS, readingMinutes, toLocalInput, wordCount, type Taxon } from './types'
import { useContentForm } from './useContentForm'

const BlogBodyEditor = lazy(() => import('./BlogBodyEditor').then((m) => ({ default: m.BlogBodyEditor })))

export function BlogEditor() {
  // Every post is dated the moment it is written; the admin can still change or schedule it.
  const blank = useMemo(() => ({ ...blankBlog, published_at: toLocalInput(new Date().toISOString()) }), [])
  const api = useContentForm('blogs', blank)
  const { form, set, errors } = api
  const [cats, setCats] = useState<Taxon[]>([])
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingBody, setUploadingBody] = useState(false)
  const [plannerText, setPlannerText] = useState('')
  const [importNotes, setImportNotes] = useState<string[] | null>(null)
  const [plannerOpen, setPlannerOpen] = useState(!api.id)
  useEffect(() => {
    adminApi.get<Taxon[]>('/blog-categories/').then((r) => setCats(r.data)).catch(() => undefined)
  }, [])
  const words = wordCount(form.content)
  const optionalError = ['slug', 'category', 'author_name', 'tag_names', 'gallery'].some((key) => !!errors[key])
  const updateImage = (i: number, patch: Partial<BlogFormImage>) => set('gallery', form.gallery.map((g, n) => n === i ? { ...g, ...patch } : g))

  const importPlanner = () => {
    const p = parsePlannerPost(plannerText)
    const category = cats.find((c) => c.name.toLowerCase() === p.category.toLowerCase())
    const fields: Partial<typeof form> = {
      title: p.title, excerpt: p.excerpt, content: p.content, seo_title: p.seo_title, meta_description: p.meta_description,
      focus_keyword: p.focus_keyword, secondary_keywords: p.secondary_keywords, tag_names: p.tag_names, author_name: p.author_name,
      author_title: p.author_title, featured_image_alt: p.featured_image_alt, featured_image_caption: p.featured_image_caption,
      featured_image_prompt: p.featured_image_prompt, faq: p.faq, ...(category ? { category: category.id } : {}),
    }
    for (const [k, v] of Object.entries(fields)) if (v !== '' && v !== undefined) set(k as keyof typeof form, v as never)
    if (p.slug) api.setSlug(p.slug)
    const notes = [...p.warnings]
    if (p.category && !category) notes.unshift(`Category "${p.category}" does not exist yet: choose one under Post details.`)
    notes.push('Upload a cover image (the planner gives a prompt, not an image), check the headings in the editor, then save.')
    setImportNotes(notes)
  }

  return (
    <BlogPostShell api={api} uploading={uploadingCover || uploadingBody}>
      <details className="ad-section ad-planner" open={plannerOpen} onToggle={(e) => setPlannerOpen(e.currentTarget.open)}>
        <summary>Import from SEO planner <span className="ad-muted">Paste the full planner output</span></summary>
        <div className="ad-section-body">
          <textarea className="ad-input ad-code" rows={8} aria-label="SEO planner output" placeholder={'Title\nURL SLUG\n...\nSEO PREVIEW\nMeta Title: ...\n...\nBLOG CONTENT\n...\nFrequently Asked Questions\n1. ...?'} value={plannerText} onChange={(e) => setPlannerText(e.target.value)} />
          <p className="ad-hint">Fills the title, URL, SEO fields, category, author, keywords, tags, excerpt, image text, article and FAQ. Other company names are replaced with Coding Hubs School of AI, and the contact, author-bio and hashtag sections are left out.</p>
          <button type="button" className="ad-btn ad-btn-primary" disabled={!plannerText.trim()} onClick={importPlanner}>Import into this post</button>
          {importNotes && <div className="ad-notice" role="status"><strong>Imported. Please check:</strong><ul>{importNotes.map((n) => <li key={n}>{n}</li>)}</ul></div>}
        </div>
      </details>
      <Text id="title" label="Title" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} max={200} placeholder="Give your article a clear, useful title" />
      <Text id="excerpt" label="Short description" textarea rows={3} value={form.excerpt} onChange={(v) => set('excerpt', v)} max={400} error={errors.excerpt} placeholder="Tell readers what they will learn." hint="Shown below the title and on blog cards." />
      <BlogCover src={form.featured_image} alt={form.featured_image_alt} onSrc={(v) => set('featured_image', v)} onAlt={(v) => set('featured_image_alt', v)} onBusy={setUploadingCover} error={errors.featured_image} altError={errors.featured_image_alt} />
      <Text id="featured_image_caption" label="Image caption" value={form.featured_image_caption} onChange={(v) => set('featured_image_caption', v)} max={300} hint="Optional. Shown under the cover image." />
      <Text id="featured_image_prompt" label="Image prompt (not public)" textarea rows={2} value={form.featured_image_prompt} onChange={(v) => set('featured_image_prompt', v)} hint="Notes for designing or generating the cover. Never shown on the website." />
      <Suspense fallback={<p role="status">Loading article editor…</p>}>
        <BlogBodyEditor value={form.content} onChange={(v) => set('content', v)} onBusy={setUploadingBody} />
      </Suspense>
      {(errors.content || words > MAX_BLOG_WORDS) && <p className="ad-field-error" role="alert">{errors.content || `Keep the article under ${MAX_BLOG_WORDS.toLocaleString()} words.`}</p>}
      <p className="ad-blog-wordcount">{words.toLocaleString()} / {MAX_BLOG_WORDS.toLocaleString()} words · {readingMinutes(form.content)} min read</p>
      <details className="ad-section" open={optionalError}>
        <summary>Post details &amp; extra images <span className="ad-muted">Optional</span></summary>
        <div className="ad-section-body">
          <div className="ad-two">
            <Field label="Category" htmlFor="category" error={errors.category}>
              <select id="category" className="ad-input" value={form.category} onChange={(e) => set('category', e.target.value ? Number(e.target.value) : '')}>
                <option value="">No category</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Text id="author_name" label="Author" value={form.author_name} onChange={(v) => set('author_name', v)} error={errors.author_name} />
            <Text id="author_title" label="Author title" value={form.author_title} onChange={(v) => set('author_title', v)} hint="e.g. Senior Trainer, Coding Hubs School of AI" />
          </div>
          <Text id="slug" label="Post URL" value={form.slug} onChange={api.setSlug} error={errors.slug} hint="Created automatically from your title. Changing a published URL creates a redirect." />
          <p className="ad-hint">codinghubs.in/blog/{form.slug || 'your-post-title'}</p>
          <Chips id="tags" label="Tags" value={form.tag_names} onChange={(v) => set('tag_names', v)} />
          {form.gallery.map((g, i) => <div key={i} className="ad-row-card">
            <ThumbnailField id={`g-${i}`} label={`Extra image ${i + 1}`} src={g.src} alt={g.alt} onSrc={(v) => updateImage(i, { src: v })} onAlt={(v) => updateImage(i, { alt: v })} />
            <button type="button" className="ad-link ad-danger" onClick={() => set('gallery', form.gallery.filter((_, n) => n !== i))}>Remove image</button>
          </div>)}
          {form.gallery.length < 5 && <button type="button" className="ad-btn" onClick={() => set('gallery', [...form.gallery, { src: '', alt: '' }])}>Add an extra image</button>}
          {errors.gallery && <p className="ad-field-error" role="alert">{errors.gallery}</p>}
        </div>
      </details>
      <SeoSection form={form} set={set} errors={errors} base="/blog" checks={blogChecks(form)} />
      <details className="ad-section" open={form.faq.length > 0}>
        <summary>FAQ <span className="ad-muted">Shown at the end of the article and marked up for search engines</span></summary>
        <div className="ad-section-body">
          <RowsEditor id="faq" rows={form.faq} onChange={(rows) => set('faq', rows)} fields={[{ key: 'q', label: 'Question' }, { key: 'a', label: 'Answer', type: 'textarea' }]} addLabel="Add a question" max={15} error={errors.faq} />
        </div>
      </details>
    </BlogPostShell>
  )
}

type BlogFormImage = { src: string; alt: string }
