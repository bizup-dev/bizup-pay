import { test } from '@playwright/test'
import { warmup, addItemAndCheckout, subscribeProPlan, selectModeAndBackend, fillCustomerAndContinue, completeCardcomSandboxRedirectPayment, waitForSuccess } from './helpers'

test.beforeAll(async ({ browser }) => { await warmup(browser) })

test.describe('Cardcom - Checkout - Provider Sandbox - Redirect', () => {
  test('simple payment', async ({ page }) => {
    await addItemAndCheckout(page, 'cardcom')
    await selectModeAndBackend(page, 'redirect', 'sandbox')
    await fillCustomerAndContinue(page)

    // Page redirects to real Cardcom
    await page.waitForURL(/cardcom|localhost/, { timeout: 20000 })
    await completeCardcomSandboxRedirectPayment(page)
    await waitForSuccess(page)
  })

  test('recurring subscription (הוראת קבע)', async ({ page }) => {
    await subscribeProPlan(page, 'cardcom')
    await selectModeAndBackend(page, 'redirect', 'sandbox')
    await fillCustomerAndContinue(page)

    await page.waitForURL(/cardcom|localhost/, { timeout: 20000 })
    await completeCardcomSandboxRedirectPayment(page)
    await waitForSuccess(page)
  })
})
