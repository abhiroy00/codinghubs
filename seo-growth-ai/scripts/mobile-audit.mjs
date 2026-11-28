import { chromium } from '../frontend/node_modules/@playwright/test/index.mjs'

const [target, address, screenshot] = process.argv.slice(2)
const url = new URL(target)
if (!['http:', 'https:'].includes(url.protocol) || !address || !screenshot) throw new Error('Use the validated backend entry point')
const resolverAddress = address.includes(':') ? `[${address}]` : address
const browser = await chromium.launch({ ...(process.env.SEO_CHROME_EXECUTABLE ? { executablePath: process.env.SEO_CHROME_EXECUTABLE } : { channel: 'chrome' }), headless: true, args: [`--host-resolver-rules=MAP ${url.hostname} ${resolverAddress}`, '--proxy-server=direct://', '--proxy-bypass-list=*', '--disable-background-networking'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1,
  reducedMotion: 'reduce', serviceWorkers: 'block', acceptDownloads: false, userAgent: 'CodingHubsLocalSEO-MobileAudit/0.1' })
let requests = 0, blocked = 0
await context.route('**/*', async route => {
  const request = route.request()
  const next = new URL(request.url())
  const forbidden = next.hostname !== url.hostname || !['http:', 'https:'].includes(next.protocol) || next.username || next.password || next.port || request.method() !== 'GET' || ++requests > 100 || next.pathname.split('/').some(part => decodeURIComponent(part).startsWith('.')) || /^\/(admin|api|login|logout|my-account|checkout|payment)(\/|$)/.test(next.pathname) || /(?:views?|track|analytics|collect)(\/|$)/.test(next.pathname)
  if (forbidden) { blocked++; await route.abort() } else await route.continue()
})
await context.routeWebSocket('**/*', socket => socket.close())
const page = await context.newPage()
await page.addInitScript(() => {
  window.__localSeoVitals = { lcp: null, cls: 0 }
  new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__localSeoVitals.lcp = entry.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
  new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__localSeoVitals.cls += entry.value }).observe({ type: 'layout-shift', buffered: true })
})
try {
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(800)
  const result = await page.evaluate(() => ({ title: document.title, h1_count: document.querySelectorAll('h1').length,
    viewport: innerWidth, document_width: document.documentElement.scrollWidth, horizontal_overflow: document.documentElement.scrollWidth > innerWidth + 1,
    lcp_ms: window.__localSeoVitals.lcp, cls: window.__localSeoVitals.cls, inp_ms: null }))
  await page.screenshot({ path: screenshot, fullPage: false })
  console.log(JSON.stringify({ ...result, requests, blocked_requests: blocked, source: 'isolated local Chrome mobile lab',
    limits: 'Main-host GET requests only; third-party traffic, writes and WebSockets blocked. This constrained lab result is not p75 field CWV or a complete user journey.' }))
} finally { await browser.close() }
