import type {
  BizupPaymentSession,
  BizupTransaction,
  BizupRefund,
  BizupWebhookEvent,
  BizupCustomer,
  CreateSessionParams,
  RefundParams,
  PaymentMethod,
  CardBrand,
  TransactionStatus,
} from '@bizup-pay/core'
import type {
  MorningPaymentFormRequest,
  MorningPaymentFormResponse,
  MorningDocument,
  MorningDownloadLinks,
} from './types.js'

const MORNING_PAYMENT_TYPE_MAP: Record<number, PaymentMethod> = {
  1: 'bank_transfer',
  2: 'bank_transfer',
  3: 'credit_card',
  4: 'credit_card',
  5: 'paypal',
  10: 'bit',
  11: 'apple_pay',
  12: 'google_pay',
}

const MORNING_CARD_BRAND_MAP: Record<string, CardBrand> = {
  visa: 'visa',
  mastercard: 'mastercard',
  amex: 'amex',
  isracard: 'isracard',
  diners: 'diners',
  discover: 'discover',
  jcb: 'jcb',
}

export function toMorningPaymentFormRequest(
  params: CreateSessionParams,
  pluginId: string,
): MorningPaymentFormRequest {
  const request: MorningPaymentFormRequest = {
    description: params.description,
    type: 320,
    lang: params.language ?? 'he',
    currency: params.currency ?? 'ILS',
    vatType: 0,
    amount: params.amount,
    pluginId,
    client: {
      name: params.customer?.name ?? '',
      emails: params.customer?.email ? [params.customer.email] : undefined,
      taxId: params.customer?.taxId,
      address: params.customer?.address?.street,
      city: params.customer?.address?.city,
      zip: params.customer?.address?.zip,
      country: params.customer?.address?.country ?? 'IL',
      phone: params.customer?.phone,
      add: true,
    },
    income: [
      {
        description: params.description,
        quantity: 1,
        price: params.amount,
        currency: params.currency ?? 'ILS',
        vatType: 0,
      },
    ],
    successUrl: params.successUrl,
    failureUrl: params.failureUrl,
    notifyUrl: params.webhookUrl,
    custom: params.metadata ? JSON.stringify(params.metadata) : undefined,
  }

  if (params.installments?.max) {
    request.maxPayments = params.installments.max
  } else if (params.installments?.fixed) {
    request.maxPayments = params.installments.fixed
  }

  return request
}

export function fromMorningPaymentFormResponse(
  response: MorningPaymentFormResponse,
  params: CreateSessionParams,
): BizupPaymentSession {
  return {
    id: '',
    provider: 'morning',
    amount: params.amount,
    currency: params.currency ?? 'ILS',
    description: params.description,
    pageUrl: response.url,
    successUrl: params.successUrl,
    failureUrl: params.failureUrl,
    cancelUrl: params.cancelUrl,
    webhookUrl: params.webhookUrl,
    metadata: params.metadata ?? {},
    status: 'pending',
  }
}

export function fromMorningDocument(
  doc: MorningDocument,
  downloadLinks?: MorningDownloadLinks,
): BizupTransaction {
  const payment = doc.payment?.[0]
  const paymentMethod = payment
    ? MORNING_PAYMENT_TYPE_MAP[payment.type] ?? 'credit_card'
    : 'credit_card'

  const cardBrand = payment?.cardType
    ? MORNING_CARD_BRAND_MAP[payment.cardType.toLowerCase()]
    : undefined

  const status = resolveTransactionStatus(doc)

  const customer: BizupCustomer | undefined = doc.client
    ? {
        name: doc.client.name,
        email: doc.client.emails?.[0],
        phone: doc.client.phone,
        taxId: doc.client.taxId,
        address: doc.client.city
          ? {
              street: doc.client.address,
              city: doc.client.city,
              zip: doc.client.zip,
              country: doc.client.country,
            }
          : undefined,
      }
    : undefined

  return {
    id: doc.id,
    providerTransactionId: doc.id,
    provider: 'morning',
    amount: doc.amount,
    currency: doc.currency,
    status,
    paymentMethod,
    cardBrand,
    cardLastFour: payment?.cardNum,
    installments: payment?.numPayments ?? 1,
    documentUrl: downloadLinks?.origin ?? downloadLinks?.he,
    customer,
    createdAt: new Date(doc.creationDate * 1000),
    morning: {
      documentId: doc.id,
      documentType: doc.type,
      documentNumber: doc.number,
      vatType: doc.vatType,
      linkedDocuments: doc.linkedDocuments ?? [],
    },
    raw: doc,
  }
}

function resolveTransactionStatus(doc: MorningDocument): TransactionStatus {
  if (doc.type === 330) return 'refunded'
  if (doc.status === 0) return 'approved'
  return 'declined'
}

export function fromMorningWebhook(doc: MorningDocument): BizupWebhookEvent {
  const transaction = fromMorningDocument(doc)

  return {
    type:
      transaction.status === 'approved'
        ? 'payment.completed'
        : 'payment.failed',
    transaction,
    timestamp: new Date(doc.creationDate * 1000),
  }
}

export function toMorningRefundRequest(
  doc: MorningDocument,
  amount?: number,
): {
  description: string
  type: number
  lang: string
  currency: string
  vatType: number
  client: { name: string; emails?: string[]; taxId?: string }
  income: Array<{
    description: string
    quantity: number
    price: number
    currency: string
    vatType: number
  }>
} {
  const refundAmount = amount ?? doc.amount

  return {
    description: `Credit note for ${doc.number}`,
    type: 330,
    lang: doc.lang,
    currency: doc.currency,
    vatType: doc.vatType,
    client: {
      name: doc.client?.name ?? '',
      emails: doc.client?.emails,
      taxId: doc.client?.taxId,
    },
    income: [
      {
        description: `Refund: ${doc.description}`,
        quantity: 1,
        price: refundAmount,
        currency: doc.currency,
        vatType: doc.vatType,
      },
    ],
  }
}
