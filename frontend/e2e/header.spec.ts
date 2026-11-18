import { expect, test, type Page } from '@playwright/test'

const menus = {
  Courses: [['All Courses', '/courses/'], ['Course Brochures', '/brochures/'], ['Book a Tutor', '/book-a-tutor/']],
  Careers: [['Interview Prep', '/interview/'], ['Latest Jobs', '/latest-jobs/']],
  Resources: [['AI Tools', '/ai-tools'], ['Blog', '/blog'], ['Newsletter', '/newsletter/'], ['Case Studies', '/case-studies'], ['About the Live Demo', '/#session']],
} as const
const header = (page: Page) => page.locator('.site-header')
const primary = (page: Page) => header(page).getByRole('navigation', { name: 'Primary', exact: true })

test('all shells share the requested primary order and existing destinations', async ({ page }) => {
  test.setTimeout(90000)
  for (const url of ['/', '/courses/', '/interview/', '/our-work', '/ai-tools', '/book-a-tutor/', '/latest-jobs/', '/blog', '/newsletter/', '/brochures/', '/case-studies', '/locations/', '/login', '/policies', '/learn/ai-engineer/', '/interview-studio/', '/missing-page-check']) {
    await page.goto(url)
    const h = header(page), nav = primary(page)
    await expect(h).toHaveCount(1)
    await expect(h).toBeVisible()
    await expect(nav.locator(':scope > a:not(.sh-mobile-login), :scope > .sh-res > button')).toHaveText(['Courses', 'Demo Videos', 'Projects', 'Careers', 'Resources'])
    await expect(h.getByRole('button', { name: 'Book Free Demo', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('href', '/our-work')
    await expect(nav.getByRole('link', { name: 'Demo Videos', exact: true })).toHaveAttribute('href', '/#demo-classes')
    await expect(h.locator('.sh-brand')).toHaveAttribute('href', '/#home')
    for (const [name, links] of Object.entries(menus)) {
      const trigger = nav.getByRole('button', { name, exact: true })
      await trigger.click()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      for (const [label, href] of links) await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href)
      await page.keyboard.press('Escape')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(trigger).toBeFocused()
    }
  }
})

test('desktop hover crosses the gap; click and outside click maintain one open menu', async ({ page }) => {
  await page.goto('/our-work')
  const nav = primary(page)
  for (const name of ['Courses', 'Careers', 'Resources'] as const) {
    const trigger = nav.getByRole('button', { name, exact: true })
    await trigger.hover()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const first = nav.getByRole('link', { name: menus[name][0][0], exact: true })
    const b = (await trigger.boundingBox())!, l = (await first.boundingBox())!
    await page.mouse.move(b.x + b.width / 2, b.y + b.height - 1)
    await page.mouse.move(l.x + l.width / 2, l.y + l.height / 2, { steps: 20 })
    await expect(first).toBeVisible()
    expect(await first.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) })).toBe(true)
    await page.mouse.move(5, 300)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  }
  const courses = nav.getByRole('button', { name: 'Courses', exact: true })
  await courses.click()
  await expect(courses).toHaveAttribute('aria-expanded', 'true')
  await nav.getByRole('button', { name: 'Careers', exact: true }).hover()
  await expect(nav.locator('.sh-res-button[aria-expanded="true"]')).toHaveCount(1)
  await page.locator('.ow-hero h1').click()
  await expect(nav.locator('.sh-res-button[aria-expanded="true"]')).toHaveCount(0)
})

