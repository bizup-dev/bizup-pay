import type {
  BizupProvider,
  CreateSessionParams,
  RefundParams,
  BizupPaymentSession,
  BizupTransaction,
  BizupRefund,
  BizupWebhookEvent,
} from '@bizup-pay/core'
import { BizupPayError } from '@bizup-pay/core'
import type { MorningConfig, MorningDocument, MorningDownloadLinks, MorningPaymentFormResponse } from './types.js'
import {
  toMorningPaymentFormRequest,
  fromMorningPaymentFormResponse,
  fromMorningDocument,
  fromMorningWebhook,
  toMorningRefundRequest,
} from './mapper.js'

export type HttpClient = (
  url: string,
  options: {
    method: string
    headers: Record<string, string>
    body?: string
  },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

export class MorningProvider implements BizupProvider {
  readonly name = 'morning' as const

  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly apiSecret: string
  private readonly httpClient: HttpClient

  constructor(config: MorningConfig, httpClient?: HttpClient) {
    if (!config.apiKey || !config.apiSecret) {
      throw new BizupPayError(
        'Morning provider requires apiKey and apiSecret',
        'INVALID_CONFIG',
        'morning',
      )
    }

    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
    this.baseUrl = config.baseUrl ?? 'https://api.greeninvoice.co.il/api/v1'
    this.httpClient = httpClient ?? (globalThis.fetch as unknown as HttpClient)
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}:${this.apiSecret}`,
    }

    const response = await this.httpClient(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }).catch((error) => {
      throw new BizupPayError(
        `Network error calling Morning API: ${error}`,
        'NETWORK_ERROR',
        'morning',
        error,
      )
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new BizupPayError(
        `Morning API error (${response.status})`,
        'PROVIDER_ERROR',
        'morning',
        errorBody,
      )
    }

    return (await response.json()) as T
  }

  async createSession(params: CreateSessionParams): Promise<BizupPaymentSession> {
    const pluginId = '7944827a-c664-11e4-8231-080027271115'
    const requestBody = toMorningPaymentFormRequest(params, pluginId)
    const response = await this.request<MorningPaymentFormResponse>(
      'POST',
      '/payments/form',
      requestBody,
    )

    if (response.errorCode !== 0) {
      throw new BizupPayError(
        `Morning createSession failed with errorCode ${response.errorCode}`,
        'PROVIDER_ERROR',
        'morning',
        response,
      )
    }

    return fromMorningPaymentFormResponse(response, params)
  }

  async getTransaction(id: string): Promise<BizupTransaction> {
    const [doc, links] = await Promise.all([
      this.request<MorningDocument>('GET', `/documents/${id}`),
      this.request<MorningDownloadLinks>(
        'GET',
        `/documents/${id}/download/links`,
      ).catch(() => undefined),
    ])

    return fromMorningDocument(doc, links)
  }

  async refund(params: RefundParams): Promise<BizupRefund> {
    const doc = await this.request<MorningDocument>(
      'GET',
      `/documents/${params.transactionId}`,
    )

    const refundBody = toMorningRefundRequest(doc, params.amount)
    const creditNote = await this.request<MorningDocument>(
      'POST',
      '/documents',
      refundBody,
    )

    return {
      id: creditNote.id,
      transactionId: params.transactionId,
      amount: params.amount ?? doc.amount,
      status: 'completed',
      createdAt: new Date(creditNote.creationDate * 1000),
    }
  }

  async parseWebhook(
    body: unknown,
    _headers?: Record<string, string>,
  ): Promise<BizupWebhookEvent> {
    if (!body || typeof body !== 'object') {
      throw new BizupPayError(
        'Invalid webhook payload',
        'WEBHOOK_PARSE_ERROR',
        'morning',
        body,
      )
    }

    const doc = body as MorningDocument
    if (!doc.id || doc.amount === undefined) {
      throw new BizupPayError(
        'Missing required fields in Morning webhook payload',
        'WEBHOOK_PARSE_ERROR',
        'morning',
        body,
      )
    }

    return fromMorningWebhook(doc)
  }
}
