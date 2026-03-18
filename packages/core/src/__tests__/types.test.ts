import { describe, it, expect } from 'vitest'
import type {
  ProviderName,
  PaymentMethod,
  CardBrand,
  TransactionStatus,
  SessionStatus,
  RefundStatus,
  WebhookEventType,
  BizupCustomer,
  BizupPaymentSession,
  BizupTransaction,
  BizupRefund,
  BizupWebhookEvent,
} from '../types.js'

describe('Core Types', () => {
  describe('BizupPaymentSession', () => {
    it('should represent a payment session with all required fields', () => {
      const session: BizupPaymentSession = {
        id: 'sess_123',
        provider: 'morning',
        amount: 100,
        currency: 'ILS',
        description: 'Test Order',
        pageUrl: 'https://pay.example.com/page',
        successUrl: 'https://shop.example.com/success',
        webhookUrl: 'https://shop.example.com/webhook',
        metadata: { orderId: 'order_456' },
        status: 'pending',
      }

      expect(session.id).toBe('sess_123')
      expect(session.provider).toBe('morning')
      expect(session.amount).toBe(100)
      expect(session.currency).toBe('ILS')
      expect(session.status).toBe('pending')
      expect(session.metadata).toEqual({ orderId: 'order_456' })
    })

    it('should support optional fields', () => {
      const session: BizupPaymentSession = {
        id: 'sess_789',
        provider: 'cardcom',
        amount: 250,
        currency: 'USD',
        description: 'Premium Plan',
        pageUrl: 'https://pay.example.com/page',
        successUrl: 'https://shop.example.com/success',
        failureUrl: 'https://shop.example.com/failure',
        cancelUrl: 'https://shop.example.com/cancel',
        webhookUrl: 'https://shop.example.com/webhook',
        metadata: {},
        status: 'completed',
        expiresAt: new Date('2026-12-31'),
      }

      expect(session.failureUrl).toBe('https://shop.example.com/failure')
      expect(session.cancelUrl).toBe('https://shop.example.com/cancel')
      expect(session.expiresAt).toBeInstanceOf(Date)
    })
  })

  describe('BizupTransaction', () => {
    it('should represent a transaction with common fields', () => {
      const tx: BizupTransaction = {
        id: 'tx_001',
        providerTransactionId: 'prov_tx_001',
        provider: 'morning',
        amount: 100,
        currency: 'ILS',
        status: 'approved',
        paymentMethod: 'credit_card',
        cardBrand: 'visa',
        cardLastFour: '1234',
        installments: 1,
        documentUrl: 'https://docs.example.com/inv/001',
        customer: { name: 'Israel Israeli', email: 'israel@example.com' },
        createdAt: new Date('2026-03-18'),
        raw: {},
      }

      expect(tx.status).toBe('approved')
      expect(tx.paymentMethod).toBe('credit_card')
      expect(tx.cardBrand).toBe('visa')
      expect(tx.installments).toBe(1)
    })

    it('should support provider-specific extras', () => {
      const tx: BizupTransaction = {
        id: 'tx_002',
        providerTransactionId: '12345',
        provider: 'cardcom',
        amount: 200,
        currency: 'ILS',
        status: 'approved',
        paymentMethod: 'credit_card',
        installments: 3,
        createdAt: new Date(),
        cardcom: {
          approvalNumber: '0077123',
          dealType: 'RegularDeal',
          lowProfileId: 'lp-uuid-123',
        },
        raw: { originalResponse: true },
      }

      expect(tx.cardcom?.approvalNumber).toBe('0077123')
      expect(tx.cardcom?.lowProfileId).toBe('lp-uuid-123')
      expect(tx.morning).toBeUndefined()
    })
  })

  describe('BizupRefund', () => {
    it('should represent a refund', () => {
      const refund: BizupRefund = {
        id: 'ref_001',
        transactionId: 'tx_001',
        amount: 50,
        status: 'completed',
        createdAt: new Date('2026-03-18'),
      }

      expect(refund.amount).toBe(50)
      expect(refund.status).toBe('completed')
    })
  })

  describe('BizupWebhookEvent', () => {
    it('should represent a webhook event with transaction', () => {
      const event: BizupWebhookEvent = {
        type: 'payment.completed',
        transaction: {
          id: 'tx_003',
          providerTransactionId: 'ext_003',
          provider: 'morning',
          amount: 150,
          currency: 'ILS',
          status: 'approved',
          paymentMethod: 'bit',
          installments: 1,
          createdAt: new Date(),
          raw: {},
        },
        timestamp: new Date(),
      }

      expect(event.type).toBe('payment.completed')
      expect(event.transaction.paymentMethod).toBe('bit')
    })
  })

  describe('BizupCustomer', () => {
    it('should support full customer details with address', () => {
      const customer: BizupCustomer = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+972501234567',
        taxId: '123456789',
        address: {
          city: 'Tel Aviv',
          street: 'Rothschild 1',
          zip: '6688101',
          country: 'IL',
        },
      }

      expect(customer.name).toBe('Test User')
      expect(customer.address?.country).toBe('IL')
    })
  })

  describe('Type unions', () => {
    it('should constrain ProviderName values', () => {
      const providers: ProviderName[] = ['morning', 'cardcom', 'icount', 'grow']
      expect(providers).toHaveLength(4)
    })

    it('should constrain PaymentMethod values', () => {
      const methods: PaymentMethod[] = [
        'credit_card',
        'bit',
        'apple_pay',
        'google_pay',
        'bank_transfer',
        'paypal',
      ]
      expect(methods).toHaveLength(6)
    })

    it('should constrain CardBrand values', () => {
      const brands: CardBrand[] = [
        'visa',
        'mastercard',
        'amex',
        'isracard',
        'diners',
        'discover',
        'jcb',
      ]
      expect(brands).toHaveLength(7)
    })

    it('should constrain TransactionStatus values', () => {
      const statuses: TransactionStatus[] = [
        'approved',
        'declined',
        'refunded',
        'partially_refunded',
      ]
      expect(statuses).toHaveLength(4)
    })

    it('should constrain SessionStatus values', () => {
      const statuses: SessionStatus[] = [
        'pending',
        'completed',
        'failed',
        'cancelled',
      ]
      expect(statuses).toHaveLength(4)
    })

    it('should constrain RefundStatus values', () => {
      const statuses: RefundStatus[] = ['pending', 'completed', 'failed']
      expect(statuses).toHaveLength(3)
    })

    it('should constrain WebhookEventType values', () => {
      const types: WebhookEventType[] = [
        'payment.completed',
        'payment.failed',
        'payment.cancelled',
      ]
      expect(types).toHaveLength(3)
    })
  })
})
