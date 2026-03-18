import { describe, it, expect } from 'vitest'
import { MorningProvider } from '../provider.js'
import { BizupPayError } from '@bizup-pay/core'
import webhookPayload from '../__fixtures__/webhook-payload.json'

const defaultConfig = {
  apiKey: 'test-key',
  apiSecret: 'test-secret',
}

describe('MorningProvider.parseWebhook', () => {
  it('should parse a valid Morning webhook payload', async () => {
    const provider = new MorningProvider(defaultConfig)

    const event = await provider.parseWebhook(webhookPayload)

    expect(event.type).toBe('payment.completed')
    expect(event.transaction.id).toBe(
      'd290f1ee-6c54-4b01-90e6-d701748f0851',
    )
    expect(event.transaction.provider).toBe('morning')
    expect(event.transaction.amount).toBe(100)
    expect(event.transaction.currency).toBe('ILS')
    expect(event.transaction.status).toBe('approved')
    expect(event.transaction.paymentMethod).toBe('credit_card')
    expect(event.transaction.cardLastFour).toBe('1234')
    expect(event.timestamp).toBeInstanceOf(Date)
  })

  it('should map customer info from webhook', async () => {
    const provider = new MorningProvider(defaultConfig)

    const event = await provider.parseWebhook(webhookPayload)

    expect(event.transaction.customer?.name).toBe('Israel Israeli')
    expect(event.transaction.customer?.email).toBe('israel@example.com')
  })

  it('should include Morning-specific extras', async () => {
    const provider = new MorningProvider(defaultConfig)

    const event = await provider.parseWebhook(webhookPayload)

    expect(event.transaction.morning?.documentType).toBe(320)
    expect(event.transaction.morning?.documentNumber).toBe('0042')
  })

  it('should throw WEBHOOK_PARSE_ERROR for null body', async () => {
    const provider = new MorningProvider(defaultConfig)

    await expect(provider.parseWebhook(null)).rejects.toThrow(BizupPayError)
    try {
      await provider.parseWebhook(null)
    } catch (error) {
      expect((error as BizupPayError).code).toBe('WEBHOOK_PARSE_ERROR')
    }
  })

  it('should throw WEBHOOK_PARSE_ERROR for missing id', async () => {
    const provider = new MorningProvider(defaultConfig)

    await expect(
      provider.parseWebhook({ amount: 100 }),
    ).rejects.toThrow(BizupPayError)
  })

  it('should throw WEBHOOK_PARSE_ERROR for non-object body', async () => {
    const provider = new MorningProvider(defaultConfig)

    await expect(provider.parseWebhook('invalid')).rejects.toThrow(
      BizupPayError,
    )
  })
})
