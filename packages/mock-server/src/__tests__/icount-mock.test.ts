import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { IcountMockServer } from '../icount-mock.js'
import { IcountProvider } from '@bizup-pay/icount'

describe('IcountMockServer', () => {
  let mock: IcountMockServer
  let provider: IcountProvider

  beforeAll(async () => {
    mock = new IcountMockServer({ port: 4311, autoComplete: true })
    await mock.start()

    provider = new IcountProvider({
      cid: 'mock',
      accessToken: 'mock-token',
      paypageId: 1,
      baseUrl: mock.baseUrl,
    })
  })

  afterAll(async () => {
    await mock.stop()
  })

  beforeEach(() => {
    mock.reset()
  })

  describe('createSession', () => {
    it('returns a payment session with page URL', async () => {
      const session = await provider.createSession({
        amount: 100,
        currency: 'ILS',
        description: 'Test Order',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
        customer: { name: 'Test User', email: 'test@test.com' },
      })

      expect(session.provider).toBe('icount')
      expect(session.amount).toBe(100)
      expect(session.pageUrl).toContain('http://localhost:4311/pay/')
      expect(session.status).toBe('pending')
    })

    it('auto-completes and stores transaction', async () => {
      await provider.createSession({
        amount: 250,
        currency: 'ILS',
        description: 'Auto test',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
      })

      const txs = mock.getTransactions()
      expect(txs).toHaveLength(1)
      expect(txs[0].amount).toBe(250)
      expect(txs[0].status).toBe('completed')
    })
  })

  describe('getTransaction', () => {
    it('retrieves transaction by ID', async () => {
      await provider.createSession({
        amount: 79.90,
        currency: 'ILS',
        description: 'T-Shirt',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
        customer: { name: 'John Doe', email: 'john@test.com' },
      })

      const txs = mock.getTransactions()
      const txId = txs[0].id

      const tx = await provider.getTransaction(txId)
      expect(tx.provider).toBe('icount')
      expect(tx.amount).toBe(79.90)
      expect(tx.status).toBe('approved')
      expect(tx.paymentMethod).toBe('credit_card')
    })
  })

  describe('refund', () => {
    it('refunds a transaction', async () => {
      await provider.createSession({
        amount: 200,
        currency: 'ILS',
        description: 'Refund test',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
      })

      const txs = mock.getTransactions()
      const txId = txs[0].id

      const refund = await provider.refund({ transactionId: txId })
      expect(refund.transactionId).toBe(txId)
      expect(refund.status).toBe('completed')
    })
  })

  describe('parseWebhook (IPN)', () => {
    it('parses a webhook payload from a completed payment', async () => {
      await provider.createSession({
        amount: 150,
        currency: 'ILS',
        description: 'Webhook test',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
        customer: { name: 'Webhook User' },
      })

      const txs = mock.getTransactions()
      const txId = txs[0].id
      const parts = txId.split('-')

      // Simulate an IPN payload the mock would send
      const ipnPayload = {
        sale_uniqid: 'test-sale-id',
        status: 'success',
        confirmation_code: '1234567',
        sum: 150,
        currency_code: 'ILS',
        client_name: 'Webhook User',
        doctype: parts[0],
        docnum: parseInt(parts[1], 10),
        cc_last4: '4580',
        cc_type: 'visa',
        num_of_payments: 1,
      }

      const event = await provider.parseWebhook(ipnPayload)
      expect(event.type).toBe('payment.completed')
      expect(event.transaction.amount).toBe(150)
      expect(event.transaction.provider).toBe('icount')
    })
  })

  describe('recurring payment', () => {
    it('creates a session with recurring params', async () => {
      const session = await provider.createSession({
        amount: 99.90,
        currency: 'ILS',
        description: 'Monthly subscription',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
        customer: { name: 'Subscriber' },
        recurring: {
          interval: 'monthly',
          totalPayments: 12,
          amount: 99.90,
        },
      })

      expect(session.provider).toBe('icount')
      expect(session.operation).toBe('charge_and_tokenize')
      expect(session.pageUrl).toContain('/pay/')

      const txs = mock.getTransactions()
      expect(txs).toHaveLength(1)
    })
  })

  describe('manual completion', () => {
    it('supports manually completing a payment', async () => {
      const manualMock = new IcountMockServer({ port: 4312, autoComplete: false })
      await manualMock.start()

      const manualProvider = new IcountProvider({
        cid: 'mock',
        accessToken: 'mock-token',
        paypageId: 1,
        baseUrl: manualMock.baseUrl,
      })

      const session = await manualProvider.createSession({
        amount: 500,
        currency: 'ILS',
        description: 'Manual test',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
      })

      expect(manualMock.getTransactions()).toHaveLength(0)

      const sessionId = session.pageUrl.split('/pay/')[1]
      const docId = manualMock.completePayment(sessionId, { cardNum: '9876', cardType: 'mastercard' })

      expect(docId).toBeTruthy()
      expect(manualMock.getTransactions()).toHaveLength(1)
      expect(manualMock.getTransactions()[0].cardType).toBe('mastercard')

      await manualMock.stop()
    })
  })

  describe('failure simulation', () => {
    it('simulates a failed payment', async () => {
      const failMock = new IcountMockServer({ port: 4313, autoComplete: false })
      await failMock.start()

      const failProvider = new IcountProvider({
        cid: 'mock',
        accessToken: 'mock-token',
        paypageId: 1,
        baseUrl: failMock.baseUrl,
      })

      const session = await failProvider.createSession({
        amount: 100,
        currency: 'ILS',
        description: 'Fail test',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
      })

      const sessionId = session.pageUrl.split('/pay/')[1]
      const docId = failMock.completePayment(sessionId, { fail: true })

      const tx = await failProvider.getTransaction(docId!)
      expect(tx.status).toBe('refunded') // cancelled docs map to refunded in icount mapper

      await failMock.stop()
    })
  })
})
