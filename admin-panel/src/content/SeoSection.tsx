import { Chips, Field, Section, Text } from './fields'
import { Checklist, SerpPreview, type Check } from './seoTools'
import type { Common } from './types'

const SITE = 'https://codinghubs.in'

export function SeoSection<T extends Common>({ form, set, errors, base, checks }: { form: T; set: <K extends keyof T>(k: K, v: T[K]) => void; errors: Record<string, string>; base: string; checks?: Check[] }) {
  const f = form as Common
  const url = `${SITE}${base}/${f.slug || 'your-url'}`
  const title = f.seo_title || (f.title ? `${f.title} | Coding Hubs School of AI` : '')
  return (
    <Section title="Search and social (SEO)">
      <SerpPreview title={title} url={url} description={f.meta_description} />
      <Text id="seo_title" label="SEO title" value={f.seo_title} onChange={(v) => set('seo_title' as keyof T, v as T[keyof T])} max={60} min={30} error={errors.seo_title} hint="Leave empty to use the title followed by the site name." />
      <Text id="meta_description" label="Meta description" textarea rows={3} value={f.meta_description} onChange={(v) => set('meta_description' as keyof T, v as T[keyof T])} max={160} min={70} error={errors.meta_description} hint="One honest sentence that says what the page offers. Each page needs its own." />
      <Text id="focus_keyword" label="Focus keyword" value={f.focus_keyword} onChange={(v) => set('focus_keyword' as keyof T, v as T[keyof T])} hint="The phrase this page is mainly about. Use it naturally; do not repeat it to game search." />
      <Chips id="secondary_keywords" label="Secondary keywords" value={f.secondary_keywords} onChange={(v) => set('secondary_keywords' as keyof T, v as T[keyof T])} max={10} />
      <Field label="Canonical URL (optional)" htmlFor="canonical_url" error={errors.canonical_url} hint="Only if this content was first published elsewhere. Leave empty for the default.">
        <input id="canonical_url" className="ad-input" type="url" value={f.canonical_url} placeholder={url} onChange={(e) => set('canonical_url' as keyof T, e.target.value as T[keyof T])} />
      </Field>
      <h3 className="ad-sub">Social sharing (Open Graph)</h3>
      <Text id="og_title" label="Share title" value={f.og_title} onChange={(v) => set('og_title' as keyof T, v as T[keyof T])} max={90} hint="Empty = SEO title." />
      <Text id="og_description" label="Share description" textarea rows={2} value={f.og_description} onChange={(v) => set('og_description' as keyof T, v as T[keyof T])} max={200} hint="Empty = meta description." />
      <Field label="Share image URL (optional)" htmlFor="og_image" error={errors.og_image} hint="Empty = featured image. Use an uploaded image or an https:// URL.">
        <input id="og_image" className="ad-input" value={f.og_image} onChange={(e) => set('og_image' as keyof T, e.target.value as T[keyof T])} />
      </Field>
      {checks && (
        <>
          <h3 className="ad-sub">SEO checklist</h3>
          <Checklist checks={checks} />
        </>
      )}
    </Section>
  )
}

const plainText = (html: string) => (new DOMParser().parseFromString(html || '', 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim()
const clip = (t: string, n: number) => (t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…')

/** Green box that shows what search engines will get when the optional fields are left empty. */
export function SeoPreviewBox({ title, seoTitle, metaDescription, excerpt, content, focus, tags }: { title: string; seoTitle: string; metaDescription: string; excerpt: string; content: string; focus: string; tags: string[] }) {
  const mTitle = seoTitle || (title ? `${title} | Coding Hubs School of AI` : '')
  const mDesc = metaDescription || clip(excerpt || plainText(content), 155)
  const mFocus = focus || tags[0] || ''
  return (
    <div className="ad-seo-auto" aria-live="polite">
      <h3>✎ SEO Preview (Auto-Generated)</h3>
      <p><strong>Meta Title:</strong> {mTitle || '–'}</p>
      <p><strong>Meta Description:</strong> {mDesc || '–'}</p>
      <p><strong>Focus Keyword:</strong> {mFocus || '–'}</p>
      <small>These fields are filled in automatically when you leave them empty. You can change them below.</small>
    </div>
  )
}

/** META TITLE / FOCUS KEYWORD / META DESCRIPTION / META KEYWORDS, shown inline (not hidden in a section). */
export function MetaFields<T extends Common>({ form, set, errors }: { form: T; set: <K extends keyof T>(k: K, v: T[K]) => void; errors: Record<string, string> }) {
  const f = form as Common
  return (
    <>
      <div className="ad-two">
        <Text id="seo_title" label="Meta title (optional)" value={f.seo_title} onChange={(v) => set('seo_title' as keyof T, v as T[keyof T])} max={60} min={30} error={errors.seo_title} placeholder="Generated from the title if empty" />
        <Text id="focus_keyword" label="Focus keyword (primary)" value={f.focus_keyword} onChange={(v) => set('focus_keyword' as keyof T, v as T[keyof T])} placeholder="e.g. AI course in Delhi" hint="The phrase this page is mainly about. Use it naturally." />
      </div>
      <Text id="meta_description" label="Meta description (optional — made from the content if empty)" textarea rows={3} value={f.meta_description} onChange={(v) => set('meta_description' as keyof T, v as T[keyof T])} max={160} min={70} error={errors.meta_description} placeholder="150–160 characters" hint="If you leave it empty, the first 155 characters of the excerpt or article are used." />
      <Chips id="secondary_keywords" label="Meta keywords (optional)" value={f.secondary_keywords} onChange={(v) => set('secondary_keywords' as keyof T, v as T[keyof T])} max={10} hint="Press Enter or comma after each keyword." />
    </>
  )
}
