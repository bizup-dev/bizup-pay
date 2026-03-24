import { expect, type Page, type FrameLocator } from '@playwright/test'

export type IntegrationMode = 'iframe' | 'modal' | 'redirect'
export type Backend = 'mock' | 'sandbox'

const MODE_BUTTONS: Record<IntegrationMode, string> = {
  iframe: 'Iframe (Embed)',
  modal: 'Modal (Popup)',
  redirect: 'Redirect (Full Page)',
}

const BACKEND_BUTTONS: Record<Backend, string> = {
  mock: 'Mock Server',
  sandbox: 'Provider Sandbox',
}

/** Warm up Next.js dev server (compile pages on first hit) */
export async function warmup(browser: import('@playwright/test').Browser) {
  const page = await browser.newPage()
  await page.goto('http://localhost:3099/')
  await page.goto('http://localhost:3099/subscribe')
  await page.goto('http://localhost:3099/checkout')
  await page.request.post('http://localhost:3099/api/checkout', {
    data: { provider: 'morning', amount: 1, description: 'warmup', items: [{ name: 'x', price: 1, quantity: 1 }], customer: { name: 'w' } },
  }).catch(() => {})
  await page.request.post('http://localhost:3099/api/checkout', {
    data: { provider: 'cardcom', amount: 1, description: 'warmup', items: [{ name: 'x', price: 1, quantity: 1 }], customer: { name: 'w' } },
  }).catch(() => {})
  await page.request.post('http://localhost:3099/api/checkout', {
    data: { provider: 'icount', amount: 1, description: 'warmup', items: [{ name: 'x', price: 1, quantity: 1 }], customer: { name: 'w' } },
  }).catch(() => {})
  await page.close()
}

/** Add a T-Shirt to cart and go to checkout with specified provider */
export async function addItemAndCheckout(page: Page, provider: 'morning' | 'cardcom' | 'icount' | 'tranzilla') {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add to Cart' }).first().click()
  const btnName = provider === 'cardcom' ? 'Checkout with Cardcom'
    : provider === 'icount' ? 'Checkout with iCount'
    : provider === 'tranzilla' ? 'Checkout with Tranzilla'
    : 'Checkout with Morning'
  await page.getByRole('button', { name: btnName }).click()
  await expect(page).toHaveURL(/\/checkout\?/)
}

/** Go to subscribe page and pick the Pro plan (monthly) with specified provider */
export async function subscribeProPlan(page: Page, provider: 'morning' | 'cardcom' | 'icount' | 'tranzilla') {
  await page.goto('/subscribe')
  const btnName = provider === 'cardcom' ? 'Subscribe via Cardcom'
    : provider === 'icount' ? 'Subscribe via iCount'
    : provider === 'tranzilla' ? 'Subscribe via Tranzilla'
    : 'Subscribe via Morning'
  await page.locator('div:has(> div:text("Most Popular"))').getByRole('button', { name: btnName }).click()
  await expect(page).toHaveURL(/\/checkout\?/)
}

/** Select integration mode and backend on the checkout page */
export async function selectModeAndBackend(page: Page, mode: IntegrationMode, backend: Backend) {
  await page.getByRole('button', { name: MODE_BUTTONS[mode] }).click()
  await page.getByRole('button', { name: BACKEND_BUTTONS[backend] }).click()
}

/** Fill customer details and click continue */
export async function fillCustomerAndContinue(page: Page) {
  await expect(page.getByRole('heading', { name: 'Customer Details' })).toBeVisible({ timeout: 10000 })
  await expect(page.getByLabel('Full Name')).toHaveValue('Israel Israeli')
  await page.getByRole('button', { name: /Continue to|Redirect to/ }).click()
}

/** Wait for success screen (works for all modes) */
export async function waitForSuccess(page: Page) {
  await expect(page.getByRole('heading', { name: 'Payment Successful' })).toBeVisible({ timeout: 30000 })
}

/** Complete payment on mock provider page inside an iframe/modal */
export async function completeMockPayment(iframe: FrameLocator, opts?: { recurring?: boolean }) {
  const btnName = opts?.recurring ? 'Setup Recurring (Mock)' : 'Pay Now (Mock)'
  await iframe.getByRole('button', { name: btnName }).click()
}

/** Complete payment on real Cardcom sandbox page inside an iframe/modal */
export async function completeCardcomSandboxPayment(iframe: FrameLocator) {
  // Wait for Cardcom page — use the text-type card input (desktop, always present)
  await expect(iframe.locator('[data-testid="credit-card-number-text-field"]')).toBeAttached({ timeout: 25000 })

  // Card number — use the text field (visible on desktop)
  await iframe.locator('[data-testid="credit-card-number-text-field"]').fill('4580000000000000')

  // Expiry
  await iframe.locator('[data-testid="credit-card-years-field"]').selectOption('2030')
  await iframe.locator('[data-testid="credit-card-months-field"]').selectOption('12')

  // CVV
  await iframe.locator('[data-testid="credit-card-cvv-field"]').fill('123')

  // Cardholder name
  await iframe.locator('[data-testid="credit-card-owner-name-field"]').fill('Test User')

  // ID number (ת.ז.)
  await iframe.locator('[data-testid="credit-card-tz-field"]').fill('000000018')

  // Submit
  await iframe.getByRole('button', { name: /תשלום/i }).first().click()
}

/** For redirect mode: complete payment on mock redirect page (full page, not iframe) */
export async function completeMockRedirectPayment(page: Page, opts?: { recurring?: boolean }) {
  const btnName = opts?.recurring ? 'Setup Recurring (Mock)' : 'Pay Now (Mock)'
  await expect(page.getByRole('button', { name: btnName })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: btnName }).click()
}

/** For redirect mode: complete payment on real Cardcom sandbox page (full page) */
export async function completeCardcomSandboxRedirectPayment(page: Page) {
  // Wait for the pay button to confirm page loaded
  await expect(page.getByRole('button', { name: /תשלום/i }).first()).toBeVisible({ timeout: 25000 })

  // Card number — try data-testid first, fallback to role
  const cardField = page.locator('[data-testid="credit-card-number-text-field"]').or(page.getByRole('textbox', { name: /מספר כרטיס/i }))
  await cardField.first().fill('4580000000000000')

  // Expiry
  const yearSelect = page.locator('[data-testid="credit-card-years-field"]').or(page.getByRole('combobox', { name: /שנה|year/i }))
  await yearSelect.first().selectOption('2030')
  const monthSelect = page.locator('[data-testid="credit-card-months-field"]').or(page.getByRole('combobox', { name: /חודש|month/i }))
  await monthSelect.first().selectOption('12')

  // CVV
  const cvvField = page.locator('[data-testid="credit-card-cvv-field"]').or(page.getByRole('spinbutton', { name: /CVV|ספרות/i }))
  await cvvField.first().fill('123')

  // Name — may already be pre-filled, only fill if empty
  const nameField = page.locator('[data-testid="credit-card-owner-name-field"]').or(page.getByRole('textbox', { name: /שם בעל/i }))
  if (await nameField.first().count() > 0) {
    const val = await nameField.first().inputValue().catch(() => '')
    if (!val) await nameField.first().fill('Test User')
  }

  // ID — may not exist on all pages
  const idField = page.locator('[data-testid="credit-card-tz-field"]').or(page.getByRole('textbox', { name: /ת\.ז/i }))
  if (await idField.first().count() > 0) {
    const val = await idField.first().inputValue().catch(() => '')
    if (!val) await idField.first().fill('000000018')
  }

  await page.getByRole('button', { name: /תשלום/i }).first().click()
}
