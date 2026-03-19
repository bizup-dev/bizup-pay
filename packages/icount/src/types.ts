import type { IcountExtras } from '@bizup-pay/core'

export interface IcountConfig {
  cid: string
  accessToken?: string
  user?: string
  pass?: string
  paypageId: number
  baseUrl?: string
}

export interface IcountAuthResponse {
  status: boolean
  reason: string
  sid?: string
  cid?: string
  user?: string
}

export interface IcountGenerateSaleResponse {
  status: boolean
  reason: string
  paypage_id?: string
  sale_uniqid?: string
  sale_sid?: string
  sale_url?: string
}

export interface IcountDocSearchResponse {
  status: boolean
  reason: string
  docs?: IcountDocument[]
}

export interface IcountDocument {
  doctype: string
  docnum: number
  client_id?: number
  client_name?: string
  email?: string
  phone?: string
  vat_id?: string
  currency_id?: number
  currency_code?: string
  total: number
  total_vat?: number
  issue_date?: string
  created?: string
  status?: string
  cc_confirmation?: string
  cc_last4?: string
  cc_type?: string
  cc_num_of_payments?: number
  items?: Array<{
    description: string
    unitprice: number
    quantity: number
    total: number
  }>
  pdf_url?: string
  paynow_url?: string
}

export interface IcountCancelResponse {
  status: boolean
  reason: string
  refund_doctype?: string
  refund_docnum?: number
}

export interface IcountIpnPayload {
  sale_sid?: string
  sale_uniqid?: string
  paypage_id?: string | number
  status?: string
  confirmation_code?: string
  sum?: number
  currency_code?: string
  client_name?: string
  email?: string
  phone?: string
  doctype?: string
  docnum?: number
  cc_last4?: string
  cc_type?: string
  num_of_payments?: number
  custom_fields?: Record<string, unknown>
}

export type { IcountExtras }
