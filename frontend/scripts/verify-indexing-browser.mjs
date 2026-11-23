// Run against the same nginx-served build as verify-indexing.mjs, with its backend available.
// Uses an isolated guest profile. No forms, authenticated operations or API mocks.
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const base = process.argv[2]
if (!base) throw new Error('Provide the origin of the nginx-served site to check')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ reducedMotion: 'reduce' })
const page = await context.newPage()
const errors = [], rows = []
page.on('pageerror', error => errors.push(error.message))
const read = () => page.evaluate(() => ({
  path: location.pathname, title: document.title,
  canonicals: [...document.querySelectorAll('head link[rel="canonical"]')].map(e => e.href),
  robots: [...document.querySelectorAll('head meta[name="robots"], head meta[name="googlebot"]')].map(e => ({ name: e.name, content: e.content })),
  headings: [...document.querySelectorAll('h1')].map(e => e.textContent),
}))
async function verify(path) {
  await page.waitForFunction(expected => document.querySelector('head link[rel="canonical"]')?.href === expected, 'https://codinghubs.in' + path)
  const row = await read()
  assert.deepEqual(row.canonicals, ['https://codinghubs.in' + path])
  assert.ok(row.robots.every(r => !/noindex|\bnone\b/i.test(r.content)))
  assert.equal(row.robots.filter(r => r.name === 'robots').length, 1)
  assert.equal(row.headings.length, 1)
  rows.push(row)
}
try {
  await page.goto(base + '/interview/', { waitUntil: 'networkidle' })
  await verify('/interview/')
  assert.equal(await page.locator('a[href="/interview/data-science-pro/"]').count(), 0)
  await page.locator('a[href="/interview/data-science/"]').first().click()
  await verify('/interview/data-science/')
  await page.getByRole('heading', { name: 'Topic-wise interview questions and practical examples' }).waitFor()
  await page.getByRole('link', { name: 'Interview', exact: true }).first().click()
  await verify('/interview/')
  // API results are paginated; find the guide through the public search UI.
  await page.getByRole('searchbox', { name: 'Search topics, questions and explanations' }).fill('Sliding windows')
  await page.locator('a[href="/interview/guides/sliding-window/"]').first().click()
  await verify('/interview/guides/sliding-window/')
  const guides = JSON.parse(await readFile(new URL('../src/interview/guides.json', import.meta.url), 'utf8'))
  for (const guide of guides) {
    const path = `/interview/guides/${guide.slug}/`
    if (new URL(page.url()).pathname !== path) await page.goto(base + path, { waitUntil: 'networkidle' })
    await verify(path)
  }
  for (const path of ['/login', '/interview/advanced-digital-marketing/']) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    const row = await read()
    assert.ok(row.robots.some(r => r.content.includes('noindex')))
    if (path === '/login') assert.deepEqual(row.canonicals, [])
    rows.push(row)
  }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ base, rows, errors, clientNavigation: 'Hub → Data Science → hub → searched topic guide' }, null, 2))
} finally {
  await browser.close()
}
