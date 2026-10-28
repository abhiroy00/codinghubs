import { wordCount } from './types'

const plain = (html: string) => new DOMParser().parseFromString(html || '', 'text/html').body.textContent ?? ''

export function Counter({ value, min, max }: { value: string; min: number; max: number }) {
  const n = value.length
  const tone = n === 0 ? 'idle' : n > max ? 'bad' : n < min ? 'warn' : 'ok'
  return (
    <span className={`ad-count ${tone}`} aria-live="polite">
      {n}/{max}
    </span>
  )
}

export function SerpPreview({ title, url, description }: { title: string; url: string; description: string }) {
  return (
    <div className="ad-serp" aria-label="Search result preview">
      <p className="ad-serp-url">{url}</p>
      <p className="ad-serp-title">{title.slice(0, 70) || 'Page title'}</p>
      <p className="ad-serp-desc">{description.slice(0, 170) || 'Meta description appears here.'}</p>
    </div>
  )
}

export interface Check {
  label: string
  ok: boolean
  hint?: string
}

export function blogChecks(f: { title: string; slug: string; seo_title: string; meta_description: string; focus_keyword: string; excerpt: string; content: string; featured_image: string; featured_image_alt: string }): Check[] {
  const kw = f.focus_keyword.trim().toLowerCase()
  const html = f.content || ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const firstPara = (doc.querySelector('p')?.textContent ?? '').toLowerCase()
  const links = [...doc.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') ?? '')
  const internal = links.some((h) => h.startsWith('/') || h.includes('codinghubs.in'))
  const external = links.some((h) => /^https?:\/\//.test(h) && !h.includes('codinghubs.in'))
  const title = (f.seo_title || f.title).toLowerCase()
  const checks: Check[] = [
    { label: 'Title is set', ok: !!f.title.trim() },
    { label: 'SEO title is 30–60 characters', ok: (f.seo_title || f.title).length >= 30 && (f.seo_title || f.title).length <= 60, hint: 'Leave it blank to use the title plus the site name.' },
    { label: 'Meta description is 70–160 characters', ok: f.meta_description.length >= 70 && f.meta_description.length <= 160 },
    { label: 'Excerpt is written', ok: f.excerpt.trim().length >= 40 },
    { label: 'Focus keyword chosen', ok: !!kw, hint: 'Write for the reader first; the keyword should fit naturally.' },
    { label: 'Keyword is in the title', ok: !!kw && title.includes(kw) },
    { label: 'Keyword is in the URL slug', ok: !!kw && f.slug.includes(kw.replace(/\s+/g, '-')) },
    { label: 'Keyword is in the meta description', ok: !!kw && f.meta_description.toLowerCase().includes(kw) },
    { label: 'Keyword appears in the first paragraph', ok: !!kw && firstPara.includes(kw) },
    { label: 'Uses H2 sections (and one H1 only: the title)', ok: doc.querySelectorAll('h2').length >= 2 && doc.querySelectorAll('h1').length === 0 },
    { label: 'At least 300 words', ok: wordCount(html) >= 300 },
    { label: 'Links to another page on this site', ok: internal },
    { label: 'Links to an outside source (optional)', ok: external },
    { label: 'Featured image has alt text', ok: !!f.featured_image && !!f.featured_image_alt.trim() },
  ]
  return checks
}

export function Checklist({ checks }: { checks: Check[] }) {
  const done = checks.filter((c) => c.ok).length
  return (
    <div className="ad-checks">
      <p>
        <strong>
          {done} of {checks.length}
        </strong>{' '}
        checks passed. These are guides, not rules.
      </p>
      <ul>
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? 'ok' : ''}>
            <span aria-hidden="true">{c.ok ? '✓' : '○'}</span>
            <span className="sr-only">{c.ok ? 'Passed: ' : 'Not yet: '}</span>
            {c.label}
            {!c.ok && c.hint && <small> {c.hint}</small>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export { plain }
