import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../api'
import { EditorShell } from './EditorShell'
import { AssetPanel, CheckField, Chips, Field, ImageField, NumberField, RowsEditor, Section, SelectField, Text, ThumbnailField } from './fields'
import { RichEditor } from './RichEditor'
import { SeoSection } from './SeoSection'
import { blankGuide, blankProduct, blankProject, GUIDE_SECTIONS, type GuideForm, type ProductForm, type ProjectForm } from './shopTypes'
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

function MultiSelect({ id, label, value, onChange, options, max = 6 }: { id: string; label: string; value: number[]; onChange: (v: number[]) => void; options: { id: number; title?: string; name?: string }[]; max?: number }) {
  return (
    <Field label={label} htmlFor={id} hint={`Hold Ctrl/Cmd to choose several (up to ${max}).`}>
      <select id={id} multiple size={5} className="ad-input" value={value.map(String)} onChange={(e) => onChange([...e.target.selectedOptions].map((o) => Number(o.value)).slice(0, max))}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.title ?? o.name}</option>
        ))}
      </select>
    </Field>
  )
}

function ProductPicker({ id, label, value, onChange, hint, error }: { id: string; label: string; value: number | ''; onChange: (v: number | '') => void; hint?: string; error?: string }) {
  const products = useOptions<Row>('/products/', { page_size: 100 })
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <select id={id} className="ad-input" value={value} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}>
        <option value="">None</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>
    </Field>
  )
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
  const courses = useOptions<any>('/courses/')
  // make sure every standard section exists in the form (older guides may have fewer)
  const sections = [...form.sections]
  for (const [key, title] of GUIDE_SECTIONS) if (!sections.some((s) => s.key === key)) sections.push({ key, title, html: '', enabled: false, preview: false })
  const upd = (key: string, patch: Partial<GuideForm['sections'][number]>) => set('sections', sections.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const needsProduct = form.access_type === 'paid' || form.access_type === 'included'

  return (
    <EditorShell kind="project-guides" api={api} noun="project guide"
      side={
        <>
          <section className="ad-panel">
            <h2>Access</h2>
            <SelectField id="access_type" label="Who can read it" value={form.access_type} onChange={(v) => set('access_type', v)} options={[['free', 'Free for everyone'], ['account', 'Free, account required'], ['paid', 'Paid'], ['included', 'Included with a product or course']]} />
            {needsProduct && <ProductPicker id="gproduct" label={form.access_type === 'paid' ? 'Product that unlocks it *' : 'Product that unlocks it'} value={form.product} onChange={(v) => set('product', v)} error={errors.product} hint="Customers who bought this product (and whose payment was not refunded) can read the whole guide." />}
            {form.access_type === 'included' && <MultiSelect id="icourses" label="Courses that include it" value={form.included_course_ids} onChange={(v) => set('included_course_ids', v)} options={courses.map((c: any) => ({ id: c.id, name: c.name }))} max={10} />}
            <p className="ad-hint">Locked sections are never sent to the browser or search engines. Mark a section “free preview” to show it to everyone.</p>
          </section>
          <section className="ad-panel">
            <h2>Details</h2>
            <Field label="Project" htmlFor="project">
              <select id="project" className="ad-input" value={form.project} onChange={(e) => set('project', e.target.value ? Number(e.target.value) : '')}>
                <option value="">None</option>
                {projects.map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
              </select>
            </Field>
            <SelectField id="g-difficulty" label="Difficulty" value={form.difficulty} onChange={(v) => set('difficulty', v)} options={DIFFICULTY} />
            <Text id="g-category" label="Category" value={form.category} onChange={(v) => set('category', v)} max={80} />
            <Text id="g-time" label="Estimated completion time" value={form.estimated_time} onChange={(v) => set('estimated_time', v)} />
          </section>
          <section className="ad-panel">
            <h2>Featured image</h2>
            <ImageField id="g-image" label="Image" src={form.featured_image} alt={form.featured_image_alt} onSrc={(v) => set('featured_image', v)} onAlt={(v) => set('featured_image_alt', v)} />
          </section>
          <AssetPanel endpoint="project-guides" ownerId={form.id} title="Attachments (private)" />
        </>
      }
    >
      <Text id="title" label="Guide title" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} max={200} />
      <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={`Public address: /project-guides/${form.slug || 'your-url'}`}>
        <input id="slug" className="ad-input" value={form.slug} onChange={(e) => api.setSlug(e.target.value)} placeholder="generated from the title" />
      </Field>
      <Text id="summary" label="Short description" textarea rows={3} value={form.summary} onChange={(v) => set('summary', v)} max={400} />
      <Chips id="objectives" label="Learning objectives" value={form.objectives} onChange={(v) => set('objectives', v)} max={20} />
      <Chips id="required_software" label="Required software" value={form.required_software} onChange={(v) => set('required_software', v)} max={30} />
      <Chips id="g-tech" label="Technology stack" value={form.technologies} onChange={(v) => set('technologies', v)} max={30} />
      {rich('g-prereq', 'Prerequisites', form.prerequisites, (v) => set('prerequisites', v), 240)}
      <h2 className="ad-sub">Guide sections</h2>
      <p className="ad-hint">Switch on only the sections this guide needs. Add code with the code-sample button; it is shown with a copy button. Never paste passwords or private keys.</p>
      {sections.map((s) => (
        <Section key={s.key} title={s.title} badge={<span className={`ad-badge ${s.enabled ? 'st-published' : ''}`}>{s.enabled ? 'On' : 'Off'}</span>}>
          <CheckField id={`en-${s.key}`} label="Include this section" checked={s.enabled} onChange={(v) => upd(s.key, { enabled: v })} />
          <CheckField id={`pv-${s.key}`} label="Show to everyone as a free preview (even when the guide is locked)" checked={s.preview} onChange={(v) => upd(s.key, { preview: v })} />
          <Text id={`st-${s.key}`} label="Section title" value={s.title} onChange={(v) => upd(s.key, { title: v })} max={120} />
          <RichEditor id={`sec-${s.key}`} label={s.title} value={s.html} onChange={(v) => upd(s.key, { html: v })} height={380} />
        </Section>
      ))}
    </EditorShell>
  )
}

