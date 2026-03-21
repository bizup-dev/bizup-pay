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
  CardcomLowProfileCreateRequest,
  CardcomLowProfileCreateResponse,
  CardcomTransactionInfo,
  CardcomWebhookPayload,
} from './types.js'

const CURRENCY_TO_COIN_ID: Record<string, number> = {
  ILS: 1,
  USD: 2,
  EUR: 978,
  GBP: 826,
}

const LANGUAGE_MAP: Record<string, string> = {
  he: 'he',
  en: 'en',
}

const CARDCOM_CARD_TYPE_MAP: Record<string, CardBrand> = {
  '1': 'visa',
  '2': 'mastercard',
  '3': 'isracard',
  '4': 'amex',
  '5': 'diners',
  '6': 'jcb',
  '7': 'discover',
}

export function toCardcomLowProfileRequest(
  params: CreateSessionParams,
  config: { terminalNumber: number; apiName: string },
): CardcomLowProfileCreateRequest {
  const request: CardcomLowProfileCreateRequest = {
    TerminalNumber: config.terminalNumber,
    ApiName: config.apiName,
    Amount: params.amount,
    SuccessRedirectUrl: params.successUrl,
    FailedRedirectUrl: params.failureUrl ?? params.successUrl,
    WebHookUrl: params.webhookUrl,
    Operation: params.recurring ? 'ChargeAndCreateToken' : 'ChargeOnly',
    Language: LANGUAGE_MAP[params.language ?? 'he'] ?? 'he',
    ISOCoinId: CURRENCY_TO_COIN_ID[params.currency ?? 'ILS'] ?? 1,
    ProductName: params.description,
  }

  if (params.cancelUrl) {
    request.CancelRedirectUrl = params.cancelUrl
  }

  if (params.metadata) {
    request.ReturnValue = JSON.stringify(params.metadata)
  }

  if (params.installments?.max) {
    request.MaxPayments = params.installments.max
  } else if (params.installments?.fixed) {
    request.MaxPayments = params.installments.fixed
  }

  if (params.customer) {
    request.AdvancedDefinition = {
      ...request.AdvancedDefinition,
      CardOwnerNameValue: params.customer.name,
      CardOwnerEmailValue: params.customer.email,
      CardOwnerPhoneValue: params.customer.phone,
    }
  }

  if (params.recurring) {
    request.AdvancedDefinition = {
      ...request.AdvancedDefinition,
      IsAutoRecurringPayment: true,
      IsCreateToken: true,
    }
    if (params.recurring.totalPayments !== undefined) {
      request.AdvancedDefinition.NumberOfPayments = params.recurring.totalPayments
    }
  }

  const products = params.metadata?.['_products']
    ? JSON.parse(params.metadata['_products']) as Array<{ description: string; unitCost: number; quantity?: number }>
    : [{ description: params.description, unitCost: params.amount }]

  request.Document = {
    Name: params.customer?.name ?? '',
    Email: params.customer?.email,
    Phone: params.customer?.phone,
    Products: products.map(p => ({
      Description: p.description,
      UnitCost: p.unitCost,
      Quantity: p.quantity,
    })),
  }

  return request
}

export function fromCardcomLowProfileResponse(
  response: CardcomLowProfileCreateResponse,
  params: CreateSessionParams,
): BizupPaymentSession {
  return {
    id: response.LowProfileId,
    provider: 'cardcom',
    amount: params.amount,
    currency: params.currency ?? 'ILS',
    description: params.description,
    pageUrl: response.Url,
    successUrl: params.successUrl,
    failureUrl: params.failureUrl,
    cancelUrl: params.cancelUrl,
    webhookUrl: params.webhookUrl,
    metadata: params.metadata ?? {},
    status: 'pending',
    operation: params.recurring ? 'charge_and_tokenize' : 'charge',
  }
}

export function fromCardcomTransactionInfo(
  info: CardcomTransactionInfo,
): BizupTransaction {
  const amount = info.SumStars52 ? parseFloat(info.SumStars52) : (info.Sum36 ?? 0) / 100
  const cardBrand = info.CardTypeCode60
    ? CARDCOM_CARD_TYPE_MAP[info.CardTypeCode60]
    : undefined
  const cardLastFour = info.CardNumber5?.replace(/\*/g, '')
  const installments = info.NumberOfPayments94
    ? parseInt(info.NumberOfPayments94, 10)
    : 1

  const status: TransactionStatus =
    info.Status1 === 0 ? 'approved' : 'declined'

  const customer: BizupCustomer | undefined = info.CardOwnerName
    ? {
        name: info.CardOwnerName,
        email: info.CardOwnerEmail,
        phone: info.CardOwnerPhone,
        taxId: info.CardHolderIdentityNumber,
      }
    : undefined

  return {
    id: String(info.InternalDealNumber ?? ''),
    providerTransactionId: String(info.InternalDealNumber ?? ''),
    provider: 'cardcom',
    amount,
    currency: 'ILS',
    status,
    paymentMethod: 'credit_card',
    cardBrand,
    cardLastFour,
    installments,
    documentUrl: info.DocumentUrl ?? undefined,
    customer,
    createdAt: info.DealDate ? new Date(info.DealDate) : new Date(),
    cardcom: {
      approvalNumber: info.ApprovalNumber71 ?? '',
      dealType: 'RegularDeal',
      lowProfileId: '',
      token: info.CardToken,
    },
    raw: info,
  }
}

export function fromCardcomWebhook(
  payload: CardcomWebhookPayload,
): BizupWebhookEvent {
  const txInfo = payload.TranzactionInfo
  const isSuccess = payload.ResponseCode === 0 && txInfo?.ResponseCode === 0

  const cardLastFour = txInfo?.Last4CardDigits
    ? String(txInfo.Last4CardDigits)
    : undefined

  const customer: BizupCustomer | undefined = txInfo?.CardOwnerName
    ? {
        name: txInfo.CardOwnerName,
        email: txInfo.CardOwnerEmail,
        phone: txInfo.CardOwnerPhone,
        taxId: txInfo.CardOwnerIdentityNumber,
      }
    : undefined

  const transaction: BizupTransaction = {
    id: String(payload.TranzactionId),
    providerTransactionId: String(payload.TranzactionId),
    provider: 'cardcom',
    amount: txInfo?.Amount ?? 0,
    currency: 'ILS',
    status: isSuccess ? 'approved' : 'declined',
    paymentMethod: 'credit_card',
    cardLastFour,
    installments: txInfo?.NumberOfPayments ?? 1,
    customer,
    createdAt: txInfo?.CreateDate ? new Date(txInfo.CreateDate) : new Date(),
    cardcom: {
      approvalNumber: txInfo?.ApprovalNumber ?? '',
      dealType: payload.Operation,
      lowProfileId: payload.LowProfileId,
      token: payload.TokenInfo?.CardToken,
      tokenExpiry: undefined,
    },
    raw: payload,
  }

  return {
    type: isSuccess ? 'payment.completed' : 'payment.failed',
    transaction,
    timestamp: txInfo?.CreateDate ? new Date(txInfo.CreateDate) : new Date(),
  }
}
