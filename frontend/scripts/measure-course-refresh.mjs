// Controlled local transfer/paint samples. These are lab observations, not field Core Web Vitals.
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5174'
const label = process.argv[2] || 'before'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
try {
  for (const width of [390, 1440]) {
    for (const route of ['/', '/courses/generative-ai/', '/courses/']) {
      const runs = []
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
        const page = await context.newPage()
        // Public content APIs are a fixed empty dataset, so DB state/network failures cannot skew comparisons.
        await page.route('**/api/**', r => r.fulfill({ status: 200, json: r.request().url().includes('/gigs/status/') ? { enabled: false } : [] }))
        await page.addInitScript(() => {
          window.__courseLab = { lcp: 0, cls: 0 }
          new PerformanceObserver(list => { for (const e of list.getEntries()) window.__courseLab.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
          new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__courseLab.cls += e.value }).observe({ type: 'layout-shift', buffered: true })
        })
        await page.goto(base + route, { waitUntil: 'load' })
        await page.waitForTimeout(4000)
        runs.push(await page.evaluate(() => {
          const resources = performance.getEntriesByType('resource')
          return { ...window.__courseLab, jsBytes: resources.filter(r => /\.js(?:\?|$)/.test(r.name)).reduce((n, r) => n + r.encodedBodySize, 0), mediaBytes: resources.filter(r => /\.(mp4|webp|jpg)(?:\?|$)/.test(r.name)).reduce((n, r) => n + r.encodedBodySize, 0), bytes: resources.reduce((n, r) => n + r.encodedBodySize, 0), videoRequests: resources.filter(r => /\.mp4/.test(r.name)).length }
        }))
        await context.close()
      }
      const median = Object.fromEntries(Object.keys(runs[0]).map(key => [key, runs.map(r => r[key]).sort((a, b) => a - b)[1]]))
      results.push({ route, width, median, runs })
      console.log(label, route, width, JSON.stringify(median))
    }
  }
  await mkdir('../artifacts/course-refresh', { recursive: true })
  await writeFile(`../artifacts/course-refresh/performance-${label}.json`, JSON.stringify({ method: 'Three cold Chrome contexts per route/viewport; four-second observation; fixed empty API dataset; unthrottled local production preview; resource encodedBodySize; not Lighthouse or field data.', results }, null, 2))
} finally { await browser.close() }
