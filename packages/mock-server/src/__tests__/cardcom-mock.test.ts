import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { CardcomMockServer } from '../cardcom-mock.js'
import { CardcomProvider } from '@bizup-pay/cardcom'

describe('CardcomMockServer', () => {
  let mock: CardcomMockServer
  let provider: CardcomProvider

  beforeAll(async () => {
    mock = new CardcomMockServer({ port: 4211, autoComplete: true })
    await mock.start()

    provider = new CardcomProvider({
      terminalNumber: 1000,
      apiName: 'test-api',
      apiPassword: 'test-pass',
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

      expect(session.provider).toBe('cardcom')
      expect(session.amount).toBe(100)
      expect(session.pageUrl).toContain('http://localhost:4211/pay/')
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
      expect(tx.provider).toBe('cardcom')
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

  describe('recurring payment', () => {
    it('creates a session with recurring/token flags', async () => {
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

      expect(session.provider).toBe('cardcom')
      expect(session.operation).toBe('charge_and_tokenize')
      expect(session.pageUrl).toContain('/pay/')

      const txs = mock.getTransactions()
      expect(txs).toHaveLength(1)
    })

    it('generates token for recurring sessions', async () => {
      const manualMock = new CardcomMockServer({ port: 4212, autoComplete: false })
      await manualMock.start()

      const manualProvider = new CardcomProvider({
        terminalNumber: 1000,
        apiName: 'test',
        apiPassword: 'test',
        baseUrl: manualMock.baseUrl,
      })

      const session = await manualProvider.createSession({
        amount: 49.90,
        currency: 'ILS',
        description: 'Plan Pro',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
        recurring: {
          interval: 'monthly',
          amount: 49.90,
        },
      })

      const sessionId = session.id
      const txId = manualMock.completePayment(sessionId)
      expect(txId).toBeTruthy()

      await manualMock.stop()
    })
  })

  describe('failure simulation', () => {
    it('simulates a failed payment', async () => {
      const failMock = new CardcomMockServer({ port: 4213, autoComplete: false })
      await failMock.start()

      const failProvider = new CardcomProvider({
        terminalNumber: 1000,
        apiName: 'test',
        apiPassword: 'test',
        baseUrl: failMock.baseUrl,
      })

      const session = await failProvider.createSession({
        amount: 100,
        currency: 'ILS',
        description: 'Fail test',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
      })

      const txId = failMock.completePayment(session.id, { fail: true })
      const tx = await failProvider.getTransaction(String(txId))
      expect(tx.status).toBe('declined')

      await failMock.stop()
    })
  })
})
