import { describe, it, expect } from 'vitest'
import { IcountProvider } from '../provider.js'
import ipnPayload from '../__fixtures__/ipn-payload.json'

describe('IcountProvider.parseWebhook', () => {
  const provider = new IcountProvider({
    cid: 'test', accessToken: 'tok', paypageId: 2,
  })

  it('parses a successful IPN payload', async () => {
    const event = await provider.parseWebhook(ipnPayload)

    expect(event.type).toBe('payment.completed')
    expect(event.transaction.provider).toBe('icount')
    expect(event.transaction.amount).toBe(79.90)
    expect(event.transaction.status).toBe('approved')
    expect(event.transaction.cardLastFour).toBe('0000')
    expect(event.transaction.customer?.name).toBe('Israel Israeli')
    expect(event.transaction.icount?.confirmationCode).toBe('0077456')
    expect(event.transaction.icount?.docnum).toBe(1001)
  })

  it('parses a failed IPN payload', async () => {
    const event = await provider.parseWebhook({
      sale_uniqid: 'test123',
      status: 'failed',
      sum: 50,
    })

    expect(event.type).toBe('payment.failed')
    expect(event.transaction.status).toBe('declined')
    expect(event.transaction.amount).toBe(50)
  })

  it('rejects invalid payload', async () => {
    await expect(provider.parseWebhook(null)).rejects.toThrow('Invalid IPN')
    await expect(provider.parseWebhook('string')).rejects.toThrow('Invalid IPN')
  })
})
