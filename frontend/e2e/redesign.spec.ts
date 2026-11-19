import { expect, test, type Page } from '@playwright/test'

/** Redesign checks against the production build (playwright.performance.config.ts). No real submissions. */

const feed = {
  refreshed_at: '2026-11-18T10:00:00Z', stale: false,
  categories: [{ id: 'ai', label: 'AI & machine learning', count: 1 }, { id: 'cloud', label: 'Cloud & DevOps', count: 1 }],
  sources: [{ id: 'infoq', name: 'InfoQ', url: 'https://www.infoq.com/', ok: true, fetched_at: '2026-11-18T10:00:00Z' }],
  items: [
    { title: 'AWS PrivateLink tunnel endpoints', url: 'https://www.infoq.com/news/b/', summary: 'Networking.', published_at: '2026-11-18T08:00:00Z', categories: ['cloud'], source: 'infoq', source_name: 'InfoQ', source_url: 'https://www.infoq.com/' },
    { title: 'Datadog brings experimentation to AI agent observability', url: 'https://www.infoq.com/news/a/', summary: 'Agent tracing.', published_at: '2026-11-17T08:00:00Z', categories: ['ai'], source: 'infoq', source_name: 'InfoQ', source_url: 'https://www.infoq.com/' },
  ],
}

async function blockSubmissions(page: Page) {
  await page.route('**/api/leads/**', (route) => route.fulfill({ status: 503, body: '{}' }))
}

test('desktop navigation uses 16px+ type, fits on one line and opens dropdowns from the keyboard', async ({ page }) => {
  for (const width of [1440, 1180, 1101]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/courses/')
    const link = page.locator('.site-header .sh-nav > .sh-link').first()
    expect(parseFloat(await link.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
    const header = await page.locator('.site-header .sh-inner').boundingBox()
    expect(header!.height).toBeLessThanOrEqual(90)
    // Every primary item sits on the same row as the logo and the CTA.
    const tops = await page.locator('.site-header .sh-nav > .sh-link, .site-header .sh-nav > .sh-res, .site-header .sh-demo').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2)))
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(4)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  const trigger = page.locator('[data-header-dropdown="Resources"] > button')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toBeFocused()
})

test('mobile menu uses 16px+ items without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  const items = page.locator('#nav .sh-link:visible, #nav .sh-res-button:visible')
  expect(await items.count()).toBeGreaterThan(4)
  for (const size of await items.evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)))) expect(size).toBeGreaterThanOrEqual(16)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})

test('homepage showreel replaces the learning block and preserves the portfolio', async ({ page }) => {
  await page.goto('/')
  const block = page.locator('#project-showcase')
  await expect(page.locator('#learn-free')).toHaveCount(0)
  await expect(block.getByLabel('Project showreel', { exact: true })).toHaveCount(1)
  await expect(block.locator('.hp-slide, .hp-picker')).toHaveCount(0)
  await block.getByRole('link', { name: 'View all 14 projects' }).click()
  await expect(page).toHaveURL(/\/our-work$/)
  await expect(page.locator('.ow-item')).toHaveCount(14)
})

test('profile section has no boxed panels and the contact hub keeps its actions', async ({ page }) => {
  await page.goto('/')
  const about = page.locator('#about')
  const style = await about.locator('.trainer').evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, shadow: getComputedStyle(el).boxShadow }))
  expect(style.bg).toBe('rgba(0, 0, 0, 0)')
  expect(style.shadow).toBe('none')
  const contact = page.locator('#contact')
  await expect(contact.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /wa\.me/)
  await expect(contact.getByRole('link', { name: 'Call us' })).toHaveAttribute('href', 'tel:+917464099059')
  await expect(contact.getByRole('link', { name: /Get Directions/ })).toHaveAttribute('href', /google\.com\/maps\/dir/)
  await expect(contact.locator('iframe[title*="Google Maps"]')).toHaveCount(1)
})

test('banner above the footer has one primary action that opens the free demo registration', async ({ page }) => {
  await blockSubmissions(page)
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/newsletter/')
    const band = page.locator('.ch-band')
    await expect(band.getByRole('button')).toHaveCount(1)
    const button = band.getByRole('button', { name: 'Book a Free Demo' })
    await button.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    const box = await button.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
})

test('newsletter tech feed shows items with source and date, filters by topic and handles failure', async ({ page }) => {
  await page.route('**/api/newsletter/feed/', (route) => route.fulfill({ json: feed }))
  await page.goto('/newsletter/')
  const section = page.locator('.tf')
  await expect(section.getByRole('link', { name: /AWS PrivateLink/ })).toHaveAttribute('href', 'https://www.infoq.com/news/b/')
  await expect(section.locator('time').first()).toHaveAttribute('datetime', '2026-11-18T08:00:00Z')
  await section.getByRole('button', { name: /AI & machine learning/ }).click()
  await expect(section.locator('.tf-card')).toHaveCount(1)
  // Signup remains a separate feature on the same page.
  await expect(page.getByLabel('Email address')).toBeVisible()

  await page.unroute('**/api/newsletter/feed/')
  await page.route('**/api/newsletter/feed/', (route) => route.fulfill({ status: 502, body: 'Bad gateway' }))
  await page.reload()
  await expect(page.locator('.tf').getByRole('alert')).toContainText('could not be loaded')
})

test('interview hub filters roadmaps by role and links to Interview Studio practice', async ({ page }) => {
  await page.goto('/interview/')
  await page.getByRole('button', { name: 'Data analyst & scientist' }).click()
  await expect(page.locator('.ih-role')).toHaveCount(1)
  await expect(page.locator('.ih-role').getByRole('link', { name: 'Data Science', exact: true })).toHaveAttribute('href', '/interview/data-science/')
  await expect(page.getByRole('link', { name: /Mock coding interview/ })).toHaveAttribute('href', '/interview-studio/coding-interviews/new')
})

test('locations keep region deep links in the URL and show availability', async ({ page }) => {
  await page.goto('/locations/?region=noida')
  await expect(page.getByRole('button', { name: /^Noida/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /^Gurugram/ }).click()
  await expect(page).toHaveURL(/region=gurugram/)
  await expect(page.locator('.lx-avail')).toContainText('Online live')
  const thumb = page.locator('.lx-card img').first()
  await expect.poll(() => thumb.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/-w(400|640)\.avif$/)
})

test('AI tools search narrows results and offers a reset', async ({ page }) => {
  await page.goto('/ai-tools')
  await page.getByLabel('Search tools').fill('zzzz-no-tool')
  await expect(page.getByText('No tools match.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear search and filters' }).click()
  await expect(page.locator('.at-card').first()).toBeVisible()
})

test('hero still uses AVIF and is not downloaded twice', async ({ page }) => {
  const images: string[] = []
  page.on('request', (request) => { if (request.resourceType() === 'image') images.push(new URL(request.url()).pathname) })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/courses/', { waitUntil: 'networkidle' })
  const posters = images.filter((path) => path.includes('courses-poster'))
  expect(posters).toEqual(['/assets/hero/video/pages/courses-poster-768.avif'])
})

test('reduced motion stops decorative animation in the new sections', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', baseURL })
  const page = await context.newPage()
  await page.route('**/api/newsletter/feed/', () => undefined) // keep the skeleton visible
  await page.goto('/newsletter/')
  const animation = await page.locator('.tf-skeleton span').first().evaluate((el) => getComputedStyle(el).animationName)
  expect(animation).toBe('none')
  await context.close()
})
