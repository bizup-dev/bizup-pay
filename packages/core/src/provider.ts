import type {
  ProviderName,
  BizupPaymentSession,
  BizupTransaction,
  BizupRefund,
  BizupWebhookEvent,
  BizupCustomer,
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
  recurring?: {
    interval: 'monthly' | 'weekly' | 'yearly'
    totalPayments?: number
    amount?: number
    firstAmount?: number
    startDate?: string
  }
}

export interface RefundParams {
  transactionId: string
  amount?: number
}

export interface BizupProvider {
  readonly name: ProviderName

  createSession(params: CreateSessionParams): Promise<BizupPaymentSession>
  getTransaction(id: string): Promise<BizupTransaction>
  refund(params: RefundParams): Promise<BizupRefund>
  parseWebhook(
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<BizupWebhookEvent>
}
