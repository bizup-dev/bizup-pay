import { test } from '@playwright/test'
import { warmup, addItemAndCheckout, subscribeProPlan, selectModeAndBackend, fillCustomerAndContinue, completeMockPayment, waitForSuccess } from './helpers'

test.beforeAll(async ({ browser }) => { await warmup(browser) })

test.describe('Morning - Checkout - Mock - Iframe', () => {
  test('simple payment', async ({ page }) => {
    await addItemAndCheckout(page, 'morning')
    await selectModeAndBackend(page, 'iframe', 'mock')
    await fillCustomerAndContinue(page)

    const iframe = page.frameLocator('iframe')
    await completeMockPayment(iframe)
    await waitForSuccess(page)
  })

  test('recurring subscription (הוראת קבע)', async ({ page }) => {
    await subscribeProPlan(page, 'morning')
    await selectModeAndBackend(page, 'iframe', 'mock')
    await fillCustomerAndContinue(page)

    const iframe = page.frameLocator('iframe')
    await completeMockPayment(iframe)
    await waitForSuccess(page)
  })
})
