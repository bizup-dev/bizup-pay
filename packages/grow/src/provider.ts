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
  GrowConfig,
  GrowCreatePaymentResponse,
  GrowTransactionInfo,
  GrowRefundResponse,
  GrowWebhookPayload,
} from './types.js'
import {
  toGrowCreatePaymentRequest,
  fromGrowCreatePaymentResponse,
  fromGrowTransactionInfo,
  fromGrowWebhook,
} from './mapper.js'

export type HttpClient = (
  url: string,
  options: {
    method: string
    headers: Record<string, string>
    body?: string
  },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

export class GrowProvider implements BizupProvider {
  readonly name = 'grow' as const

  private readonly baseUrl: string
  private readonly pageCode: string
  private readonly userId: string
  private readonly httpClient: HttpClient

  constructor(config: GrowConfig, httpClient?: HttpClient) {
    if (!config.pageCode) {
      throw new BizupPayError('Grow provider requires pageCode', 'INVALID_CONFIG', 'grow')
    }
    if (!config.userId) {
      throw new BizupPayError('Grow provider requires userId', 'INVALID_CONFIG', 'grow')
    }

    this.pageCode = config.pageCode
    this.userId = config.userId
    this.baseUrl = config.baseUrl ?? 'https://secure.meshulam.co.il/api/light/server/1.0'
    this.httpClient = httpClient ?? (globalThis.fetch as unknown as HttpClient)
  }

  private toFormBody(params: Record<string, string>): string {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      searchParams.append(key, value)
    }
    return searchParams.toString()
  }

  private async request<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const body = this.toFormBody(params)

    const response = await this.httpClient(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }).catch((error) => {
      throw new BizupPayError(
        `Network error calling Grow API: ${error}`,
        'NETWORK_ERROR',
        'grow',
        error,
      )
    })

    const data = (await response.json()) as T & { status?: number }
    if (data.status !== undefined && data.status !== 1) {
      throw new BizupPayError(
        `Grow API error (status=${data.status})`,
        'PROVIDER_ERROR',
        'grow',
        data,
      )
    }

    return data
  }

  async createSession(params: CreateSessionParams): Promise<BizupPaymentSession> {
    const formParams = toGrowCreatePaymentRequest(params, this.pageCode, this.userId)
    const response = await this.request<GrowCreatePaymentResponse>(
      '/createPaymentProcess',
      formParams,
    )

    if (!response.data?.url) {
      throw new BizupPayError(
        'Grow createPaymentProcess did not return a url',
        'PROVIDER_ERROR',
        'grow',
        response,
      )
    }

    return fromGrowCreatePaymentResponse(response, params)
  }

  async getTransaction(id: string): Promise<BizupTransaction> {
    // id format: "transactionId:transactionToken"
    const [transactionId, transactionToken] = id.split(':')

    if (!transactionId || !transactionToken) {
      throw new BizupPayError(
        'Grow getTransaction requires id in format "transactionId:transactionToken"',
        'INVALID_PARAMS',
        'grow',
      )
    }

    const response = await this.request<GrowTransactionInfo>(
      '/getTransactionInfo',
      {
        pageCode: this.pageCode,
        transactionId,
        transactionToken,
      },
    )

    return fromGrowTransactionInfo(response)
  }

  async refund(params: RefundParams): Promise<BizupRefund> {
    // transactionId format: "transactionId:transactionToken"
    const [transactionId, transactionToken] = params.transactionId.split(':')

    if (!transactionId || !transactionToken) {
      throw new BizupPayError(
        'Grow refund requires transactionId in format "transactionId:transactionToken"',
        'INVALID_PARAMS',
        'grow',
      )
    }

    const formParams: Record<string, string> = {
      pageCode: this.pageCode,
      userId: this.userId,
      transactionId,
      transactionToken,
    }

    if (params.amount !== undefined) {
      formParams.refundSum = String(params.amount)
    }

    const response = await this.request<GrowRefundResponse>(
      '/refundTransaction',
      formParams,
    )

    return {
      id: String(response.data?.transactionId ?? transactionId),
      transactionId: params.transactionId,
      amount: params.amount ?? response.data?.refundSum ?? 0,
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
        'grow',
        body,
      )
    }

    const payload = body as GrowWebhookPayload
    if (!payload.transactionId) {
      throw new BizupPayError(
        'Webhook payload missing transactionId',
        'WEBHOOK_PARSE_ERROR',
        'grow',
        body,
      )
    }

    return fromGrowWebhook(payload)
  }
}