test('keyboard Tab, Enter, Space and Escape operate the disclosures', async ({ page }) => {
  await page.goto('/login')
  const nav = primary(page), courses = nav.getByRole('button', { name: 'Courses', exact: true })
  await courses.focus(); await page.keyboard.press('Enter')
  await expect(courses).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Tab')
  await expect(nav.getByRole('link', { name: 'All Courses', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(nav.getByRole('link', { name: 'Course Brochures', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(courses).toBeFocused()
  await expect(courses).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Space')
  await expect(courses).toHaveAttribute('aria-expanded', 'true')
  expect(await courses.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
  await page.keyboard.press('Escape')
})

for (const width of [390, 1024, 1366]) test(`touch navigation uses tap disclosures at ${width}px`, async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true })
  const page = await context.newPage()
  await page.goto(new URL('/our-work', baseURL!).href)
  const toggle = header(page).getByRole('button', { name: 'Open menu', exact: true })
  await expect(toggle).toBeVisible(); await toggle.tap()
  for (const name of ['Courses', 'Careers', 'Resources'] as const) {
    const trigger = primary(page).getByRole('button', { name, exact: true })
    await trigger.tap()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(primary(page).locator('.sh-res-button[aria-expanded="true"]')).toHaveCount(1)
    await expect(primary(page).getByRole('link', { name: menus[name][0][0], exact: true })).toBeVisible()
  }
  await primary(page).getByRole('link', { name: 'Newsletter', exact: true }).tap()
  await expect(page).toHaveURL(/\/newsletter\/$/); await expect(primary(page)).toBeHidden()
  await header(page).getByRole('button', { name: 'Open menu', exact: true }).tap()
  await expect(primary(page).getByRole('link', { name: 'Support', exact: true })).toBeVisible()
  await primary(page).getByRole('link', { name: 'Locations', exact: true }).tap()
  await expect(page).toHaveURL(/\/locations\/$/); await expect(primary(page)).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await context.close()
})

test('inner-page homepage anchors and project content stay intact', async ({ page }) => {
  await page.goto('/our-work')
  await expect(page.locator('.ow-item').first()).toBeVisible()
  const count = await page.locator('.ow-item').count(); expect(count).toBeGreaterThan(0)
  await primary(page).getByRole('link', { name: 'Demo Videos', exact: true }).click()
  await expect(page).toHaveURL(/\/#demo-classes$/)
  await expect.poll(() => page.locator('#demo-classes').evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(250)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.mouse.move(20, 500)
  await page.mouse.wheel(0, -10000)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(200)
  await primary(page).getByRole('link', { name: 'Demo Videos', exact: true }).click()
  await expect.poll(() => page.locator('#demo-classes').evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(250)
  await primary(page).getByRole('link', { name: 'Projects', exact: true }).click()
  await expect(page).toHaveURL(/\/our-work$/); await expect(page.locator('.ow-item')).toHaveCount(count)
  await primary(page).getByRole('button', { name: 'Resources', exact: true }).click()
  await primary(page).getByRole('link', { name: 'About the Live Demo', exact: true }).click()
  await expect(page).toHaveURL(/\/#session$/)
  await expect.poll(() => page.locator('#session').evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(250)
  await header(page).locator('.sh-brand').click()
  await expect(page).toHaveURL(/\/#home$/)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(200)
  await page.goto('/our-work')
  await page.setViewportSize({ width: 390, height: 844 })
  await header(page).getByRole('button', { name: 'Open menu' }).click()
  await primary(page).getByRole('link', { name: 'Support', exact: true }).click()
  await expect(page).toHaveURL(/\/#contact$/)
  await expect(primary(page)).toBeHidden()
  await expect.poll(() => page.locator('#contact').evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(250)
})

test('Book Free Demo preserves the registration dialog, focus and scroll lock', async ({ page }) => {
  await page.goto('/login')
  const button = header(page).getByRole('button', { name: 'Book Free Demo', exact: true })
  await button.click()
  const dialog = page.getByRole('dialog', { name: 'Free demo registration' })
  await expect(dialog.getByRole('textbox', { name: /Full Name/ })).toBeVisible()
  await expect(page.locator('.rp-overlay')).toHaveCSS('position', 'fixed')
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(button).toBeFocused()
  await page.setViewportSize({ width: 390, height: 844 })
  await header(page).getByRole('button', { name: 'Open menu' }).click(); await button.click()
  await expect(dialog).toBeVisible(); await expect(primary(page)).toBeHidden()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await page.keyboard.press('Escape')
  await header(page).getByRole('button', { name: 'Open menu' }).click(); await page.keyboard.press('Escape')
  await expect(header(page).getByRole('button', { name: 'Open menu' })).toBeFocused()
})

test('every dropdown link navigates to its existing page and closes its disclosure', async ({ page, baseURL }) => {
  test.setTimeout(60000)
  for (const [menu, links] of Object.entries(menus)) {
    for (const [label, href] of links) {
      await page.goto('/our-work')
      await primary(page).getByRole('button', { name: menu, exact: true }).click()
      await primary(page).getByRole('link', { name: label, exact: true }).click()
      await expect(page).toHaveURL(new URL(href, baseURL!).href)
      await expect(page.locator('main h1').first()).toBeVisible()
      await expect(primary(page).locator('.sh-res-button[aria-expanded="true"]')).toHaveCount(0)
    }
  }
})

test('header, mobile support links and CTA fit 320px through desktop', async ({ page }) => {
  await page.goto('/login')
  for (const width of [320, 390, 768, 1024, 1101, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(header(page).getByRole('button', { name: 'Book Free Demo', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width <= 1100) {
      await header(page).getByRole('button', { name: 'Open menu', exact: true }).click()
      await expect(primary(page).getByRole('link', { name: 'Support', exact: true })).toHaveAttribute('href', '/#contact')
      await expect(primary(page).getByRole('link', { name: 'Locations', exact: true })).toHaveAttribute('href', '/locations/')
      await page.locator('main h1').click({ force: true })
      await expect(primary(page)).toBeHidden()
    }
  }
  await expect(page.locator('#site-footer').getByRole('link', { name: 'Support', exact: true })).toHaveAttribute('href', '/#contact')
  await expect(page.locator('#site-footer').getByRole('link', { name: /^(AI Course )?Locations$/ })).toHaveAttribute('href', '/locations/')
  await expect(page.locator('#site-footer .sh-login')).toHaveAttribute('href', '/login')
})
