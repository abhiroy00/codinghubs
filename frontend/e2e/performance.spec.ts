import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) test(`first viewport is styled before external CSS and reuses its HTML at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  let cssReady!: () => void, scriptReady!: () => void
  const css = new Promise<void>(resolve => { cssReady = resolve })
  const script = new Promise<void>(resolve => { scriptReady = resolve })
  await page.route('**/*.css*', route => css.then(() => route.continue()))
  await page.route('**/assets/index-*.js', route => script.then(() => route.continue()))
  await page.goto('/', { waitUntil: 'commit' })
  const hero = page.locator('#home')
  await expect(hero.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('style[data-home-critical]')).toHaveCount(1)
  const original = (await hero.elementHandle())!
  await page.evaluate(() => document.fonts.ready)
  const geometry = () => page.locator('.join-bar, .sh-inner, #home, #hero-title, .hs-stage').evaluateAll(elements =>
    elements.map(el => { const box = el.getBoundingClientRect(); return { width: box.width, height: box.height, top: box.top } }))
  const before = await geometry()
  cssReady()
  await expect.poll(() => page.locator('link[rel="preload"][as="style"][href^="/"]').count()).toBe(0)
  const after = await geometry()
  expect(after).toHaveLength(before.length)
  after.forEach((box, i) => {
    for (const property of ['width', 'height', 'top'] as const) expect(Math.abs(box[property] - before[i][property])).toBeLessThan(1)
  })
  scriptReady()
  await expect(page.locator('.sh-account-loading')).toHaveCount(0)
  expect(await original.evaluate(el => el === document.getElementById('home'))).toBe(true)
  if (width < 1101) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await page.getByRole('button', { name: 'Courses', exact: true }).click()
  await expect(page.locator('.site-header').getByRole('link', { name: 'All Courses', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('hydration keeps the first screen visible while deferred CSS is still loading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let ready!: () => void
  const css = new Promise<void>(resolve => { ready = resolve })
  await page.route('**/*.css*', route => css.then(() => route.continue()))
  await page.goto('/', { waitUntil: 'commit' })
  await expect(page.locator('#home h1')).toBeVisible()
  await expect(page.locator('.sh-account-loading')).toHaveCount(0)
  expect(await page.locator('html').getAttribute('data-fs-loading')).toBeNull()
  expect(await page.locator('#root').evaluate(el => getComputedStyle(el).visibility)).toBe('visible')
  expect(await page.locator('link[href*="/free-session.css"]').count()).toBe(1)
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Primary', exact: true })).toBeVisible()
  ready()
  await expect.poll(() => page.locator('link[rel="preload"][as="style"][href^="/"]').count()).toBe(0)
})

test('responsive images use versioned URLs and accessible video names include their visible labels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const image = page.locator('.hs-slide.is-active img')
  await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
  expect(await image.evaluate((el: HTMLImageElement) => el.currentSrc)).toMatch(/classroom-live-coding-session-(480|640)-[\w-]{8}\.webp$/)
  expect(await page.locator('.sh-brand img').evaluate((el: HTMLImageElement) => el.currentSrc)).toMatch(/logo-288-[\w-]{8}\.webp$/)
  for (const button of await page.locator('.reel-btn').all()) {
    const name = await button.getAttribute('aria-label')
    expect(name).toContain((await button.locator('.n').innerText()).trim())
    if (await button.locator('.d').count()) expect(name).toContain((await button.locator('.d').innerText()).trim())
  }
  const privacy = page.locator('.newsletter-consent').getByRole('link', { name: 'Privacy policy' })
  await expect(privacy).toHaveCSS('text-decoration-line', 'underline')
})

test('a direct homepage anchor stays aligned after deferred page styles finish loading', async ({ page }) => {
  let ready!: () => void
  const css = new Promise<void>(resolve => { ready = resolve })
  await page.route('**/*.css*', route => css.then(() => route.continue()))
  await page.goto('/#contact', { waitUntil: 'commit' })
  await expect(page.locator('#home h1')).toBeVisible()
  await expect(page.locator('.sh-account-loading')).toHaveCount(0)
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  ready()
  await expect.poll(() => page.locator('#contact').evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(250)
})

test('homepage retains its complete design when JavaScript is disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto(baseURL!)
  await expect(page.locator('#home h1')).toBeVisible()
  await expect(page.locator('.site-header')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('.newsletter-consent a')).toHaveCSS('text-decoration-line', 'underline')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await context.close()
})

test('hero autoplay waits for its visible photos, then keeps the existing rotation', async ({ page }) => {
  let ready!: () => void
  const images = new Promise<void>(resolve => { ready = resolve })
  let pending = 0
  await page.route('**/assets/gitm-*.webp', route => { pending++; return images.then(() => route.continue()) })
  await page.goto('/')
  await page.mouse.move(0, 0)
  await expect.poll(() => pending).toBeGreaterThan(0)
  const active = page.locator('.hs-slide.is-active')
  // Exercise the actual three-second rotation clock while its images are unavailable.
  await page.waitForTimeout(3200)
  await expect(active).toHaveAttribute('aria-label', /^1 of 5:/)
  ready()
  await expect(active).toHaveAttribute('aria-label', /^2 of 5:/, { timeout: 4500 })
})
