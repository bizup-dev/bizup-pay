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
import type {
  TranzillaConfig,
  TranzillaCreateSessionResponse,
  TranzillaTransactionResponse,
  TranzillaRefundResponse,
  TranzillaWebhookPayload,
} from './types.js'
import {
  toTranzillaCreateSessionRequest,
  fromTranzillaCreateSessionResponse,
  fromTranzillaTransaction,
  fromTranzillaWebhook,
} from './mapper.js'

export type HttpClient = (
  url: string,
  options: {
    method: string
    headers: Record<string, string>
    body?: string
  },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

export class TranzillaProvider implements BizupProvider {
  readonly name = 'tranzilla' as const

  private readonly baseUrl: string
  private readonly appKey: string
  private readonly secretKey: string
  private readonly terminal: string
  private readonly httpClient: HttpClient

  constructor(config: TranzillaConfig, httpClient?: HttpClient) {
    if (!config.appKey || !config.secretKey || !config.terminal) {
      throw new BizupPayError(
        'Tranzilla provider requires appKey, secretKey, and terminal',
        'INVALID_CONFIG',
        'tranzilla',
      )
    }

    this.appKey = config.appKey
    this.secretKey = config.secretKey
    this.terminal = config.terminal
    this.baseUrl = config.baseUrl ?? 'https://api.tranzila.com/v1'
    this.httpClient = httpClient ?? (globalThis.fetch as unknown as HttpClient)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`

    const response = await this.httpClient(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-tranzila-api-app-key': this.appKey,
        'X-tranzila-api-terminal': this.terminal,
      },
      body: body ? JSON.stringify(body) : undefined,
    }).catch((error) => {
      throw new BizupPayError(
        `Network error calling Tranzilla API: ${error}`,
        'NETWORK_ERROR',
        'tranzilla',
        error,
      )
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new BizupPayError(
        `Tranzilla API error (${response.status})`,
        'PROVIDER_ERROR',
        'tranzilla',
        errorBody,
      )
    }

    return (await response.json()) as T
  }

  async createSession(params: CreateSessionParams): Promise<BizupPaymentSession> {
    const requestBody = toTranzillaCreateSessionRequest(params, {
      terminal: this.terminal,
    })

    const response = await this.request<TranzillaCreateSessionResponse>(
      'POST',
      '/payment/session',
      requestBody,
    )

    if (!response.success || !response.data) {
      throw new BizupPayError(
        `Tranzilla createSession failed: ${response.error?.message ?? 'Unknown error'}`,
        'PROVIDER_ERROR',
        'tranzilla',
        response,
      )
    }

    return fromTranzillaCreateSessionResponse(response, params)
  }

  async getTransaction(id: string): Promise<BizupTransaction> {
    const response = await this.request<TranzillaTransactionResponse>(
      'GET',
      `/transactions/${encodeURIComponent(id)}`,
    )

    if (!response.success || !response.data) {
      throw new BizupPayError(
        `Transaction ${id} not found`,
        'TRANSACTION_NOT_FOUND',
        'tranzilla',
      )
    }

    return fromTranzillaTransaction(response.data)
  }

  async refund(params: RefundParams): Promise<BizupRefund> {
    const body: Record<string, unknown> = {
      transaction_id: params.transactionId,
    }

    if (params.amount !== undefined) {
      body.amount = params.amount
    }

    const response = await this.request<TranzillaRefundResponse>(
      'POST',
      `/transactions/${encodeURIComponent(params.transactionId)}/refund`,
      body,
    )

    if (!response.success || !response.data) {
      throw new BizupPayError(
        `Tranzilla refund failed: ${response.error?.message ?? 'Unknown error'}`,
        'REFUND_FAILED',
        'tranzilla',
        response,
      )
    }

    return {
      id: response.data.refund_id,
      transactionId: params.transactionId,
      amount: response.data.amount,
      status: 'completed',
      createdAt: new Date(),
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
        'tranzilla',
        body,
      )
    }

    const payload = body as TranzillaWebhookPayload
    if (!payload.transaction_id || !payload.tranzila_id) {
      throw new BizupPayError(
        'Missing required fields in Tranzilla webhook payload',
        'WEBHOOK_PARSE_ERROR',
        'tranzilla',
        body,
      )
    }

    return fromTranzillaWebhook(payload)
  }
}
