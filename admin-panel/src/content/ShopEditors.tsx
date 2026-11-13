import { useEffect, useState } from 'react'
import { adminApi } from '../api'
import { EditorShell } from './EditorShell'
import { Chips, Field, ImageField, RowsEditor, Section, SelectField, Text } from './fields'
import { RichEditor } from './RichEditor'
import { blankGuide, blankProject, type GuideForm, type ProjectForm } from './shopTypes'
import type { Row } from './types'
import { useContentForm } from './useContentForm'

/* eslint-disable @typescript-eslint/no-explicit-any */
const DIFFICULTY: [string, string][] = [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']]

function useOptions<T = any>(url: string, params: Record<string, unknown> = {}) {
  const [rows, setRows] = useState<T[]>([])
  useEffect(() => {
    adminApi.get(url, { params }).then((r) => setRows(Array.isArray(r.data) ? r.data : r.data.results ?? [])).catch(() => undefined)
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps
  return rows
}

const rich = (id: string, label: string, value: string, onChange: (v: string) => void, height = 300) => (
  <Section key={id} title={label}>
    <RichEditor id={id} label={label} value={value} onChange={onChange} height={height} />
  </Section>
)

/* ============================ Project ============================ */
export function ProjectEditor() {
  const api = useContentForm<ProjectForm>('projects', blankProject)
  const { form, set, errors } = api
  return (
    <EditorShell kind="projects" api={api} noun="project" publishOnCreate
      side={
        <>
          <section className="ad-panel">
            <h2>Details</h2>
            <SelectField id="difficulty" label="Difficulty" value={form.difficulty} onChange={(v) => set('difficulty', v)} options={DIFFICULTY} error={errors.difficulty} />
            <Text id="category" label="Category" value={form.category} onChange={(v) => set('category', v)} hint="e.g. Web development, Data analytics." max={80} />
            <Text id="estimated_time" label="Estimated completion time" value={form.estimated_time} onChange={(v) => set('estimated_time', v)} placeholder="e.g. 2 weeks" />
          </section>
          <section className="ad-panel">
            <h2>Featured image</h2>
            <ImageField id="featured_image" label="Image" src={form.featured_image} alt={form.featured_image_alt} onSrc={(v) => set('featured_image', v)} onAlt={(v) => set('featured_image_alt', v)} errors={{ src: errors.featured_image }} />
          </section>
        </>
      }
    >
      <Text id="title" label="Project title" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} max={200} />
      <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={`Public address: /projects/${form.slug || 'your-url'}`}>
        <input id="slug" className="ad-input" value={form.slug} onChange={(e) => api.setSlug(e.target.value)} placeholder="generated from the title" />
      </Field>
      <Text id="summary" label="Short description" required textarea rows={3} value={form.summary} onChange={(v) => set('summary', v)} max={400} error={errors.summary} hint="This appears on the project card." />
      {rich('overview', 'Detailed project overview', form.overview, (v) => set('overview', v), 360)}
      <Section title="Features (add as many as you need)" open>
        <RowsEditor id="feat" rows={form.features} onChange={(r) => set('features', r)} fields={[{ key: 'title', label: 'Feature' }, { key: 'description', label: 'Description', type: 'textarea' }]} addLabel="Add a feature" max={60} error={errors.features} />
      </Section>
      <Section title="Technology stack">
        <Chips id="technologies" label="Technologies" value={form.technologies} onChange={(v) => set('technologies', v)} max={30} />
      </Section>
    </EditorShell>
  )
}

/* ============================ Guide ============================ */
export function GuideEditor() {
  const api = useContentForm<GuideForm>('project-guides', blankGuide)
  const { form, set, errors } = api
  const projects = useOptions<Row>('/projects/', { page_size: 100 })
  const guidance = form.sections.find((s) => s.key === 'guidance') ?? form.sections.find((s) => s.enabled) ?? {
    key: 'guidance', title: 'Guidance', html: '', enabled: true, preview: false,
  }
  const setGuidance = (html: string) => {
    const index = form.sections.findIndex((s) => s.key === guidance.key)
    const next = { ...guidance, html, enabled: true }
    set('sections', index < 0 ? [next, ...form.sections] : form.sections.map((s, i) => i === index ? next : s))
  }

  return (
    <EditorShell kind="project-guides" api={api} noun="project guide" publishOnCreate submitMessage="Project guide submitted and published."
      side={
        <section className="ad-panel">
          <h2>Project</h2>
          <Field label="Related project" htmlFor="project">
            <select id="project" className="ad-input" value={form.project} onChange={(e) => set('project', e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select a project (optional)</option>
              {projects.map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
            </select>
          </Field>
          {errors.project && <p className="ad-field-error" role="alert">{errors.project}</p>}
        </section>
      }
    >
      <Text id="title" label="Guide title / query" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} max={200} />
      <Text id="summary" label="Project query or problem" required textarea rows={3} value={form.summary} onChange={(v) => set('summary', v)} max={400} error={errors.summary} hint="Briefly describe what the learner is asking or trying to build." />
      {rich('g-guidance', 'Your guidance / answer', guidance.html, setGuidance, 380)}
      {errors.sections && <p className="ad-field-error" role="alert">{errors.sections}</p>}
    </EditorShell>
  )
}
