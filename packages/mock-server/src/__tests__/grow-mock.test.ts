import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { GrowMockServer } from '../grow-mock.js'

describe('GrowMockServer', () => {
  let mock: GrowMockServer

  beforeAll(async () => {
    mock = new GrowMockServer({ port: 4411, autoComplete: false })
    await mock.start()
  })

  afterAll(async () => {
    await mock.stop()
  })

  beforeEach(() => {
    mock.reset()
  })

  describe('createPaymentProcess', () => {
    it('returns a payment process with URL', async () => {
      const body = new URLSearchParams({
        pageCode: 'test-page',
        userId: 'test-user',
        sum: '79.90',
        description: 'Test Product',
        successUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
        notifyUrl: 'http://localhost/webhook',
        'pageField[fullName]': 'Israel Israeli',
        'pageField[email]': 'israel@example.com',
        'pageField[phone]': '0541234567',
        cField1: 'order-123',
      })

      const res = await fetch(`${mock.baseUrl}/createPaymentProcess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      const json = await res.json()
      expect(json.status).toBe(1)
      expect(json.data.processId).toBeDefined()
      expect(json.data.processToken).toBeDefined()
      expect(json.data.url).toContain('http://localhost:4411/pay/')
    })
  })

  describe('complete payment and getTransactionInfo', () => {
    it('completes a payment and retrieves transaction details', async () => {
      // Create a payment process
      const createBody = new URLSearchParams({
        pageCode: 'test-page',
        userId: 'test-user',
        sum: '150.00',
        description: 'Premium Widget',
        successUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
        notifyUrl: 'http://localhost/webhook',
        'pageField[fullName]': 'Test User',
        'pageField[email]': 'test@test.com',
        cField1: 'widget-456',
      })

      const createRes = await fetch(`${mock.baseUrl}/createPaymentProcess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: createBody.toString(),
      })
      const createJson = await createRes.json()
      const processId = createJson.data.processId

      // Manually complete the payment
      const transactionId = mock.completePayment(processId)
      expect(transactionId).toBeTruthy()

      // Verify transaction is stored
      const txs = mock.getTransactions()
      expect(txs).toHaveLength(1)
      expect(txs[0].amount).toBe(150)
      expect(txs[0].status).toBe('completed')

      // Get transaction info via API
      const infoBody = new URLSearchParams({
        pageCode: 'test-page',
        transactionId: String(transactionId),
        transactionToken: 'any',
      })

      const infoRes = await fetch(`${mock.baseUrl}/getTransactionInfo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: infoBody.toString(),
      })

      const infoJson = await infoRes.json()
      expect(infoJson.status).toBe(1)
      expect(infoJson.data.sum).toBe(150)
      expect(infoJson.data.fullName).toBe('Test User')
      expect(infoJson.data.description).toBe('Premium Widget')
      expect(infoJson.data.cardSuffix).toBe('4580')
      expect(infoJson.data.customFields.cField1).toBe('widget-456')
    })
  })

  describe('refundTransaction', () => {
    it('refunds a completed transaction', async () => {
      // Create and complete
      const createBody = new URLSearchParams({
        pageCode: 'test-page',
        userId: 'test-user',
        sum: '200',
        description: 'Refund test',
        successUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
        notifyUrl: 'http://localhost/webhook',
      })

      const createRes = await fetch(`${mock.baseUrl}/createPaymentProcess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: createBody.toString(),
      })
      const createJson = await createRes.json()
      const transactionId = mock.completePayment(createJson.data.processId)

      // Refund
      const refundBody = new URLSearchParams({
        transactionId: String(transactionId),
        transactionToken: 'any',
        refundSum: '200',
        userId: 'test-user',
      })

      const refundRes = await fetch(`${mock.baseUrl}/refundTransaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: refundBody.toString(),
      })

      const refundJson = await refundRes.json()
      expect(refundJson.status).toBe(1)
      expect(refundJson.data.refundSum).toBe(200)

      // Verify mock transaction is marked as refunded
      const tx = mock.getTransaction(String(transactionId))
      expect(tx?.status).toBe('refunded')
    })
  })
})