/* ============================ Product ============================ */
const TYPES: [string, string][] = [['digital', 'Digital (download)'], ['physical', 'Physical (shipped)'], ['mixed', 'Physical + digital']]
const KINDS: [string, string][] = [
  ['programming_notes', 'Programming notes'], ['interview_notes', 'Interview preparation notes'], ['book', 'Technical book'], ['printed_material', 'Printed study material'],
  ['pdf_notes', 'PDF notes'], ['ebook', 'E-book'], ['source_code', 'Project source code'], ['project_report', 'Project report'], ['project_guide', 'Project guide'],
  ['lab_manual', 'Practical lab manual'], ['question_bank', 'Question bank'], ['mock_test', 'Mock test material'], ['course_material', 'Course study material'], ['other', 'Other'],
]

export function ProductEditor() {
  const api = useContentForm<ProductForm>('products', blankProduct)
  const { form, set, errors } = api
  const cats = useOptions<any>('/product-categories/')
  const physical = form.product_type !== 'digital'
  const digital = form.product_type !== 'physical'
  const discount = form.original_price && Number(form.original_price) > Number(form.price) ? Math.round((1 - Number(form.price) / Number(form.original_price)) * 100) : 0
  return (
    <EditorShell kind="products" api={api} noun="product"
      side={
        <>
          <section className="ad-panel">
            <h2>Product type</h2>
            <SelectField id="product_type" label="Type" value={form.product_type} onChange={(v) => set('product_type', v)} options={TYPES} error={errors.product_type} />
            <SelectField id="item_kind" label="Kind" value={form.item_kind} onChange={(v) => set('item_kind', v)} options={KINDS} />
            <Field label="Category" htmlFor="pcat">
              <select id="pcat" className="ad-input" value={form.category} onChange={(e) => set('category', e.target.value ? Number(e.target.value) : '')}>
                <option value="">No category</option>
                {cats.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </Field>
            <Text id="sku" label="SKU / product ID" value={form.sku} onChange={(v) => set('sku', v)} error={errors.sku} hint="Leave empty to generate one." max={40} />
            <CheckField id="p-feat" label="Feature this product" checked={form.is_featured} onChange={(v) => set('is_featured', v)} />
          </section>
          <section className="ad-panel">
            <h2>Price</h2>
            <NumberField id="price" label="Selling price (₹) *" step="0.01" min={0} value={form.price} onChange={(v) => set('price', v)} error={errors.price} hint="0 makes it a free item (claimed through checkout so downloads have an owner)." />
            <NumberField id="original_price" label="Original price (₹)" step="0.01" min={0} value={form.original_price} onChange={(v) => set('original_price', v)} error={errors.original_price} hint={discount ? `Shows a ${discount}% saving. Only fill this in if it is a real earlier price.` : 'Optional. Only if it is a real earlier price.'} />
            <Text id="currency" label="Currency" value={form.currency} onChange={(v) => set('currency', v.toUpperCase())} max={3} error={errors.currency} />
            <NumberField id="tax_rate" label="Tax rate override (%)" step="0.01" min={0} value={form.tax_rate} onChange={(v) => set('tax_rate', v)} error={errors.tax_rate} hint="Empty = the store default (Store settings). Set only what your accountant confirms." />
          </section>
          {physical && (
            <section className="ad-panel">
              <h2>Stock and shipping</h2>
              <CheckField id="track_stock" label="Track stock" checked={form.track_stock} onChange={(v) => set('track_stock', v)} />
              <NumberField id="stock_quantity" label="Quantity in stock" value={form.stock_quantity} onChange={(v) => set('stock_quantity', Number(v))} error={errors.stock_quantity} hint="After the first save use Inventory to adjust stock: every change is logged." />
              <NumberField id="low_stock_threshold" label="Low-stock alert at" value={form.low_stock_threshold} onChange={(v) => set('low_stock_threshold', Number(v))} />
              <NumberField id="weight_grams" label="Weight (grams)" value={form.weight_grams} onChange={(v) => set('weight_grams', v === '' ? '' : Number(v))} />
              <Text id="dimensions" label="Dimensions" value={form.dimensions} onChange={(v) => set('dimensions', v)} placeholder="e.g. 21 × 14 × 2 cm" />
            </section>
          )}
          {digital && (
            <>
              <section className="ad-panel">
                <h2>Digital delivery</h2>
                <NumberField id="download_limit" label="Downloads per file per purchase" value={form.download_limit} onChange={(v) => set('download_limit', v === '' ? '' : Number(v))} hint="Empty = unlimited." />
              </section>
              <AssetPanel endpoint="products" ownerId={form.id} title="Downloadable files (private)" />
            </>
          )}
        </>
      }
    >
      <Text id="title" label="Product name" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} max={200} />
      <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={`Public address: /store/${form.slug || 'your-url'}`}>
        <input id="slug" className="ad-input" value={form.slug} onChange={(e) => api.setSlug(e.target.value)} placeholder="generated from the name" />
      </Field>
      <Text id="short_description" label="Short description" textarea rows={3} value={form.short_description} onChange={(v) => set('short_description', v)} max={400} error={errors.short_description} />
      <RichEditor id="description" label="Full description" value={form.description} onChange={(v) => set('description', v)} height={420} />
      <Section title="Images" open>
        <RowsEditor id="pimg" rows={form.images} onChange={(r) => set('images', r)} fields={[{ key: 'src', label: 'Image', type: 'image' }, { key: 'alt', label: 'Description (alt text)' }]} addLabel="Add an image" max={10} error={errors.images} />
      </Section>
      <Section title="Details">
        <Chips id="included_materials" label="What is included" value={form.included_materials} onChange={(v) => set('included_materials', v)} max={20} hint="e.g. 120-page PDF, source code ZIP." />
        <Text id="author" label="Author" value={form.author} onChange={(v) => set('author', v)} />
        <Text id="publisher" label="Publisher" value={form.publisher} onChange={(v) => set('publisher', v)} />
        <Text id="isbn" label="ISBN" value={form.isbn} onChange={(v) => set('isbn', v)} error={errors.isbn} hint="Books only; validated." />
        <Text id="language" label="Language" value={form.language} onChange={(v) => set('language', v)} />
        <Text id="edition" label="Edition" value={form.edition} onChange={(v) => set('edition', v)} />
        <NumberField id="publication_year" label="Publication year" value={form.publication_year} onChange={(v) => set('publication_year', v === '' ? '' : Number(v))} />
        <NumberField id="pages" label="Pages" value={form.pages} onChange={(v) => set('pages', v === '' ? '' : Number(v))} />
        <Text id="format" label="Format" value={form.format} onChange={(v) => set('format', v)} placeholder="PDF, EPUB, Paperback…" />
        <Chips id="topics" label="Technologies / topics covered" value={form.topics} onChange={(v) => set('topics', v)} max={20} />
      </Section>
      <SeoSection form={form} set={set} errors={errors} base="/store" />
    </EditorShell>
  )
}


