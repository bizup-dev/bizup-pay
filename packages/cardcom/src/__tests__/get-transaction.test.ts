import { describe, it, expect, vi } from 'vitest'
import { CardcomProvider } from '../provider.js'
import { BizupPayError } from '@bizup-pay/core'
import transactionInfoResponse from '../__fixtures__/transaction-info-response.json'

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

describe('CardcomProvider.getTransaction', () => {
  it('should send correct request to GetTransactionInfoById', async () => {
    const httpClient = createMockHttpClient(transactionInfoResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await provider.getTransaction('219282004')

    const [url, options] = httpClient.mock.calls[0]
    expect(url).toContain('/Transactions/GetTransactionInfoById')

    const body = JSON.parse(options.body)
    expect(body.TerminalNumber).toBe(1000)
    expect(body.UserName).toBe('TestApiName')
    expect(body.UserPassword).toBe('TestApiPassword')
    expect(body.InternalDealNumber).toBe(219282004)
  })

  it('should map Cardcom response to BizupTransaction', async () => {
    const httpClient = createMockHttpClient(transactionInfoResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction('219282004')

    expect(tx.id).toBe('219282004')
    expect(tx.providerTransactionId).toBe('219282004')
    expect(tx.provider).toBe('cardcom')
    expect(tx.amount).toBe(10.5)
    expect(tx.status).toBe('approved')
    expect(tx.paymentMethod).toBe('credit_card')
    expect(tx.cardBrand).toBe('visa')
    expect(tx.cardLastFour).toBe('1111')
    expect(tx.installments).toBe(1)
  })

  it('should map customer fields', async () => {
    const httpClient = createMockHttpClient(transactionInfoResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction('219282004')

    expect(tx.customer?.name).toBe('John Doe')
    expect(tx.customer?.email).toBe('john@example.com')
    expect(tx.customer?.phone).toBe('+972-54-1234567')
    expect(tx.customer?.taxId).toBe('123456789')
  })

  it('should populate Cardcom-specific extras', async () => {
    const httpClient = createMockHttpClient(transactionInfoResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction('219282004')

    expect(tx.cardcom).toBeDefined()
    expect(tx.cardcom?.approvalNumber).toBe('0077123')
    expect(tx.cardcom?.token).toBe('tok-550e8400-e29b-41d4')
  })

  it('should map document URL from transaction info', async () => {
    const httpClient = createMockHttpClient(transactionInfoResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction('219282004')

    expect(tx.documentUrl).toBe('https://secure.cardcom.solutions/docs/50004.pdf')
  })

  it('should preserve raw response', async () => {
    const httpClient = createMockHttpClient(transactionInfoResponse)
    const provider = new CardcomProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction('219282004')

    expect(tx.raw).toEqual(transactionInfoResponse[0])
  })

  it('should throw TRANSACTION_NOT_FOUND for empty response', async () => {
    const httpClient = createMockHttpClient([])
    const provider = new CardcomProvider(defaultConfig, httpClient)

    await expect(provider.getTransaction('999')).rejects.toThrow(
      BizupPayError,
    )

    try {
      await provider.getTransaction('999')
    } catch (error) {
      expect((error as BizupPayError).code).toBe('TRANSACTION_NOT_FOUND')
    }
  })
})
