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
  GrowCreatePaymentResponse,
  GrowTransactionInfo,
  GrowWebhookPayload,
} from './types.js'

const CARD_BRAND_MAP: Record<number, CardBrand> = {
  2: 'mastercard',
  3: 'visa',
  5: 'isracard',
  7: 'discover',
  8: 'diners',
}

function mapCardBrand(code?: number): CardBrand | undefined {
  if (code === undefined) return undefined
  return CARD_BRAND_MAP[code]
}

export function toGrowCreatePaymentRequest(
  params: CreateSessionParams,
  pageCode: string,
  userId: string,
): Record<string, string> {
  const request: Record<string, string> = {
    pageCode,
    userId,
    sum: String(params.amount),
    description: params.description,
    successUrl: params.successUrl,
    notifyUrl: params.webhookUrl,
  }

  if (params.cancelUrl) {
    request.cancelUrl = params.cancelUrl
  } else if (params.failureUrl) {
    request.cancelUrl = params.failureUrl
  }

  if (params.customer) {
    request['pageField[fullName]'] = params.customer.name
    if (params.customer.email) {
      request['pageField[email]'] = params.customer.email
    }
    if (params.customer.phone) {
      request['pageField[phone]'] = params.customer.phone
    }
  }

  if (params.recurring) {
    request.saveCardToken = '1'
  }

  if (params.metadata) {
    const entries = Object.entries(params.metadata)
    for (let i = 0; i < entries.length && i < 9; i++) {
      request[`cField${i + 1}`] = entries[i][1]
    }
  }

  return request
}

export function fromGrowCreatePaymentResponse(
  response: GrowCreatePaymentResponse,
  params: CreateSessionParams,
): BizupPaymentSession {
  return {
    id: String(response.data.processId),
    provider: 'grow',
    amount: params.amount,
    currency: params.currency ?? 'ILS',
    description: params.description,
    pageUrl: response.data.url,
    successUrl: params.successUrl,
    failureUrl: params.failureUrl,
    cancelUrl: params.cancelUrl,
    webhookUrl: params.webhookUrl,
    metadata: params.metadata ?? {},
    status: 'pending',
    token: response.data.processToken,
    operation: params.recurring ? 'charge_and_tokenize' : 'charge',
  }
}

export function fromGrowTransactionInfo(
  response: GrowTransactionInfo,
): BizupTransaction {
  const data = response.data

  const status: TransactionStatus = data.statusCode === 1 ? 'approved' : 'declined'

  const customer: BizupCustomer | undefined = data.fullName
    ? {
        name: data.fullName,
        email: data.payerEmail,
        phone: data.payerPhone,
      }
    : undefined

  return {
    id: String(data.transactionId),
    providerTransactionId: String(data.transactionId),
    provider: 'grow',
    amount: data.sum,
    currency: 'ILS',
    status,
    paymentMethod: 'credit_card',
    cardBrand: mapCardBrand(data.cardBrandCode),
    cardLastFour: data.cardSuffix,
    installments: 1,
    customer,
    createdAt: new Date(),
    grow: {
      processId: data.processId,
      processToken: data.processToken,
      transactionToken: data.transactionToken,
      asmachta: data.asmachta,
      cardTypeCode: data.cardBrandCode,
      customFields: data.customFields,
    },
    raw: response,
  }
}

export function fromGrowWebhook(payload: GrowWebhookPayload): BizupWebhookEvent {
  const customer: BizupCustomer | undefined = payload.fullName
    ? {
        name: payload.fullName,
        email: payload.payerEmail,
        phone: payload.payerPhone,
      }
    : undefined

  const transaction: BizupTransaction = {
    id: String(payload.transactionId),
    providerTransactionId: String(payload.transactionId),
    provider: 'grow',
    amount: payload.sum,
    currency: 'ILS',
    status: 'approved',
    paymentMethod: 'credit_card',
    cardBrand: mapCardBrand(payload.cardBrandCode),
    cardLastFour: payload.cardSuffix,
    installments: 1,
    customer,
    createdAt: new Date(),
    grow: {
      processId: payload.processId,
      processToken: payload.processToken,
      transactionToken: payload.transactionToken,
      asmachta: payload.asmachta,
      cardTypeCode: payload.cardBrandCode,
      customFields: payload.customFields,
    },
    raw: payload,
  }

  return {
    type: 'payment.completed',
    transaction,
    timestamp: new Date(),
  }
}
