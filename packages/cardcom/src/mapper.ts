import type {
  BizupPaymentSession,
  BizupTransaction,
  BizupWebhookEvent,
  BizupCustomer,
  CreateSessionParams,
  ChargeTokenParams,
  CardBrand,
  TransactionStatus,
} from '@bizup-pay/core'
import type {
  CardcomLowProfileCreateRequest,
  CardcomLowProfileCreateResponse,
  CardcomTransactionInfo,
  CardcomWebhookPayload,
  CardcomChargeTokenRequest,
  CardcomChargeTokenResponse,
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
    Operation: 'ChargeOnly',
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
    request.Document = {
      Name: params.customer.name,
      Email: params.customer.email,
      Phone: params.customer.phone,
    }
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
    },
    raw: payload,
  }

  return {
    type: isSuccess ? 'payment.completed' : 'payment.failed',
    transaction,
    timestamp: txInfo?.CreateDate ? new Date(txInfo.CreateDate) : new Date(),
  }
}

export function toCardcomCreateTokenRequest(
  params: CreateSessionParams,
  config: { terminalNumber: number; apiName: string },
): CardcomLowProfileCreateRequest {
  const request = toCardcomLowProfileRequest(params, config)
  request.Operation = 'CreateTokenOnly'
  return request
}

export function toCardcomChargeTokenRequest(
  params: ChargeTokenParams,
  config: { terminalNumber: number; apiName: string },
): CardcomChargeTokenRequest {
  const request: CardcomChargeTokenRequest = {
    TerminalNumber: config.terminalNumber,
    ApiName: config.apiName,
    Amount: params.amount,
    Token: params.tokenId,
    ISOCoinId: CURRENCY_TO_COIN_ID[params.currency ?? 'ILS'] ?? 1,
  }

  if (params.installments) {
    request.NumOfPayments = params.installments
  }

  return request
}

export function fromCardcomChargeTokenResponse(
  response: CardcomChargeTokenResponse,
): BizupTransaction {
  const customer: BizupCustomer | undefined = response.CardOwnerName
    ? {
        name: response.CardOwnerName,
        email: response.CardOwnerEmail,
        phone: response.CardOwnerPhone,
        taxId: response.CardOwnerIdentityNumber,
      }
    : undefined

  return {
    id: String(response.InternalDealNumber ?? ''),
    providerTransactionId: String(response.InternalDealNumber ?? ''),
    provider: 'cardcom',
    amount: response.Amount ?? 0,
    currency: 'ILS',
    status: 'approved',
    paymentMethod: 'credit_card',
    cardLastFour: response.Last4CardDigits,
    installments: response.NumOfPayments ?? 1,
    customer,
    createdAt: new Date(),
    cardcom: {
      approvalNumber: response.ApprovalNumber ?? '',
      dealType: 'ChargeToken',
      lowProfileId: '',
      token: response.TokenInfo?.Token,
      tokenExpiry: response.TokenInfo?.TokenExDate,
    },
    raw: response,
  }
}
