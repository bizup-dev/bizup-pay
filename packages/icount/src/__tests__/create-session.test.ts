import { describe, it, expect, vi } from 'vitest'
import { IcountProvider } from '../provider.js'
import generateSaleResponse from '../__fixtures__/generate-sale-response.json'

function mockHttpClient(responses: Array<{ ok: boolean; status: number; data: unknown }>) {
  let callIndex = 0
  return vi.fn().mockImplementation(() => {
    const resp = responses[callIndex++] ?? responses[responses.length - 1]
    return Promise.resolve({
      ok: resp.ok,
      status: resp.status,
      json: () => Promise.resolve(resp.data),
    })
  })
}

const authResponse = { status: true, reason: 'OK', sid: 'test-sid-123' }

describe('IcountProvider.createSession', () => {
  it('authenticates and creates a payment session', async () => {
    const http = mockHttpClient([
      { ok: true, status: 200, data: authResponse },
      { ok: true, status: 200, data: generateSaleResponse },
    ])

    const provider = new IcountProvider({
      cid: 'test', accessToken: 'test-token', paypageId: 2,
    }, http)

    const session = await provider.createSession({
      amount: 79.90,
      currency: 'ILS',
      description: 'Test Order',
      successUrl: 'http://localhost/success',
      webhookUrl: 'http://localhost/webhook',
      customer: { name: 'Test User', email: 'test@test.com' },
    })

    expect(session.provider).toBe('icount')
    expect(session.amount).toBe(79.90)
    expect(session.pageUrl).toContain('icount.co.il')
    expect(session.id).toBe('c6934c17p2u69bc66a7')

    // Verify auth call used Bearer header
    expect(http).toHaveBeenCalledTimes(2)
    const authCall = http.mock.calls[0]
    expect(authCall[1].headers['Authorization']).toBe('Bearer test-token')

    // Verify generate_sale passed sid
    const saleCall = http.mock.calls[1]
    const saleBody = JSON.parse(saleCall[1].body)
    expect(saleBody.sid).toBe('test-sid-123')
    expect(saleBody.paypage_id).toBe(2)
    expect(saleBody.sum).toBe(79.90)
    expect(saleBody.client_name).toBe('Test User')
  })

  it('authenticates with user/pass when no token', async () => {
    const http = mockHttpClient([
      { ok: true, status: 200, data: authResponse },
      { ok: true, status: 200, data: generateSaleResponse },
    ])

    const provider = new IcountProvider({
      cid: 'test', user: 'api', pass: 'secret', paypageId: 2,
    }, http)

    await provider.createSession({
      amount: 100, description: 'Test', successUrl: 'http://x', webhookUrl: 'http://x',
    })

    const authBody = JSON.parse(http.mock.calls[0][1].body)
    expect(authBody.cid).toBe('test')
    expect(authBody.user).toBe('api')
    expect(authBody.pass).toBe('secret')
  })

  it('caches sid across calls', async () => {
    const http = mockHttpClient([
      { ok: true, status: 200, data: authResponse },
      { ok: true, status: 200, data: generateSaleResponse },
      { ok: true, status: 200, data: generateSaleResponse },
    ])

    const provider = new IcountProvider({
      cid: 'test', accessToken: 'tok', paypageId: 2,
    }, http)

    await provider.createSession({ amount: 10, description: 'A', successUrl: 'http://x', webhookUrl: 'http://x' })
    await provider.createSession({ amount: 20, description: 'B', successUrl: 'http://x', webhookUrl: 'http://x' })

    // Only 1 auth call + 2 sale calls = 3 total
    expect(http).toHaveBeenCalledTimes(3)
  })

  it('passes recurring hk_* params', async () => {
    const http = mockHttpClient([
      { ok: true, status: 200, data: authResponse },
      { ok: true, status: 200, data: generateSaleResponse },
    ])

    const provider = new IcountProvider({
      cid: 'test', accessToken: 'tok', paypageId: 2,
    }, http)

    await provider.createSession({
      amount: 99.90, description: 'Pro Plan', successUrl: 'http://x', webhookUrl: 'http://x',
      recurring: { interval: 'monthly', totalPayments: 12 },
    })

    const saleBody = JSON.parse(http.mock.calls[1][1].body)
    expect(saleBody.hk_issue_every).toBe(1)
    expect(saleBody.hk_payments).toBe(12)
  })

  it('throws on auth failure', async () => {
    const http = mockHttpClient([
      { ok: true, status: 200, data: { status: false, reason: 'invalid_credentials' } },
    ])

    const provider = new IcountProvider({
      cid: 'test', accessToken: 'bad-token', paypageId: 2,
    }, http)

    await expect(provider.createSession({
      amount: 10, description: 'Test', successUrl: 'http://x', webhookUrl: 'http://x',
    })).rejects.toThrow('iCount auth failed')
  })
})
