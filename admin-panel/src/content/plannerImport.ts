/**
 * Turns a post written in the SEO planner format (TITLE, URL SLUG, SEO PREVIEW, CATEGORY, AUTHOR NAME, FOCUS KEYWORD,
 * SECONDARY KEYWORDS, SEO TAGS, META DESCRIPTION, EXCERPT, FEATURED IMAGE, BLOG CONTENT, FAQ...) into blog form fields.
 * Works with plain text (as copied from the planner) and with Markdown. Other brands are replaced with Coding Hubs, and
 * claims that need a human check are listed as warnings. Nothing is saved until the editor clicks Save.
 */
export interface PlannerPost {
  title: string
  slug: string
  seo_title: string
  meta_description: string
  category: string
  author_name: string
  author_title: string
  focus_keyword: string
  secondary_keywords: string[]
  tag_names: string[]
  excerpt: string
  featured_image_alt: string
  featured_image_caption: string
  featured_image_prompt: string
  content: string
  faq: { q: string; a: string }[]
  warnings: string[]
}

const BRAND: [RegExp, string][] = [
  [/https?:\/\/(?:www\.)?innovativeaislabs\.com\/?[^\s)]*/gi, 'https://codinghubs.in/'],
  [/innovativeaislabs\.com/gi, 'codinghubs.in'],
  [/#InnovativeAISolutions/g, '#CodingHubs'],
  [/Innovative AI Solutions?/gi, 'Coding Hubs School of AI'],
  [/Innovative AI Labs?/gi, 'Coding Hubs School of AI'],
]

const FIELD_LABELS = ['URL SLUG', 'SEO PREVIEW', 'CATEGORY', 'AUTHOR NAME', 'FOCUS KEYWORD', 'SECONDARY KEYWORDS', 'SEO TAGS',
  'META DESCRIPTION', 'EXCERPT', 'FEATURED IMAGE', 'BLOG CONTENT']
/** Sections after the article that belong to another site's template, not to the post body. */
const TAIL = /^(contact\b|contact information|business services|about the author|final tagline|ready to build|get free consultation|hashtags:|copyright|\[one-line)/i
const FAQ_HEAD = /^#*\s*(frequently asked questions|faqs?)\s*$/i
const CLAIMS: [RegExp, string][] = [
  [/\b(leading|best|top-rated|no\.?\s?1|#1|number one)\b/i, 'Superlative claim (e.g. "leading", "best"): keep only if you can prove it.'],
  [/\b\d+\+?\s*years?\b/i, 'Experience claim (e.g. "5+ years"): confirm it is true for Coding Hubs.'],
  [/₹\s?\d|\$\s?\d|\blakh\b|\bcrore\b/i, 'Prices or costs: label them as estimates and check they are reasonable.'],
  [/\bguarantee/i, 'Guarantee wording: avoid unless it is a real written guarantee.'],
]

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2">$1</a>')
const slugify = (v: string) => v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
const split = (v: string) => v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)

function isHeading(line: string) {
  const t = line.trim()
  if (!t || t.includes('\t') || t.length > 100 || /[.?!:;,"”]$/.test(t)) return false
  if (/^[-*•|>]|^\d+[.)]\s/.test(t)) return false
  return /^[A-Z0-9₹"“(]/.test(t) && t.split(/\s+/).length <= 14
}

type Block = { kind: 'h' | 'p' | 'table' | 'ul' | 'ol'; text?: string; level?: number; rows?: string[][]; items?: string[] }

function toBlocks(lines: string[]): Block[] {
  const blocks: Block[] = []
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const t = raw.trim()
    if (!t || /^-{3,}$/.test(t)) continue
    const md = /^(#{1,4})\s+(.*)$/.exec(t)
    if (md) { blocks.push({ kind: 'h', level: Math.min(4, Math.max(2, md[1].length)), text: md[2].trim() }); continue }
    if (raw.includes('\t') || /^\|.*\|$/.test(t)) {
      const rows: string[][] = []
      while (i < lines.length && (lines[i].includes('\t') || /^\|.*\|$/.test(lines[i].trim()))) {
        const row = lines[i].trim()
        if (!/^\|?\s*:?-{2,}/.test(row)) rows.push((row.startsWith('|') ? row.replace(/^\||\|$/g, '').split('|') : row.split('\t')).map((c) => c.trim()))
        i++
      }
      i--
      blocks.push({ kind: 'table', rows })
      continue
    }
    if (/^[-*•]\s+/.test(t) || /^\d+[.)]\s+/.test(t)) {
      const ordered = /^\d/.test(t)
      const items: string[] = []
      while (i < lines.length && (ordered ? /^\d+[.)]\s+/ : /^[-*•]\s+/).test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^([-*•]|\d+[.)])\s+/, ''))
        i++
      }
      i--
      blocks.push({ kind: ordered ? 'ol' : 'ul', items })
      continue
    }
    blocks.push(isHeading(t) ? { kind: 'h', text: t } : { kind: 'p', text: t })
  }
  // Plain-text headings have no level: a heading followed straight by another heading opens a section (H2);
  // later headings inside a section that has subsections are H3; anything else is H2.
  let sectionHasSubs = false
  blocks.forEach((b, n) => {
    if (b.kind !== 'h' || b.level) return
    const next = blocks[n + 1]
    if (next?.kind === 'h' && !next.level) { b.level = 2; sectionHasSubs = true }
    else if (sectionHasSubs) b.level = 3
    else b.level = 2
    if (b.level === 2 && !(next?.kind === 'h')) sectionHasSubs = false
  })
  return blocks
}

