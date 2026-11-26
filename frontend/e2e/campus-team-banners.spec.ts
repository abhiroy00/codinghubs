import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/leads/campaigns/active/**', route => route.fulfill({ json: { campaign: null } }))
})

test('homepage adds the four original team profiles and their LinkedIn links', async ({ page }) => {
  await page.goto('/')
  const team = page.getByRole('region', { name: 'Meet Our Teams' })
  await team.scrollIntoViewIfNeeded()
  await expect(team.getByRole('article')).toHaveCount(4)
  for (const name of ['Abhishek Kumar', 'Sandeep Sharma', 'Vandana Prajapat', 'Anshika Garg']) {
    await expect(team.getByRole('heading', { name, exact: true })).toBeVisible()
    await expect(team.getByRole('link', { name: `Connect with ${name} on LinkedIn` })).toHaveAttribute('href', /^https:\/\/www.linkedin.com\/in\//)
    const response = await page.request.get((await team.getByRole('img', { name, exact: true }).getAttribute('src'))!)
    expect(response.ok()).toBe(true)
  }
})

test('Campus Connect has seven original colleges and a seamless, pausable scrolling row', async ({ page }) => {
  await page.goto('/')
  const campus = page.getByRole('region', { name: 'Explore Our Campus Connect', exact: true })
  await campus.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await expect(campus.getByRole('listitem')).toHaveCount(7)
  const track = campus.locator('.campus-explore-track')
  const before = await track.evaluate(element => getComputedStyle(element).transform)
  await expect.poll(() => track.evaluate(element => getComputedStyle(element).transform)).not.toBe(before)
  await campus.getByRole('button', { name: 'Pause campus scrolling' }).click()
  await expect(track).toHaveCSS('animation-play-state', 'paused')
  await campus.getByRole('button', { name: 'Resume campus scrolling' }).click()
  await page.mouse.move(0, 0)
  await expect(track).toHaveCSS('animation-play-state', 'running')
  for (const image of await campus.locator('ul:not([aria-hidden]) img').all()) {
    const response = await page.request.get((await image.getAttribute('src'))!)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toMatch(/^image\//)
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(track).toHaveCSS('animation-name', 'none')
  await expect(campus.locator('.campus-explore-viewport')).toHaveCSS('overflow-x', 'auto')
})

for (const width of [320, 768, 1024, 1440]) {
  test(`new homepage sections and the course robot fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/')
    for (const [name, file] of [
      ['Meet Our Teams', 'team'],
      ['Explore Our Campus Connect', 'campus'],
      ['Start your AI career with Coding Hubs', 'footer'],
    ]) {
      const section = page.getByRole('region', { name, exact: true })
      await section.scrollIntoViewIfNeeded()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await section.screenshot({ path: `../artifacts/campus-team-banners/${file}-${width}.png` })
    }
    await page.goto('/courses/')
    const hero = page.locator('.csx-hero')
    const robot = hero.getByRole('img', { name: 'Animated Coding Hubs AI robot' })
    await robot.scrollIntoViewIfNeeded()
    await expect.poll(() => robot.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 760)).toBe(true)
    const bounds = await robot.boundingBox()
    expect(bounds!.width / bounds!.height).toBeCloseTo(760 / 800, 2)
    await expect(hero.getByRole('link', { name: 'Start Learning' })).toHaveAttribute('href', '#catalogue')
    await expect(hero.getByRole('link', { name: 'Book free demo' })).toHaveAttribute('href', '/#register')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await hero.screenshot({ path: `../artifacts/campus-team-banners/courses-${width}.png` })
    expect(errors).toEqual([])
  })
}
