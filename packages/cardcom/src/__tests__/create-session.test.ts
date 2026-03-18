import { describe, it, expect, vi } from 'vitest'
import { CardcomProvider } from '../provider.js'
import type { CreateSessionParams } from '@bizup-pay/core'
import createResponse from '../__fixtures__/lowprofile-create-response.json'

function createMockHttpClient(responseBody: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
  })
}

const defaultConfig = {
  terminalNumber: 1000,
  apiName: 'TestApiName',
  apiPassword: 'TestApiPassword',
  baseUrl: 'https://secure.cardcom.solutions/api/v11',
}

const defaultParams: CreateSessionParams = {
  amount: 10.5,
  currency: 'ILS',
  description: 'Premium Package',
  customer: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+972-54-1234567',
  },
  successUrl: 'https://myshop.co.il/success',
  failureUrl: 'https://myshop.co.il/failure',
  cancelUrl: 'https://myshop.co.il/cancel',
  webhookUrl: 'https://myshop.co.il/api/webhooks/payment',
  metadata: { orderId: 'order_456' },
  language: 'en',
}

describe('CardcomProvider.createSession', () => {
  it('should send correct request to Cardcom LowProfile/Create', async () => {
    const httpClient = createMockHttpClient(createResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.createSession(defaultParams)

    expect(httpClient).toHaveBeenCalledOnce()
    const [url, options] = httpClient.mock.calls[0]

    expect(url).toBe(
      'https://secure.cardcom.solutions/api/v11/LowProfile/Create',
    )
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body.TerminalNumber).toBe(1000)
    expect(body.ApiName).toBe('TestApiName')
    expect(body.Amount).toBe(10.5)
    expect(body.SuccessRedirectUrl).toBe('https://myshop.co.il/success')
    expect(body.FailedRedirectUrl).toBe('https://myshop.co.il/failure')
    expect(body.WebHookUrl).toBe(
      'https://myshop.co.il/api/webhooks/payment',
    )
    expect(body.CancelRedirectUrl).toBe('https://myshop.co.il/cancel')
    expect(body.Operation).toBe('ChargeOnly')
    expect(body.Language).toBe('en')
    expect(body.ISOCoinId).toBe(1)
    expect(body.ProductName).toBe('Premium Package')
    expect(body.ReturnValue).toBe('{"orderId":"order_456"}')
    expect(body.Document.Name).toBe('John Doe')
    expect(body.Document.Email).toBe('john@example.com')
  })

  it('should return BizupPaymentSession with pageUrl and lowProfileId', async () => {
    const httpClient = createMockHttpClient(createResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    const session = await provider.createSession(defaultParams)

    expect(session.id).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(session.provider).toBe('cardcom')
    expect(session.amount).toBe(10.5)
    expect(session.currency).toBe('ILS')
    expect(session.pageUrl).toBe(createResponse.Url)
    expect(session.status).toBe('pending')
    expect(session.metadata).toEqual({ orderId: 'order_456' })
  })

  it('should support installments via MaxPayments', async () => {
    const httpClient = createMockHttpClient(createResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.createSession({
      ...defaultParams,
      installments: { max: 6 },
    })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.MaxPayments).toBe(6)
  })

  it('should throw PROVIDER_ERROR on non-zero ResponseCode', async () => {
    const httpClient = createMockHttpClient({
      ResponseCode: 1,
      Description: 'Invalid Terminal',
    })
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await expect(provider.createSession(defaultParams)).rejects.toThrow(
      'Cardcom LowProfile/Create failed',
    )
  })

  it('should throw NETWORK_ERROR on fetch failure', async () => {
    const httpClient = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await expect(provider.createSession(defaultParams)).rejects.toThrow(
      'Network error',
    )
  })

  it('should throw INVALID_CONFIG if terminalNumber missing', () => {
    expect(
      () =>
        new CardcomProvider({
          terminalNumber: 0,
          apiName: 'test',
          apiPassword: 'test',
        }),
    ).toThrow('terminalNumber')
  })

  it('should use USD coin ID for USD currency', async () => {
    const httpClient = createMockHttpClient(createResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.createSession({ ...defaultParams, currency: 'USD' })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.ISOCoinId).toBe(2)
  })
})
