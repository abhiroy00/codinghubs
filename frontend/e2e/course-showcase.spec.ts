import { expect, test } from '@playwright/test'

for (const [width, columns] of [[320, 1], [390, 1], [768, 2], [1024, 3], [1440, 3]]) {
  test(`catalogue fits ${width}px with ${columns} columns and 16:9 artwork`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/courses/')
    await expect(page.locator('.csx-card')).toHaveCount(43)
    await expect(page.locator('.csx-count')).toHaveText('Showing 43 of 43 courses')
    const grid = page.locator('.csx-grid')
    expect(await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const art = page.locator('.csx-art').first()
    await art.scrollIntoViewIfNeeded()
    await expect.poll(() => art.locator('img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 960)).toBe(true)
    const box = (await art.boundingBox())!
    expect(box.width / box.height).toBeCloseTo(16 / 9, 1)
    expect(errors).toEqual([])
  })
}

test('all thumbnails load locally and all course actions keep their destinations', async ({ page, request }) => {
  test.setTimeout(120000)
  await page.goto('/courses/')
  await expect(page.locator('.csx-card')).toHaveCount(43)
  const cards = await page.locator('.csx-card').evaluateAll(els => els.map(el => ({
    title: el.querySelector('h3')!.textContent!,
    href: el.querySelector('h3 a')!.getAttribute('href')!,
    action: el.querySelector('.csx-pactions a')!.getAttribute('href'),
    enroll: el.querySelector('.csx-pactions button')!.textContent!,
    image: el.querySelector('img')!.getAttribute('src')!,
  })))
  expect(new Set(cards.map(c => c.image)).size).toBe(43)
  for (const card of cards) {
    expect(card.action).toBe(card.href)
    expect(card.enroll).toContain('Enroll Now')
    expect(card.image).toMatch(/^\/assets\/courses\/.+\.webp$/)
    const response = await request.get(card.image)
    expect(response.ok(), card.image).toBe(true)
    expect(response.headers()['content-type']).toContain('image/webp')
  }
  // Exercise actual client navigation for every catalogue link, not just HTTP fallback responses.
  for (const card of cards) {
    await page.locator(`.csx-pactions a[href="${card.href}"]`).click()
    await expect(page).toHaveURL(new RegExp(`${card.href}$`))
    await expect(page.locator('main h1').first()).toContainText(card.title)
    await page.goBack()
    await expect(page.locator('.csx-card')).toHaveCount(43)
  }
})

test('category filters preserve data, pressed state and keyboard focus', async ({ page }) => {
  await page.goto('/courses/')
  const filters = page.getByRole('group', { name: 'Filter by category' })
  for (const [category, count] of [['AI & Data', 11], ['Full Stack', 9], ['Cloud', 12], ['Programs', 2], ['Cyber Security', 7], ['Design & Digital', 2]] as const) {
    const button = filters.getByRole('button', { name: `${category} ${count}`, exact: true })
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(button).toBeFocused()
    await expect(page.locator('.csx-card')).toHaveCount(count)
    await expect(page.locator('.csx-count')).toContainText(`Showing ${count} of 43 courses in ${category}`)
    expect(await page.locator('.csx-cat').allTextContents()).toEqual(Array(count).fill(category))
    expect(await button.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid')
  }
  await filters.getByRole('button', { name: 'All 43', exact: true }).click()
  await expect(page.locator('.csx-card')).toHaveCount(43)
})

test('a missing course image uses track artwork, then the existing icon if both fail', async ({ page }) => {
  await page.route('**/assets/courses/generative-ai.webp', route => route.abort())
  await page.goto('/courses/')
  const card = page.locator('.csx-card').first()
  await card.scrollIntoViewIfNeeded()
  await expect(card.locator('img')).toHaveAttribute('src', '/assets/courses/track-ai.webp')
  await expect.poll(() => card.locator('img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
  const before = await card.locator('.csx-art').boundingBox()
  await page.route('**/assets/courses/track-ai.webp', route => route.abort())
  await page.reload()
  await page.locator('.csx-card').first().scrollIntoViewIfNeeded()
  await expect(card.locator('.csx-glyph')).toBeVisible()
  await expect(card.locator('img')).toHaveCount(0)
  const after = await card.locator('.csx-art').boundingBox()
  expect(after!.height).toBeCloseTo(before!.height, 0)
  await expect(card.getByRole('link', { name: 'View details of Generative AI', exact: true })).toBeVisible()
  await expect(card.getByRole('button', { name: /Enroll Now/ })).toBeVisible()
})

test('navigation shares Inter, highlights the active route and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/courses/')
  const trigger = page.getByRole('button', { name: 'Courses', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  const active = page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name: 'All Courses', exact: true })
  await expect(active).toBeFocused()
  await expect(active).toHaveAttribute('aria-current', 'page')
  expect(await active.evaluate(el => getComputedStyle(el).fontFamily)).toBe(await trigger.evaluate(el => getComputedStyle(el).fontFamily))
  await expect(active).toHaveCSS('font-size', '15px')
  expect(await trigger.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe('none')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  const card = page.locator('.csx-card').first()
  await card.locator('h3 a').focus()
  await expect(card).toHaveCSS('transform', 'none')
  await expect(card).toHaveCSS('transition-duration', '0s')
  await page.setViewportSize({ width: 320, height: 740 })
  const toggle = page.getByRole('button', { name: 'Open menu', exact: true })
  await toggle.click()
  await trigger.click()
  await expect(active).toHaveCSS('font-size', '16px')
  await page.screenshot({ path: '../artifacts/courses-mobile-menu.png' })
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(toggle).toBeFocused()
  await expect(page.locator('.sh-nav')).toBeHidden()
})
