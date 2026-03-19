import { test, expect } from '@playwright/test'
import { warmup, addItemAndCheckout, subscribeProPlan, selectModeAndBackend, fillCustomerAndContinue, completeMockPayment, waitForSuccess } from './helpers'

test.beforeAll(async ({ browser }) => { await warmup(browser) })

test.describe('Cardcom - Checkout - Mock - Modal', () => {
  test('simple payment', async ({ page }) => {
    await addItemAndCheckout(page, 'cardcom')
    await selectModeAndBackend(page, 'modal', 'mock')
    await fillCustomerAndContinue(page)

    // Modal creates an overlay with an iframe
    await expect(page.getByText('Payment modal is open')).toBeVisible({ timeout: 10000 })
    const iframe = page.frameLocator('iframe')
    await completeMockPayment(iframe)
    await waitForSuccess(page)
  })

  test('recurring subscription (הוראת קבע)', async ({ page }) => {
    await subscribeProPlan(page, 'cardcom')
    await selectModeAndBackend(page, 'modal', 'mock')
    await fillCustomerAndContinue(page)

    await expect(page.getByText('Payment modal is open')).toBeVisible({ timeout: 10000 })
    const iframe = page.frameLocator('iframe')
    await completeMockPayment(iframe, { recurring: true })
    await waitForSuccess(page)
  })
})
