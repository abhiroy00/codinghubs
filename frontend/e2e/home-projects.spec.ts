import { expect, test, type Page } from '@playwright/test'

const showcase = (page: Page) => page.locator('#project-showcase')

test('homepage replaces the learning block with all 14 existing portfolio projects', async ({ page }) => {
  await page.goto('/')
  const section = showcase(page)
  await expect(section.getByRole('heading', { level: 2 })).toHaveText('Real projects. Real-world impact.')
  await expect(page.locator('#learn-free')).toHaveCount(0)
  await expect(section.locator('.hp-slide')).toHaveCount(14)
  await expect(section.getByRole('combobox', { name: 'Choose a project' }).getByRole('option')).toHaveCount(14)
  await expect(section.getByRole('link', { name: 'View all 14 projects' })).toHaveAttribute('href', '/our-work')
  await expect(page.locator('#courses .hc-card')).toHaveCount(13)
})

for (const width of [320, 768, 1024, 1440]) {
  test(`project section renders inside the viewport at ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const section = showcase(page)
    await section.locator('.hp-stage').focus()
    await expect(section.getByRole('heading', { name: 'LeadGenPlus.ai', exact: true })).toBeInViewport()
    const box = (await section.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.width).toBeGreaterThanOrEqual(width * 0.9)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(section.locator('.hp-slide.is-active img')).toBeVisible()
    expect((await section.locator('.hp-stage').boundingBox())!.width).toBeGreaterThan(250)
  })
}

test('all project images, descriptions and destinations match the complete portfolio', async ({ page }) => {
  const { PROJECTS } = await import('../src/data/projects')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const section = showcase(page)
  const chooser = section.getByRole('combobox', { name: 'Choose a project' })
  for (const [index, project] of PROJECTS.entries()) {
    await chooser.selectOption(String(index))
    const active = section.locator('.hp-slide.is-active')
    await expect(active).toHaveAttribute('aria-label', `${index + 1} of 14: ${project.name}`)
    await expect(active).toHaveAttribute('aria-hidden', 'false')
    await expect(section.locator('.hp-summary')).toHaveText(project.summary)
    await expect.poll(() => active.locator('img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
    if (project.href) {
      await expect(active.getByRole('link')).toHaveAttribute('href', project.href)
      await expect(active.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
    } else {
      await expect(active.getByRole('link')).toHaveCount(0)
      await expect(active).toContainText('Private client project')
    }
  }
  await section.getByRole('link', { name: 'View all 14 projects' }).click()
  await expect(page).toHaveURL(/\/our-work$/)
  await expect(page.locator('.ow-item')).toHaveCount(14)
  for (const category of ['AI Applications', 'Web Development', 'E-Commerce']) {
    await page.getByRole('group', { name: 'Filter by discipline' }).getByRole('button', { name: category, exact: true }).click()
    const expected = PROJECTS.filter(project => project.category === category)
    await expect(page.locator('.ow-item')).toHaveCount(expected.length)
    expect(await page.locator('.ow-brand').allTextContents()).toEqual(expected.map(project => project.name))
  }
})

test('keyboard controls and project selection keep hidden links out of focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const section = showcase(page)
  const stage = section.locator('.hp-stage')
  await stage.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(section.locator('.hp-slide.is-active')).toHaveAttribute('aria-label', '14 of 14: RDPMS')
  await page.keyboard.press('ArrowRight')
  await expect(section.locator('.hp-slide.is-active')).toHaveAttribute('aria-label', '1 of 14: LeadGenPlus.ai')
  await page.keyboard.press('Tab')
  await expect(section.locator('.hp-slide.is-active a')).toBeFocused()
  expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).toBe('solid')
  await page.keyboard.press('Tab')
  await expect(section.getByRole('button', { name: 'Previous project', exact: true })).toBeFocused()
  const chooser = section.getByRole('combobox', { name: 'Choose a project' })
  await chooser.focus()
  await chooser.selectOption('13')
  await expect(chooser).toBeFocused()
  await expect(chooser).toHaveValue('13')
  await expect(section.locator('.hp-slide.is-active')).toContainText('RDPMS')
  await expect(section.locator('.hp-slide.is-active')).toHaveCSS('transition-duration', '0s')
  await expect(section.getByRole('button', { name: /project slideshow/ })).toHaveCount(0)
})

test('autoplay rotates through every project and pauses on hover, focus and user request', async ({ page }) => {
  test.setTimeout(60000)
  // Model a returning registered visitor so the existing 30–45s registration popup does not cover the carousel.
  await page.addInitScript(() => localStorage.setItem('ch_registered', '1'))
  await page.clock.install()
  await page.goto('/')
  const section = showcase(page)
  await section.locator('.hp-stage').scrollIntoViewIfNeeded()
  await page.mouse.move(2, 100)
  await expect(section.locator('.hp-track')).toHaveAttribute('aria-live', 'off')
  for (let index = 1; index <= 14; index++) {
    await page.clock.fastForward(5100)
    await expect(section.getByRole('combobox', { name: 'Choose a project' })).toHaveValue(String(index % 14))
  }
  await section.locator('.hp-stage').hover()
  await expect(section.locator('.hp-track')).toHaveAttribute('aria-live', 'polite')
  await page.clock.fastForward(6000)
  await expect(section.getByRole('combobox')).toHaveValue('0')
  await page.mouse.move(2, 100)
  await section.locator('.hp-stage').focus()
  await page.clock.fastForward(6000)
  await expect(section.getByRole('combobox')).toHaveValue('0')
  await section.getByRole('button', { name: 'Pause project slideshow' }).click()
  await page.clock.fastForward(6000)
  await expect(section.getByRole('combobox')).toHaveValue('0')
  await section.getByRole('button', { name: 'Play project slideshow' }).click()
  await page.mouse.move(2, 100)
  await expect(section.locator('.hp-track')).toHaveAttribute('aria-live', 'off')
  await page.clock.fastForward(5100)
  await expect(section.getByRole('combobox')).toHaveValue('1')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(section.locator('.hp-track')).toHaveAttribute('aria-live', 'polite')
  await page.clock.fastForward(6000)
  await expect(section.getByRole('combobox')).toHaveValue('1')
})

test('unavailable project images retain the project title and navigation', async ({ page }) => {
  await page.route('**/assets/our-work/leadgenplus-leads-search.webp', route => route.abort())
  await page.goto('/')
  const section = showcase(page)
  await section.locator('.hp-stage').focus()
  await expect(section.locator('.hp-slide.is-active')).toContainText('Project preview unavailable')
  await expect(section.getByRole('link', { name: 'View LeadGenPlus.ai project (opens in a new tab)' })).toBeVisible()
  await section.getByRole('button', { name: 'Next project', exact: true }).click()
  await expect(section.locator('.hp-slide.is-active')).toContainText('Properly')
})

test('phone swipe changes project while a vertical scroll keeps the selection', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto(baseURL!)
  const section = showcase(page)
  await section.locator('.hp-stage').focus()
  const box = (await section.locator('.hp-stage').boundingBox())!
  const session = await context.newCDPSession(page)
  const start = { x: box.x + box.width * 0.8, y: box.y + box.height / 2 }
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x - 140, y: start.y }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(section.getByRole('combobox')).toHaveValue('1')
  const nextBox = (await section.locator('.hp-stage').boundingBox())!
  const next = { x: nextBox.x + nextBox.width / 2, y: nextBox.y + nextBox.height / 2 }
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [next] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: next.x + 5, y: next.y - 70 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(section.getByRole('combobox')).toHaveValue('1')
  await context.close()
})
