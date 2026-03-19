import { test } from '@playwright/test'
import { warmup, addItemAndCheckout, subscribeProPlan, selectModeAndBackend, fillCustomerAndContinue, completeMockRedirectPayment, waitForSuccess } from './helpers'

test.beforeAll(async ({ browser }) => { await warmup(browser) })

test.describe('Morning - Checkout - Mock - Redirect', () => {
  test('simple payment', async ({ page }) => {
    await addItemAndCheckout(page, 'morning')
    await selectModeAndBackend(page, 'redirect', 'mock')
    await fillCustomerAndContinue(page)

    await completeMockRedirectPayment(page)
    await waitForSuccess(page)
  })

  test('recurring subscription (הוראת קבע)', async ({ page }) => {
    await subscribeProPlan(page, 'morning')
    await selectModeAndBackend(page, 'redirect', 'mock')
    await fillCustomerAndContinue(page)

    await completeMockRedirectPayment(page)
    await waitForSuccess(page)
  })
})
