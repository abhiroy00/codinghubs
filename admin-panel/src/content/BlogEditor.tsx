import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../api'
import { EditorShell } from './EditorShell'
import { Chips, Field, Section, Text, ThumbnailField } from './fields'
import { RichEditor } from './RichEditor'
import { MetaFields, SeoPreviewBox, SeoSection } from './SeoSection'
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
    <EditorShell kind="blogs" api={api} noun="blog post" layout="single">
      <Text id="title" label="Post title" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} max={200} placeholder="e.g. How to Choose the Best AI Course in Delhi" />
      <Field label="URL slug (auto-generated)" htmlFor="slug" error={errors.slug}>
        <input id="slug" className="ad-input" value={form.slug} onChange={(e) => api.setSlug(e.target.value)} placeholder="how-to-choose-the-best-ai-course-in-delhi" />
      </Field>
      <p className="ad-urlchip">🔗 codinghubs.in/blog/{form.slug || 'your-post-slug'}</p>
      <SeoPreviewBox title={form.title} seoTitle={form.seo_title} metaDescription={form.meta_description} excerpt={form.excerpt} content={form.content} focus={form.focus_keyword} tags={form.tag_names} />
      <hr className="ad-hr" />
      <div className="ad-three">
        <Field label="Category" htmlFor="category" error={errors.category}>
          <select id="category" className="ad-input" value={form.category} onChange={(e) => set('category', e.target.value ? Number(e.target.value) : '')}>
            <option value="">No category</option>
            {cats.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </Field>
        <Text id="author_name" label="Author name" value={form.author_name} onChange={(v) => set('author_name', v)} error={errors.author_name} placeholder="Coding Hubs Team" />
        <Field label="Read time" htmlFor="read_time" hint="Calculated from the article.">
          <input id="read_time" className="ad-input" readOnly value={`${readingMinutes(form.content)} min`} />
        </Field>
      </div>
      <Chips id="tags" label="Tags (comma separated)" value={form.tag_names} onChange={(v) => set('tag_names', v)} hint="e.g. AI, RAG, automation, LLM" />
      <MetaFields form={form} set={set} errors={errors} />
      <hr className="ad-hr" />
      <ThumbnailField id="featured_image" src={form.featured_image} alt={form.featured_image_alt} onSrc={(v) => set('featured_image', v)} onAlt={(v) => set('featured_image_alt', v)} error={errors.featured_image} altError={errors.featured_image_alt} />
      <Text id="excerpt" label="Excerpt (short description)" required textarea rows={4} value={form.excerpt} onChange={(v) => set('excerpt', v)} max={400} error={errors.excerpt} placeholder="A short summary — shown on blog cards and in search results." />
      <RichEditor id="content" label="Article" value={form.content} onChange={(v) => set('content', v)} />
      {errors.content && <p className="ad-field-error" role="alert">{errors.content}</p>}
      <p className="ad-note-line">🛡 <strong>Note:</strong> unsafe HTML (scripts, iframes, inline event handlers) is removed when you save. {words} words · about {readingMinutes(form.content)} min read. Use headings H2 and H3; the title is the only H1.</p>

      <Section title="More options (author role, related posts, FAQ, canonical URL, social sharing, SEO checklist)">
        <Text id="author_title" label="Author designation" value={form.author_title} onChange={(v) => set('author_title', v)} hint="e.g. Python trainer. Only real roles." />
        <Field label="Related articles" htmlFor="related" hint="Pick up to 3. If you pick none, posts from the same category are shown.">
          <select id="related" multiple size={6} className="ad-input" value={form.related_ids.map(String)} onChange={(e) => set('related_ids', [...e.target.selectedOptions].map((o) => Number(o.value)).slice(0, 3))}>
            {others.filter((o) => o.id !== form.id).map((o) => (<option key={o.id} value={o.id}>{o.title}</option>))}
          </select>
        </Field>
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
        {form.faq.length < 15 && <button type="button" className="ad-btn" onClick={() => set('faq', [...form.faq, { q: '', a: '' }])}>Add a question</button>}
      </Section>
      <SeoSection form={form} set={set} errors={errors} base="/blog" checks={checks} />
    </EditorShell>
  )
}
