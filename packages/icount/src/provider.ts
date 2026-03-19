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
  IcountConfig,
  IcountAuthResponse,
  IcountGenerateSaleResponse,
  IcountDocSearchResponse,
  IcountCancelResponse,
  IcountIpnPayload,
} from './types.js'
import {
  toGenerateSaleRequest,
  fromGenerateSaleResponse,
  fromIcountDocument,
  fromIcountIpn,
} from './mapper.js'

export type HttpClient = (
  url: string,
  options: {
    method: string
    headers: Record<string, string>
    body?: string
  },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

export class IcountProvider implements BizupProvider {
  readonly name = 'icount' as const

  private readonly baseUrl: string
  private readonly cid: string
  private readonly accessToken?: string
  private readonly user?: string
  private readonly pass?: string
  private readonly paypageId: number
  private readonly httpClient: HttpClient

  private sid: string | null = null
  private sidExpiresAt: number = 0

  constructor(config: IcountConfig, httpClient?: HttpClient) {
    if (!config.cid) {
      throw new BizupPayError('iCount provider requires cid', 'INVALID_CONFIG', 'icount')
    }
    if (!config.accessToken && (!config.user || !config.pass)) {
      throw new BizupPayError(
        'iCount provider requires either accessToken or user+pass',
        'INVALID_CONFIG',
        'icount',
      )
    }
    if (!config.paypageId) {
      throw new BizupPayError('iCount provider requires paypageId', 'INVALID_CONFIG', 'icount')
    }

    this.cid = config.cid
    this.accessToken = config.accessToken
    this.user = config.user
    this.pass = config.pass
    this.paypageId = config.paypageId
    this.baseUrl = config.baseUrl ?? 'https://api.icount.co.il/api/v3.php'
    this.httpClient = httpClient ?? (globalThis.fetch as unknown as HttpClient)
  }

  private async getSid(): Promise<string> {
    // Return cached sid if still valid (with 1 min buffer)
    if (this.sid && Date.now() < this.sidExpiresAt - 60000) {
      return this.sid
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const body: Record<string, string> = { cid: this.cid }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    } else {
      body.user = this.user!
      body.pass = this.pass!
    }

    const response = await this.httpClient(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }).catch((error) => {
      throw new BizupPayError(
        `Network error calling iCount auth: ${error}`,
        'NETWORK_ERROR',
        'icount',
        error,
      )
    })

    const data = (await response.json()) as IcountAuthResponse
    if (!data.status || !data.sid) {
      throw new BizupPayError(
        `iCount auth failed: ${data.reason}`,
        'INVALID_CONFIG',
        'icount',
        data,
      )
    }

    this.sid = data.sid
    this.sidExpiresAt = Date.now() + 19 * 60 * 1000 // 19 min (20 min TTL with buffer)
    return this.sid
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const sid = await this.getSid()
    const url = `${this.baseUrl}${path}`

    const response = await this.httpClient(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid, ...body }),
    }).catch((error) => {
      throw new BizupPayError(
        `Network error calling iCount API: ${error}`,
        'NETWORK_ERROR',
        'icount',
        error,
      )
    })

    const data = (await response.json()) as T & { status?: boolean; reason?: string }
    if (data.status === false) {
      throw new BizupPayError(
        `iCount API error: ${data.reason}`,
        'PROVIDER_ERROR',
        'icount',
        data,
      )
    }

    return data
  }

  async createSession(params: CreateSessionParams): Promise<BizupPaymentSession> {
    const requestBody = toGenerateSaleRequest(params, this.paypageId)
    const response = await this.request<IcountGenerateSaleResponse>(
      '/paypage/generate_sale',
      requestBody,
    )

    if (!response.sale_url) {
      throw new BizupPayError(
        'iCount generate_sale did not return a sale_url',
        'PROVIDER_ERROR',
        'icount',
        response,
      )
    }

    return fromGenerateSaleResponse(response, params)
  }

  async getTransaction(id: string): Promise<BizupTransaction> {
    // id format: "doctype-docnum" or just docnum
    let doctype = 'invrec'
    let docnum: number

    if (id.includes('-')) {
      const parts = id.split('-')
      doctype = parts[0]
      docnum = parseInt(parts[1], 10)
    } else {
      docnum = parseInt(id, 10)
    }

    const response = await this.request<{ status: boolean; doc?: Record<string, unknown> }>(
      '/doc/info',
      { doctype, docnum, get_pdf_url: true },
    )

    if (!response.doc) {
      throw new BizupPayError(
        `Document ${id} not found`,
        'TRANSACTION_NOT_FOUND',
        'icount',
        response,
      )
    }

    return fromIcountDocument(response.doc as unknown as import('./types.js').IcountDocument)
  }

  async refund(params: RefundParams): Promise<BizupRefund> {
    let doctype = 'invrec'
    let docnum: number

    if (params.transactionId.includes('-')) {
      const parts = params.transactionId.split('-')
      doctype = parts[0]
      docnum = parseInt(parts[1], 10)
    } else {
      docnum = parseInt(params.transactionId, 10)
    }

    const response = await this.request<IcountCancelResponse>(
      '/doc/cancel',
      {
        doctype,
        docnum,
        refund_cc: true,
        reason: 'Refund via BizUp Pay',
      },
    )

    return {
      id: response.refund_docnum ? `${response.refund_doctype}-${response.refund_docnum}` : '',
      transactionId: params.transactionId,
      amount: params.amount ?? 0,
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
        'Invalid IPN payload',
        'WEBHOOK_PARSE_ERROR',
        'icount',
        body,
      )
    }

    return fromIcountIpn(body as IcountIpnPayload)
  }
}
