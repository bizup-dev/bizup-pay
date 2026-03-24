import type {
  BizupPaymentSession,
  BizupTransaction,
  BizupWebhookEvent,
  BizupCustomer,
  CreateSessionParams,
  CardBrand,
  TransactionStatus,
} from '@bizup-pay/core'
import type {
  TranzillaCreateSessionRequest,
  TranzillaCreateSessionResponse,
  TranzillaTransaction,
  TranzillaWebhookPayload,
} from './types.js'

const CURRENCY_MAP: Record<string, string> = {
  ILS: 'ILS',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
}

const CARD_BRAND_MAP: Record<string, CardBrand> = {
  visa: 'visa',
  mastercard: 'mastercard',
  amex: 'amex',
  isracard: 'isracard',
  diners: 'diners',
  jcb: 'jcb',
  discover: 'discover',
}

const INTERVAL_TO_CYCLE: Record<string, string> = {
  weekly: 'weekly',
  monthly: 'monthly',
  yearly: 'annual',
}

export function toTranzillaCreateSessionRequest(
  params: CreateSessionParams,
  config: { terminal: string },
): TranzillaCreateSessionRequest {
  const request: TranzillaCreateSessionRequest = {
    terminal: config.terminal,
    amount: params.amount,
    currency: CURRENCY_MAP[params.currency ?? 'ILS'] ?? 'ILS',
    description: params.description,
    success_url: params.successUrl,
    failure_url: params.failureUrl,
    cancel_url: params.cancelUrl,
    webhook_url: params.webhookUrl,
    language: params.language ?? 'he',
  }

  if (params.metadata) {
    request.metadata = JSON.stringify(params.metadata)
  }

  if (params.customer) {
    request.customer = {
      name: params.customer.name,
      email: params.customer.email,
      phone: params.customer.phone,
      identity_number: params.customer.taxId,
    }
  }

  if (params.installments) {
    request.installments = {
      max: params.installments.max,
      fixed: params.installments.fixed,
    }
  }

  if (params.recurring) {
    request.recurring = {
      cycle: INTERVAL_TO_CYCLE[params.recurring.interval] ?? 'monthly',
      total_payments: params.recurring.totalPayments,
      amount: params.recurring.amount,
      first_amount: params.recurring.firstAmount,
      start_date: params.recurring.startDate,
    }
  }

  return request
}

export function fromTranzillaCreateSessionResponse(
  response: TranzillaCreateSessionResponse,
  params: CreateSessionParams,
): BizupPaymentSession {
  return {
    id: response.data!.session_id,
    provider: 'tranzilla',
    amount: params.amount,
    currency: params.currency ?? 'ILS',
    description: params.description,
    pageUrl: response.data!.page_url,
    successUrl: params.successUrl,
    failureUrl: params.failureUrl,
    cancelUrl: params.cancelUrl,
    webhookUrl: params.webhookUrl,
    metadata: params.metadata ?? {},
    status: 'pending',
    operation: params.recurring ? 'charge_and_tokenize' : 'charge',
    expiresAt: response.data!.expires_at ? new Date(response.data!.expires_at) : undefined,
  }
}

export function fromTranzillaTransaction(
  tx: TranzillaTransaction,
): BizupTransaction {
  const cardBrand = tx.card_brand
    ? CARD_BRAND_MAP[tx.card_brand.toLowerCase()]
    : undefined

  const status: TransactionStatus =
    tx.status === 'approved' ? 'approved'
    : tx.status === 'refunded' ? 'refunded'
    : tx.status === 'partially_refunded' ? 'partially_refunded'
    : 'declined'

  const customer: BizupCustomer | undefined = tx.customer?.name
    ? {
        name: tx.customer.name,
        email: tx.customer.email,
        phone: tx.customer.phone,
        taxId: tx.customer.identity_number,
      }
    : undefined

  let metadata: Record<string, string> | undefined
  if (tx.metadata) {
    try { metadata = JSON.parse(tx.metadata) } catch { /* ignore */ }
  }

  return {
    id: tx.transaction_id,
    providerTransactionId: tx.tranzila_id,
    provider: 'tranzilla',
    amount: tx.amount,
    currency: tx.currency ?? 'ILS',
    status,
    paymentMethod: 'credit_card',
    cardBrand,
    cardLastFour: tx.card_last_four,
    installments: tx.installments ?? 1,
    documentUrl: tx.document_url,
    customer,
    createdAt: new Date(tx.created_at),
    tranzilla: {
      tranzilaId: tx.tranzila_id,
      approvalNumber: tx.approval_number,
      token: tx.token,
      tokenExpiry: tx.token_expiry,
      standingOrderId: tx.standing_order_id,
    },
    raw: tx,
  }
}

export function fromTranzillaWebhook(
  payload: TranzillaWebhookPayload,
): BizupWebhookEvent {
  const isSuccess = payload.status === 'approved'

  const customer: BizupCustomer | undefined = payload.customer?.name
    ? {
        name: payload.customer.name,
        email: payload.customer.email,
        phone: payload.customer.phone,
        taxId: payload.customer.identity_number,
      }
    : undefined

  const cardBrand = payload.card_brand
    ? CARD_BRAND_MAP[payload.card_brand.toLowerCase()]
    : undefined

  const transaction: BizupTransaction = {
    id: payload.transaction_id,
    providerTransactionId: payload.tranzila_id,
    provider: 'tranzilla',
    amount: payload.amount,
    currency: payload.currency ?? 'ILS',
    status: isSuccess ? 'approved' : 'declined',
    paymentMethod: 'credit_card',
    cardBrand,
    cardLastFour: payload.card_last_four,
    installments: payload.installments ?? 1,
    customer,
    createdAt: new Date(payload.created_at),
    tranzilla: {
      tranzilaId: payload.tranzila_id,
      approvalNumber: payload.approval_number,
      token: payload.token,
      tokenExpiry: payload.token_expiry,
      standingOrderId: payload.standing_order_id,
    },
    raw: payload,
  }

  return {
    type: isSuccess ? 'payment.completed' : 'payment.failed',
    transaction,
    timestamp: new Date(payload.created_at),
  }
}
