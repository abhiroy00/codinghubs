import { useEffect, useState } from 'react'
import { adminApi } from '../api'
import { EditorShell } from './EditorShell'
import { Chips, Field, ImageField, Section, Text } from './fields'
import { RichEditor } from './RichEditor'
import { SeoSection } from './SeoSection'
import { blankCase, readingMinutes, type Row } from './types'
import { useContentForm } from './useContentForm'

const SECTIONS: { key: 'overview' | 'background' | 'challenge' | 'objectives' | 'solution' | 'implementation' | 'results' | 'lessons'; label: string; hint: string }[] = [
  { key: 'overview', label: 'Executive summary', hint: 'Two or three sentences: what was the project and why does it matter?' },
  { key: 'background', label: 'Client background', hint: 'Who the client is. Use an anonymised description if they have not agreed to be named.' },
  { key: 'challenge', label: 'Business challenge', hint: 'The problem the client had.' },
  { key: 'objectives', label: 'Business objectives', hint: 'What success was meant to look like.' },
  { key: 'solution', label: 'Solution architecture', hint: 'What was built or taught, and how the pieces fit.' },
  { key: 'implementation', label: 'Implementation approach', hint: 'How the work was carried out, in steps.' },
  { key: 'results', label: 'Results and business impact', hint: 'Only outcomes that have been verified. Never estimate or round up.' },
  { key: 'lessons', label: 'Lessons learned', hint: 'What the team would do differently or keep doing.' },
]

