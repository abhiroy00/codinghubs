import { expect, test } from '@playwright/test'

test('subject cards open complete notes, topic search and shareable selections', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/notes/')
  await expect(page.getByRole('heading', { name: 'Free Programming & AI Notes Library' })).toBeVisible()
  await expect(page.locator('.nt-card')).toHaveCount(7)
  await expect(page.getByText('1,078 learning notes', { exact: false })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search notebooks' }).fill('Python')
  await expect(page.locator('#subject-python')).toBeVisible()
  await page.locator('#subject-python').click()
  await expect(page).toHaveURL(/\/notes\/python\/$/)
  await expect(page.locator('.nt-workspace')).toHaveCSS('animation-name', 'ntOpen')
  await page.getByRole('searchbox', { name: 'Search topics' }).fill('History')
  await expect(page.locator('.nt-topic-list a')).toHaveCount(1)
  await page.locator('.nt-topic-list').getByRole('link', { name: /History of Python/ }).click()
  await expect(page).toHaveURL(/topic=history-of-python/)
  await expect(page.locator('.nt-article-body')).toContainText('Guido van Rossum')
  await expect(page.locator('.nt-article-body table')).toBeVisible()
  await page.reload()
  await expect(page.locator('.nt-article-body')).toContainText('Guido van Rossum')
  await page.getByRole('searchbox', { name: 'Search topics' }).fill('no-such-topic')
  await expect(page.getByText('No topics found.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await expect(page.locator('.nt-topic-list a')).toHaveCount(15)
  await page.locator('.nt-topic-list').getByRole('link', { name: /Functions in Python/ }).click()
  await expect(page.locator('.nt-article-body pre')).not.toHaveCount(0)
  await expect(page.locator('.nt-article-body')).toContainText('def ')
  await page.getByRole('searchbox', { name: 'Search topics' }).focus()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/notes\/#subject-python$/)
  await expect(page.locator('#subject-python')).toBeFocused()
  expect(errors).toEqual([])
})

test('all seven notebooks expose their published articles', async ({ page }) => {
  for (const [slug, count] of [['python', 15], ['sql', 37], ['machine-learning', 239], ['dl', 490], ['agentic-ai', 20], ['html', 124], ['generative-ai', 153]] as const) {
    await page.goto(`/notes/${slug}/`)
    await expect(page.locator('.nt-topic-list a')).toHaveCount(count)
    await expect(page.locator('.nt-article-body')).toBeVisible()
    expect((await page.locator('.nt-article-body').innerText()).length).toBeGreaterThan(40)
  }
})

test('reader recovers from a failed content request and handles an unknown topic', async ({ page }) => {
  let unavailable = true
  await page.route('**/notes-content/python/history-of-python.json', async route => {
    if (unavailable) await route.fulfill({ status: 503, json: {} })
    else await route.continue()
  })
  await page.goto('/notes/python/?topic=history-of-python')
  await expect(page.getByRole('heading', { name: 'This note couldn’t be loaded.' })).toBeVisible()
  unavailable = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('.nt-article-body')).toContainText('Guido van Rossum')
  await page.goto('/notes/python/?topic=missing-note')
  await expect(page.getByRole('heading', { name: 'That topic isn’t in this notebook.' })).toBeVisible()
  await page.getByRole('button', { name: 'Open the first note' }).click()
  await expect(page.locator('.nt-article-body')).toBeVisible()
})

test('notes and the redesigned demo fit mobile, tablet and desktop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/notes/')
    await expect(page.locator('.nt-card')).toHaveCount(7)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.goto('/notes/python/?topic=history-of-python')
    await expect(page.locator('.nt-article-body')).toBeVisible()
    await expect(page.locator('.nt-workspace')).toHaveCSS('animation-name', 'none')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.locator('.site-header').getByRole('button', { name: 'Book Free Demo', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Free demo registration' })
    await expect(dialog).toHaveClass(/rp-consultation/)
    await expect(dialog.getByRole('textbox', { name: /Full Name/ })).toBeFocused()
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await dialog.getByRole('button', { name: 'Close', exact: true }).focus()
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.getByRole('link', { name: 'Privacy Policy' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(page.locator('.site-header').getByRole('button', { name: 'Book Free Demo', exact: true })).toBeFocused()
  }
})

test('redesigned demo validates and submits through the existing lead API', async ({ page }) => {
  let payload: Record<string, unknown> | null = null
  await page.route('**/api/leads/', route => {
    payload = route.request().postDataJSON()
    return route.fulfill({ status: 201, json: { id: 7 } })
  })
  await page.goto('/notes/')
  await expect(page.getByRole('dialog', { name: 'Free demo registration' })).toHaveCount(0)
  await page.locator('.site-header').getByRole('button', { name: 'Book Free Demo', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Free demo registration' })
  await dialog.getByRole('button', { name: 'Reserve My Free Seat', exact: true }).click()
  await expect(dialog.getByText('Please correct the highlighted fields.')).toBeVisible()
  expect(payload).toBeNull()
  await dialog.getByRole('textbox', { name: /Full Name/ }).fill('Test Learner')
  await dialog.getByRole('textbox', { name: /Mobile Number/ }).fill('9876543210')
  await dialog.getByRole('textbox', { name: /Email Address/ }).fill('learner@example.com')
  await dialog.getByRole('combobox', { name: /Select Your Interested Course/ }).selectOption('Generative AI')
  await dialog.getByRole('button', { name: 'Reserve My Free Seat', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: "You're registered!" })).toBeVisible()
  expect(payload).toMatchObject({ name: 'Test Learner', phone: '+919876543210', email: 'learner@example.com', course: 'Generative AI', mode: 'demo', source_page: '/notes/', whatsapp_consent: false })
})
