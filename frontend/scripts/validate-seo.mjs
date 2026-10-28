// Site-wide technical SEO checks on the built output (dist/). Run after `npm run build`.
// Checks only what can be verified from the build: it does not measure rankings, indexing or Core Web Vitals.
import { existsSync, readdirSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const dist = path.resolve(import.meta.dirname, '..', 'dist')
const SITE = 'https://codinghubs.in'
const APP_ONLY = /^\/(login|register|dashboard|courses|admin-panel)(\/|$)/
const PROXIED = /^\/(api|admin|static)\//
const failures = []
const warnings = []
const fail = (m) => failures.push(m)
const warn = (m) => warnings.push(m)

const decode = (s) => s.replace(/&(amp|quot|#x27|#39|lt|gt);/g, (m) => ({ '&amp;': '&', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>' })[m])
const read = (f) => readFile(path.join(dist, f), 'utf8')

/** Mirrors nginx.conf: where a clean URL is served from. */
function resolveUrl(urlPath) {
  // blog / case studies come from the database: nginx hands these URLs to the backend (server-rendered)
  if (/^\/(blog|case-studies)(\/[^/]+)?$/.test(urlPath)) return { file: 'content-shell.html', dynamic: true }
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
if (/<lastmod>/.test(sitemapXml)) warn('sitemap.xml has <lastmod>; only keep it if it reflects real content changes')

// ---------- robots.txt ----------
const robots = await read('robots.txt')
if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) fail('robots.txt has no Sitemap line')
if (!robots.includes(`Sitemap: ${SITE}/sitemap-content.xml`)) fail('robots.txt has no Sitemap line for the blog/case-study sitemap')
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
  const canonical = tag(/<link rel="canonical" href="([^"]*)"/)
  const robotsMeta = tag(/<meta name="robots" content="([^"]*)"/) ?? ''
  const where = `[${urlPath}]`

  if (title.length < 25 || title.length > 70) fail(`${where} title length ${title.length} (want 25–70): ${title}`)
  if (desc.length < 70 || desc.length > 170) fail(`${where} description length ${desc.length} (want 70–170)`)
  if (titles.has(title)) fail(`${where} duplicate title with ${titles.get(title)}`)
  if (descs.has(desc)) fail(`${where} duplicate description with ${descs.get(desc)}`)
  titles.set(title, urlPath); descs.set(desc, urlPath)
  if (canonical !== pg.url) fail(`${where} canonical is ${canonical}, expected ${pg.url}`)
  if (/noindex/i.test(robotsMeta) || !robotsMeta) fail(`${where} robots meta missing or noindex: "${robotsMeta}"`)
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
    const hasVisibleBreadcrumb = /class="breadcrumb"/.test(html)
    if (graph.some((n) => n['@type'] === 'BreadcrumbList') && !hasVisibleBreadcrumb) fail(`${where} BreadcrumbList markup without a visible breadcrumb`)
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
    if (APP_ONLY.test(clean) || PROXIED.test(clean)) continue
    const r = resolveUrl(clean)
    if (!r) { fail(`${where} broken internal link ${href}`); continue }
    if (r.needsSlash) warn(`${where} link ${href} redirects to a trailing-slash URL`)
    if (!r.static && clean !== '/' && clean.endsWith('/') && r.file.endsWith('.html') && !r.file.endsWith('index.html')) warn(`${where} link ${href} has a trailing slash but the page is served without one`)
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

// ---------- non-indexable pages ----------
const notFound = await read('404.html')
if (!/<meta name="robots" content="noindex/.test(notFound)) fail('404.html must be noindex')
if (urls.some((u) => u.endsWith('/404'))) fail('404 page is in the sitemap')
const shell = await read('index.html')
if (!/<meta name="robots" content="noindex/.test(shell)) fail('SPA shell index.html must be noindex')
const faq = await read('faq.html')
if (urls.includes(`${SITE}/faq`) === /noindex/.test(faq)) fail('faq.html robots meta and sitemap membership disagree')

// ---------- report ----------
console.log(`checked ${pages.length} indexable pages from sitemap.xml`)
console.log(`sitemap URLs: ${urls.length}; robots Disallow rules: ${disallows.length}`)
if (warnings.length) console.log(`\n${warnings.length} warning(s):\n- ${[...new Set(warnings)].slice(0, 25).join('\n- ')}`)
if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('\nAll SEO checks passed.')
