import type { GrowExtras } from '@bizup-pay/core'

export interface GrowConfig {
  pageCode: string
  userId: string
  baseUrl?: string
}

export interface GrowCreatePaymentResponse {
  status: number
  data: {
    processId: number
    processToken: string
    url: string
  }
}

export interface GrowTransactionInfo {
  status: number
  data: {
    transactionId: number
    transactionToken: string
    sum: number
    fullName: string
    payerEmail: string
    payerPhone: string
    cardSuffix: string
    cardBrand: string
    cardBrandCode: number
    asmachta: string
    processId: number
    processToken: string
    description: string
    statusCode: number
    customFields?: Record<string, string>
  }
}

export interface GrowWebhookPayload {
  transactionId: number
  transactionToken: string
  sum: number
  fullName: string
  payerEmail: string
  payerPhone: string
  cardSuffix: string
  cardBrand: string
  cardBrandCode: number
  asmachta: string
  processId: number
  processToken: string
  description: string
  customFields?: Record<string, string>
}

export interface GrowRefundResponse {
  status: number
  data: {
    transactionId: number
    refundSum: number
  }
}

export type { GrowExtras }
