import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/leads/campaigns/active/**', route => route.fulfill({ json: { campaign: null } }))
})

test('student placements replace the demo ticket and continuously scroll in opposite directions', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Your free pass to a 2-hour live class')).toHaveCount(0)
  const section = page.getByRole('region', { name: 'Our placed students' })
  await section.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await expect(section).toHaveAttribute('data-active', 'true')
  await expect(section.locator('.placements-rows').getByRole('listitem')).toHaveCount(12)
  await expect(section.getByText('Ankit Kumar', { exact: true }).first()).toBeAttached()
  const rows = section.locator('.placements-track')
  await expect(rows.first()).toHaveCSS('animation-direction', 'normal')
  await expect(rows.last()).toHaveCSS('animation-direction', 'reverse')
  const initial = await rows.first().evaluate(element => getComputedStyle(element).transform)
  await expect.poll(() => rows.first().evaluate(element => getComputedStyle(element).transform)).not.toBe(initial)
  for (const image of await section.locator('.placements-group:not([aria-hidden]) img').all()) {
    // Offscreen copies are lazy-loaded; verify every original asset without forcing them into view.
    const response = await page.request.get((await image.getAttribute('src'))!)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toMatch(/^image\//)
  }
  await section.getByRole('button', { name: 'Pause scrolling' }).click()
  await expect(rows.first()).toHaveCSS('animation-play-state', 'paused')
  await expect(rows.last()).toHaveCSS('animation-play-state', 'paused')
  await section.getByRole('button', { name: 'Resume scrolling' }).click()
  await page.mouse.move(0, 0)
  await expect(rows.first()).toHaveCSS('animation-play-state', 'running')
  const viewport = section.getByRole('region', { name: 'Student placements, first row' })
  await viewport.focus()
  await expect(rows.first()).toHaveCSS('animation-play-state', 'paused')
})

test('reduced motion shows all students in manually scrollable rows', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const section = page.getByRole('region', { name: 'Our placed students' })
  await section.scrollIntoViewIfNeeded()
  await expect(section.locator('.placements-track').first()).toHaveCSS('animation-name', 'none')
  await expect(section.locator('.placements-viewport').first()).toHaveCSS('overflow-x', 'auto')
  await expect(section.locator('.placements-group[aria-hidden]').first()).toBeHidden()
  await expect(section.locator('.placements-rows').getByRole('listitem')).toHaveCount(12)
})

for (const width of [320, 768, 1024, 1440]) {
  test(`placements fit the ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const section = page.getByRole('region', { name: 'Our placed students' })
    await section.scrollIntoViewIfNeeded()
    await expect(section.getByRole('heading', { name: 'Our placed students' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.screenshot({ path: `../artifacts/student-placements/placements-${width}.png` })
    const brands = page.getByRole('region', { name: 'Explore US Technology Companies' })
    await brands.scrollIntoViewIfNeeded()
    await expect(brands.getByRole('img')).toHaveCount(5)
    for (const image of await brands.getByRole('img').all()) {
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
    }
    await expect(brands.getByRole('link', { name: /Microsoft/ })).toHaveAttribute('href', 'https://www.microsoft.com/')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await brands.screenshot({ path: `../artifacts/student-placements/us-brands-${width}.png` })
  })
}
