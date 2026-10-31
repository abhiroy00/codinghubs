// Validates the built location pages in dist/. Run after `npm run build`.
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const dist = path.resolve(import.meta.dirname, '..', 'dist')
const SITE = 'https://codinghubs.in'
const MIN_WORDS = 4000
const MAX_OVERLAP = Number(process.env.MAX_OVERLAP ?? 0.3)
const ADDRESS = '904, 9th Floor, Pearls Best Heights-I, Netaji Subhash Place, Delhi – 110034'

const SLUGS = [
  'ai-course-in-south-extension-delhi', 'ai-course-in-pitampura-delhi', 'ai-course-in-tagore-garden-delhi',
  'ai-course-in-connaught-place-delhi', 'ai-course-in-lajpat-nagar-delhi', 'ai-course-in-laxmi-nagar-delhi',
  'ai-course-in-patel-nagar-delhi', 'ai-course-in-uttam-nagar-delhi', 'ai-course-in-nsp-delhi',
  'ai-course-in-aya-nagar-delhi', 'ai-course-in-noida-sector-62', 'ai-course-in-noida-sector-2',
  'ai-course-in-noida-sector-3', 'ai-course-in-gurugram', 'ai-course-in-gurugram-cyber-hub',
  'ai-course-in-faridabad', 'ai-course-in-greater-noida', 'ai-course-in-panipat', 'ai-course-in-rohini-delhi',
]

const BANNED = [/₹/, /\bRs\.?\s?\d/i, /\bINR\b/, /best (ai )?institute/i, /\bno\.?\s?1\b/i, /100% placement/i]

