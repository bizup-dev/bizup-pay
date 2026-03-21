import { describe, it, expect } from 'vitest'
import { GrowProvider } from '../provider.js'
import webhookPayload from '../__fixtures__/webhook-payload.json'

describe('GrowProvider.parseWebhook', () => {
  const provider = new GrowProvider({
    pageCode: 'pc', userId: 'u1',
  })

  it('parses a successful webhook payload', async () => {
    const event = await provider.parseWebhook(webhookPayload)

    expect(event.type).toBe('payment.completed')
    expect(event.transaction.provider).toBe('grow')
    expect(event.transaction.amount).toBe(149.90)
    expect(event.transaction.status).toBe('approved')
    expect(event.transaction.cardLastFour).toBe('4580')
    expect(event.transaction.cardBrand).toBe('visa')
    expect(event.transaction.customer?.name).toBe('Avi Cohen')
    expect(event.transaction.customer?.email).toBe('avi@example.com')
    expect(event.transaction.customer?.phone).toBe('052-9876543')
    expect(event.transaction.grow?.processId).toBe(88501)
    expect(event.transaction.grow?.asmachta).toBe('0098765')
    expect(event.transaction.grow?.transactionToken).toBe('txn-tok-xyz789')
    expect(event.transaction.grow?.customFields).toEqual({ cField1: 'order-42' })
  })

  it('rejects invalid payload', async () => {
    await expect(provider.parseWebhook(null)).rejects.toThrow('Invalid webhook')
    await expect(provider.parseWebhook('string')).rejects.toThrow('Invalid webhook')
  })

  it('rejects payload missing transactionId', async () => {
    await expect(provider.parseWebhook({ sum: 100 })).rejects.toThrow('missing transactionId')
  })
})
