import { lazy, Suspense, useEffect, useState } from 'react'
import { adminApi } from '../api'
import { BlogPostShell } from './BlogPostShell'
import { BlogCover } from './BlogCover'
import { Chips, Field, Text, ThumbnailField } from './fields'
import { blankBlog, MAX_BLOG_WORDS, readingMinutes, wordCount, type Taxon } from './types'
import { useContentForm } from './useContentForm'

const BlogBodyEditor = lazy(() => import('./BlogBodyEditor').then((m) => ({ default: m.BlogBodyEditor })))

export function BlogEditor() {
  const api = useContentForm('blogs', blankBlog)
  const { form, set, errors } = api
  const [cats, setCats] = useState<Taxon[]>([])
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingBody, setUploadingBody] = useState(false)
  useEffect(() => {
    adminApi.get<Taxon[]>('/blog-categories/').then((r) => setCats(r.data)).catch(() => undefined)
  }, [])
  const words = wordCount(form.content)
  const optionalError = ['slug', 'category', 'author_name', 'tag_names', 'gallery'].some((key) => !!errors[key])
  const updateImage = (i: number, patch: Partial<BlogFormImage>) => set('gallery', form.gallery.map((g, n) => n === i ? { ...g, ...patch } : g))

  return (
    <BlogPostShell api={api} uploading={uploadingCover || uploadingBody}>
      <Text id="title" label="Title" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} max={200} placeholder="Give your article a clear, useful title" />
      <Text id="excerpt" label="Short description" textarea rows={3} value={form.excerpt} onChange={(v) => set('excerpt', v)} max={400} error={errors.excerpt} placeholder="Tell readers what they will learn." hint="Shown below the title and on blog cards." />
      <BlogCover src={form.featured_image} alt={form.featured_image_alt} onSrc={(v) => set('featured_image', v)} onAlt={(v) => set('featured_image_alt', v)} onBusy={setUploadingCover} error={errors.featured_image} altError={errors.featured_image_alt} />
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
    </BlogPostShell>
  )
}

type BlogFormImage = { src: string; alt: string }