const entities = { '&amp;': '&', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' }
const decode = (s) => s.replace(/&(amp|quot|#x27|#39|lt|gt|nbsp);/g, (m) => entities[m])
const text = (html) => decode(html.replace(/<[^>]+>/g, ' '))
const words = (s) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) ?? []).length

function editorial(html) {
  const heroStart = html.indexOf('data-editorial="hero"')
  const heroEnd = html.indexOf('<aside class="loc-ho-card"', heroStart)
  let hero = html.slice(heroStart, heroEnd)
  hero = hero.replace(/<div class="cta-row">[\s\S]*?<\/div>/, '')
  const bodyStart = html.indexOf('data-editorial="body"')
  const bodyEnd = html.indexOf('</article>', bodyStart)
  let body = html.slice(bodyStart, bodyEnd)
  body = body.replace(/<nav class="loc-toc"[\s\S]*?<\/nav>/, '')
  return text(hero + ' ' + body).replace(/\s+/g, ' ').trim()
}

const failures = []
const fail = (m) => failures.push(m)
const pages = []

for (const slug of SLUGS) {
  const file = path.join(dist, 'locations', slug, 'index.html')
  if (!existsSync(file)) { fail(`${slug}: missing ${file}`); continue }
  const html = await readFile(file, 'utf8')
  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? ''
  const h1s = html.match(/<h1[\s>]/g)?.length ?? 0
  const ed = editorial(html)
  const wc = words(ed)
  pages.push({ slug, html, title: decode(title), desc: decode(desc), canonical, ed, wc })

  if (h1s !== 1) fail(`${slug}: expected 1 <h1>, found ${h1s}`)
  if (canonical !== `${SITE}/locations/${slug}/`) fail(`${slug}: wrong canonical ${canonical}`)
  if (!text(html).includes(ADDRESS)) fail(`${slug}: official head-office address missing`)
  if (!html.includes('coding-hubs-school-of-ai-logo')) fail(`${slug}: logo missing`)
  if (!html.includes('id="local-guidance"')) fail(`${slug}: locality guidance section missing`)
  for (const img of [`assets/ai/loc/${slug}.jpg`, `assets/ai/loc/thumb/${slug}.jpg`]) if (!existsSync(path.join(dist, img))) fail(`${slug}: missing image ${img}`)
  if (!html.includes(`/assets/ai/loc/${slug}.jpg`)) fail(`${slug}: page does not reference its own hero image`)
  if (!html.includes('id="faqs"')) fail(`${slug}: FAQ section missing`)
  if ((html.match(/<div class="loc-faq">/g)?.length ?? 0) < 12) fail(`${slug}: fewer than 12 FAQs`)
  if (wc < MIN_WORDS) fail(`${slug}: only ${wc} editorial words (need ${MIN_WORDS})`)
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  if (ld.length !== 1) fail(`${slug}: expected 1 JSON-LD block, found ${ld.length}`)
  for (const m of ld) { try { JSON.parse(m[1]) } catch { fail(`${slug}: invalid JSON-LD`) } }
  const h1 = decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '').replace(/<[^>]+>/g, '')
  if (!h1) fail(`${slug}: empty h1`)
  for (const re of BANNED) if (re.test(text(html))) fail(`${slug}: banned phrase/pattern ${re}`)
  for (const m of html.matchAll(/href="(\/locations\/[^"#?]*)"/g)) {
    const target = path.join(dist, m[1], 'index.html')
    if (!existsSync(target)) fail(`${slug}: broken internal link ${m[1]}`)
  }
}

// index page
const idxFile = path.join(dist, 'locations', 'index.html')
if (!existsSync(idxFile)) fail('locations index missing')
else {
  const idx = await readFile(idxFile, 'utf8')
  for (const slug of SLUGS) if (!idx.includes(`href="/locations/${slug}/"`)) fail(`index: missing link to ${slug}`)
  if (!text(idx).includes(ADDRESS)) fail('index: head-office address missing')
  if ((idx.match(/<h1[\s>]/g)?.length ?? 0) !== 1) fail('index: expected exactly one <h1>')
  if (!idx.includes('rel="canonical" href="https://codinghubs.in/locations/"')) fail('index: bad canonical')
}

// uniqueness of metadata
for (const key of ['title', 'desc', 'canonical']) {
  const seen = new Map()
  for (const p of pages) {
    if (seen.has(p[key])) fail(`duplicate ${key}: ${p.slug} and ${seen.get(p[key])}`)
    seen.set(p[key], p.slug)
  }
}

// near-duplicate guard: share of 8-word shingles that also occur on another page
const SHINGLE = 8
const sets = pages.map((p) => {
  const w = p.ed.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  const s = new Set()
  for (let i = 0; i + SHINGLE <= w.length; i++) s.add(w.slice(i, i + SHINGLE).join(' '))
  return s
})
let worst = { v: 0, a: '', b: '' }
for (let i = 0; i < pages.length; i++) {
  for (let j = 0; j < pages.length; j++) {
    if (i === j) continue
    let shared = 0
    for (const sh of sets[i]) if (sets[j].has(sh)) shared++
    const v = shared / sets[i].size
    if (v > worst.v) worst = { v, a: pages[i].slug, b: pages[j].slug }
    if (v > MAX_OVERLAP) fail(`near-duplicate content: ${pages[i].slug} shares ${(v * 100).toFixed(0)}% of its 8-word phrases with ${pages[j].slug}`)
  }
}

// sitemap
const smFile = path.join(dist, 'sitemap.xml')
if (!existsSync(smFile)) fail('sitemap.xml missing')
else {
  const sm = await readFile(smFile, 'utf8')
  for (const slug of SLUGS) if (!sm.includes(`<loc>${SITE}/locations/${slug}/</loc>`)) fail(`sitemap: missing ${slug}`)
  if (!sm.includes(`<loc>${SITE}/locations/</loc>`)) fail('sitemap: missing /locations/')
}

console.log('slug'.padEnd(40), 'words')
for (const p of pages) console.log(p.slug.padEnd(40), p.wc)
console.log(`\nworst pairwise 8-word-phrase overlap: ${(worst.v * 100).toFixed(1)}% (${worst.a} -> ${worst.b}), limit ${(MAX_OVERLAP * 100).toFixed(0)}%`)
if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n- ` + failures.join('\n- '))
  process.exit(1)
}
console.log('\nAll location checks passed.')
