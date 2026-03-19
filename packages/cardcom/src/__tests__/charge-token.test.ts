import { describe, it, expect, vi } from 'vitest'
import { CardcomProvider } from '../provider.js'
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
  terminalNumber: 1000,
  apiName: 'TestApi',
  apiPassword: 'TestPassword',
  baseUrl: 'https://secure.cardcom.solutions/api/v11',
}

const defaultParams: ChargeTokenParams = {
  tokenId: '84cc1f4f-c089-410b-9f93-6437ac9abba6',
  amount: 50,
  currency: 'ILS',
  description: 'Monthly subscription charge',
}

describe('CardcomProvider.chargeToken', () => {
  it('should send POST to /Transactions/Transaction with token', async () => {
    const httpClient = createMockHttpClient(chargeTokenResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.chargeToken(defaultParams)

    expect(httpClient).toHaveBeenCalledOnce()
    const [url, options] = httpClient.mock.calls[0]

    expect(url).toBe(
      'https://secure.cardcom.solutions/api/v11/Transactions/Transaction',
    )
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body.TerminalNumber).toBe(1000)
    expect(body.ApiName).toBe('TestApi')
    expect(body.Amount).toBe(50)
    expect(body.Token).toBe('84cc1f4f-c089-410b-9f93-6437ac9abba6')
    expect(body.ISOCoinId).toBe(1)
  })

  it('should return a BizupTransaction on success', async () => {
    const httpClient = createMockHttpClient(chargeTokenResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    const tx = await provider.chargeToken(defaultParams)

    expect(tx.id).toBe(String(chargeTokenResponse.InternalDealNumber))
    expect(tx.providerTransactionId).toBe(String(chargeTokenResponse.InternalDealNumber))
    expect(tx.provider).toBe('cardcom')
    expect(tx.amount).toBe(50)
    expect(tx.status).toBe('approved')
    expect(tx.paymentMethod).toBe('credit_card')
    expect(tx.raw).toBeTruthy()
  })

  it('should support installments via NumOfPayments', async () => {
    const httpClient = createMockHttpClient(chargeTokenResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.chargeToken({
      ...defaultParams,
      installments: 3,
    })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.NumOfPayments).toBe(3)
  })

  it('should map currency to ISOCoinId', async () => {
    const httpClient = createMockHttpClient(chargeTokenResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.chargeToken({
      ...defaultParams,
      currency: 'USD',
    })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.ISOCoinId).toBe(2)
  })

  it('should default currency to ILS', async () => {
    const httpClient = createMockHttpClient(chargeTokenResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.chargeToken({
      tokenId: 'some-token',
      amount: 25,
      description: 'Charge',
    })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.ISOCoinId).toBe(1)
  })

  it('should throw PROVIDER_ERROR on API error status', async () => {
    const httpClient = createMockHttpClient({}, 400)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await expect(provider.chargeToken(defaultParams)).rejects.toThrow(
      'Cardcom API error',
    )
  })

  it('should throw TOKEN_FAILED on non-zero ResponseCode', async () => {
    const httpClient = createMockHttpClient({
      ResponseCode: 1,
      Description: 'Token expired',
    })
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await expect(provider.chargeToken(defaultParams)).rejects.toThrow(
      'Cardcom token charge failed',
    )
  })

  it('should throw NETWORK_ERROR on fetch failure', async () => {
    const httpClient = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await expect(provider.chargeToken(defaultParams)).rejects.toThrow(
      'Network error',
    )
  })
})
