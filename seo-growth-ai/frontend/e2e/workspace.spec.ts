import { expect, test } from '@playwright/test'

test('authenticated source import, agents, retrieval and mobile controls work end to end', async ({ page, isMobile }) => {
  const errors: string[] = [], external: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url()) })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Start with a local owner|Welcome back/ })).toBeVisible()
  if (await page.getByRole('heading', { name: 'Start with a local owner' }).isVisible()) {
    await page.getByLabel('Username', { exact: true }).fill('fixture-owner')
    await page.getByLabel('Password', { exact: true }).fill('fixture-local-password')
    await page.getByRole('button', { name: 'Create local workspace' }).click()
  } else {
    await page.getByLabel('Username', { exact: true }).fill('fixture-owner')
    await page.getByLabel('Password', { exact: true }).fill('fixture-local-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  }
  await expect(page.getByRole('combobox', { name: 'Selected website' })).toBeVisible()
  const websites = await (await page.request.get('/api/sites')).json()
  if (websites.length === 0) {
    await page.getByRole('button', { name: 'Add website', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Website name', { exact: true }).fill('Example fixture')
    await dialog.getByLabel('Website URL', { exact: true }).fill('https://example.test/')
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Add website', exact: true }).click()
    await expect(dialog).not.toBeVisible()
  }
  await expect(page.getByRole('combobox', { name: 'Selected website' })).not.toHaveValue('')
  async function nav(name: string) {
    if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('button', { name, exact: true }).click()
  }
  await nav('Data & integrations')
  await page.locator('input[type=file]').setInputFiles([
    { name: 'Chart.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Clicks,Impressions,CTR,Position\n2026-11-25,1,100,1%,8\n2026-11-26,2,200,1%,9\n') },
    { name: 'Pages.csv', mimeType: 'text/csv', buffer: Buffer.from('Top pages,Clicks,Impressions,CTR,Position\nhttps://example.test/guide,0,200,0%,8\n') },
    { name: 'Queries.csv', mimeType: 'text/csv', buffer: Buffer.from('Top queries,Clicks,Impressions,CTR,Position\nrag tutorial,0,100,0%,8\n') },
  ])
  await page.getByRole('button', { name: 'Import selected files' }).click()
  await expect(page.getByText('Import validated. Original files remain unchanged and duplicate rows are not added.')).toBeVisible()
  await nav('Overview')
  await expect(page.locator('.kpi').filter({ hasText: 'Organic clicks' }).locator('.value')).toHaveText('3')
  await expect(page.locator('.kpi').filter({ hasText: 'Search impressions' }).locator('.value')).toHaveText('300')
  await page.getByRole('button', { name: 'Run analysis', exact: true }).click()
  await nav('Automation')
  await expect(page.locator('.agent-item')).toHaveCount(20, { timeout: 20000 })
  await expect(page.locator('.agent-item').filter({ has: page.getByRole('heading', { name: 'Google Analytics', exact: true }) }).getByText('blocked', { exact: true })).toBeVisible()
  await nav('Knowledge base')
  await page.getByLabel('Document title', { exact: true }).fill('Reference fixture')
  await page.getByLabel('Source / provenance', { exact: true }).fill('fixture:reviewed-reference')
  await page.getByLabel('Source text', { exact: true }).fill('Retrieval uses source documents, validates the relevant passages and abstains when useful evidence is unavailable.')
  await page.getByRole('button', { name: 'Save local document' }).click()
  await expect(page.getByText('Document version stored locally; nothing sent to an external AI service')).toBeVisible()
  await page.getByLabel('What do you want to investigate?', { exact: true }).fill('retrieval source evidence')
  await page.getByRole('button', { name: 'Retrieve references' }).click()
  await expect(page.getByText('lexical fallback; not semantic embeddings', { exact: true })).toBeVisible()
  await nav('Content studio')
  await page.getByLabel('Requested analysis', { exact: true }).fill('Review the existing retrieval definition and its evidence.')
  await page.getByRole('button', { name: 'Generate local draft' }).click()
  await expect(page.getByText('deterministic fallback · rules', { exact: true })).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'Prepare ChatGPT prompt', exact: true }).click()
  await expect(page.getByLabel('Review and copy this prompt', { exact: true })).toHaveValue(/source_ids/)
  await nav('Technical audit')
  await page.getByRole('checkbox', { name: /I have permission/ }).check()
  await page.getByRole('button', { name: 'Start crawl', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Reference guide', exact: false })).toBeVisible({ timeout: 20000 })
  const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }))
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1)
  expect(errors).toEqual([])
  expect(external).toEqual([])
})
