import { describe, it, expect } from 'vitest'
import { CardcomProvider } from '../provider.js'
import { BizupPayError } from '@bizup-pay/core'
import webhookPayload from '../__fixtures__/webhook-payload.json'

const defaultConfig = {
  terminalNumber: 1000,
  apiName: 'TestApiName',
  apiPassword: 'TestApiPassword',
}

describe('CardcomProvider.parseWebhook', () => {
  it('should parse a valid Cardcom webhook payload', async () => {
    const provider = new CardcomProvider(defaultConfig)

    const event = await provider.parseWebhook(webhookPayload)

    expect(event.type).toBe('payment.completed')
    expect(event.transaction.id).toBe('219282004')
    expect(event.transaction.provider).toBe('cardcom')
    expect(event.transaction.amount).toBe(10.5)
    expect(event.transaction.status).toBe('approved')
    expect(event.transaction.paymentMethod).toBe('credit_card')
    expect(event.transaction.cardLastFour).toBe('1111')
    expect(event.transaction.installments).toBe(1)
    expect(event.timestamp).toBeInstanceOf(Date)
  })

  it('should map customer info from webhook', async () => {
    const provider = new CardcomProvider(defaultConfig)

    const event = await provider.parseWebhook(webhookPayload)

    expect(event.transaction.customer?.name).toBe('John Doe')
    expect(event.transaction.customer?.email).toBe('john@example.com')
    expect(event.transaction.customer?.phone).toBe('+972-54-1234567')
    expect(event.transaction.customer?.taxId).toBe('123456789')
  })

  it('should include Cardcom-specific extras', async () => {
    const provider = new CardcomProvider(defaultConfig)

    const event = await provider.parseWebhook(webhookPayload)

    expect(event.transaction.cardcom).toBeDefined()
    expect(event.transaction.cardcom?.approvalNumber).toBe('0077123')
    expect(event.transaction.cardcom?.dealType).toBe('ChargeOnly')
    expect(event.transaction.cardcom?.lowProfileId).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    )
  })

  it('should detect failed payment from ResponseCode', async () => {
    const provider = new CardcomProvider(defaultConfig)
    const failedPayload = {
      ...webhookPayload,
      ResponseCode: 1,
      Description: 'Payment Failed',
    }

    const event = await provider.parseWebhook(failedPayload)

    expect(event.type).toBe('payment.failed')
    expect(event.transaction.status).toBe('declined')
  })

  it('should throw WEBHOOK_PARSE_ERROR for null body', async () => {
    const provider = new CardcomProvider(defaultConfig)

    await expect(provider.parseWebhook(null)).rejects.toThrow(BizupPayError)
    try {
      await provider.parseWebhook(null)
    } catch (error) {
      expect((error as BizupPayError).code).toBe('WEBHOOK_PARSE_ERROR')
    }
  })

  it('should throw WEBHOOK_PARSE_ERROR for missing LowProfileId', async () => {
    const provider = new CardcomProvider(defaultConfig)

    await expect(
      provider.parseWebhook({ TranzactionId: 123 }),
    ).rejects.toThrow(BizupPayError)
  })

  it('should throw WEBHOOK_PARSE_ERROR for non-object body', async () => {
    const provider = new CardcomProvider(defaultConfig)

    await expect(provider.parseWebhook('invalid')).rejects.toThrow(
      BizupPayError,
    )
  })
})
