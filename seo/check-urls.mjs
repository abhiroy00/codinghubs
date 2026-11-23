#!/usr/bin/env node
// HTTP check of every sitemap URL and every redirect, against the nginx-served build or production.
//
//   node seo/check-urls.mjs http://127.0.0.1:18183        (see seo/local-nginx.mjs)
//   node seo/check-urls.mjs https://codinghubs.in          (after deploying)
//
// For each URL: HTTP status, hops, final URL, robots (meta + X-Robots-Tag) and canonical. Flags:
// noindex-in-sitemap, non-200 in sitemap, redirect chains (>1 hop), redirects to the wrong place,
// canonical mismatches, and 200 responses for URLs that must not exist. Writes seo/check-urls-report.csv.
import fs from 'node:fs'
import path from 'node:path'

const base = (process.argv[2] ?? '').replace(/\/$/, '')
if (!base) { console.error('Usage: node seo/check-urls.mjs <origin>'); process.exit(2) }
const SITE = 'https://codinghubs.in'
const root = path.resolve(import.meta.dirname, '..')
const local = url => base + (url.startsWith(SITE) ? url.slice(SITE.length) : url)

async function fetchOnce(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'codinghubs-seo-check/1.0' } })
      return { status: r.status, location: r.headers.get('location'), xRobots: r.headers.get('x-robots-tag') ?? '', body: r.status === 200 ? await r.text() : '' }
    } catch (e) { if (attempt >= 2) throw e }
  }
}
/** Follow redirects manually so every hop is counted. */
async function check(url) {
  let current = local(url), hops = 0, first
  for (;;) {
    const r = await fetchOnce(current)
    first ??= r.status
    if (r.status >= 300 && r.status < 400 && r.location && hops < 10) { current = new URL(r.location, current).toString(); hops++; continue }
    const meta = [...r.body.matchAll(/<meta\s+name="(?:robots|googlebot)"\s+content="([^"]*)"/gi)].map(m => m[1])
    const canonicals = [...r.body.matchAll(/<link\s+rel="canonical"\s+href="([^"]*)"/gi)].map(m => m[1])
    const final = current.startsWith(base) ? SITE + current.slice(base.length) : current
    return { url, first, status: r.status, hops, final, robots: [...meta, r.xRobots].filter(Boolean).join(' | '), canonical: canonicals.join(' '), canonicals }
  }
}
const noindex = robots => /\b(noindex|none)\b/i.test(robots)

async function pool(items, size, fn) {
  const out = []; let i = 0
  await Promise.all(Array.from({ length: size }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]) } }))
  return out
}

