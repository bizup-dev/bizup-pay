import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { MorningMockServer } from '../morning-mock.js'
import { MorningProvider } from '@bizup-pay/morning'

describe('MorningMockServer', () => {
  let mock: MorningMockServer
  let provider: MorningProvider

  beforeAll(async () => {
    mock = new MorningMockServer({ port: 4111, autoComplete: true })
    await mock.start()

    provider = new MorningProvider({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
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
    it('returns a payment session with a page URL', async () => {
      const session = await provider.createSession({
        amount: 100,
        currency: 'ILS',
        description: 'Test Order',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
        customer: { name: 'Test User', email: 'test@test.com' },
      })

      expect(session.provider).toBe('morning')
      expect(session.amount).toBe(100)
      expect(session.currency).toBe('ILS')
      expect(session.pageUrl).toContain('http://localhost:4111/pay/')
      expect(session.status).toBe('pending')
    })

    it('auto-completes payment and creates a transaction', async () => {
      await provider.createSession({
        amount: 250,
        currency: 'ILS',
        description: 'Auto-complete test',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
      })

      const transactions = mock.getTransactions()
      expect(transactions).toHaveLength(1)
      expect(transactions[0].amount).toBe(250)
      expect(transactions[0].status).toBe('completed')
    })
  })

  describe('getTransaction', () => {
    it('retrieves a completed transaction by document ID', async () => {
      await provider.createSession({
        amount: 79.90,
        currency: 'ILS',
        description: 'T-Shirt',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
        customer: { name: 'Israel Israeli', email: 'test@example.com' },
      })

      const transactions = mock.getTransactions()
      expect(transactions).toHaveLength(1)
      const docId = transactions[0].id

      const tx = await provider.getTransaction(docId)
      expect(tx.provider).toBe('morning')
      expect(tx.amount).toBe(79.90)
      expect(tx.status).toBe('approved')
      expect(tx.paymentMethod).toBe('credit_card')
      expect(tx.cardBrand).toBe('visa')
      expect(tx.cardLastFour).toBe('4580')
      expect(tx.customer?.name).toBe('Israel Israeli')
      expect(tx.customer?.email).toBe('test@example.com')
      expect(tx.documentUrl).toContain('/download/origin')
      expect(tx.morning?.documentType).toBe(320)
    })
  })

  describe('refund', () => {
    it('creates a credit note and returns a refund', async () => {
      await provider.createSession({
        amount: 200,
        currency: 'ILS',
        description: 'Refund test item',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
        customer: { name: 'Test User' },
      })

      const transactions = mock.getTransactions()
      const docId = transactions[0].id

      const refund = await provider.refund({ transactionId: docId })
      expect(refund.transactionId).toBe(docId)
      expect(refund.amount).toBe(200)
      expect(refund.status).toBe('completed')
      expect(refund.id).toBeTruthy()
    })

    it('supports partial refunds', async () => {
      await provider.createSession({
        amount: 300,
        currency: 'ILS',
        description: 'Partial refund test',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
        customer: { name: 'Test User' },
      })

      const transactions = mock.getTransactions()
      const docId = transactions[0].id

      const refund = await provider.refund({ transactionId: docId, amount: 100 })
      expect(refund.amount).toBe(100)
      expect(refund.status).toBe('completed')
    })
  })

  describe('parseWebhook', () => {
    it('parses a webhook payload from a completed payment', async () => {
      await provider.createSession({
        amount: 150,
        currency: 'ILS',
        description: 'Webhook test',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
        customer: { name: 'Webhook User' },
      })

      const transactions = mock.getTransactions()
      const docId = transactions[0].id

      // Fetch the document to use as a webhook payload (Morning sends the document as the webhook body)
      const response = await fetch(`${mock.baseUrl}/documents/${docId}`)
      const doc = await response.json()

      const event = await provider.parseWebhook(doc)
      expect(event.type).toBe('payment.completed')
      expect(event.transaction.amount).toBe(150)
      expect(event.transaction.provider).toBe('morning')
    })
  })

  describe('manual completion', () => {
    it('supports manually completing a payment', async () => {
      const manualMock = new MorningMockServer({ port: 4112, autoComplete: false })
      await manualMock.start()

      const manualProvider = new MorningProvider({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        baseUrl: manualMock.baseUrl,
      })

      const session = await manualProvider.createSession({
        amount: 500,
        currency: 'ILS',
        description: 'Manual test',
        successUrl: 'http://localhost/success',
        webhookUrl: 'http://localhost/webhook',
      })

      // No transactions yet
      expect(manualMock.getTransactions()).toHaveLength(0)

      // Extract session ID from URL
      const sessionId = session.pageUrl.split('/pay/')[1]
      const docId = manualMock.completePayment(sessionId, { cardNum: '9876', cardType: 'mastercard' })

      expect(docId).toBeTruthy()
      expect(manualMock.getTransactions()).toHaveLength(1)
      expect(manualMock.getTransactions()[0].cardType).toBe('mastercard')

      const tx = await manualProvider.getTransaction(docId!)
      expect(tx.cardBrand).toBe('mastercard')

      await manualMock.stop()
    })
  })

  describe('failure simulation', () => {
    it('simulates a failed payment', async () => {
      const failMock = new MorningMockServer({ port: 4113, autoComplete: false })
      await failMock.start()

      const failProvider = new MorningProvider({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
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
      expect(tx.status).toBe('declined')

      await failMock.stop()
    })
  })
})
