import { test } from '@playwright/test'
import { warmup, addItemAndCheckout, subscribeProPlan, selectModeAndBackend, fillCustomerAndContinue, completeMockRedirectPayment, waitForSuccess } from './helpers'

test.beforeAll(async ({ browser }) => { await warmup(browser) })

test.describe('Tranzilla - Checkout - Mock - Redirect', () => {
  test('simple payment', async ({ page }) => {
    await addItemAndCheckout(page, 'tranzilla')
    await selectModeAndBackend(page, 'redirect', 'mock')
    await fillCustomerAndContinue(page)

    // Page redirects to mock provider payment page
    await completeMockRedirectPayment(page)
    await waitForSuccess(page)
  })

  test('recurring subscription (הוראת קבע)', async ({ page }) => {
    await subscribeProPlan(page, 'tranzilla')
    await selectModeAndBackend(page, 'redirect', 'mock')
    await fillCustomerAndContinue(page)

    await completeMockRedirectPayment(page, { recurring: true })
    await waitForSuccess(page)
  })
})
