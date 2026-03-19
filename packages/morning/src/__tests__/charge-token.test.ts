import { describe, it, expect, vi } from 'vitest'
import { MorningProvider } from '../provider.js'
import type { ChargeTokenParams } from '@bizup-pay/core'
import chargeTokenResponse from '../__fixtures__/charge-token-response.json'

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

const defaultParams: ChargeTokenParams = {
  tokenId: 'da5d064b-aac7-fcb4-45e9-c1123b3899d2',
  amount: 50,
  currency: 'ILS',
  description: 'Monthly subscription charge',
  vatType: 0,
}

describe('MorningProvider.chargeToken', () => {
  it('should send POST to /payments/tokens/{id}/charge', async () => {
    const httpClient = createMockHttpClient(chargeTokenResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    await provider.chargeToken(defaultParams)

    expect(httpClient).toHaveBeenCalledOnce()
    const [url, options] = httpClient.mock.calls[0]

    expect(url).toBe(
      'https://sandbox.d.greeninvoice.co.il/api/v1/payments/tokens/da5d064b-aac7-fcb4-45e9-c1123b3899d2/charge',
    )
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(options.body)
    expect(body.type).toBe(320)
    expect(body.lang).toBe('he')
    expect(body.currency).toBe('ILS')
    expect(body.vatType).toBe(0)
    expect(body.amount).toBe(50)
    expect(body.description).toBe('Monthly subscription charge')
  })

  it('should return a BizupTransaction on success', async () => {
    const httpClient = createMockHttpClient(chargeTokenResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    const tx = await provider.chargeToken(defaultParams)

    expect(tx.id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(tx.provider).toBe('morning')
    expect(tx.amount).toBe(50)
    expect(tx.currency).toBe('ILS')
    expect(tx.status).toBe('approved')
    expect(tx.paymentMethod).toBe('credit_card')
    expect(tx.cardLastFour).toBe('4567')
    expect(tx.cardBrand).toBe('visa')
    expect(tx.morning?.documentId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(tx.morning?.documentType).toBe(320)
    expect(tx.raw).toBeTruthy()
  })

  it('should default currency to ILS and vatType to 0', async () => {
    const httpClient = createMockHttpClient(chargeTokenResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    await provider.chargeToken({
      tokenId: 'some-token-id',
      amount: 25,
      description: 'Charge',
    })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.currency).toBe('ILS')
    expect(body.vatType).toBe(0)
    expect(body.lang).toBe('he')
  })

  it('should support installments via maxPayments', async () => {
    const httpClient = createMockHttpClient(chargeTokenResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    await provider.chargeToken({
      ...defaultParams,
      installments: 3,
    })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.maxPayments).toBe(3)
  })

  it('should include income array matching description and amount', async () => {
    const httpClient = createMockHttpClient(chargeTokenResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    await provider.chargeToken(defaultParams)

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.income).toEqual([
      {
        description: 'Monthly subscription charge',
        quantity: 1,
        price: 50,
        currency: 'ILS',
        vatType: 0,
      },
    ])
  })

  it('should throw PROVIDER_ERROR on API error', async () => {
    const httpClient = createMockHttpClient({}, 400)
    const provider = new MorningProvider(defaultConfig, httpClient)

    await expect(provider.chargeToken(defaultParams)).rejects.toThrow(
      'Morning API error',
    )
  })

  it('should throw NETWORK_ERROR on fetch failure', async () => {
    const httpClient = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const provider = new MorningProvider(defaultConfig, httpClient)

    await expect(provider.chargeToken(defaultParams)).rejects.toThrow(
      'Network error',
    )
  })

  it('should include notifyUrl when webhookUrl is provided', async () => {
    const httpClient = createMockHttpClient(chargeTokenResponse)
    const provider = new MorningProvider(defaultConfig, httpClient)

    await provider.chargeToken({
      ...defaultParams,
      webhookUrl: 'https://myshop.co.il/api/webhooks/charge',
    })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.notifyUrl).toBe('https://myshop.co.il/api/webhooks/charge')
  })
})
