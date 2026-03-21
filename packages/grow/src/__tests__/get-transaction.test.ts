import { describe, it, expect, vi } from 'vitest'
import { GrowProvider } from '../provider.js'
import transactionInfoResponse from '../__fixtures__/transaction-info-response.json'

function mockHttp(responses: Array<{ ok: boolean; status: number; data: unknown }>) {
  let i = 0
  return vi.fn().mockImplementation(() => {
    const r = responses[i++] ?? responses[responses.length - 1]
    return Promise.resolve({ ok: r.ok, status: r.status, json: () => Promise.resolve(r.data) })
  })
}

describe('GrowProvider.getTransaction', () => {
  it('retrieves a transaction by id:token format', async () => {
    const http = mockHttp([
      { ok: true, status: 200, data: transactionInfoResponse },
    ])

    const provider = new GrowProvider({
      pageCode: 'my-page', userId: 'u1',
    }, http)

    const tx = await provider.getTransaction('77201:txn-tok-xyz789')

    expect(tx.provider).toBe('grow')
    expect(tx.amount).toBe(149.90)
    expect(tx.status).toBe('approved')
    expect(tx.cardLastFour).toBe('4580')
    expect(tx.cardBrand).toBe('visa')
    expect(tx.customer?.name).toBe('Avi Cohen')
    expect(tx.customer?.email).toBe('avi@example.com')
    expect(tx.grow?.processId).toBe(88501)
    expect(tx.grow?.asmachta).toBe('0098765')
    expect(tx.grow?.cardTypeCode).toBe(3)
    expect(tx.grow?.customFields).toEqual({ cField1: 'order-42' })

    // Verify form-encoded request
    const body = new URLSearchParams(http.mock.calls[0][1].body)
    expect(body.get('pageCode')).toBe('my-page')
    expect(body.get('transactionId')).toBe('77201')
    expect(body.get('transactionToken')).toBe('txn-tok-xyz789')
  })

  it('throws on invalid id format (missing token)', async () => {
    const provider = new GrowProvider({
      pageCode: 'pc', userId: 'u1',
    })

    await expect(provider.getTransaction('77201')).rejects.toThrow('transactionId:transactionToken')
  })
})
