import { expect, test } from '@playwright/test'

const campaign = {
  id: 20, title: '20% off course fees', offer_label: '20% OFF',
  offer_text: 'Get 20% off the fee of any Coding Hubs course.',
  coupon_code: '', terms: 'A counsellor confirms your final fee before you enrol.',
  cta_label: 'Claim 20% off', cta_url: '#demo', presentation: 'modal',
  frequency: 'daily', ends_at: null, show_countdown: false, updated_at: '2026-11-26T06:30:00Z',
}

test('homepage replaces newsletter signup with the original Campus Connect banner', async ({ page }) => {
  await page.route('**/api/leads/campaigns/active/**', route => route.fulfill({ json: { campaign: null } }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'A useful note for your next step.' })).toHaveCount(0)
  const campus = page.getByRole('region', { name: 'Campus Connect' })
  await campus.scrollIntoViewIfNeeded()
  await expect(campus.getByRole('img')).toBeVisible()
  expect(await campus.getByRole('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
})

test('online tools showcase uses a white background and readable cards', async ({ page }) => {
  await page.route('**/api/leads/campaigns/active/**', route => route.fulfill({ json: { campaign: null } }))
  await page.goto('/ai-tools')
  const tools = page.locator('#innovative-tools')
  await expect(tools).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(tools).toHaveCSS('background-image', 'none')
  await expect(tools.locator('.itk-cat').first()).toHaveCSS('color', 'rgb(11, 18, 32)')
})

test('offer popup validates contacts, retries failed saves, and records the selected campaign', async ({ page }) => {
  await page.route('**/api/leads/campaigns/active/**', route => route.fulfill({ json: { campaign } }))
  let attempts = 0
  let payload: Record<string, unknown> = {}
  await page.route('**/api/leads/', route => {
    attempts++
    payload = route.request().postDataJSON()
    return route.fulfill({ status: attempts === 1 ? 503 : 201, json: attempts === 1 ? { detail: 'Unavailable' } : { id: 42 } })
  })
  await page.goto('/')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Grab Your 20% Discount Before It Expires!' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Dismiss offer' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.locator('summary')).toBeFocused()
  await dialog.getByRole('textbox', { name: 'Your Full Name' }).fill('Test Learner')
  await dialog.getByRole('textbox', { name: 'Your Email Address' }).fill('learner@example.com')
  const phone = dialog.getByRole('textbox', { name: 'WhatsApp Number' })
  await phone.fill('1234567890')
  await dialog.getByRole('button', { name: 'Claim My 20% OFF' }).click()
  await expect(dialog.getByRole('alert')).toContainText('valid 10-digit Indian mobile')
  expect(attempts).toBe(0)
  await phone.fill('+91 98765 43210')
  await dialog.getByRole('button', { name: 'Claim My 20% OFF' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Please try again')
  await dialog.getByRole('button', { name: 'Claim My 20% OFF' }).click()
  await expect(dialog.getByRole('status')).toContainText('Request received')
  expect(payload).toMatchObject({ name: 'Test Learner', email: 'learner@example.com', phone: '+919876543210', campaign: 20, mode: 'expert', source_page: '/' })
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('offer timer follows the real expiry and dismisses an expired campaign', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-26T06:29:59Z') })
  await page.clock.pauseAt(new Date('2026-11-26T06:30:00Z'))
  await page.route('**/api/leads/campaigns/active/**', route => route.fulfill({ json: { campaign: { ...campaign, ends_at: '2026-11-26T06:59:46Z', show_countdown: true } } }))
  await page.goto('/')
  const timer = page.getByRole('timer')
  await expect(timer).toContainText('29')
  await expect(timer).toContainText('46')
  await page.clock.fastForward(30 * 60 * 1000)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('custom campaigns retain their admin copy, coupon and destination', async ({ page }) => {
  await page.route('**/api/leads/campaigns/active/**', route => route.fulfill({ json: { campaign: {
    ...campaign, title: 'Weekend learning offer', offer_text: 'A custom offer for our weekend learners.',
    coupon_code: 'WEEKEND20', cta_label: 'Explore courses', cta_url: '/courses/',
  } } }))
  await page.goto('/')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Weekend learning offer' })).toBeVisible()
  await expect(dialog.getByText('A custom offer for our weekend learners.')).toBeVisible()
  await expect(dialog.getByText('WEEKEND20')).toBeVisible()
  await dialog.getByRole('button', { name: 'Explore courses' }).click()
  await expect(page).toHaveURL(/\/courses\/$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

for (const width of [320, 768, 1024, 1440]) {
  test(`reference sections and offer popup fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/leads/campaigns/active/**', route => route.fulfill({ json: { campaign: {
      ...campaign, ends_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), show_countdown: true,
    } } }))
    await page.goto('/')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await dialog.getByRole('button', { name: 'Claim My 20% OFF' }).scrollIntoViewIfNeeded()
    await expect(dialog.getByRole('button', { name: 'Claim My 20% OFF' })).toBeInViewport()
    await dialog.getByRole('button', { name: 'Dismiss offer' }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: `../artifacts/ui-reference/offer-${width}.png` })
    await page.keyboard.press('Escape')
    const campus = page.getByRole('region', { name: 'Campus Connect' })
    await campus.scrollIntoViewIfNeeded()
    expect(await campus.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await campus.getByRole('img').evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(1176)
    await campus.screenshot({ path: `../artifacts/ui-reference/campus-${width}.png` })
    await page.goto('/ai-tools')
    const tools = page.locator('#innovative-tools')
    await tools.scrollIntoViewIfNeeded()
    expect(await tools.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await tools.screenshot({ path: `../artifacts/ui-reference/tools-${width}.png` })
    expect(errors).toEqual([])
  })
}