/* ============================ Simple product (notes) ============================ */
/** What the owner needs to sell notes: name, price, a short line, a picture and the PDF. Everything else is filled in for them. */
export function SimpleProductEditor() {
  const api = useContentForm<ProductForm>('products', { ...blankProduct, price: '', item_kind: 'pdf_notes', product_type: 'digital', format: 'PDF' })
  const { form, set, errors } = api
  const [files, setFiles] = useState(0)
  const cover = form.images[0]
  const blocked = !form.id ? 'Save the draft first, then upload the note file (PDF). Publish unlocks after that.' : files === 0 ? 'Upload the note file (PDF) below before publishing.' : undefined
  return (
    <EditorShell kind="products" api={api} noun="product" layout="single" publishBlock={blocked}>
      <Text id="title" label="Note name" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} max={200} placeholder="e.g. Python Notes — Complete Handwritten PDF" />
      <div className="ad-two">
        <NumberField id="price" label="Price (₹) *" step="1" min={0} value={form.price} onChange={(v) => set('price', v)} error={errors.price} hint="Enter 0 to give it for free." />
        <NumberField id="original_price" label="Original price / MRP (₹), optional" step="1" min={0} value={form.original_price} onChange={(v) => set('original_price', v)} error={errors.original_price} hint="Only if it is a real earlier price; it shows struck through." />
      </div>
      <Text id="short_description" label="Short description" textarea rows={3} value={form.short_description} onChange={(v) => set('short_description', v)} max={400} error={errors.short_description} placeholder="One or two lines about what is inside (shown on the store card)." />
      <ThumbnailField id="cover" label="Cover image" src={cover?.src ?? ''} alt={cover?.alt ?? ''} onSrc={(v) => set('images', v ? [{ src: v, alt: cover?.alt ?? '' }] : [])} onAlt={(v) => set('images', cover ? [{ ...cover, alt: v }] : [])} error={errors.images} />
      <RichEditor id="description" label="Full description (optional)" value={form.description} onChange={(v) => set('description', v)} height={320} />
      <AssetPanel endpoint="products" ownerId={form.id} title="The note file (PDF) customers get after paying" onCount={setFiles} saveFirst="Click “Save as Draft” first. This box then lets you upload the PDF." />
      {form.id && <p className="ad-note-line">Need printed books, stock or tax settings? <Link to={`/products/advanced/${form.id}`}>Open the advanced editor</Link>.</p>}
    </EditorShell>
  )
}
