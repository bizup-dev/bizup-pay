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
  description: 'Token for subscription',
  customer: {
    name: 'Israel Israeli',
    email: 'israel@example.com',
  },
  successUrl: 'https://myshop.co.il/success',
  webhookUrl: 'https://myshop.co.il/api/webhooks/token',
  metadata: { subscriptionId: 'sub_001' },
}

describe('MorningProvider.createToken', () => {
  it('should send request to /payments/form with type 320', async () => {
    const httpClient = createMockHttpClient(createSessionResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    await provider.createToken(defaultParams)

    expect(httpClient).toHaveBeenCalledOnce()
    const [url, options] = httpClient.mock.calls[0]

    expect(url).toBe(
      'https://sandbox.d.greeninvoice.co.il/api/v1/payments/form',
    )
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body.type).toBe(320)
    expect(body.amount).toBe(100)
    expect(body.description).toBe('Token for subscription')
    expect(body.notifyUrl).toBe('https://myshop.co.il/api/webhooks/token')
    expect(body.client.name).toBe('Israel Israeli')
  })

  it('should return a BizupPaymentSession with pageUrl', async () => {
    const httpClient = createMockHttpClient(createSessionResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    const session = await provider.createToken(defaultParams)

    expect(session.provider).toBe('morning')
    expect(session.amount).toBe(100)
    expect(session.currency).toBe('ILS')
    expect(session.pageUrl).toBe(createSessionResponse.url)
    expect(session.status).toBe('pending')
    expect(session.webhookUrl).toBe('https://myshop.co.il/api/webhooks/token')
  })

  it('should throw PROVIDER_ERROR on non-zero errorCode', async () => {
    const httpClient = createMockHttpClient({ errorCode: 5, url: '' })
    const provider = new MorningProvider(defaultConfig, httpClient)

    await expect(provider.createToken(defaultParams)).rejects.toThrow(
      'Morning createSession failed',
    )
  })

  it('should throw NETWORK_ERROR on fetch failure', async () => {
    const httpClient = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const provider = new MorningProvider(defaultConfig, httpClient)

    await expect(provider.createToken(defaultParams)).rejects.toThrow(
      'Network error',
    )
  })
})
