import { describe, it, expect, beforeEach } from 'vitest'
import { createProvider, registerProvider } from '../factory.js'
import { BizupPayError } from '../errors.js'
import type { BizupProvider } from '../provider.js'

function createMockProvider(name: 'morning' | 'cardcom'): BizupProvider {
  return {
    name,
    createSession: async () => ({
      id: 'mock-session',
      provider: name,
      amount: 100,
      currency: 'ILS',
      description: 'Mock',
      pageUrl: 'https://example.com/pay',
      successUrl: 'https://example.com/success',
      webhookUrl: 'https://example.com/webhook',
      metadata: {},
      status: 'pending' as const,
    }),
    getTransaction: async () => ({
      id: 'mock-tx',
      providerTransactionId: 'ext-123',
      provider: name,
      amount: 100,
      currency: 'ILS',
      status: 'approved' as const,
      paymentMethod: 'credit_card' as const,
      installments: 1,
      createdAt: new Date(),
      raw: {},
    }),
    refund: async () => ({
      id: 'mock-refund',
      transactionId: 'mock-tx',
      amount: 100,
      status: 'completed' as const,
      createdAt: new Date(),
    }),
    parseWebhook: async () => ({
      type: 'payment.completed' as const,
      transaction: {
        id: 'mock-tx',
        providerTransactionId: 'ext-123',
        provider: name,
        amount: 100,
        currency: 'ILS',
        status: 'approved' as const,
        paymentMethod: 'credit_card' as const,
        installments: 1,
        createdAt: new Date(),
        raw: {},
      },
      timestamp: new Date(),
    }),
  }
}

describe('Factory', () => {
  describe('registerProvider', () => {
    it('should register a provider factory', () => {
      registerProvider('morning', () => createMockProvider('morning'))

      const provider = createProvider('morning', { apiKey: 'test' })
      expect(provider.name).toBe('morning')
    })
  })

  describe('createProvider', () => {
    it('should create a registered provider', () => {
      registerProvider('cardcom', () => createMockProvider('cardcom'))

      const provider = createProvider('cardcom', {
        terminalNumber: 1000,
        apiName: 'test',
      })
      expect(provider.name).toBe('cardcom')
    })

    it('should throw BizupPayError for unregistered provider', () => {
      expect(() =>
        createProvider('grow', { apiKey: 'test' }),
      ).toThrow(BizupPayError)

      try {
        createProvider('grow', { apiKey: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(BizupPayError)
        expect((error as BizupPayError).code).toBe('INVALID_CONFIG')
        expect((error as BizupPayError).message).toContain('grow')
      }
    })

    it('should pass config to the factory function', () => {
      let receivedConfig: unknown

      registerProvider('morning', (config) => {
        receivedConfig = config
        return createMockProvider('morning')
      })

      createProvider('morning', { apiKey: 'my-key', apiSecret: 'my-secret' })
      expect(receivedConfig).toEqual({
        apiKey: 'my-key',
        apiSecret: 'my-secret',
      })
    })

    it('should return a provider that implements BizupProvider interface', async () => {
      registerProvider('morning', () => createMockProvider('morning'))

      const provider = createProvider('morning', {})

      const session = await provider.createSession({
        amount: 100,
        description: 'Test',
        successUrl: 'https://example.com/success',
        webhookUrl: 'https://example.com/webhook',
      })
      expect(session.id).toBe('mock-session')

      const tx = await provider.getTransaction('123')
      expect(tx.id).toBe('mock-tx')

      const refund = await provider.refund({ transactionId: '123' })
      expect(refund.id).toBe('mock-refund')

      const event = await provider.parseWebhook({})
      expect(event.type).toBe('payment.completed')
    })
  })
})

describe('BizupPayError', () => {
  it('should have correct error properties', () => {
    const error = new BizupPayError(
      'Something went wrong',
      'PROVIDER_ERROR',
      'morning',
      { originalError: 'timeout' },
    )

    expect(error.message).toBe('Something went wrong')
    expect(error.code).toBe('PROVIDER_ERROR')
    expect(error.provider).toBe('morning')
    expect(error.providerError).toEqual({ originalError: 'timeout' })
    expect(error.name).toBe('BizupPayError')
    expect(error).toBeInstanceOf(Error)
  })

  it('should work without optional provider fields', () => {
    const error = new BizupPayError('Bad params', 'INVALID_PARAMS')

    expect(error.code).toBe('INVALID_PARAMS')
    expect(error.provider).toBeUndefined()
    expect(error.providerError).toBeUndefined()
  })
})
