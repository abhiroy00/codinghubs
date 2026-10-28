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