// ---------- URL sets ----------
const index = await fetchOnce(local('/sitemap-index.xml'))
if (index.status !== 200) { console.error('sitemap-index.xml →', index.status); process.exit(1) }
const robotsTxt = (await fetchOnce(local('/robots.txt'))).body
const children = [...index.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
const sitemapUrls = []
const sitemapProblems = []
if (!robotsTxt.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) sitemapProblems.push('robots.txt does not name sitemap-index.xml')
for (const child of children) {
  const r = await fetchOnce(local(child))
  if (r.status !== 200) { sitemapProblems.push(`${child} → HTTP ${r.status}`); continue }
  const locs = [...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  for (const loc of locs) sitemapUrls.push({ loc, sitemap: child.split('/').pop() })
}

const mapFile = path.join(root, 'frontend/dist-nginx/lesson-days.map')
const dayRedirects = fs.existsSync(mapFile) ? fs.readFileSync(mapFile, 'utf8').split('\n').filter(l => l.startsWith('/')).map(l => l.replace(/;$/, '').split(' ')) : []
const expectations = [
  ...dayRedirects.map(([from, to]) => ({ from, to })),
  { from: '/interview-prep', to: '/interview/' },
  { from: '/interview-prep/', to: '/interview/' },
  { from: '/interview-prep/cissp/levels/2/days/14/', to: '/interview/cissp/levels/2/days/14/' },
  { from: '/interview-prep/data-science', to: '/interview/data-science/' },
  { from: '/interview-prep/data-science/levels/1?review=1', to: '/interview/data-science/levels/1/?review=1' },
  { from: '/interview/data-science', to: '/interview/data-science/' },
  { from: '/certificates/data-science', to: '/interview/data-science/' },
]
const mustNotExist = ['/interview/no-such-course/', '/interview/cissp/levels/9/', '/interview/cissp/levels/1/days/99/', '/interview/python-training-course/levels/1/articles/day-99/', '/interview/guides/no-such-guide/', '/learn/no-such-path/', '/this-page-does-not-exist']
const gonePages = ['/store', '/store/', '/store/old-product/', '/cart', '/checkout', '/payment/success', '/my-account/orders', '/my-account/downloads']
const privatePages = ['/login', '/login?next=%2Finterview%2Fdata-science%2F', '/register', '/forgot-password', '/my-account/', '/interview-studio/practice']

// ---------- Run ----------
const flags = []
const flag = (kind, url, detail) => flags.push({ kind, url, detail })
for (const p of sitemapProblems) flag('sitemap', '', p)

const seen = new Set()
for (const { loc } of sitemapUrls) { if (seen.has(loc)) flag('duplicate-in-sitemap', loc, ''); seen.add(loc) }
const sitemapRows = await pool(sitemapUrls, 8, async ({ loc, sitemap }) => ({ ...(await check(loc)), group: sitemap }))
for (const r of sitemapRows) {
  if (r.first !== 200) flag(r.hops ? 'redirect-in-sitemap' : 'non-200-in-sitemap', r.url, `HTTP ${r.first} → ${r.final} (${r.status})`)
  if (noindex(r.robots)) flag('noindex-in-sitemap', r.url, r.robots)
  if (r.canonicals.length !== 1 || r.canonicals[0] !== r.url) flag('canonical-mismatch', r.url, r.canonical || '(none)')
}
const redirectRows = await pool(expectations, 8, async ({ from, to }) => {
  const r = await check(from)
  const expected = SITE + to
  if (r.first !== 301) flag('redirect-not-301', from, `HTTP ${r.first}`)
  if (r.hops > 1) flag('redirect-chain', from, `${r.hops} hops → ${r.final}`)
  if (r.final !== expected) flag('redirect-target', from, `${r.final} ≠ ${expected}`)
  if (r.status !== 200 && r.status !== 404) flag('redirect-ends-badly', from, `final HTTP ${r.status}`)
  return { ...r, group: 'redirect', expected }
})
const missingRows = await pool(mustNotExist, 4, async p => {
  const r = await check(p)
  if (r.status === 200) flag('200-on-missing', p, r.final)
  return { ...r, group: 'must-404' }
})
const goneRows = await pool(gonePages, 4, async p => {
  const r = await check(p)
  if (r.first !== 410 || r.hops) flag('retired-not-410', p, `HTTP ${r.first}${r.hops ? ' via redirect' : ''}`)
  return { ...r, group: 'must-410' }
})
const privateRows = await pool(privatePages, 4, async p => {
  const r = await check(p)
  if (r.status === 200 && !noindex(r.robots)) flag('private-page-indexable', p, r.robots || '(no directive)')
  return { ...r, group: 'private' }
})

// ---------- Report ----------
const rows = [...sitemapRows, ...redirectRows, ...missingRows, ...goneRows, ...privateRows]
const cell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
fs.writeFileSync(path.join(root, 'seo/check-urls-report.csv'), [['group', 'url', 'first_status', 'hops', 'final_url', 'final_status', 'robots', 'canonical'],
  ...rows.map(r => [r.group, r.url, r.first, r.hops, r.final, r.status, r.robots, r.canonical])].map(r => r.map(cell).join(',')).join('\n') + '\n')

const bySitemap = Object.entries(sitemapRows.reduce((a, r) => (a[r.group] = (a[r.group] ?? 0) + 1, a), {}))
console.log(`Checked ${base}`)
console.log(`  sitemap-index children: ${children.length} (${children.map(c => c.split('/').pop()).join(', ')})`)
console.log(`  sitemap URLs: ${sitemapRows.length} — ${bySitemap.map(([k, v]) => `${k} ${v}`).join(', ')}`)
console.log(`  redirects: ${redirectRows.length} (single-hop 301: ${redirectRows.filter(r => r.first === 301 && r.hops === 1).length})`)
console.log(`  must-404 probes: ${missingRows.length} (404: ${missingRows.filter(r => r.status === 404).length})`)
console.log(`  retired store (410 Gone): ${goneRows.length} (410: ${goneRows.filter(r => r.first === 410 && !r.hops).length})`)
console.log(`  private pages: ${privateRows.length} (${privateRows.map(r => `${r.url} ${r.status} [${r.robots || '-'}]`).join('; ')})`)
const counts = flags.reduce((a, f) => (a[f.kind] = (a[f.kind] ?? 0) + 1, a), {})
console.log(flags.length ? `\nFLAGS (${flags.length}): ${JSON.stringify(counts)}` : '\nNo flags: every sitemap URL is 200, indexable and self-canonical; every redirect is one 301 hop to the right URL; missing pages 404; retired store pages 410; private pages are noindex.')
for (const f of flags.slice(0, 40)) console.log(`  [${f.kind}] ${f.url} ${f.detail}`)
console.log('\nFull rows: seo/check-urls-report.csv')
process.exit(flags.length ? 1 : 0)
