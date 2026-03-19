import type {
  BizupProvider,
  CreateSessionParams,
  RefundParams,
  ChargeTokenParams,
  BizupPaymentSession,
  BizupTransaction,
  BizupRefund,
  BizupWebhookEvent,
} from '@bizup-pay/core'
import { BizupPayError } from '@bizup-pay/core'
import type {
  CardcomConfig,
  CardcomLowProfileCreateResponse,
  CardcomTransactionInfo,
  CardcomRefundResponse,
  CardcomWebhookPayload,
  CardcomChargeTokenResponse,
} from './types.js'
import {
  toCardcomLowProfileRequest,
  fromCardcomLowProfileResponse,
  fromCardcomTransactionInfo,
  fromCardcomWebhook,
  toCardcomCreateTokenRequest,
  toCardcomChargeTokenRequest,
  fromCardcomChargeTokenResponse,
} from './mapper.js'

export type HttpClient = (
  url: string,
  options: {
    method: string
    headers: Record<string, string>
    body?: string
  },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

export class CardcomProvider implements BizupProvider {
  readonly name = 'cardcom' as const

  private readonly baseUrl: string
  private readonly terminalNumber: number
  private readonly apiName: string
  private readonly apiPassword: string
  private readonly httpClient: HttpClient

  constructor(config: CardcomConfig, httpClient?: HttpClient) {
    if (!config.terminalNumber || !config.apiName || !config.apiPassword) {
      throw new BizupPayError(
        'Cardcom provider requires terminalNumber, apiName, and apiPassword',
        'INVALID_CONFIG',
        'cardcom',
      )
    }

    this.terminalNumber = config.terminalNumber
    this.apiName = config.apiName
    this.apiPassword = config.apiPassword
    this.baseUrl = config.baseUrl ?? 'https://secure.cardcom.solutions/api/v11'
    this.httpClient = httpClient ?? (globalThis.fetch as unknown as HttpClient)
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`

    const response = await this.httpClient(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch((error) => {
      throw new BizupPayError(
        `Network error calling Cardcom API: ${error}`,
        'NETWORK_ERROR',
        'cardcom',
        error,
      )
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new BizupPayError(
        `Cardcom API error (${response.status})`,
        'PROVIDER_ERROR',
        'cardcom',
        errorBody,
      )
    }

    return (await response.json()) as T
  }

  async createSession(params: CreateSessionParams): Promise<BizupPaymentSession> {
    const requestBody = toCardcomLowProfileRequest(params, {
      terminalNumber: this.terminalNumber,
      apiName: this.apiName,
    })

    const response = await this.request<CardcomLowProfileCreateResponse>(
      '/LowProfile/Create',
      requestBody,
    )

    if (response.ResponseCode !== 0) {
      throw new BizupPayError(
        `Cardcom LowProfile/Create failed: ${response.Description}`,
        'PROVIDER_ERROR',
        'cardcom',
        response,
      )
    }

    return fromCardcomLowProfileResponse(response, params)
  }

  async getTransaction(id: string): Promise<BizupTransaction> {
    const response = await this.request<CardcomTransactionInfo[]>(
      '/Transactions/GetTransactionInfoById',
      {
        TerminalNumber: this.terminalNumber,
        UserName: this.apiName,
        UserPassword: this.apiPassword,
        InternalDealNumber: parseInt(id, 10),
      },
    )

    if (!response || response.length === 0) {
      throw new BizupPayError(
        `Transaction ${id} not found`,
        'TRANSACTION_NOT_FOUND',
        'cardcom',
      )
    }

    return fromCardcomTransactionInfo(response[0])
  }

  async refund(params: RefundParams): Promise<BizupRefund> {
    const body: Record<string, unknown> = {
      ApiName: this.apiName,
      ApiPassword: this.apiPassword,
      TransactionId: parseInt(params.transactionId, 10),
    }

    if (params.amount !== undefined) {
      body.PartialSum = params.amount
    }

    const response = await this.request<CardcomRefundResponse>(
      '/Transactions/RefundByTransactionId',
      body,
    )

    if (response.ResponseCode !== 0) {
      throw new BizupPayError(
        `Cardcom refund failed: ${response.Description}`,
        'REFUND_FAILED',
        'cardcom',
        response,
      )
    }

    return {
      id: String(response.NewTranzactionId ?? ''),
      transactionId: params.transactionId,
      amount: params.amount ?? 0,
      status: 'completed',
      createdAt: new Date(),
    }
  }

  async createToken(params: CreateSessionParams): Promise<BizupPaymentSession> {
    const requestBody = toCardcomCreateTokenRequest(params, {
      terminalNumber: this.terminalNumber,
      apiName: this.apiName,
    })

    const response = await this.request<CardcomLowProfileCreateResponse>(
      '/LowProfile/Create',
      requestBody,
    )

    if (response.ResponseCode !== 0) {
      throw new BizupPayError(
        `Cardcom LowProfile/Create failed: ${response.Description}`,
        'PROVIDER_ERROR',
        'cardcom',
        response,
      )
    }

    return fromCardcomLowProfileResponse(response, params)
  }

  async chargeToken(params: ChargeTokenParams): Promise<BizupTransaction> {
    const requestBody = toCardcomChargeTokenRequest(params, {
      terminalNumber: this.terminalNumber,
      apiName: this.apiName,
    })

    const response = await this.request<CardcomChargeTokenResponse>(
      '/Transactions/Transaction',
      requestBody,
    )

    if (response.ResponseCode !== 0) {
      throw new BizupPayError(
        `Cardcom token charge failed: ${response.Description}`,
        'TOKEN_FAILED',
        'cardcom',
        response,
      )
    }

    return fromCardcomChargeTokenResponse(response)
  }

  async parseWebhook(
    body: unknown,
    _headers?: Record<string, string>,
  ): Promise<BizupWebhookEvent> {
    if (!body || typeof body !== 'object') {
      throw new BizupPayError(
        'Invalid webhook payload',
        'WEBHOOK_PARSE_ERROR',
        'cardcom',
        body,
      )
    }

    const payload = body as CardcomWebhookPayload
    if (!payload.LowProfileId || payload.TranzactionId === undefined) {
      throw new BizupPayError(
        'Missing required fields in Cardcom webhook payload',
        'WEBHOOK_PARSE_ERROR',
        'cardcom',
        body,
      )
    }

    return fromCardcomWebhook(payload)
  }
}
