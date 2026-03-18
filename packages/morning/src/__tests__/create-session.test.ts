import { describe, it, expect, vi } from 'vitest'
import { MorningProvider } from '../provider.js'
import type { CreateSessionParams } from '@bizup-pay/core'
import createSessionResponse from '../__fixtures__/create-session-response.json'

function createMockHttpClient(responseBody: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
  })
}

const defaultConfig = {
  apiKey: 'test-key',
  apiSecret: 'test-secret',
  baseUrl: 'https://sandbox.d.greeninvoice.co.il/api/v1',
}

const defaultParams: CreateSessionParams = {
  amount: 100,
  currency: 'ILS',
  description: 'Order #1234',
  customer: {
    name: 'Israel Israeli',
    email: 'israel@example.com',
    phone: '+972-54-1234567',
    taxId: '0123456789',
    address: {
      street: '1 Rothschild Blvd',
      city: 'Tel Aviv',
      zip: '6688101',
      country: 'IL',
    },
  },
  successUrl: 'https://myshop.co.il/success',
  failureUrl: 'https://myshop.co.il/failure',
  webhookUrl: 'https://myshop.co.il/api/webhooks/payment',
  metadata: { orderId: 'order_456' },
  language: 'he',
}

describe('MorningProvider.createSession', () => {
  it('should send correct request to Morning API', async () => {
    const httpClient = createMockHttpClient(createSessionResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    await provider.createSession(defaultParams)

    expect(httpClient).toHaveBeenCalledOnce()
    const [url, options] = httpClient.mock.calls[0]

    expect(url).toBe(
      'https://sandbox.d.greeninvoice.co.il/api/v1/payments/form',
    )
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers['Authorization']).toContain('Bearer')

    const body = JSON.parse(options.body)
    expect(body.description).toBe('Order #1234')
    expect(body.type).toBe(320)
    expect(body.lang).toBe('he')
    expect(body.currency).toBe('ILS')
    expect(body.amount).toBe(100)
    expect(body.successUrl).toBe('https://myshop.co.il/success')
    expect(body.failureUrl).toBe('https://myshop.co.il/failure')
    expect(body.notifyUrl).toBe(
      'https://myshop.co.il/api/webhooks/payment',
    )
    expect(body.custom).toBe('{"orderId":"order_456"}')
    expect(body.client.name).toBe('Israel Israeli')
    expect(body.client.emails).toEqual(['israel@example.com'])
    expect(body.client.taxId).toBe('0123456789')
    expect(body.client.city).toBe('Tel Aviv')
    expect(body.income[0].price).toBe(100)
  })

  it('should return a BizupPaymentSession with pageUrl', async () => {
    const httpClient = createMockHttpClient(createSessionResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    const session = await provider.createSession(defaultParams)

    expect(session.provider).toBe('morning')
    expect(session.amount).toBe(100)
    expect(session.currency).toBe('ILS')
    expect(session.pageUrl).toBe(createSessionResponse.url)
    expect(session.status).toBe('pending')
    expect(session.successUrl).toBe('https://myshop.co.il/success')
    expect(session.webhookUrl).toBe(
      'https://myshop.co.il/api/webhooks/payment',
    )
    expect(session.metadata).toEqual({ orderId: 'order_456' })
  })

  it('should support installments via maxPayments', async () => {
    const httpClient = createMockHttpClient(createSessionResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    await provider.createSession({
      ...defaultParams,
      installments: { max: 12 },
    })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.maxPayments).toBe(12)
  })

  it('should default currency to ILS and language to he', async () => {
    const httpClient = createMockHttpClient(createSessionResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    await provider.createSession({
      amount: 50,
      description: 'Test',
      successUrl: 'https://example.com/ok',
      webhookUrl: 'https://example.com/wh',
    })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.currency).toBe('ILS')
    expect(body.lang).toBe('he')
  })

  it('should throw PROVIDER_ERROR on non-zero errorCode', async () => {
    const httpClient = createMockHttpClient({ errorCode: 5, url: '' })
    const provider = new MorningProvider(defaultConfig, httpClient)

    await expect(provider.createSession(defaultParams)).rejects.toThrow(
      'Morning createSession failed',
    )
  })

  it('should throw NETWORK_ERROR on fetch failure', async () => {
    const httpClient = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const provider = new MorningProvider(defaultConfig, httpClient)

    await expect(provider.createSession(defaultParams)).rejects.toThrow(
      'Network error',
    )
  })

  it('should throw INVALID_CONFIG if apiKey missing', () => {
    expect(
      () => new MorningProvider({ apiKey: '', apiSecret: 'secret' }),
    ).toThrow('apiKey and apiSecret')
  })
})
