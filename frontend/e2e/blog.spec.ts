import { test, expect, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

// Run against disposable local Django/Vite servers. Never point these writes at production.
const adminBase = process.env.BLOG_ADMIN_BASE_URL ?? 'http://127.0.0.1:5184/admin-panel'
const email = process.env.BLOG_TEST_EMAIL ?? 'blog-ui@example.test'
const password = process.env.BLOG_TEST_PASSWORD ?? 'Local-blog-test-only-2026!'
const browserErrors = new WeakMap<Page, string[]>()

test.beforeEach(async ({ baseURL, page }) => {
  for (const target of [baseURL!, adminBase]) expect(['localhost', '127.0.0.1', '::1']).toContain(new URL(target).hostname)
  // Isolate anonymous rate-limit buckets across browser-test runs.
  await page.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.0.0.${Math.floor(Math.random() * 200) + 20}` })
  const errors: string[] = []
  browserErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
})

test.afterEach(async ({ page }) => { expect(browserErrors.get(page)).toEqual([]) })

test('blog reader: responsive cover, sticky contents and active heading', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/blog/what-is-an-ai-engineer')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('What Is an AI Engineer?')
  await expect(page.locator('.bl-deck')).toBeVisible()
  const toc = page.getByRole('navigation', { name: 'On this page' })
  await expect(toc).toBeVisible()
  const cover = page.locator('.bl-reader-cover')
  await expect(cover).toBeVisible()
  expect(await cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  await page.screenshot({ path: '../artifacts/blog/article-desktop.png' })
  const links = toc.getByRole('link')
  const target = links.nth(2)
  await target.click()
  await expect(target).toHaveAttribute('aria-current', 'location')
  const href = await target.getAttribute('href')
  const headingTop = await page.locator(href!).evaluate((el) => el.getBoundingClientRect().top)
  expect(headingTop).toBeGreaterThan(0)
  expect(headingTop).toBeLessThan(250)
  expect(await toc.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
  await page.screenshot({ path: '../artifacts/blog/article-reading.png' })
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog/what-is-an-ai-engineer')
  await expect(toc).toBeVisible()
  await page.screenshot({ path: '../artifacts/blog/article-mobile.png', fullPage: true })
  expect(errors).toEqual([])
})

test('simple blog form: draft, reload, optional metadata preservation and publish', async ({ page, request }) => {
  const title = `Blog editor verification ${randomUUID().slice(0, 8)}`
  const login = await request.post('/api/admin/login/', { headers: { 'X-Forwarded-For': `127.0.1.${Math.floor(Math.random() * 200) + 20}` }, data: { email, password } })
  expect(login.status()).toBe(200)
  const { access } = await login.json()
  const headers = { Authorization: `Bearer ${access}` }
  const faq = [{ q: 'What is tested?', a: '<p>Publishing and metadata preservation.</p>' }]
  const gallery = [{ src: '/media/blog/ai-engineer/rag.png', alt: 'Existing RAG diagram' }]
  const create = await request.post('/api/admin/blogs/', { headers, data: {
    title, content: '<p>Existing article text for preservation.</p>', excerpt: 'Original summary.',
    gallery, faq, seo_title: 'Keep this SEO title', author_name: 'Original author',
  } })
  expect(create.status()).toBe(201)
  const post = await create.json()
  try {
    await page.goto(`${adminBase}/blogs/edit/${post.id}`)
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Edit post', exact: true })).toBeVisible()
    await expect(page.getByLabel('Title', { exact: false })).toHaveValue(title)
    await expect(page.getByLabel('Post URL', { exact: true })).not.toBeVisible()
    await expect(page.getByLabel('Publish date', { exact: true })).not.toBeVisible()
    await expect(page.getByLabel('Status', { exact: true })).toHaveCount(0)
    await page.getByLabel('Short description', { exact: false }).fill('An updated summary for the new reading layout.')
    await page.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(page.getByText('Saved.', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Short description', { exact: false })).toHaveValue('An updated summary for the new reading layout.')
    await page.screenshot({ path: '../artifacts/blog/admin-desktop.png', fullPage: true })
    await page.getByRole('button', { name: 'Publish post', exact: true }).click()
    await expect(page.getByText('Published. It is now live on the website.')).toBeVisible()
    const saved = await (await request.get(`/api/admin/blogs/${post.id}/`, { headers })).json()
    expect(saved.status).toBe('published')
    expect(saved.gallery).toEqual(gallery)
    expect(saved.faq).toEqual(faq)
    expect(saved.seo_title).toBe('Keep this SEO title')
    expect(saved.author_name).toBe('Original author')
    expect(saved.content).toBe('<p>Existing article text for preservation.</p>')
    await expect(page.getByRole('button', { name: 'Update post', exact: true })).toBeVisible()
    await page.getByText('Publishing options', { exact: false }).click()
    await page.getByRole('button', { name: 'Unpublish', exact: true }).click()
    await expect(page.getByText('Post unpublished. It is now a draft.')).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: '../artifacts/blog/admin-mobile.png', fullPage: true })
  } finally {
    await request.delete(`/api/admin/blogs/${post.id}/`, { headers })
  }
})

test('visual writing, cover upload and scheduling work without an editor API key', async ({ page }) => {
  await page.goto(`${adminBase}/blogs/create`)
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const title = `Visual editor ${randomUUID().slice(0, 8)}`
  await page.getByLabel('Title', { exact: false }).fill(title)
  await page.getByLabel('Short description', { exact: false }).fill('A guide written with the visual editor.')
  const body = page.getByRole('textbox', { name: 'Article', exact: true })
  await body.fill('A practical introduction')
  await page.getByLabel('Text style').selectOption('2')
  await body.press('End')
  await body.press('Enter')
  await body.pressSequentially('This paragraph explains the results clearly.')
  await page.locator('input#blog-cover').setInputFiles('../backend/apps/content/seed_data/ai-engineer-images/cover.png')
  await expect(page.getByLabel('Describe the image', { exact: false })).toBeVisible()
  await page.getByLabel('Describe the image', { exact: false }).fill('An AI engineering workflow diagram')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edit post', exact: true })).toBeVisible()
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible()
  await page.reload()
  await expect(body.locator('h2')).toHaveText('A practical introduction')
  await expect(body).toContainText('This paragraph explains the results clearly.')
  await expect(page.locator('.ad-blog-cover-preview')).toHaveAttribute('alt', 'An AI engineering workflow diagram')
  await page.getByText('Publishing options', { exact: false }).click()
  const future = new Date(Date.now() + 7 * 86400000)
  future.setMinutes(future.getMinutes() - future.getTimezoneOffset())
  await page.getByLabel('Publish date', { exact: true }).fill(future.toISOString().slice(0, 16))
  await page.getByRole('button', { name: 'Schedule post', exact: true }).click()
  await expect(page.getByText('Scheduled. It goes live automatically at the chosen time.')).toBeVisible()
  await page.screenshot({ path: '../artifacts/blog/admin-visual-editor.png', fullPage: true })
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete post', exact: true }).click()
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Blogs', exact: true })).toBeVisible()
})
