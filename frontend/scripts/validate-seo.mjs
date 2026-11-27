// Site-wide technical SEO checks on the built output (dist/). Run after `npm run build`.
// Checks only what can be verified from the build: it does not measure rankings, indexing or Core Web Vitals.
import { existsSync, readdirSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { inspectSeoHtml } from './seo-html.mjs'

const dist = path.resolve(import.meta.dirname, '..', 'dist')
const SITE = 'https://codinghubs.in'
const APP_ONLY = /^\/(login|register|dashboard|enroll|cart|checkout|payment|my-account|admin-panel|ai|gigs|certificates\/verify)(\/|$)/
const PROXIED = /^\/(api|admin|static)\//
const failures = []
const warnings = []
const fail = (m) => failures.push(m)
const warn = (m) => warnings.push(m)

const decode = (s) => s.replace(/&(amp|quot|#x27|#39|lt|gt);/g, (m) => ({ '&amp;': '&', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>' })[m])
const read = (f) => readFile(path.join(dist, f), 'utf8')

/** Mirrors nginx.conf: where a clean URL is served from. */
function resolveUrl(urlPath) {
  if (/^\/(store|cart|checkout|payment|my-account\/(orders|downloads))(\/|$)/.test(urlPath)) return null
  if (/^\/interview-prep(\/|$)/.test(urlPath) || /^\/certificates\/(?!verify\/$)[^/]+/.test(urlPath)) return null
  if (/^\/(newsletter|brochures)(?:\/|$)/.test(urlPath)) return {file:'content-shell.html', dynamic:true}
  if (/^\/learn(?:\/|$)/.test(urlPath)) return {file: 'content-shell.html', dynamic: true}
  // Explicit Studio nginx locations: canonical landing has no slash; private routes use the SPA shell.
  if (urlPath === '/interview-studio') return { file: 'interview-studio/index.html' }
  if (/^\/interview-studio\/(dashboard|coding-interviews(?:\/(new|history|session\/[a-f0-9-]+))?|practice|problems|company-preparation|dsa-roadmaps|system-design(?:\/interview)?|low-level-design|ai-tutor|analytics|profile)\/?$/.test(urlPath)) return { file: 'index.html', static: true }
  // blog / case studies come from the database: nginx hands these URLs to the backend (server-rendered)
  if (/^\/(blog|case-studies|projects|project-guides)(\/[^/]+)?$/.test(urlPath)) return { file: 'content-shell.html', dynamic: true }
  // account / checkout screens are app-only (noindex SPA shell)
  if (urlPath === '/my-account') return { file: 'index.html', static: true }
  if (urlPath === '/') return { file: 'home.html' }
  if (urlPath.endsWith('/')) {
    const f = path.posix.join(urlPath, 'index.html').slice(1)
    return existsSync(path.join(dist, f)) ? { file: f } : null
  }
  const p = urlPath.slice(1)
  if (existsSync(path.join(dist, `${p}.html`)) && !p.includes('.')) return { file: `${p}.html` }
  if (existsSync(path.join(dist, p)) && statSync(path.join(dist, p)).isFile()) return { file: p, static: true }
  if (existsSync(path.join(dist, p, 'index.html'))) return { file: path.posix.join(p, 'index.html'), needsSlash: true }
  return null
}

// ---------- sitemap ----------
const sitemapXml = await read('sitemap.xml')
if (!sitemapXml.startsWith('<?xml') || !sitemapXml.includes('<urlset') || !sitemapXml.trim().endsWith('</urlset>')) fail('sitemap.xml is not a well-formed urlset')
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
if (new Set(urls).size !== urls.length) fail('sitemap.xml contains duplicate URLs')

// ---------- robots.txt ----------
const robots = await read('robots.txt')
if (!robots.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) fail('robots.txt has no master Sitemap line')
const sitemapIndex = await read('sitemap-index.xml')
if (!sitemapIndex.startsWith('<?xml') || !/<sitemapindex\s+xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/.test(sitemapIndex) || !sitemapIndex.trim().endsWith('</sitemapindex>')) fail('sitemap-index.xml is not a sitemap index')
const children = [...sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
// sitemap-learning.xml is left out while it has 0 published /learn/ concepts (apps/learning/ssr.py:sitemap) -
// an empty child sitemap would be submitted to Search Console for nothing. Add it back once that content ships.
const expectedChildren = ['sitemap.xml', 'sitemap-content.xml', 'sitemap-shop.xml', 'sitemap-directory.xml'].map(name => `${SITE}/${name}`)
if (children.length !== expectedChildren.length || new Set(children).size !== children.length || expectedChildren.some(url => !children.includes(url))) fail('sitemap index must reference all four public child sitemaps')
if (/<lastmod>/.test(sitemapIndex)) fail('Sitemap index must not invent child modification dates')
const contentShell = await read('content-shell.html')
if (!contentShell.includes('<!--SEO_HEAD-->') || !contentShell.includes('<!--SSR_ROOT-->')) fail('content-shell.html is missing its SEO_HEAD / SSR_ROOT markers (the backend fills them)')
const disallows = [...robots.matchAll(/^Disallow:\s*(\S+)/gim)].map((m) => m[1])

const pages = []
for (const url of urls) {
  if (!url.startsWith(`${SITE}/`)) { fail(`sitemap URL not on ${SITE}: ${url}`); continue }
  if (/localhost|127\.0\.0\.1|\?/.test(url)) fail(`sitemap URL is not clean: ${url}`)
  const p = url.slice(SITE.length)
  for (const d of disallows) if (p.startsWith(d)) fail(`sitemap URL ${p} is blocked by robots.txt (Disallow: ${d})`)
  const r = resolveUrl(p)
  if (!r) { fail(`sitemap URL has no built page: ${p}`); continue }
  if (r.needsSlash) fail(`sitemap URL ${p} redirects (needs trailing slash)`)
  pages.push({ url, urlPath: p, file: r.file, html: await read(r.file) })
}

// ---------- per-page ----------
const titles = new Map()
const descs = new Map()
const links = new Map() // urlPath -> Set(targets)
for (const pg of pages) {
  const { html, urlPath } = pg
  const tag = (re) => html.match(re)?.[1]
  const title = decode(tag(/<title>([\s\S]*?)<\/title>/) ?? '')
  const desc = decode(tag(/<meta name="description" content="([^"]*)"/) ?? '')
  const seo = inspectSeoHtml(html)
  const canonical = seo.canonicals[0]
  const robotsMeta = tag(/<meta name="robots" content="([^"]*)"/) ?? ''
  const where = `[${urlPath}]`

  if (title.length < 25 || title.length > 70) fail(`${where} title length ${title.length} (want 25–70): ${title}`)
  if (desc.length < 70 || desc.length > 170) fail(`${where} description length ${desc.length} (want 70–170)`)
  if (titles.has(title)) fail(`${where} duplicate title with ${titles.get(title)}`)
  if (descs.has(desc)) fail(`${where} duplicate description with ${descs.get(desc)}`)
  titles.set(title, urlPath); descs.set(desc, urlPath)
  if (canonical !== pg.url) fail(`${where} canonical is ${canonical}, expected ${pg.url}`)
  if (seo.canonicals.length !== 1) fail(`${where} expected exactly one canonical`)
  if (seo.noindex || !robotsMeta) fail(`${where} robots/googlebot meta missing or noindex: ${JSON.stringify(seo.robots)}`)
  if (!html.includes('<html lang="en-IN">')) fail(`${where} missing lang="en-IN"`)
  for (const k of ['og:title', 'og:description', 'og:url', 'og:image']) if (!html.includes(`property="${k}"`)) fail(`${where} missing ${k}`)
  if (tag(/property="og:url" content="([^"]*)"/) !== pg.url) fail(`${where} og:url differs from canonical`)
  const ogImage = tag(/property="og:image" content="([^"]*)"/) ?? ''
  if (ogImage.startsWith(SITE) && !existsSync(path.join(dist, decodeURI(ogImage.slice(SITE.length))))) fail(`${where} og:image file missing: ${ogImage}`)

  // content pages (not metadata-only shells)
  const hasContent = /<div id="root"><div/.test(html)
  if (hasContent) {
    const h1s = html.match(/<h1[\s>]/g)?.length ?? 0
    if (h1s !== 1) fail(`${where} expected exactly one <h1>, found ${h1s}`)
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]))
    for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) { fail(`${where} heading level jumps h${levels[i - 1]} -> h${levels[i]}`); break }
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      const t = m[0]
      if (!/\balt="/.test(t)) fail(`${where} <img> without alt: ${t.slice(0, 90)}`)
      if (!/\bwidth="/.test(t) || !/\bheight="/.test(t)) warn(`${where} <img> without width/height (layout shift): ${t.slice(0, 90)}`)
    }
  }

  // structured data
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  if (hasContent && ld.length !== 1) fail(`${where} expected 1 JSON-LD block, found ${ld.length}`)
  for (const m of ld) {
    let data
    try { data = JSON.parse(m[1]) } catch { fail(`${where} invalid JSON-LD`); continue }
    const graph = data['@graph'] ?? [data]
    if (!graph.some((n) => n['@type'] === 'EducationalOrganization')) fail(`${where} JSON-LD has no organization node`)
    if (graph.some((n) => n['@type'] === 'LocalBusiness')) fail(`${where} LocalBusiness markup is not allowed (single head office)`)
    if (JSON.stringify(data).match(/aggregateRating|"review"|"price"/)) fail(`${where} JSON-LD contains rating/review/price data`)
  }

  // internal links
  const out = new Set()
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const href = decode(m[1])
    if (!href.startsWith('/') || href.startsWith('//')) continue
    const clean = href.split('#')[0].split('?')[0] || '/'
    out.add(clean)
    if (/^\/(store|cart|checkout|payment|my-account\/(orders|downloads)|interview-prep)(\/|$)/.test(clean) || /^\/certificates\/(?!verify\/$)[^/]+/.test(clean)) {
      fail(`${where} link to retired/legacy URL ${href}`)
      continue
    }
    if (APP_ONLY.test(clean) || PROXIED.test(clean)) continue
    const r = resolveUrl(clean)
    if (!r) { fail(`${where} broken internal link ${href}`); continue }
    if (r.needsSlash) warn(`${where} link ${href} redirects to a trailing-slash URL`)
    if (!r.static && !r.dynamic && clean !== '/' && clean.endsWith('/') && r.file.endsWith('.html') && !r.file.endsWith('index.html')) warn(`${where} link ${href} has a trailing slash but the page is served without one`)
  }
  links.set(urlPath, out)

  // referenced local assets exist
  for (const m of html.matchAll(/(?:src|href)="(\/(?:assets|fs-assets)\/[^"?#]+)/g)) {
    if (!existsSync(path.join(dist, decodeURI(m[1])))) fail(`${where} references missing file ${m[1]}`)
  }
}

