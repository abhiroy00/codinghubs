import { expect, test } from '@playwright/test'

for (const [slug, name] of [['generative-ai', 'Generative AI'], ['google-cloud', 'Google Cloud']]) {
  test(`Enrollment options opens the enquiry popup for ${name}`, async ({ page }) => {
    // Enquiries are independent of whether a paid checkout product is configured.
    await page.route(`**/api/courses/${slug}/`, route => route.fulfill({ status: 404, json: { detail: 'Not found' } }))
    await page.goto(`/courses/${slug}/`)
    const trigger = page.getByRole('button', { name: 'Enrollment options' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Enrollment enquiry' })
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/courses/${slug}/$`))
    await expect(dialog.getByRole('textbox', { name: /Full Name/ })).toBeFocused()
    await expect(dialog.getByRole('textbox', { name: /Mobile Number/ })).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: /Email Address/ })).toBeVisible()
    await expect(dialog.getByRole('combobox', { name: /Select Your Interested Course/ })).toHaveValue(name)
    await expect(dialog.getByText('2 Hours', { exact: true })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Close', exact: true }).focus()
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.getByRole('link', { name: 'Privacy Policy' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
  })
}

test('existing demo registrants can still open enrollment enquiries on mobile', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ch_registered', '1'))
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/courses/generative-ai/')
    await page.getByRole('button', { name: 'Enrollment options' }).click()
    const dialog = page.getByRole('dialog', { name: 'Enrollment enquiry' })
    await expect(dialog.getByRole('textbox', { name: /Full Name/ })).toBeVisible()
    await expect(page).toHaveURL(/\/courses\/generative-ai\/$/)
    expect(await dialog.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false)
    await page.keyboard.press('Escape')
  }
})

test('enrollment enquiry validates, retries and saves contact details without a payment', async ({ page }) => {
  let attempts = 0
  let payload: Record<string, unknown> = {}
  const payments: string[] = []
  page.on('request', request => {
    if (/\/api\/(payments|enrollments)\//.test(new URL(request.url()).pathname)) payments.push(request.url())
  })
  await page.route('**/api/leads/', route => {
    attempts++
    payload = route.request().postDataJSON()
    return route.fulfill({ status: attempts === 1 ? 503 : 201, json: attempts === 1 ? { detail: 'Unavailable' } : { id: 42 } })
  })
  await page.goto('/courses/generative-ai/')
  await page.getByRole('button', { name: 'Enrollment options' }).click()
  const dialog = page.getByRole('dialog', { name: 'Enrollment enquiry' })
  await dialog.getByRole('button', { name: 'Send enrollment enquiry' }).click()
  await expect(dialog.getByText('Please correct the highlighted fields.')).toBeVisible()
  expect(attempts).toBe(0)
  await dialog.getByRole('textbox', { name: /Full Name/ }).fill('Test Learner')
  await dialog.getByRole('textbox', { name: /Mobile Number/ }).fill('9876543210')
  await dialog.getByRole('textbox', { name: /Email Address/ }).fill('learner@example.com')
  await dialog.getByRole('combobox', { name: /Select Your Interested Course/ }).selectOption('Google Cloud')
  await dialog.getByRole('combobox', { name: /Current Education/ }).selectOption('Graduate')
  await dialog.getByRole('checkbox', { name: /enrollment updates/ }).check()
  await dialog.getByRole('button', { name: 'Send enrollment enquiry' }).click()
  await expect(dialog.getByText('Your enquiry could not be sent. Please try again.')).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Enquiry received' })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Send enrollment enquiry' }).click()
  await expect(dialog.getByRole('heading', { name: 'Enquiry received' })).toBeVisible()
  expect(payload).toEqual({
    name: 'Test Learner', phone: '+919876543210', email: 'learner@example.com',
    education: 'Graduate', whatsapp_consent: true, course: 'Google Cloud',
    mode: 'expert', source_page: '/courses/generative-ai/',
  })
  expect(payments).toEqual([])
  expect(await page.evaluate(() => localStorage.getItem('ch_registered'))).toBeNull()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Enrollment options' }).click()
  await expect(dialog.getByRole('combobox', { name: /Select Your Interested Course/ })).toHaveValue('Generative AI')
  await expect(dialog.getByRole('textbox', { name: /Full Name/ })).toHaveValue('')
  await page.keyboard.press('Escape')
  await page.locator('.site-header').getByRole('button', { name: 'Free Demo', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Free demo registration' })).toBeVisible()
})
