import { describe, it, expect, vi } from 'vitest'
import { MorningProvider } from '../provider.js'
import getDocumentResponse from '../__fixtures__/get-document-response.json'
import downloadLinksResponse from '../__fixtures__/download-links-response.json'

function createMockHttpClient(responses: Record<string, unknown>) {
  return vi.fn().mockImplementation((url: string) => {
    for (const [pattern, body] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(body),
        })
      }
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'not found' }),
    })
  })
}

const defaultConfig = {
  apiKey: 'test-key',
  apiSecret: 'test-secret',
  baseUrl: 'https://sandbox.d.greeninvoice.co.il/api/v1',
}

describe('MorningProvider.getTransaction', () => {
  it('should fetch document and download links', async () => {
    const docId = 'd290f1ee-6c54-4b01-90e6-d701748f0851'
    const httpClient = createMockHttpClient({
      [`/documents/${docId}/download/links`]: downloadLinksResponse,
      [`/documents/${docId}`]: getDocumentResponse,
    })
    const provider = new MorningProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction(docId)

    expect(httpClient).toHaveBeenCalledTimes(2)
  })

  it('should map Morning document to BizupTransaction', async () => {
    const docId = 'd290f1ee-6c54-4b01-90e6-d701748f0851'
    const httpClient = createMockHttpClient({
      [`/documents/${docId}/download/links`]: downloadLinksResponse,
      [`/documents/${docId}`]: getDocumentResponse,
    })
    const provider = new MorningProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction(docId)

    expect(tx.id).toBe(docId)
    expect(tx.providerTransactionId).toBe(docId)
    expect(tx.provider).toBe('morning')
    expect(tx.amount).toBe(100)
    expect(tx.currency).toBe('ILS')
    expect(tx.status).toBe('approved')
    expect(tx.paymentMethod).toBe('credit_card')
    expect(tx.cardBrand).toBe('visa')
    expect(tx.cardLastFour).toBe('1234')
    expect(tx.installments).toBe(1)
  })

  it('should include document URL from download links', async () => {
    const docId = 'd290f1ee-6c54-4b01-90e6-d701748f0851'
    const httpClient = createMockHttpClient({
      [`/documents/${docId}/download/links`]: downloadLinksResponse,
      [`/documents/${docId}`]: getDocumentResponse,
    })
    const provider = new MorningProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction(docId)

    expect(tx.documentUrl).toBe(downloadLinksResponse.origin)
  })

  it('should map customer fields correctly', async () => {
    const docId = 'd290f1ee-6c54-4b01-90e6-d701748f0851'
    const httpClient = createMockHttpClient({
      [`/documents/${docId}/download/links`]: downloadLinksResponse,
      [`/documents/${docId}`]: getDocumentResponse,
    })
    const provider = new MorningProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction(docId)

    expect(tx.customer?.name).toBe('Israel Israeli')
    expect(tx.customer?.email).toBe('israel@example.com')
    expect(tx.customer?.phone).toBe('+972-54-1234567')
    expect(tx.customer?.taxId).toBe('0123456789')
    expect(tx.customer?.address?.city).toBe('Tel Aviv')
    expect(tx.customer?.address?.country).toBe('IL')
  })

  it('should populate Morning-specific extras', async () => {
    const docId = 'd290f1ee-6c54-4b01-90e6-d701748f0851'
    const httpClient = createMockHttpClient({
      [`/documents/${docId}/download/links`]: downloadLinksResponse,
      [`/documents/${docId}`]: getDocumentResponse,
    })
    const provider = new MorningProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction(docId)

    expect(tx.morning).toBeDefined()
    expect(tx.morning?.documentId).toBe(docId)
    expect(tx.morning?.documentType).toBe(320)
    expect(tx.morning?.documentNumber).toBe('0042')
    expect(tx.morning?.vatType).toBe(0)
    expect(tx.morning?.linkedDocuments).toEqual([])
  })

  it('should preserve raw response', async () => {
    const docId = 'd290f1ee-6c54-4b01-90e6-d701748f0851'
    const httpClient = createMockHttpClient({
      [`/documents/${docId}/download/links`]: downloadLinksResponse,
      [`/documents/${docId}`]: getDocumentResponse,
    })
    const provider = new MorningProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction(docId)

    expect(tx.raw).toEqual(getDocumentResponse)
  })

  it('should handle missing download links gracefully', async () => {
    const docId = 'd290f1ee-6c54-4b01-90e6-d701748f0851'
    const httpClient = vi.fn().mockImplementation((url: string) => {
      if (url.includes('download/links')) {
        return Promise.reject(new Error('not found'))
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(getDocumentResponse),
      })
    })
    const provider = new MorningProvider(defaultConfig, httpClient)

    const tx = await provider.getTransaction(docId)

    expect(tx.documentUrl).toBeUndefined()
    expect(tx.amount).toBe(100)
  })
})
