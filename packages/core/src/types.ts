export type ProviderName = 'morning' | 'cardcom' | 'icount' | 'grow'

export type PaymentMethod =
  | 'credit_card'
  | 'bit'
  | 'apple_pay'
  | 'google_pay'
  | 'bank_transfer'
  | 'paypal'

export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'isracard'
  | 'diners'
  | 'discover'
  | 'jcb'

export type TransactionStatus =
  | 'approved'
  | 'declined'
  | 'refunded'
  | 'partially_refunded'

export type SessionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export type SessionOperation = 'charge' | 'charge_and_tokenize' | 'tokenize_only'

export type RefundStatus = 'pending' | 'completed' | 'failed'

export type WebhookEventType =
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.cancelled'

export interface BizupCustomer {
  name: string
  email?: string
  phone?: string
  taxId?: string
  address?: {
    city?: string
    street?: string
    zip?: string
    country?: string
  }
}

export interface BizupPaymentSession {
  id: string
  provider: ProviderName
  amount: number
  currency: string
  description: string
  pageUrl: string
  successUrl: string
  failureUrl?: string
  cancelUrl?: string
  webhookUrl: string
  metadata: Record<string, string>
  status: SessionStatus
  operation?: SessionOperation
  expiresAt?: Date
  token?: string
  tokenExpiry?: string
  recurringId?: string
}

export interface BizupTransaction {
  id: string
  providerTransactionId: string
  provider: ProviderName
  amount: number
  currency: string
  status: TransactionStatus
  paymentMethod: PaymentMethod
  cardBrand?: CardBrand
  cardLastFour?: string
  installments: number
  documentUrl?: string
  customer?: BizupCustomer
  createdAt: Date
  morning?: MorningExtras
  cardcom?: CardcomExtras
  icount?: IcountExtras
  grow?: GrowExtras
  raw: unknown
}

export interface BizupRefund {
  id: string
  transactionId: string
  amount: number
  status: RefundStatus
  createdAt: Date
}

export interface BizupWebhookEvent {
  type: WebhookEventType
  transaction: BizupTransaction
  timestamp: Date
}

export interface MorningExtras {
  documentId: string
  documentType: number
  documentNumber: string
  vatType: number
  linkedDocuments: string[]
}

export interface CardcomExtras {
  approvalNumber: string
  dealType: string
  lowProfileId: string
  threeDSecureStatus?: string
  acquirer?: string
  token?: string
  tokenExpiry?: string
}

export interface IcountExtras {
  doctype?: string
  docnum?: number
  confirmationCode?: string
  [key: string]: unknown
}

export interface GrowExtras {
  [key: string]: unknown
}
