import { expect, test } from '@playwright/test'

const metadata = {
  course_slug: 'generative-ai', title: 'Generative AI course brochure',
  description: 'Coding Hubs course curriculum and practical projects.', size: 240000,
  download_url: '/api/courses/brochures/generative-ai/download/',
  view_url: '/api/courses/brochures/generative-ai/view/', cover_url: '', cover_small_url: '',
}

test('course brochure offers the published PDF without loading it before a click', async ({ page }) => {
  const pdfRequests: string[] = []
  page.on('request', request => {
    if (/\/brochures\/[^/]+\/(view|download)\//.test(request.url())) pdfRequests.push(request.url())
  })
  await page.route('**/api/courses/brochures/generative-ai/', route => route.fulfill({ json: metadata }))
  await page.goto('/courses/generative-ai/')
  const brochure = page.getByRole('region', { name: 'Generative AI brochure', exact: true })
  await expect(brochure.getByRole('link', { name: 'Download brochure', exact: true })).toHaveAttribute('href', metadata.download_url)
  await expect(brochure.getByRole('link', { name: /View Generative AI brochure/ })).toHaveAttribute('href', metadata.view_url)
  await expect(brochure.getByRole('link', { name: /View Generative AI brochure/ })).toHaveAttribute('target', '_blank')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Generative AI')
  await expect(page.locator('.course-facts dd')).toHaveText(['30 days', '6', '3', '6'])
  expect(pdfRequests).toEqual([])
  await expect(page.locator('.course-programme-hero video')).toHaveCount(0)
})

test('unpublished PDF keeps honest unavailable controls and a course-specific enquiry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/courses/brochures/google-cloud/', route => route.fulfill({ status: 404, json: { detail: 'Not found.' } }))
  await page.goto('/courses/google-cloud/')
  const brochure = page.getByRole('region', { name: 'Google Cloud brochure', exact: true })
  await expect(brochure.getByText(/has not been published/)).toBeVisible()
  await expect(brochure.getByRole('button', { name: 'Download brochure', exact: true })).toBeDisabled()
  await expect(brochure.getByRole('link')).toHaveCount(0)
  await brochure.getByRole('button', { name: /Ask about this course/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Enrollment enquiry' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('combobox', { name: /Select Your Interested Course/ })).toHaveValue('Google Cloud')
})

test('brochure availability recovers after a temporary error', async ({ page }) => {
  let requests = 0
  await page.route('**/api/courses/brochures/generative-ai/', route => {
    requests++
    return requests === 1
      ? route.fulfill({ status: 503, json: { detail: 'Unavailable' } })
      : route.fulfill({ json: metadata })
  })
  await page.goto('/courses/generative-ai/')
  await page.getByRole('button', { name: 'Retry brochure', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Download brochure', exact: true })).toBeVisible()
})

test('training programme enquiries retain the programme selected in its brochure panel', async ({ page }) => {
  await page.route('**/api/courses/brochures/**', route => route.fulfill({ status: 404, json: { detail: 'Not found.' } }))
  for (const [slug, name] of [['vibe-coding-with-ai', 'Vibe Coding with AI'], ['data-analytics-with-ai', 'Data Analytics with AI'], ['ai-for-all', 'AI for All']]) {
    await page.goto(`/program/${slug}/`)
    await page.getByRole('region', { name: `${name} brochure`, exact: true }).getByRole('button', { name: /Ask about this course/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Enrollment enquiry' })
    await expect(dialog.getByRole('combobox', { name: /Select Your Interested Course/ })).toHaveValue(name)
    await page.keyboard.press('Escape')
  }
})
