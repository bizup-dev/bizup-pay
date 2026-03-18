import { describe, it, expect, vi } from 'vitest'
import { MorningProvider } from '../provider.js'
import getDocumentResponse from '../__fixtures__/get-document-response.json'

const defaultConfig = {
  apiKey: 'test-key',
  apiSecret: 'test-secret',
  baseUrl: 'https://sandbox.d.greeninvoice.co.il/api/v1',
}

const creditNoteResponse = {
  id: 'cn-new-uuid-001',
  description: 'Credit note for 0042',
  type: 330,
  number: '0043',
  documentDate: '2026-03-18',
  creationDate: 1742313600,
  status: 0,
  lang: 'he',
  amount: 100,
  currency: 'ILS',
  vatType: 0,
  linkedDocuments: ['d290f1ee-6c54-4b01-90e6-d701748f0851'],
}

describe('MorningProvider.refund', () => {
  it('should fetch original document then create credit note', async () => {
    const httpClient = vi.fn().mockImplementation((url: string, options: { method: string }) => {
      if (options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(getDocumentResponse),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(creditNoteResponse),
      })
    })
    const provider = new MorningProvider(defaultConfig, httpClient)

    const refund = await provider.refund({
      transactionId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    })

    expect(httpClient).toHaveBeenCalledTimes(2)

    // First call: GET document
    expect(httpClient.mock.calls[0][1].method).toBe('GET')

    // Second call: POST credit note
    const [postUrl, postOptions] = httpClient.mock.calls[1]
    expect(postUrl).toContain('/documents')
    expect(postOptions.method).toBe('POST')

    const body = JSON.parse(postOptions.body)
    expect(body.type).toBe(330)
    expect(body.income[0].price).toBe(100)
  })

  it('should return BizupRefund on full refund', async () => {
    const httpClient = vi.fn().mockImplementation((_url: string, options: { method: string }) => {
      if (options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(getDocumentResponse),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(creditNoteResponse),
      })
    })
    const provider = new MorningProvider(defaultConfig, httpClient)

    const refund = await provider.refund({
      transactionId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    })

    expect(refund.id).toBe('cn-new-uuid-001')
    expect(refund.transactionId).toBe('d290f1ee-6c54-4b01-90e6-d701748f0851')
    expect(refund.amount).toBe(100)
    expect(refund.status).toBe('completed')
    expect(refund.createdAt).toBeInstanceOf(Date)
  })

  it('should support partial refund', async () => {
    const partialCreditNote = { ...creditNoteResponse, amount: 50 }
    const httpClient = vi.fn().mockImplementation((_url: string, options: { method: string }) => {
      if (options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(getDocumentResponse),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(partialCreditNote),
      })
    })
    const provider = new MorningProvider(defaultConfig, httpClient)

    const refund = await provider.refund({
      transactionId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
      amount: 50,
    })

    const body = JSON.parse(httpClient.mock.calls[1][1].body)
    expect(body.income[0].price).toBe(50)
    expect(refund.amount).toBe(50)
  })
})
