import { describe, it, expect, vi } from 'vitest'
import { IcountProvider } from '../provider.js'
import docInfoResponse from '../__fixtures__/doc-info-response.json'

const authResponse = { status: true, reason: 'OK', sid: 'test-sid' }

function mockHttp(responses: Array<{ ok: boolean; status: number; data: unknown }>) {
  let i = 0
  return vi.fn().mockImplementation(() => {
    const r = responses[i++] ?? responses[responses.length - 1]
    return Promise.resolve({ ok: r.ok, status: r.status, json: () => Promise.resolve(r.data) })
  })
}

describe('IcountProvider.getTransaction', () => {
  it('retrieves a transaction by doctype-docnum', async () => {
    const http = mockHttp([
      { ok: true, status: 200, data: authResponse },
      { ok: true, status: 200, data: docInfoResponse },
    ])

    const provider = new IcountProvider({
      cid: 'test', accessToken: 'tok', paypageId: 2,
    }, http)

    const tx = await provider.getTransaction('invrec-1001')

    expect(tx.provider).toBe('icount')
    expect(tx.amount).toBe(79.90)
    expect(tx.status).toBe('approved')
    expect(tx.cardLastFour).toBe('0000')
    expect(tx.customer?.name).toBe('Israel Israeli')
    expect(tx.documentUrl).toContain('pdf')
    expect(tx.icount?.doctype).toBe('invrec')
    expect(tx.icount?.docnum).toBe(1001)
    expect(tx.icount?.confirmationCode).toBe('0077456')
  })

  it('parses plain docnum as invrec', async () => {
    const http = mockHttp([
      { ok: true, status: 200, data: authResponse },
      { ok: true, status: 200, data: docInfoResponse },
    ])

    const provider = new IcountProvider({
      cid: 'test', accessToken: 'tok', paypageId: 2,
    }, http)

    await provider.getTransaction('1001')

    const body = JSON.parse(http.mock.calls[1][1].body)
    expect(body.doctype).toBe('invrec')
    expect(body.docnum).toBe(1001)
  })

  it('throws when document not found', async () => {
    const http = mockHttp([
      { ok: true, status: 200, data: authResponse },
      { ok: true, status: 200, data: { status: true, reason: 'OK' } },
    ])

    const provider = new IcountProvider({
      cid: 'test', accessToken: 'tok', paypageId: 2,
    }, http)

    await expect(provider.getTransaction('invrec-9999')).rejects.toThrow('not found')
  })
})
