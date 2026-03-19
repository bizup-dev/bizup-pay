import { test } from '@playwright/test'
import { warmup, addItemAndCheckout, subscribeProPlan, selectModeAndBackend, fillCustomerAndContinue, completeMockRedirectPayment, waitForSuccess } from './helpers'

test.beforeAll(async ({ browser }) => { await warmup(browser) })

test.describe('iCount - Checkout - Mock - Redirect', () => {
  test('simple payment', async ({ page }) => {
    await addItemAndCheckout(page, 'icount')
    await selectModeAndBackend(page, 'redirect', 'mock')
    await fillCustomerAndContinue(page)

    await completeMockRedirectPayment(page)
    await waitForSuccess(page)
  })

  test('recurring subscription', async ({ page }) => {
    await subscribeProPlan(page, 'icount')
    await selectModeAndBackend(page, 'redirect', 'mock')
    await fillCustomerAndContinue(page)

    await completeMockRedirectPayment(page, { recurring: true })
    await waitForSuccess(page)
  })
})
