import type {
  ProviderName,
  BizupPaymentSession,
  BizupTransaction,
  BizupRefund,
  BizupWebhookEvent,
  BizupCustomer,
  BizupToken,
} from './types.js'

export interface BizupProviderConfig {
  [key: string]: unknown
}

export interface CreateSessionParams {
  amount: number
  currency?: string
  description: string
  customer?: BizupCustomer
  successUrl: string
  failureUrl?: string
  cancelUrl?: string
  webhookUrl: string
  metadata?: Record<string, string>
  installments?: {
    min?: number
    max?: number
    fixed?: number
  }
  language?: 'he' | 'en'
}

export interface RefundParams {
  transactionId: string
  amount?: number
}

export interface ChargeTokenParams {
  tokenId: string
  amount: number
  currency?: string
  description: string
  vatType?: number
  installments?: number
  webhookUrl?: string
}

export interface BizupProvider {
  readonly name: ProviderName

  // Phase 1: E-commerce
  createSession(params: CreateSessionParams): Promise<BizupPaymentSession>
  getTransaction(id: string): Promise<BizupTransaction>
  refund(params: RefundParams): Promise<BizupRefund>
  parseWebhook(
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<BizupWebhookEvent>

  // Phase 2: Subscriptions (optional)
  createToken?(params: CreateSessionParams): Promise<BizupPaymentSession>
  chargeToken?(params: ChargeTokenParams): Promise<BizupTransaction>
}