function toHtml(blocks: Block[]) {
  return blocks.map((b) => {
    if (b.kind === 'h') return `<h${b.level}>${inline(b.text!)}</h${b.level}>`
    if (b.kind === 'p') return `<p>${inline(b.text!)}</p>`
    if (b.kind === 'ul' || b.kind === 'ol') return `<${b.kind}>${b.items!.map((x) => `<li>${inline(x)}</li>`).join('')}</${b.kind}>`
    const [head, ...body] = b.rows!
    return `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  }).join('\n')
}

function parseFaq(lines: string[]) {
  const faq: { q: string; a: string }[] = []
  let current: { q: string; a: string[] } | null = null
  for (const raw of lines) {
    const t = raw.trim()
    if (!t) continue
    if (TAIL.test(t)) break
    const q = /^(?:\d+[.)]\s*|Q[:.]\s*|#{2,4}\s*)?(.+\?)$/.exec(t)
    if (q) {
      if (current) faq.push({ q: current.q, a: current.a.join(' ') })
      current = { q: q[1].trim(), a: [] }
    } else if (current) current.a.push(t.replace(/^A[:.]\s*/, ''))
  }
  if (current) faq.push({ q: current.q, a: current.a.join(' ') })
  return faq.filter((f) => f.q && f.a)
}

export function parsePlannerPost(input: string): PlannerPost {
  let text = input.replace(/\r\n?/g, '\n')
  for (const [from, to] of BRAND) text = text.replace(from, to)
  const lines = text.split('\n')
  const warnings: string[] = []

  // Split the labelled header fields from the article body.
  const sections: Record<string, string[]> = {}
  let key = 'TITLE'
  sections[key] = []
  for (const line of lines) {
    const label = line.trim().replace(/:$/, '').toUpperCase()
    if (FIELD_LABELS.includes(label) && key !== 'BLOG CONTENT') { key = label; sections[key] = []; continue }
    sections[key].push(line)
  }
  const one = (k: string) => (sections[k] ?? []).map((l) => l.trim()).filter(Boolean).join(' ')
  const labelled = (k: string, name: RegExp) => (sections[k] ?? []).map((l) => l.trim()).find((l) => name.test(l))?.replace(name, '').trim() ?? ''

  const title = (sections.TITLE ?? []).map((l) => l.trim()).find(Boolean)?.replace(/^#\s*/, '') ?? ''
  const author = one('AUTHOR NAME')
  const [authorName, ...authorRest] = author.split(',')
  const preview = sections['SEO PREVIEW'] ?? []
  const metaTitle = preview.map((l) => l.trim()).find((l) => /^meta title:/i.test(l))?.replace(/^meta title:/i, '').trim() ?? ''

  // Body: everything under BLOG CONTENT until the FAQ heading or a template tail section.
  const body = sections['BLOG CONTENT'] ?? []
  const faqStart = body.findIndex((l) => FAQ_HEAD.test(l.trim()))
  const tailStart = body.findIndex((l) => TAIL.test(l.trim()))
  const bodyEnd = [faqStart, tailStart].filter((n) => n >= 0).reduce((a, b) => Math.min(a, b), body.length)
  const faq = faqStart >= 0 ? parseFaq(body.slice(faqStart + 1)) : []
  const content = toHtml(toBlocks(body.slice(0, bodyEnd)))

  const secondary = split(one('SECONDARY KEYWORDS'))
  const tags = split(one('SEO TAGS'))
  if (secondary.length > 10) warnings.push(`Only the first 10 of ${secondary.length} secondary keywords are kept.`)
  if (tags.length > 15) warnings.push(`Only the first 15 of ${tags.length} tags are kept.`)
  if (/coding hubs school of ai/i.test(input) === false && /innovative/i.test(input)) warnings.push('Another brand was replaced with Coding Hubs School of AI. Read the post once to check the wording still makes sense.')
  if (!content) warnings.push('No BLOG CONTENT section was found.')
  const all = `${title}\n${text}`
  for (const [rx, note] of CLAIMS) if (rx.test(all)) warnings.push(note)
  if (/\bfounder|ceo\b/i.test(author)) warnings.push('Author title mentions a role: confirm it is correct for Coding Hubs.')

  return {
    title,
    slug: slugify(one('URL SLUG') || title),
    seo_title: metaTitle,
    meta_description: one('META DESCRIPTION') || (preview.map((l) => l.trim()).find((l) => /^meta description:/i.test(l))?.replace(/^meta description:/i, '').trim() ?? ''),
    category: one('CATEGORY'),
    author_name: (authorName ?? '').trim(),
    author_title: authorRest.join(',').trim(),
    focus_keyword: one('FOCUS KEYWORD'),
    secondary_keywords: secondary.slice(0, 10),
    tag_names: tags.slice(0, 15),
    excerpt: one('EXCERPT').slice(0, 400),
    featured_image_alt: labelled('FEATURED IMAGE', /^alt text:/i).slice(0, 200),
    featured_image_caption: labelled('FEATURED IMAGE', /^caption:/i).slice(0, 300),
    featured_image_prompt: labelled('FEATURED IMAGE', /^image prompt:/i),
    content,
    faq: faq.slice(0, 15).map((f) => ({ q: f.q.slice(0, 250), a: f.a.slice(0, 2000) })),
    warnings,
  }
}
