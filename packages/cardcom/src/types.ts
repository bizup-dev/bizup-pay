import type { CardcomExtras } from '@bizup-pay/core'

export interface CardcomConfig {
  terminalNumber: number
  apiName: string
  apiPassword: string
  baseUrl?: string
}

export interface CardcomLowProfileCreateRequest {
  TerminalNumber: number
  ApiName: string
  Amount: number
  SuccessRedirectUrl: string
  FailedRedirectUrl: string
  WebHookUrl: string
  ReturnValue?: string
  Operation: string
  Language?: string
  ISOCoinId?: number
  CancelRedirectUrl?: string
  ProductName?: string
  MaxPayments?: number
  AdvancedDefinition?: {
    IsAutoRecurringPayment?: boolean
    IsCreateToken?: boolean
    FirstPayment?: number
    ConstPayment?: number
    NumberOfPayments?: number
  }
  Document?: {
    Name: string
    Email?: string
    Phone?: string
    Products?: Array<{
      Description: string
      UnitCost: number
      Quantity?: number
    }>
  }
}

export interface CardcomLowProfileCreateResponse {
  ResponseCode: number
  Description: string
  LowProfileId: string
  Url: string
  UrlToPayPal?: string
  UrlToBit?: string
}

export interface CardcomTransactionInfoRequest {
  TerminalNumber: number
  UserName: string
  UserPassword: string
  InternalDealNumber: number
}

export interface CardcomTransactionInfo {
  HaveRecipient?: boolean
  Status1?: number
  CardNumber5?: string
  Sulac25?: string
  Sum36?: number
  SumStars52?: string
  ApprovalNumber71?: string
  NumberOfPayments94?: string
  CardTypeCode60?: string
  CardOwnerName?: string
  CardToken?: string
  CardHolderIdentityNumber?: string
  DealDate?: string
  TerminalNumber?: number
  InternalDealNumber?: number
  CouponNumber?: string
  CardOwnerPhone?: string
  CardOwnerEmail?: string
  Uid?: string
}

export interface CardcomRefundRequest {
  ApiName: string
  ApiPassword: string
  TransactionId: number
  PartialSum?: number
  CancelOnly?: boolean
  AllowMultipleRefunds?: boolean
}

export interface CardcomRefundResponse {
  ResponseCode: number
  Description: string
  NewTranzactionId?: number
}

export interface CardcomWebhookPayload {
  ResponseCode: number
  Description: string
  TerminalNumber: number
  LowProfileId: string
  TranzactionId: number
  ReturnValue?: string
  Operation: string
  UIValues?: {
    CardOwnerEmail?: string
    CardOwnerName?: string
    CardOwnerPhone?: string
    CardOwnerIdentityNumber?: string
    NumOfPayments?: number
    CardYear?: number
    CardMonth?: number
    IsAbroadCard?: boolean
  }
  TranzactionInfo?: {
    ResponseCode: number
    Description: string
    TranzactionId: number
    TerminalNumber: number
    Amount: number
    CoinId: number
    CreateDate: string
    Last4CardDigits: number
    CardMonth: number
    CardYear: number
    ApprovalNumber: string
    FirstPaymentAmount: number
    ConstPaymentAmount: number
    NumberOfPayments: number
    CardOwnerName: string
    CardOwnerPhone: string
    CardOwnerEmail: string
    CardOwnerIdentityNumber: string
  }
  TokenInfo?: {
    ResponseCode: number
    CardToken?: string
  }
  Country?: string
}

export type { CardcomExtras }
