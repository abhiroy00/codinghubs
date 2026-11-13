// Live/staging SEO smoke test (read-only HTTP). Usage: node scripts/seo-smoke.mjs [baseUrl]   (default https://codinghubs.in)
// Build-time checks live in validate-seo.mjs / validate-locations.mjs; this verifies what a crawler actually receives.
const base = (process.argv[2] || 'https://codinghubs.in').replace(/\/$/, '')
const problems = []
const fail = (m) => problems.push(m)
const get = (url, init = {}) => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'seo-smoke' }, ...init })

async function retry(url, init) {
  let r
  for (let i = 0; i < 3; i++) {
    r = await get(url, init)
    if (r.status < 500) return r
    await new Promise((res) => setTimeout(res, 1500))
  }
  return r
}

// 1. robots + sitemaps
const robots = await retry(`${base}/robots.txt`)
if (robots.status !== 200) fail(`robots.txt ${robots.status}`)
const robotsTxt = await robots.text()
const sitemapUrls = [...robotsTxt.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1])
if (!sitemapUrls.length) fail('robots.txt lists no Sitemap')
const disallowed = [...robotsTxt.matchAll(/^Disallow:\s*(\S+)/gim)].map((m) => m[1])

const urls = new Set()
const sitemapFiles = new Set()
const visiting = new Set()
const xmlDecode = value => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
async function readSitemap(sm, depth = 0) {
  if (depth > 3 || visiting.has(sm)) { fail(`sitemap index cycle or excessive nesting: ${sm}`); return }
  let parsed
  try { parsed = new URL(sm) } catch { fail(`invalid sitemap URL: ${sm}`); return }
  if (parsed.origin !== new URL(base).origin || parsed.username || parsed.password) { fail(`sitemap outside selected site: ${sm}`); return }
  if (sitemapFiles.has(sm)) return
  sitemapFiles.add(sm)
  visiting.add(sm)
  const r = await retry(sm)
  if (r.status !== 200) { fail(`sitemap ${sm} -> ${r.status}`); visiting.delete(sm); return }
  const xml = await r.text()
  if (!xml.includes('<urlset') && !xml.includes('<sitemapindex')) { fail(`sitemap ${sm} is not XML`); visiting.delete(sm); return }
  const entries = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => xmlDecode(m[1]))
  if (xml.includes('<sitemapindex')) {
    for (const child of entries) await readSitemap(child, depth + 1)
  } else {
    for (const url of entries) urls.add(url)
  }
  visiting.delete(sm)
}
for (const sm of sitemapUrls) await readSitemap(sm)

// 2. every sitemap URL: 200, self canonical, indexable, title/description/h1, valid JSON-LD
const titles = new Map()
for (const u of urls) {
  if (new URL(u).origin !== new URL(base).origin) { fail(`${u}: sitemap URL is not on ${base}`); continue }
  const path = new URL(u).pathname
  if (disallowed.some((d) => d !== '/' && path.startsWith(d))) fail(`${u}: listed in sitemap but disallowed in robots.txt`)
  const r = await retry(u)
  if (r.status !== 200) { fail(`${u}: HTTP ${r.status}`); continue }
  const html = await r.text()
  const one = (re) => (html.match(re) || [])[1] || ''
  if (one(/<link rel="canonical" href="([^"]*)"/) !== u) fail(`${u}: canonical is not self`)
  if (/noindex/i.test(one(/<meta name="robots" content="([^"]*)"/)) || /noindex/i.test(r.headers.get('x-robots-tag') || '')) fail(`${u}: noindex but in sitemap`)
  const title = one(/<title>([^<]*)<\/title>/)
  if (!title) fail(`${u}: missing title`)
  else if (titles.has(title)) fail(`${u}: duplicate title with ${titles.get(title)}`)
  else titles.set(title, u)
  if (one(/<meta name="description" content="([^"]*)"/).length < 50) fail(`${u}: meta description missing or under 50 characters`)
  if ((html.match(/<h1\b/g) || []).length !== 1) fail(`${u}: expected exactly one <h1> in the HTML a crawler receives`)
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]) } catch { fail(`${u}: invalid JSON-LD`) }
  }
  await new Promise((res) => setTimeout(res, 150))
}

// 3. host / protocol / slash redirects resolve in a single hop to the canonical URL
const host = new URL(base).host
for (const [from, to] of [
  [`http://${host}/`, `${base}/`],
  [`https://www.${host}/`, `${base}/`],
  [`${base}/locations`, `${base}/locations/`],
  [`${base}/projects/`, `${base}/projects`],
]) {
  try {
    const r = await get(from)
    if (r.status !== 301 || r.headers.get('location') !== to) fail(`redirect ${from} -> ${r.status} ${r.headers.get('location')} (expected 301 ${to})`)
  } catch (e) { fail(`redirect ${from}: ${e.message}`) }
}

// 4. unknown URL is a real 404, app-only routes are noindex
const nf = await get(`${base}/this-page-does-not-exist-seo-smoke`)
if (nf.status !== 404) fail(`unknown URL returned ${nf.status}, expected 404`)
for (const p of ['/login', '/my-account']) {
  const r = await get(`${base}${p}`)
  if (!/noindex/i.test(r.headers.get('x-robots-tag') || '')) fail(`${p}: missing X-Robots-Tag noindex`)
}

console.log(`checked ${urls.size} sitemap URLs on ${base}`)
if (problems.length) { console.log(`${problems.length} problem(s):`); problems.forEach((p) => console.log(' -', p)); process.exit(1) }
console.log('SEO smoke test passed.')
