import { describe, it, expect, vi } from 'vitest'
import { CardcomProvider } from '../provider.js'
import { BizupPayError } from '@bizup-pay/core'
import refundResponse from '../__fixtures__/refund-response.json'

function createMockHttpClient(responseBody: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(responseBody),
  })
}

const defaultConfig = {
  terminalNumber: 1000,
  apiName: 'TestApiName',
  apiPassword: 'TestApiPassword',
  baseUrl: 'https://secure.cardcom.solutions/api/v11',
}

describe('CardcomProvider.refund', () => {
  it('should send correct request to RefundByTransactionId', async () => {
    const httpClient = createMockHttpClient(refundResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.refund({ transactionId: '219282004' })

    const [url, options] = httpClient.mock.calls[0]
    expect(url).toContain('/Transactions/RefundByTransactionId')

    const body = JSON.parse(options.body)
    expect(body.ApiName).toBe('TestApiName')
    expect(body.ApiPassword).toBe('TestApiPassword')
    expect(body.TransactionId).toBe(219282004)
  })

  it('should return BizupRefund on success', async () => {
    const httpClient = createMockHttpClient(refundResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    const refund = await provider.refund({ transactionId: '219282004' })

    expect(refund.id).toBe('219282005')
    expect(refund.transactionId).toBe('219282004')
    expect(refund.status).toBe('completed')
    expect(refund.createdAt).toBeInstanceOf(Date)
  })

  it('should support partial refund with PartialSum', async () => {
    const httpClient = createMockHttpClient(refundResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.refund({
      transactionId: '219282004',
      amount: 5.25,
    })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.PartialSum).toBe(5.25)
  })

  it('should not send PartialSum for full refund', async () => {
    const httpClient = createMockHttpClient(refundResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.refund({ transactionId: '219282004' })

    const body = JSON.parse(httpClient.mock.calls[0][1].body)
    expect(body.PartialSum).toBeUndefined()
  })

  it('should throw REFUND_FAILED on non-zero ResponseCode', async () => {
    const httpClient = createMockHttpClient({
      ResponseCode: 1,
      Description: 'Refund not allowed',
    })
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await expect(
      provider.refund({ transactionId: '219282004' }),
    ).rejects.toThrow(BizupPayError)

    try {
      await provider.refund({ transactionId: '219282004' })
    } catch (error) {
      expect((error as BizupPayError).code).toBe('REFUND_FAILED')
    }
  })
})
