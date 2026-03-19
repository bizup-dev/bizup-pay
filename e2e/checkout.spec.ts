import { test, expect } from '@playwright/test'

// Warm up all pages on first visit (Next.js dev mode compiles on demand)
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto('http://localhost:3099/')
  await page.goto('http://localhost:3099/subscribe')
  await page.goto('http://localhost:3099/checkout')
  // Also warm the API route
  await page.request.post('http://localhost:3099/api/checkout', {
    data: { provider: 'morning', amount: 1, description: 'warmup', items: [{ name: 'x', price: 1, quantity: 1 }] },
  }).catch(() => {})
  await page.close()
})

async function waitForSuccess(page: import('@playwright/test').Page) {
  // The mock payment page sends postMessage (handled by BizupPay client → shows inline success)
  // AND does a fallback redirect after 500ms (navigates to ?status=success)
  // Wait for whichever happens first
  await expect(page.getByRole('heading', { name: 'Payment Successful' })).toBeVisible({ timeout: 15000 })
}

// ───────────────────────────────────────────────────────
// Morning: Simple Payment (mock)
// ───────────────────────────────────────────────────────
test('Morning - simple payment', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'BizUp Pay Demo Shop' })).toBeVisible()

  // Add T-Shirt to cart
  await page.getByRole('button', { name: 'Add to Cart' }).first().click()
  await expect(page.getByText('Total').locator('..').getByText('79.90 ILS')).toBeVisible()

  // Pay with Morning
  await page.getByRole('button', { name: 'Pay with Morning' }).click()
  await expect(page).toHaveURL(/\/checkout\?/)

  // Mock payment page in iframe
  const iframe = page.frameLocator('iframe')
  await expect(iframe.getByText('Morning Mock Payment')).toBeVisible({ timeout: 10000 })
  await expect(iframe.getByText('79.90 ILS')).toBeVisible()

  // Pay
  await iframe.getByRole('button', { name: 'Pay Now (Mock)' }).click()

  // Success
  await waitForSuccess(page)

  // Back to shop
  await page.getByRole('button', { name: 'Back to Shop' }).click()
  await expect(page).toHaveURL('/')
})

// ───────────────────────────────────────────────────────
// Cardcom: Simple Payment (mock)
// ───────────────────────────────────────────────────────
test('Cardcom - simple payment', async ({ page }) => {
  await page.goto('/')

  // Add Hoodie and Cap
  await page.locator('text=Hoodie').locator('..').getByRole('button', { name: 'Add to Cart' }).click()
  await page.locator('text=Cap').locator('..').getByRole('button', { name: 'Add to Cart' }).click()
  await expect(page.getByText('Total').locator('..').getByText('189.80 ILS')).toBeVisible()

  // Pay with Cardcom
  await page.getByRole('button', { name: 'Pay with Cardcom' }).click()
  await expect(page).toHaveURL(/\/checkout\?/)

  // Mock Cardcom payment page
  const iframe = page.frameLocator('iframe')
  await expect(iframe.getByText('CARDCOM Mock')).toBeVisible({ timeout: 10000 })
  await expect(iframe.getByText('189.80 ILS')).toBeVisible()

  // Pay
  await iframe.getByRole('button', { name: 'Pay Now (Mock)' }).click()
  await waitForSuccess(page)
})

// ───────────────────────────────────────────────────────
// Cardcom: Recurring Payment / הוראת קבע (mock)
// ───────────────────────────────────────────────────────
test('Cardcom - recurring subscription', async ({ page }) => {
  await page.goto('/subscribe')
  await expect(page.getByRole('heading', { name: 'Choose Your Plan' })).toBeVisible()
  await expect(page.getByText('Most Popular')).toBeVisible()

  // Subscribe to Pro plan via Cardcom — click the button inside the "Most Popular" card
  await page.locator('div:has(> div:text("Most Popular"))').getByRole('button', { name: 'Subscribe via Cardcom' }).click()

  // Checkout page
  await expect(page).toHaveURL(/\/checkout\?/)
  await expect(page.getByText('Cardcom')).toBeVisible()

  // Mock Cardcom page shows recurring badge
  const iframe = page.frameLocator('iframe')
  await expect(iframe.getByText('CARDCOM Mock')).toBeVisible({ timeout: 15000 })
  await expect(iframe.getByText('הוראת קבע')).toBeVisible({ timeout: 5000 })

  // Setup recurring
  await iframe.getByRole('button', { name: 'Setup Recurring (Mock)' }).click()
  await waitForSuccess(page)
})

// ───────────────────────────────────────────────────────
// Morning: Recurring Payment / הוראת קבע (mock)
// ───────────────────────────────────────────────────────
test('Morning - recurring subscription (yearly)', async ({ page }) => {
  await page.goto('/subscribe')

  // Switch to yearly billing
  await page.getByRole('button', { name: /Yearly/ }).click()

  // Subscribe to Basic plan via Morning
  await page.getByRole('heading', { name: 'Basic' }).locator('..').locator('..').getByRole('button', { name: 'Subscribe via Morning' }).click()

  // Checkout page
  await expect(page).toHaveURL(/\/checkout\?/)
  await expect(page.getByText('Morning')).toBeVisible()

  // Mock Morning payment page
  const iframe = page.frameLocator('iframe')
  await expect(iframe.getByText('Morning Mock Payment')).toBeVisible({ timeout: 10000 })
  await expect(iframe.getByText('499.00 ILS')).toBeVisible()

  // Pay
  await iframe.getByRole('button', { name: 'Pay Now (Mock)' }).click()
  await waitForSuccess(page)
})
