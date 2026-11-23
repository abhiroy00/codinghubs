// Read-only response checks against a built site served by nginx (or production).
// Usage: node scripts/verify-indexing.mjs http://127.0.0.1:18183
import assert from 'node:assert/strict'
import { excludesIndexing, inspectSeoHtml } from './seo-html.mjs'

const base = process.argv[2]
if (!base) throw new Error('Provide the origin of the nginx-served site to check')
const SITE = 'https://codinghubs.in'
const get = async path => {
  const response = await fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  const html = await response.text()
  return { path, status: response.status, location: response.headers.get('location'),
    xRobotsTag: response.headers.get('x-robots-tag'), ...inspectSeoHtml(html), html }
}
const sitemap = await get('/sitemap.xml')
assert.equal(sitemap.status, 200)
const urls = [...sitemap.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
assert.equal(new Set(urls).size, urls.length)
const rows = []
for (const url of urls) {
  assert.equal(new URL(url).origin, SITE)
  assert.equal(new URL(url).search, '')
  const row = await get(new URL(url).pathname)
  assert.equal(row.status, 200, url)
  assert.deepEqual(row.canonicals, [url], url)
  assert.equal(row.noindex || excludesIndexing(row.xRobotsTag ?? ''), false, url)
  if (row.path === '/interview/data-science/') {
    assert.ok(row.html.includes('The Data Science Lifecycle &amp; Problem Framing'))
    assert.ok(row.html.includes('id="prep-answers"'))
  }
  const { html: _, ...result } = row
  rows.push(result)
}
assert.ok(urls.includes(`${SITE}/interview/data-science/`))
const robots = await get('/robots.txt')
assert.equal(robots.status, 200)
assert.ok(robots.html.includes(`Sitemap: ${SITE}/sitemap-index.xml`))
assert.ok(!/^Disallow:\s*\/interview/m.test(robots.html))

const excluded = []
for (const path of ['/login', '/forgot-password', '/my-account', '/interview-studio/practice', '/interview/advanced-digital-marketing/']) {
  const { html: _, ...row } = await get(path)
  assert.equal(row.status, 200, path)
  assert.ok(row.noindex || excludesIndexing(row.xRobotsTag ?? ''), path)
  assert.ok(!urls.includes(SITE + path), path)
  excluded.push(row)
}
const aliases = []
for (const [slug, primary] of [['data-science-pro', 'data-science'], ['aws-solutions-architect', 'aws-certified-solutions-architect']]) {
  const { html: _, ...row } = await get(`/interview/${slug}/`)
  assert.equal(row.status, 200)
  assert.deepEqual(row.canonicals, [`${SITE}/interview/${primary}/`])
  assert.equal(row.noindex || excludesIndexing(row.xRobotsTag ?? ''), false)
  assert.ok(!urls.includes(SITE + row.path))
  aliases.push(row)
}
const redirects = []
for (const [from, to] of [
  ['/interview-prep', '/interview/'], ['/interview-prep/', '/interview/'],
  ['/interview-prep/data-science', '/interview/data-science/'],
  ['/interview-prep/data-science/', '/interview/data-science/'],
  ['/interview-prep/data-science/levels/1?review=1', '/interview/data-science/levels/1/?review=1'],
  ['/interview-prep/generative-ai/levels/1/articles/ai-ml-deep-learning/?review=1', '/interview/generative-ai/levels/1/articles/ai-ml-deep-learning/?review=1'],
  ['/certificates/data-science', '/interview/data-science/'],
  ['/interview/data-science', '/interview/data-science/'],
]) {
  const row = await get(from)
  assert.equal(row.status, 301, from)
  const destination = new URL(row.location, base)
  assert.equal(destination.pathname + destination.search, to, from)
  assert.equal((await get(to)).status, 200, `${from}: replacement must be one hop away`)
  redirects.push({ from, to, status: row.status })
}
const retired = []
for (const path of ['/store', '/store/', '/store/old-product', '/store/old-product/', '/cart', '/checkout', '/payment/success', '/my-account/orders', '/my-account/downloads', '/this-page-does-not-exist-indexing-check']) {
  const row = await get(path)
  // The retired store answers 410 Gone; the control URL must stay a plain 404.
  assert.equal(row.status, path.includes('does-not-exist') ? 404 : 410, path)
  assert.ok(!urls.includes(SITE + path), path)
  retired.push({ path, status: row.status })
}
console.log(JSON.stringify({ base, checkedAt: new Date().toISOString(), sitemapPages: rows.length, rows, excluded, aliases, redirects, retired }, null, 2))
