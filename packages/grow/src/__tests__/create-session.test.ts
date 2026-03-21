import { describe, it, expect, vi } from 'vitest'
import { GrowProvider } from '../provider.js'
import createPaymentResponse from '../__fixtures__/create-payment-response.json'

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

describe('GrowProvider.createSession', () => {
  it('creates a payment session with form-encoded body', async () => {
    const http = mockHttpClient([
      { ok: true, status: 200, data: createPaymentResponse },
    ])

    const provider = new GrowProvider({
      pageCode: 'my-page-code',
      userId: 'user-123',
    }, http)

    const session = await provider.createSession({
      amount: 149.90,
      currency: 'ILS',
      description: 'Premium Plan',
      successUrl: 'http://localhost/success',
      webhookUrl: 'http://localhost/webhook',
      customer: { name: 'Avi Cohen', email: 'avi@example.com', phone: '052-9876543' },
    })

    expect(session.provider).toBe('grow')
    expect(session.amount).toBe(149.90)
    expect(session.pageUrl).toContain('meshulam.co.il')
    expect(session.id).toBe('88501')
    expect(session.token).toBe('proc-tok-abc123')
    expect(session.status).toBe('pending')

    // Verify request was form-encoded
    expect(http).toHaveBeenCalledTimes(1)
    const call = http.mock.calls[0]
    expect(call[1].headers['Content-Type']).toBe('application/x-www-form-urlencoded')

    // Parse the form body
    const body = new URLSearchParams(call[1].body)
    expect(body.get('pageCode')).toBe('my-page-code')
    expect(body.get('userId')).toBe('user-123')
    expect(body.get('sum')).toBe('149.9')
    expect(body.get('description')).toBe('Premium Plan')
    expect(body.get('pageField[fullName]')).toBe('Avi Cohen')
    expect(body.get('pageField[email]')).toBe('avi@example.com')
    expect(body.get('pageField[phone]')).toBe('052-9876543')
    expect(body.get('notifyUrl')).toBe('http://localhost/webhook')
    expect(body.get('successUrl')).toBe('http://localhost/success')
  })

  it('sends cancelUrl from failureUrl when cancelUrl not provided', async () => {
    const http = mockHttpClient([
      { ok: true, status: 200, data: createPaymentResponse },
    ])

    const provider = new GrowProvider({
      pageCode: 'pc', userId: 'u1',
    }, http)

    await provider.createSession({
      amount: 50,
      description: 'Test',
      successUrl: 'http://x/success',
      failureUrl: 'http://x/fail',
      webhookUrl: 'http://x/webhook',
    })

    const body = new URLSearchParams(http.mock.calls[0][1].body)
    expect(body.get('cancelUrl')).toBe('http://x/fail')
  })

  it('sets saveCardToken=1 for recurring', async () => {
    const http = mockHttpClient([
      { ok: true, status: 200, data: createPaymentResponse },
    ])

    const provider = new GrowProvider({
      pageCode: 'pc', userId: 'u1',
    }, http)

    const session = await provider.createSession({
      amount: 99.90,
      description: 'Pro Plan',
      successUrl: 'http://x',
      webhookUrl: 'http://x',
      recurring: { interval: 'monthly', totalPayments: 12 },
    })

    const body = new URLSearchParams(http.mock.calls[0][1].body)
    expect(body.get('saveCardToken')).toBe('1')
    expect(session.operation).toBe('charge_and_tokenize')
  })

  it('maps metadata to cField1-cField9', async () => {
    const http = mockHttpClient([
      { ok: true, status: 200, data: createPaymentResponse },
    ])

    const provider = new GrowProvider({
      pageCode: 'pc', userId: 'u1',
    }, http)

    await provider.createSession({
      amount: 10,
      description: 'Test',
      successUrl: 'http://x',
      webhookUrl: 'http://x',
      metadata: { orderId: 'order-42', source: 'web' },
    })

    const body = new URLSearchParams(http.mock.calls[0][1].body)
    expect(body.get('cField1')).toBe('order-42')
    expect(body.get('cField2')).toBe('web')
  })

  it('throws on API error', async () => {
    const http = mockHttpClient([
      { ok: true, status: 200, data: { status: 0, data: null } },
    ])

    const provider = new GrowProvider({
      pageCode: 'pc', userId: 'u1',
    }, http)

    await expect(provider.createSession({
      amount: 10, description: 'Test', successUrl: 'http://x', webhookUrl: 'http://x',
    })).rejects.toThrow('Grow API error')
  })

  it('throws on missing config', () => {
    expect(() => new GrowProvider({ pageCode: '', userId: 'u' })).toThrow('requires pageCode')
    expect(() => new GrowProvider({ pageCode: 'p', userId: '' })).toThrow('requires userId')
  })
})
