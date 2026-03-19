import type { MorningExtras } from '@bizup-pay/core'

export interface MorningConfig {
  apiKey: string
  apiSecret: string
  baseUrl?: string
}

export interface MorningPaymentFormRequest {
  description: string
  type: number
  lang: 'he' | 'en'
  currency: string
  vatType: number
  amount: number
  maxPayments?: number
  pluginId: string
  client: {
    name: string
    emails?: string[]
    taxId?: string
    address?: string
    city?: string
    zip?: string
    country?: string
    phone?: string
    add?: boolean
  }
  income: Array<{
    catalogNum?: string
    description: string
    quantity: number
    price: number
    currency: string
    vatType: number
  }>
  successUrl: string
  failureUrl?: string
  notifyUrl: string
  custom?: string
}

export interface MorningPaymentFormResponse {
  errorCode: number
  url: string
}

export interface MorningDocument {
  id: string
  description: string
  type: number
  number: string
  documentDate: string
  creationDate: number
  status: number
  lang: string
  amountDueVat?: number
  amountExemptVat?: number
  amountExcludedVat?: number
  amountLocal?: number
  amountOpened?: number
  vat?: number
  amount: number
  currency: string
  currencyRate?: number
  linkedDocuments: string[]
  vatType: number
  income?: Array<{
    catalogNum?: string
    description: string
    quantity: number
    price: number
    currency: string
    vatType: number
  }>
  payment?: Array<{
    type: number
    date?: string
    dealType?: number
    cardNum?: string
    cardType?: string
    numPayments?: number
    firstPayment?: number
    price: number
    currency?: string
  }>
  client?: {
    id?: string
    name: string
    taxId?: string
    address?: string
    city?: string
    zip?: string
    country?: string
    phone?: string
    emails?: string[]
  }
  data?: {
    taxAuthorityConfirmationNumber?: string
    taxAuthorityConfirmationInitiated?: boolean
    taxAuthorityConfirmationLastError?: number
  }
  custom?: string
}

export interface MorningDownloadLinks {
  he: string
  en: string
  origin: string
}

export interface MorningCreateDocumentRequest {
  description: string
  type: number
  lang: string
  currency: string
  vatType: number
  client: {
    name: string
    emails?: string[]
    taxId?: string
  }
  income: Array<{
    description: string
    quantity: number
    price: number
    currency: string
    vatType: number
  }>
}

export interface MorningChargeTokenRequest {
  description: string
  type: number
  lang: 'he' | 'en'
  currency: string
  vatType: number
  amount: number
  maxPayments?: number
  notifyUrl?: string
  income: Array<{
    description: string
    quantity: number
    price: number
    currency: string
    vatType: number
  }>
}

export type { MorningExtras }
