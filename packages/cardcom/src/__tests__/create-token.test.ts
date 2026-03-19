import { describe, it, expect, vi } from 'vitest'
import { CardcomProvider } from '../provider.js'
import type { CreateSessionParams } from '@bizup-pay/core'
import lowProfileResponse from '../__fixtures__/lowprofile-create-response.json'

function createMockHttpClient(responseBody: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
  })
}

const defaultConfig = {
  terminalNumber: 1000,
  apiName: 'TestApi',
  apiPassword: 'TestPassword',
  baseUrl: 'https://secure.cardcom.solutions/api/v11',
}

const defaultParams: CreateSessionParams = {
  amount: 0,
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

describe('CardcomProvider.createToken', () => {
  it('should send request to /LowProfile/Create with CreateTokenOnly operation', async () => {
    const httpClient = createMockHttpClient(lowProfileResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.createToken(defaultParams)

    expect(httpClient).toHaveBeenCalledOnce()
    const [url, options] = httpClient.mock.calls[0]

    expect(url).toBe(
      'https://secure.cardcom.solutions/api/v11/LowProfile/Create',
    )

    const body = JSON.parse(options.body)
    expect(body.Operation).toBe('CreateTokenOnly')
    expect(body.TerminalNumber).toBe(1000)
    expect(body.ApiName).toBe('TestApi')
    expect(body.WebHookUrl).toBe('https://myshop.co.il/api/webhooks/token')
    expect(body.ProductName).toBe('Token for subscription')
  })

  it('should return a BizupPaymentSession with pageUrl', async () => {
    const httpClient = createMockHttpClient(lowProfileResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    const session = await provider.createToken(defaultParams)

    expect(session.provider).toBe('cardcom')
    expect(session.pageUrl).toBe(lowProfileResponse.Url)
    expect(session.status).toBe('pending')
    expect(session.id).toBe(lowProfileResponse.LowProfileId)
  })

  it('should throw PROVIDER_ERROR on non-zero ResponseCode', async () => {
    const httpClient = createMockHttpClient({
      ResponseCode: 1,
      Description: 'Invalid terminal',
      LowProfileId: '',
      Url: '',
    })
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await expect(provider.createToken(defaultParams)).rejects.toThrow(
      'Cardcom LowProfile/Create failed',
    )
  })

  it('should throw NETWORK_ERROR on fetch failure', async () => {
    const httpClient = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await expect(provider.createToken(defaultParams)).rejects.toThrow(
      'Network error',
    )
  })
})
