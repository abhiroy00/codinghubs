import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page, baseURL }) => {
  expect(['localhost', '127.0.0.1', '::1']).toContain(new URL(baseURL!).hostname)
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }))
})

for (const indexable of [false, true]) test(`guide-list browser metadata respects public instruction eligibility: ${indexable}`, async ({ page }) => {
  await page.route('**/api/project-guides/**', route => route.fulfill({ json: {
    count: 1, indexable, categories: [], next: null, previous: null,
    results: [{ title: 'Practice guide', slug: 'practice-guide', summary: 'A local fixture', access_type: 'free', difficulty: 'beginner' }],
  } }))
  await page.goto('/project-guides')
  await expect(page.getByRole('link', { name: 'Read Practice guide', exact: true })).toBeVisible()
  const robots = page.locator('meta[name="robots"]')
  await expect(robots).toHaveAttribute('content', indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow')
  if (indexable) {
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://codinghubs.in/project-guides')
    await page.getByRole('searchbox', { name: 'Search guides' }).fill('filtered')
    await expect(robots).toHaveAttribute('content', 'noindex, follow')
  } else {
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  }
})