export function CaseEditor() {
  const api = useContentForm('case-studies', blankCase)
  const { form, set, errors } = api
  const [others, setOthers] = useState<Row[]>([])
  useEffect(() => {
    adminApi.get<{ results: Row[] }>('/case-studies/', { params: { page_size: 100, status: 'published' } }).then((r) => setOthers(r.data.results)).catch(() => undefined)
  }, [])
  const hidden = new Set(form.hidden_sections)
  const toggle = (key: string, hide: boolean) => set('hidden_sections', hide ? [...hidden, key] : [...hidden].filter((k) => k !== key))
  const upd = <K extends 'metrics' | 'related_services' | 'gallery'>(k: K, i: number, patch: Partial<(typeof form)[K][number]>) =>
    set(k, form[k].map((x, n) => (n === i ? { ...x, ...patch } : x)) as (typeof form)[K])

  return (
    <EditorShell kind="case-studies" api={api} noun="case study"
      side={
        <>
          <section className="ad-panel">
            <h2>Details</h2>
            <Text id="industry" label="Industry" value={form.industry} onChange={(v) => set('industry', v)} error={errors.industry} hint="Used for the filter on the public page." max={80} />
            <Text id="duration" label="Project duration" value={form.duration} onChange={(v) => set('duration', v)} hint="Only if known, e.g. 6 weeks." />
            <Text id="author_name" label="Author / project team" value={form.author_name} onChange={(v) => set('author_name', v)} />
            <Text id="author_title" label="Role" value={form.author_title} onChange={(v) => set('author_title', v)} />
            <label className="ad-check">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> Feature this case study
            </label>
          </section>
          <section className="ad-panel">
            <h2>Client</h2>
            <Text id="client_name" label="Client or organisation" value={form.client_name} onChange={(v) => set('client_name', v)} />
            <label className="ad-check">
              <input type="checkbox" checked={form.client_permission} onChange={(e) => set('client_permission', e.target.checked)} /> The client has agreed to be named publicly
            </label>
            <Text id="client_descriptor" label="Anonymised description" value={form.client_descriptor} onChange={(v) => set('client_descriptor', v)} hint="Shown instead of the name unless permission is ticked. e.g. A logistics company in NCR." max={160} />
          </section>
          <section className="ad-panel">
            <h2>Featured image</h2>
            <ImageField id="featured_image" label="Image" src={form.featured_image} alt={form.featured_image_alt} onSrc={(v) => set('featured_image', v)} onAlt={(v) => set('featured_image_alt', v)} errors={{ src: errors.featured_image, alt: errors.featured_image_alt }} />
          </section>
          <section className="ad-panel">
            <h2>Related case studies</h2>
            <select multiple size={5} className="ad-input" aria-label="Related case studies" value={form.related_ids.map(String)} onChange={(e) => set('related_ids', [...e.target.selectedOptions].map((o) => Number(o.value)).slice(0, 3))}>
              {others.filter((o) => o.id !== form.id).map((o) => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
          </section>
        </>
      }
    >
      <Text id="title" label="Title" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} max={200} />
      <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={`Public address: /case-studies/${form.slug || 'your-url'}`}>
        <input id="slug" className="ad-input" value={form.slug} onChange={(e) => api.setSlug(e.target.value)} placeholder="generated from the title" />
      </Field>
      <Text id="summary" label="Project summary" textarea rows={3} value={form.summary} onChange={(v) => set('summary', v)} max={400} error={errors.summary} hint="Shown on the case study cards." />

      <p className="ad-hint">Open a section to write it. Untick “Show” to hide a section that does not apply. About {readingMinutes(form.overview, form.background, form.challenge, form.objectives, form.solution, form.implementation, form.results, form.lessons)} min read.</p>
      {SECTIONS.map((s) => (
        <Section key={s.key} title={s.label} badge={hidden.has(s.key) ? <span className="ad-badge">Hidden</span> : undefined}>
          <label className="ad-check">
            <input type="checkbox" checked={!hidden.has(s.key)} onChange={(e) => toggle(s.key, !e.target.checked)} /> Show this section on the page
          </label>
          <p className="ad-hint">{s.hint}</p>
          <RichEditor id={s.key} label={s.label} value={form[s.key]} onChange={(v) => set(s.key, v)} height={320} />
        </Section>
      ))}

      <Section title="Technology stack">
        <Chips id="technologies" label="Technologies used" value={form.technologies} onChange={(v) => set('technologies', v)} max={30} />
        <label className="ad-check">
          <input type="checkbox" checked={!hidden.has('technologies')} onChange={(e) => toggle('technologies', !e.target.checked)} /> Show on the page
        </label>
      </Section>

      <Section title="Verified results (numbers)">
        <p className="ad-note">Only enter figures the client or your records confirm. Nothing is shown unless you add it here. If a number is confidential, describe it in words in the Results section instead.</p>
        {form.metrics.map((m, i) => (
          <div key={i} className="ad-row-card ad-row-3">
            <Text id={`m-v-${i}`} label="Figure" value={m.value} onChange={(v) => upd('metrics', i, { value: v })} placeholder="e.g. 12" />
            <Text id={`m-l-${i}`} label="What it measures" value={m.label} onChange={(v) => upd('metrics', i, { label: v })} placeholder="e.g. reports automated" />
            <Text id={`m-n-${i}`} label="Source / note (optional)" value={m.note} onChange={(v) => upd('metrics', i, { note: v })} placeholder="e.g. as confirmed by the client" />
            <button type="button" className="ad-link ad-danger" onClick={() => set('metrics', form.metrics.filter((_, n) => n !== i))}>Remove</button>
          </div>
        ))}
        {form.metrics.length < 8 && <button type="button" className="ad-btn" onClick={() => set('metrics', [...form.metrics, { label: '', value: '', note: '' }])}>Add a figure</button>}
        {errors.metrics && <p className="ad-field-error" role="alert">{errors.metrics}</p>}
      </Section>

      <Section title="Related services and gallery">
        <h3 className="ad-sub">Related services</h3>
        {form.related_services.map((s, i) => (
          <div key={i} className="ad-row-card ad-row-2">
            <Text id={`s-l-${i}`} label="Label" value={s.label} onChange={(v) => upd('related_services', i, { label: v })} />
            <Text id={`s-u-${i}`} label="Link" value={s.url} onChange={(v) => upd('related_services', i, { url: v })} placeholder="/program/ai-for-all" />
            <button type="button" className="ad-link ad-danger" onClick={() => set('related_services', form.related_services.filter((_, n) => n !== i))}>Remove</button>
          </div>
        ))}
        {errors.related_services && <p className="ad-field-error" role="alert">{errors.related_services}</p>}
        {form.related_services.length < 8 && <button type="button" className="ad-btn" onClick={() => set('related_services', [...form.related_services, { label: '', url: '' }])}>Add a service link</button>}
        <h3 className="ad-sub">More project images</h3>
        {form.gallery.map((g, i) => (
          <div key={i} className="ad-row-card">
            <ImageField id={`g-${i}`} label={`Image ${i + 1}`} src={g.src} alt={g.alt} onSrc={(v) => upd('gallery', i, { src: v })} onAlt={(v) => upd('gallery', i, { alt: v })} />
            <button type="button" className="ad-link ad-danger" onClick={() => set('gallery', form.gallery.filter((_, n) => n !== i))}>Remove image</button>
          </div>
        ))}
        {form.gallery.length < 8 && <button type="button" className="ad-btn" onClick={() => set('gallery', [...form.gallery, { src: '', alt: '' }])}>Add an image</button>}
      </Section>

      <SeoSection form={form} set={set} errors={errors} base="/case-studies" />
    </EditorShell>
  )
}
