import type { TranzillaExtras } from '@bizup-pay/core'

export interface TranzillaConfig {
  appKey: string
  secretKey: string
  terminal: string
  baseUrl?: string
}

export interface TranzillaCreateSessionRequest {
  terminal: string
  amount: number
  currency?: string
  description?: string
  success_url: string
  failure_url?: string
  cancel_url?: string
  webhook_url: string
  customer?: {
    name?: string
    email?: string
    phone?: string
    identity_number?: string
  }
  installments?: {
    max?: number
    fixed?: number
  }
  language?: string
  metadata?: string
  recurring?: {
    cycle: string
    total_payments?: number
    amount?: number
    first_amount?: number
    start_date?: string
  }
}

export interface TranzillaCreateSessionResponse {
  success: boolean
  data?: {
    session_id: string
    page_url: string
    expires_at?: string
  }
  error?: {
    code: string
    message: string
  }
}

export interface TranzillaTransactionResponse {
  success: boolean
  data?: TranzillaTransaction
  error?: {
    code: string
    message: string
  }
}

export interface TranzillaTransaction {
  transaction_id: string
  tranzila_id: string
  status: string
  amount: number
  currency: string
  card_last_four?: string
  card_brand?: string
  approval_number?: string
  installments?: number
  customer?: {
    name?: string
    email?: string
    phone?: string
    identity_number?: string
  }
  token?: string
  token_expiry?: string
  standing_order_id?: string
  document_url?: string
  created_at: string
  metadata?: string
}

export interface TranzillaRefundRequest {
  transaction_id: string
  amount?: number
  reason?: string
}

export interface TranzillaRefundResponse {
  success: boolean
  data?: {
    refund_id: string
    transaction_id: string
    amount: number
    status: string
  }
  error?: {
    code: string
    message: string
  }
}

export interface TranzillaWebhookPayload {
  event: string
  transaction_id: string
  tranzila_id: string
  terminal: string
  amount: number
  currency: string
  status: string
  card_last_four?: string
  card_brand?: string
  approval_number?: string
  installments?: number
  customer?: {
    name?: string
    email?: string
    phone?: string
    identity_number?: string
  }
  token?: string
  token_expiry?: string
  standing_order_id?: string
  metadata?: string
  created_at: string
}

export type { TranzillaExtras }
