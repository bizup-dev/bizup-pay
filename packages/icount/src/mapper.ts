import type {
  BizupPaymentSession,
  BizupTransaction,
  BizupWebhookEvent,
  BizupCustomer,
  CreateSessionParams,
  PaymentMethod,
  TransactionStatus,
} from '@bizup-pay/core'
import type {
  IcountGenerateSaleResponse,
  IcountDocument,
  IcountIpnPayload,
} from './types.js'

export function toGenerateSaleRequest(
  params: CreateSessionParams,
  paypageId: number,
): Record<string, unknown> {
  const request: Record<string, unknown> = {
    paypage_id: paypageId,
    sum: params.amount,
    description: params.description,
    currency_code: params.currency ?? 'ILS',
    success_url: params.successUrl,
    failure_url: params.failureUrl,
    cancel_url: params.cancelUrl,
    ipn_url: params.webhookUrl,
    page_lang: params.language === 'en' ? 'en' : 'he',
  }

  if (params.customer) {
    request.client_name = params.customer.name
    request.email = params.customer.email
    request.phone = params.customer.phone
    request.vat_id = params.customer.taxId
    if (params.customer.address) {
      request.city = params.customer.address.city
      request.zip = params.customer.address.zip
      request.street = params.customer.address.street
      request.country_code = params.customer.address.country
    }
  }

  if (params.installments?.max) {
    request.max_payments = params.installments.max
  }

  if (params.recurring) {
    request.hk_issue_every = params.recurring.interval === 'yearly' ? 12
      : params.recurring.interval === 'weekly' ? 0.25
      : 1
    if (params.recurring.totalPayments) {
      request.hk_payments = params.recurring.totalPayments
    } else {
      request.hk_payments = 0 // unlimited
    }
    if (params.recurring.startDate) {
      request.hk_start_date = params.recurring.startDate
    }
  }

  if (params.metadata) {
    request.custom = JSON.stringify(params.metadata)
  }

  return request
}

export function fromGenerateSaleResponse(
  response: IcountGenerateSaleResponse,
  params: CreateSessionParams,
): BizupPaymentSession {
  return {
    id: response.sale_uniqid ?? '',
    provider: 'icount',
    amount: params.amount,
    currency: params.currency ?? 'ILS',
    description: params.description,
    pageUrl: response.sale_url ?? '',
    successUrl: params.successUrl,
    failureUrl: params.failureUrl,
    cancelUrl: params.cancelUrl,
    webhookUrl: params.webhookUrl,
    metadata: params.metadata ?? {},
    status: 'pending',
    operation: params.recurring ? 'charge_and_tokenize' : 'charge',
  }
}

export function fromIcountDocument(doc: IcountDocument): BizupTransaction {
  const status: TransactionStatus = doc.status === 'cancelled' ? 'refunded'
    : doc.status === 'closed' ? 'approved'
    : 'approved'

  const paymentMethod: PaymentMethod = 'credit_card'

  const customer: BizupCustomer | undefined = doc.client_name
    ? {
        name: doc.client_name,
        email: doc.email,
        phone: doc.phone,
        taxId: doc.vat_id,
      }
    : undefined

  return {
    id: `${doc.doctype}-${doc.docnum}`,
    providerTransactionId: String(doc.docnum),
    provider: 'icount',
    amount: doc.total,
    currency: doc.currency_code ?? 'ILS',
    status,
    paymentMethod,
    cardLastFour: doc.cc_last4,
    installments: doc.cc_num_of_payments ?? 1,
    documentUrl: doc.pdf_url,
    customer,
    createdAt: doc.created ? new Date(doc.created) : new Date(),
    icount: {
      doctype: doc.doctype,
      docnum: doc.docnum,
      confirmationCode: doc.cc_confirmation,
    },
    raw: doc,
  }
}

export function fromIcountIpn(payload: IcountIpnPayload): BizupWebhookEvent {
  const isSuccess = payload.status === 'success' || !!payload.confirmation_code

  const transaction: BizupTransaction = {
    id: payload.sale_uniqid ?? '',
    providerTransactionId: payload.docnum ? String(payload.docnum) : '',
    provider: 'icount',
    amount: payload.sum ?? 0,
    currency: payload.currency_code ?? 'ILS',
    status: isSuccess ? 'approved' : 'declined',
    paymentMethod: 'credit_card',
    cardLastFour: payload.cc_last4,
    installments: payload.num_of_payments ?? 1,
    customer: payload.client_name ? {
      name: payload.client_name,
      email: payload.email,
      phone: payload.phone,
    } : undefined,
    createdAt: new Date(),
    icount: {
      doctype: payload.doctype,
      docnum: payload.docnum,
      confirmationCode: payload.confirmation_code,
    },
    raw: payload,
  }

  return {
    type: isSuccess ? 'payment.completed' : 'payment.failed',
    transaction,
    timestamp: new Date(),
  }
}
