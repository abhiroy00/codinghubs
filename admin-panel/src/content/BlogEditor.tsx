import { useEffect, useState } from 'react'
import { adminApi } from '../api'
import { EditorShell } from './EditorShell'
import { Chips, Field, Text, ThumbnailField } from './fields'
import { RichEditor } from './RichEditor'
import { blankBlog, readingMinutes, wordCount, type Taxon } from './types'
import { useContentForm } from './useContentForm'

export function BlogEditor() {
  const api = useContentForm('blogs', blankBlog)
  const { form, set, errors } = api
  const [cats, setCats] = useState<Taxon[]>([])
  useEffect(() => {
    adminApi.get<Taxon[]>('/blog-categories/').then((r) => setCats(r.data)).catch(() => undefined)
  }, [])
  const words = wordCount(form.content)

  return (
    <EditorShell kind="blogs" api={api} noun="blog post" layout="single">
      <Text id="title" label="Post title" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} max={200} placeholder="e.g. How to Choose the Best AI Course in Delhi" />
      <Field label="URL slug (auto-generated)" htmlFor="slug" error={errors.slug}>
        <input id="slug" className="ad-input" value={form.slug} onChange={(e) => api.setSlug(e.target.value)} placeholder="how-to-choose-the-best-ai-course-in-delhi" />
      </Field>
      <p className="ad-urlchip">🔗 codinghubs.in/blog/{form.slug || 'your-post-slug'}</p>
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
      <hr className="ad-hr" />
      <ThumbnailField id="featured_image" src={form.featured_image} alt={form.featured_image_alt} onSrc={(v) => set('featured_image', v)} onAlt={(v) => set('featured_image_alt', v)} error={errors.featured_image} altError={errors.featured_image_alt} />
      <Text id="excerpt" label="Excerpt (short description)" required textarea rows={4} value={form.excerpt} onChange={(v) => set('excerpt', v)} max={400} error={errors.excerpt} placeholder="A short summary — shown on blog cards and in search results." />
      <RichEditor id="content" label="Article" value={form.content} onChange={(v) => set('content', v)} />
      {errors.content && <p className="ad-field-error" role="alert">{errors.content}</p>}
      <p className="ad-note-line">🛡 <strong>Note:</strong> unsafe HTML (scripts, iframes, inline event handlers) is removed when you save. {words} words · about {readingMinutes(form.content)} min read. Use headings H2 and H3; the title is the only H1.</p>
    </EditorShell>
  )
}
