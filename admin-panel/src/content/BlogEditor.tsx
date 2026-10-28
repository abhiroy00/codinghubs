import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../api'
import { EditorShell } from './EditorShell'
import { Chips, Field, ImageField, Section, Text } from './fields'
import { RichEditor } from './RichEditor'
import { SeoSection } from './SeoSection'
import { blogChecks } from './seoTools'
import { blankBlog, readingMinutes, wordCount, type Row, type Taxon } from './types'
import { useContentForm } from './useContentForm'

export function BlogEditor() {
  const api = useContentForm('blogs', blankBlog)
  const { form, set, errors } = api
  const [cats, setCats] = useState<Taxon[]>([])
  const [others, setOthers] = useState<Row[]>([])
  useEffect(() => {
    adminApi.get<Taxon[]>('/blog-categories/').then((r) => setCats(r.data)).catch(() => undefined)
    adminApi.get<{ results: Row[] }>('/blogs/', { params: { page_size: 100, status: 'published' } }).then((r) => setOthers(r.data.results)).catch(() => undefined)
  }, [])
  const checks = useMemo(() => blogChecks(form), [form])
  const words = wordCount(form.content)

  return (
    <EditorShell kind="blogs" api={api} noun="blog post"
      side={
        <>
          <section className="ad-panel">
            <h2>Details</h2>
            <Field label="Category" htmlFor="category" error={errors.category}>
              <select id="category" className="ad-input" value={form.category} onChange={(e) => set('category', e.target.value ? Number(e.target.value) : '')}>
                <option value="">No category</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Chips id="tags" label="Tags" value={form.tag_names} onChange={(v) => set('tag_names', v)} hint="Short topics, e.g. Python, Careers." />
            <Text id="author_name" label="Author name" value={form.author_name} onChange={(v) => set('author_name', v)} error={errors.author_name} />
            <Text id="author_title" label="Author designation" value={form.author_title} onChange={(v) => set('author_title', v)} hint="e.g. Python trainer. Only real roles." />
            <label className="ad-check">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> Feature this post at the top of the blog
            </label>
          </section>
          <section className="ad-panel">
            <h2>Featured image</h2>
            <ImageField id="featured_image" label="Image" src={form.featured_image} alt={form.featured_image_alt} onSrc={(v) => set('featured_image', v)} onAlt={(v) => set('featured_image_alt', v)} errors={{ src: errors.featured_image, alt: errors.featured_image_alt }} />
          </section>
          <section className="ad-panel">
            <h2>Related articles</h2>
            <p className="ad-hint">Pick up to 3. If you pick none, posts from the same category are shown.</p>
            <select multiple size={6} className="ad-input" aria-label="Related articles" value={form.related_ids.map(String)} onChange={(e) => set('related_ids', [...e.target.selectedOptions].map((o) => Number(o.value)).slice(0, 3))}>
              {others.filter((o) => o.id !== form.id).map((o) => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
          </section>
        </>
      }
    >
      <Text id="title" label="Title" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} max={200} />
      <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={`Public address: /blog/${form.slug || 'your-url'}. Changing the slug of a live post keeps the old link working (redirect).`}>
        <input id="slug" className="ad-input" value={form.slug} onChange={(e) => api.setSlug(e.target.value)} placeholder="generated from the title" />
      </Field>
      <Text id="excerpt" label="Short excerpt" textarea rows={3} value={form.excerpt} onChange={(v) => set('excerpt', v)} max={400} error={errors.excerpt} hint="Shown on blog cards and in search results when no meta description is set." />
      <RichEditor id="content" label="Article" value={form.content} onChange={(v) => set('content', v)} />
      {errors.content && <p className="ad-field-error" role="alert">{errors.content}</p>}
      <p className="ad-hint">{words} words · about {readingMinutes(form.content)} min read. Use headings H2 and H3; the title is the only H1.</p>

      <Section title="Planning and FAQ (optional)">
        <Text id="search_intent" label="Search intent" value={form.search_intent} onChange={(v) => set('search_intent', v)} hint="Who is searching and what do they want? Only visible here." max={200} />
        <h3 className="ad-sub">Frequently asked questions</h3>
        <p className="ad-hint">Shown at the end of the post and added as FAQ structured data. Only add questions your article really answers.</p>
        {form.faq.map((f, i) => (
          <div key={i} className="ad-row-card">
            <Text id={`faq-q-${i}`} label={`Question ${i + 1}`} value={f.q} onChange={(v) => set('faq', form.faq.map((x, n) => (n === i ? { ...x, q: v } : x)))} max={250} />
            <Text id={`faq-a-${i}`} label="Answer" textarea rows={3} value={f.a} onChange={(v) => set('faq', form.faq.map((x, n) => (n === i ? { ...x, a: v } : x)))} />
            <button type="button" className="ad-link ad-danger" onClick={() => set('faq', form.faq.filter((_, n) => n !== i))}>Remove question</button>
          </div>
        ))}
        {form.faq.length < 15 && (
          <button type="button" className="ad-btn" onClick={() => set('faq', [...form.faq, { q: '', a: '' }])}>Add a question</button>
        )}
      </Section>

      <SeoSection form={form} set={set} errors={errors} base="/blog" checks={checks} />
    </EditorShell>
  )
}
