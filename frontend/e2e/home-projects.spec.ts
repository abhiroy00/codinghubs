import { expect, test } from '@playwright/test'

const section = (page: import('@playwright/test').Page) => page.locator('#project-showcase')

test('homepage shows the supplied video instead of the project carousel', async ({ page }) => {
  await page.goto('/')
  const block = section(page)
  const video = block.getByLabel('Project showreel', { exact: true })
  await expect(video).toHaveCount(1)
  await expect(video).toHaveAttribute('controls', '')
  await expect(video).toHaveAttribute('poster', '/assets/showreel/project-showreel-poster.webp')
  await expect(block.locator('.hp-slide, .hp-picker, .hp-controls')).toHaveCount(0)
  await expect(block.getByRole('link', { name: 'View all 14 projects' })).toHaveAttribute('href', '/our-work')
})