// orphan check: every sitemap URL reachable from the home page through links found in the prerendered HTML
const reach = new Set(['/'])
const queue = ['/']
while (queue.length) {
  const cur = queue.shift()
  for (const t of links.get(cur) ?? []) {
    const norm = t
    if (!reach.has(norm)) { reach.add(norm); queue.push(norm) }
  }
}
for (const pg of pages) if (!reach.has(pg.urlPath)) fail(`orphan (not reachable from the home page via HTML links): ${pg.urlPath}`)

// ---------- source-backed prep coverage and preserved non-indexable routes ----------
const sources = JSON.parse(await readFile(path.resolve(import.meta.dirname, '../src/learning/prep-generated/manifest.json'), 'utf8'))
const summary = JSON.parse(await readFile(path.resolve(import.meta.dirname, '../src/seo/roadmap-summary.json'), 'utf8'))
const genaiComplete = JSON.parse(await readFile(path.resolve(import.meta.dirname, '../src/learning/genai-generated/manifest.json'), 'utf8')).flatMap(l => l.articleSlugs).filter(a => a.status === 'COMPLETE').length
const catalog = await readFile(path.resolve(import.meta.dirname, '../src/learning/catalog.ts'), 'utf8')
const courseSlugs = [...catalog.matchAll(/^  \['([^']+)',/gm)].map(m => m[1])
for (const slug of courseSlugs) {
  const p = '/interview/' + slug + '/'
  const html = await read('interview/' + slug + '/index.html')
  const source = sources[slug]
  // Same rule as src/seo/learning.ts: a hub is ready once it has a COMPLETE lesson.
  const ready = (slug === 'generative-ai' ? genaiComplete : summary[slug]?.completeLessons ?? 0) > 0
  const indexed = ready && (source?.primary ?? slug) === slug
  if (urls.includes(SITE + p) !== indexed) fail('Prep source/sitemap mismatch: ' + p)
  if (indexed) {
    for (const id of ['prep-outcomes', 'prep-answers', 'prep-roadmap']) if (!html.includes('id="' + id + '"')) fail(p + ' missing readable guide section ' + id)
    const guide = JSON.parse(await readFile(path.resolve(import.meta.dirname, '../src/learning/prep-generated/' + source.curriculum + '.json'), 'utf8'))
    for (const sample of guide.samples) {
      if (!html.includes(sample.interview[0].question.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;'))) fail(p + ' missing source-backed answer ' + sample.day)
    }
  } else if (!ready && !/<meta name="robots" content="noindex, follow"/.test(html)) fail(p + ' should remain noindex until distinct content is available')
  if (ready && source && source.primary !== slug && /<meta name="robots" content="noindex/.test(html)) fail(p + ' should use canonical consolidation without noindex')
  if (/is a core concept in|It improves reliability, maintainability and clarity|An unrelated concept/.test(html) && source) fail(p + ' exposes source template placeholders')
  const expected = SITE + '/interview/' + (source?.primary ?? slug) + '/'
  if (!html.includes('<link rel="canonical" href="' + expected + '"')) fail(p + ' canonical differs from source mapping')
}
if (urls.some(u => /\/gigs(?:\/|$)/.test(u))) fail('Staged marketplace must stay outside the sitemap')
// <lastmod> only from the content ledger, and only while the page's content still matches it.
{
  const ledger = JSON.parse(await readFile(path.resolve(import.meta.dirname, '../src/seo/lastmod.json'), 'utf8'))
  const hashes = JSON.parse(await readFile(path.resolve(import.meta.dirname, '../dist-nginx/content-hashes.json'), 'utf8'))
  for (const [, loc, mod] of sitemapXml.matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)) {
    const p = loc.slice(SITE.length), entry = ledger[p]
    if (mod && (!entry || entry.date !== mod || entry.hash !== hashes[p])) fail('Static sitemap lastmod not backed by the content ledger: ' + p)
    if (mod && !/^\d{4}-\d{2}-\d{2}$/.test(mod)) fail('Invalid lastmod: ' + p)
  }
}
for (const p of ['/login', '/register', '/dashboard', '/checkout', '/my-account', '/gigs']) {
  if (disallows.some(d => p.startsWith(d))) fail(p + ' must be crawlable so noindex can be read')
}

// ---------- non-indexable pages ----------
const notFound = await read('404.html')
if (!/<meta name="robots" content="noindex/.test(notFound)) fail('404.html must be noindex')
if (urls.some((u) => u.endsWith('/404'))) fail('404 page is in the sitemap')
const shell = await read('index.html')
if (!/<meta name="robots" content="noindex/.test(shell)) fail('SPA shell index.html must be noindex')

// ---------- course "Related guides" point at seeded blog posts ----------
{
  const seedDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../backend/apps/content/seed_data/blog_posts')
  if (existsSync(seedDir)) {
    const seeded = new Set()
    for (const f of readdirSync(seedDir).filter((n) => n.endsWith('.html'))) {
      const m = /^slug:\s*(\S+)/m.exec(await readFile(path.join(seedDir, f), 'utf8'))
      if (m) seeded.add(m[1])
    }
    const related = await readFile(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../src/learning/relatedArticles.ts'), 'utf8')
    for (const [, slug] of related.matchAll(/slug: '([a-z0-9-]+)'/g)) {
      if (!seeded.has(slug)) fail(`relatedArticles.ts links /blog/${slug}, which is not a seeded blog post`)
    }
  }
}

// ---------- report ----------
console.log(`checked ${pages.length} indexable pages from sitemap.xml`)
console.log(`sitemap URLs: ${urls.length}; robots Disallow rules: ${disallows.length}`)
if (warnings.length) console.log(`\n${warnings.length} warning(s):\n- ${[...new Set(warnings)].slice(0, 25).join('\n- ')}`)
if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('\nAll SEO checks passed.')
