import { test, expect } from '@playwright/test'

// Warm up Next.js dev server
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto('http://localhost:3099/')
  await page.goto('http://localhost:3099/subscribe')
  await page.goto('http://localhost:3099/checkout')
  await page.request.post('http://localhost:3099/api/checkout', {
    data: { provider: 'morning', amount: 1, description: 'warmup', items: [{ name: 'x', price: 1, quantity: 1 }], customer: { name: 'w' } },
  }).catch(() => {})
  await page.close()
})

async function waitForSuccess(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading', { name: 'Payment Successful' })).toBeVisible({ timeout: 15000 })
}

async function fillCustomerAndContinue(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading', { name: 'Customer Details' })).toBeVisible({ timeout: 10000 })
  await expect(page.getByLabel('Full Name')).toHaveValue('Israel Israeli')
  await expect(page.getByLabel('Email')).toHaveValue('israel@example.com')
  await page.getByRole('button', { name: /Continue to/ }).click()
  return page.frameLocator('iframe')
}

// ─── Morning: Simple Payment ─────────────────────────
test('Morning - simple payment', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Add to Cart' }).first().click()

  await page.getByRole('button', { name: 'Checkout with Morning' }).click()
  await expect(page).toHaveURL(/\/checkout\?/)

  const iframe = await fillCustomerAndContinue(page)

  await expect(iframe.getByText('Morning Mock Payment')).toBeVisible({ timeout: 15000 })
  await iframe.getByRole('button', { name: 'Pay Now (Mock)' }).click()

  await waitForSuccess(page)
  await page.getByRole('button', { name: 'Back to Shop' }).click()
  await expect(page).toHaveURL('/')
})

// ─── Cardcom: Simple Payment ─────────────────────────
test('Cardcom - simple payment', async ({ page }) => {
  await page.goto('/')

  await page.locator('text=Hoodie').locator('..').getByRole('button', { name: 'Add to Cart' }).click()
  await page.locator('text=Cap').locator('..').getByRole('button', { name: 'Add to Cart' }).click()

  await page.getByRole('button', { name: 'Checkout with Cardcom' }).click()
  await expect(page).toHaveURL(/\/checkout\?/)

  const iframe = await fillCustomerAndContinue(page)

  await expect(iframe.getByText('CARDCOM Mock')).toBeVisible({ timeout: 15000 })
  await iframe.getByRole('button', { name: 'Pay Now (Mock)' }).click()

  await waitForSuccess(page)
})

// ─── Cardcom: Recurring Subscription ─────────────────
test('Cardcom - recurring subscription', async ({ page }) => {
  await page.goto('/subscribe')

  await page.locator('div:has(> div:text("Most Popular"))').getByRole('button', { name: 'Subscribe via Cardcom' }).click()
  await expect(page).toHaveURL(/\/checkout\?/)

  const iframe = await fillCustomerAndContinue(page)

  await expect(iframe.getByText('CARDCOM Mock')).toBeVisible({ timeout: 15000 })
  await expect(iframe.getByText('הוראת קבע')).toBeVisible()
  await iframe.getByRole('button', { name: 'Setup Recurring (Mock)' }).click()

  await waitForSuccess(page)
})

// ─── Morning: Recurring Subscription (yearly) ────────
test('Morning - recurring subscription (yearly)', async ({ page }) => {
  await page.goto('/subscribe')

  await page.getByRole('button', { name: /Yearly/ }).click()
  await page.getByRole('heading', { name: 'Basic' }).locator('..').locator('..').getByRole('button', { name: 'Subscribe via Morning' }).click()
  await expect(page).toHaveURL(/\/checkout\?/)

  const iframe = await fillCustomerAndContinue(page)

  await expect(iframe.getByText('Morning Mock Payment')).toBeVisible({ timeout: 15000 })
  await iframe.getByRole('button', { name: 'Pay Now (Mock)' }).click()

  await waitForSuccess(page)
})
