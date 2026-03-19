import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import type { MockProviderServer, MockTransaction, MockServerOptions } from './types.js'

interface PendingSession {
  id: string
  amount: number
  currency: string
  description: string
  operation: string
  successUrl: string
  failedUrl: string
  webhookUrl: string
  returnValue?: string
  terminalNumber: number
  apiName: string
  customer?: { name: string; email?: string; phone?: string; identityNumber?: string }
  products?: Array<{ description: string; unitCost: number; quantity?: number }>
  advanced?: {
    isAutoRecurringPayment?: boolean
    isCreateToken?: boolean
    firstPayment?: number
    constPayment?: number
    numberOfPayments?: number
  }
  createdAt: Date
}

interface StoredTransaction {
  id: number
  session: PendingSession
  status: number
  cardNum: string
  cardType: string
  approvalNumber: string
  token?: string
  tokenExpiry?: string
  recurringId?: number
  createdAt: Date
}

export class CardcomMockServer implements MockProviderServer {
  readonly name = 'cardcom'
  readonly port: number
  readonly baseUrl: string

  private server: Server | null = null
  private sessions = new Map<string, PendingSession>()
  private storedTransactions = new Map<number, StoredTransaction>()
  private mockTransactions = new Map<string, MockTransaction>()
  private txCounter = 219282000
  private recurringCounter = 100000
  private readonly autoComplete: boolean
  private readonly latencyMs: number

  constructor(options: MockServerOptions = {}) {
    this.port = options.port ?? 4200
    this.baseUrl = `http://localhost:${this.port}/api/v11`
    this.autoComplete = options.autoComplete ?? true
    this.latencyMs = options.latencyMs ?? 0
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res))
      this.server.listen(this.port, () => resolve())
      this.server.on('error', reject)
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve())
      } else {
        resolve()
      }
    })
  }

  reset(): void {
    this.sessions.clear()
    this.storedTransactions.clear()
    this.mockTransactions.clear()
    this.txCounter = 219282000
    this.recurringCounter = 100000
  }

  getTransactions(): MockTransaction[] {
    return Array.from(this.mockTransactions.values())
  }

  getTransaction(id: string): MockTransaction | undefined {
    return this.mockTransactions.get(id)
  }

  completePayment(sessionId: string, options?: {
    fail?: boolean
    cardNum?: string
    cardType?: string
  }): number | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    const txId = ++this.txCounter
    const now = new Date()
    const fail = options?.fail ?? false
    const cardNum = options?.cardNum ?? '0000'
    const cardType = options?.cardType ?? '1'

    const isRecurring = session.advanced?.isAutoRecurringPayment
    const isTokenize = session.operation === 'ChargeAndCreateToken' || session.operation === 'CreateTokenOnly'
    const token = isTokenize ? randomUUID() : undefined
    const recurringId = isRecurring ? ++this.recurringCounter : undefined

    const stored: StoredTransaction = {
      id: txId,
      session,
      status: fail ? 1 : 0,
      cardNum,
      cardType,
      approvalNumber: String(Math.floor(Math.random() * 9000000) + 1000000),
      token,
      tokenExpiry: token ? '20301201' : undefined,
      recurringId,
      createdAt: now,
    }
    this.storedTransactions.set(txId, stored)

    const mockTx: MockTransaction = {
      id: String(txId),
      sessionId,
      amount: session.amount,
      currency: session.currency,
      description: session.description,
      status: fail ? 'failed' : 'completed',
      customer: session.customer,
      cardNum,
      cardType,
      createdAt: now,
      completedAt: now,
      metadata: session.returnValue ? JSON.parse(session.returnValue) : undefined,
    }
    this.mockTransactions.set(String(txId), mockTx)

    return txId
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.latencyMs))
    }

    const url = new URL(req.url ?? '/', `http://localhost:${this.port}`)
    const path = url.pathname.replace('/api/v11', '')

    try {
      if (req.method === 'POST' && path === '/LowProfile/Create') {
        return this.handleLowProfileCreate(req, res)
      }

      if (req.method === 'POST' && path === '/Transactions/GetTransactionInfoById') {
        return this.handleGetTransactionInfo(req, res)
      }

      if (req.method === 'POST' && path === '/Transactions/RefundByTransactionId') {
        return this.handleRefund(req, res)
      }

      // Mock payment page
      const payMatch = url.pathname.match(/^\/pay\/([^/]+)$/)
      if (req.method === 'GET' && payMatch) {
        return this.handlePaymentPage(payMatch[1], res)
      }

      const completeMatch = url.pathname.match(/^\/pay\/([^/]+)\/complete$/)
      if (req.method === 'POST' && completeMatch) {
        return this.handlePaymentComplete(completeMatch[1], req, res)
      }

      this.json(res, 404, { error: 'Not found', path })
    } catch (err) {
      this.json(res, 500, { error: String(err) })
    }
  }

  private async handleLowProfileCreate(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)

    const sessionId = randomUUID()
    const session: PendingSession = {
      id: sessionId,
      amount: body.Amount ?? 0,
      currency: body.ISOCoinId === 2 ? 'USD' : 'ILS',
      description: body.ProductName ?? '',
      operation: body.Operation ?? 'ChargeOnly',
      successUrl: body.SuccessRedirectUrl ?? '',
      failedUrl: body.FailedRedirectUrl ?? '',
      webhookUrl: body.WebHookUrl ?? '',
      returnValue: body.ReturnValue,
      terminalNumber: body.TerminalNumber ?? 1000,
      apiName: body.ApiName ?? '',
      customer: body.Document ? {
        name: body.Document.Name ?? '',
        email: body.Document.Email,
        phone: body.Document.Phone,
        identityNumber: body.Document.IdentityNumber,
      } : undefined,
      products: body.Document?.Products,
      advanced: body.AdvancedDefinition ? {
        isAutoRecurringPayment: body.AdvancedDefinition.IsAutoRecurringPayment,
        isCreateToken: body.AdvancedDefinition.IsCreateToken,
        firstPayment: body.AdvancedDefinition.FirstPayment,
        constPayment: body.AdvancedDefinition.ConstPayment,
        numberOfPayments: body.AdvancedDefinition.NumberOfPayments,
      } : undefined,
      createdAt: new Date(),
    }

    this.sessions.set(sessionId, session)

    if (this.autoComplete) {
      this.completePayment(sessionId)
    }

    this.json(res, 200, {
      ResponseCode: 0,
      Description: 'Success',
      LowProfileId: sessionId,
      Url: `http://localhost:${this.port}/pay/${sessionId}`,
      UrlToPayPal: `http://localhost:${this.port}/pay/${sessionId}?method=paypal`,
      UrlToBit: `http://localhost:${this.port}/pay/${sessionId}?method=bit`,
    })
  }

  private async handleGetTransactionInfo(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)
    const txId = body.InternalDealNumber

    const stored = this.storedTransactions.get(txId)
    if (!stored) {
      this.json(res, 200, [])
      return
    }

    this.json(res, 200, [
      {
        HaveRecipient: true,
        Status1: stored.status,
        CardNumber5: `****${stored.cardNum}`,
        Sulac25: stored.cardType,
        Sum36: Math.round(stored.session.amount * 100),
        SumStars52: stored.session.amount.toFixed(2),
        ApprovalNumber71: stored.approvalNumber,
        NumberOfPayments94: '1',
        CardTypeCode60: stored.cardType,
        CardOwnerName: stored.session.customer?.name ?? '',
        CardToken: stored.token,
        CardHolderIdentityNumber: stored.session.customer?.identityNumber ?? '',
        DealDate: stored.createdAt.toISOString(),
        TerminalNumber: stored.session.terminalNumber,
        InternalDealNumber: stored.id,
        CardOwnerPhone: stored.session.customer?.phone ?? '',
        CardOwnerEmail: stored.session.customer?.email ?? '',
      },
    ])
  }

  private async handleRefund(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)
    const txId = body.TransactionId

    const stored = this.storedTransactions.get(txId)
    if (!stored) {
      this.json(res, 200, { ResponseCode: 1, Description: 'Transaction not found' })
      return
    }

    const newTxId = ++this.txCounter
    stored.status = 2 // refunded

    const mockTx = this.mockTransactions.get(String(txId))
    if (mockTx) mockTx.status = 'refunded'

    this.json(res, 200, {
      ResponseCode: 0,
      Description: 'Success',
      NewTranzactionId: newTxId,
    })
  }

  private handlePaymentPage(sessionId: string, res: ServerResponse): void {
    const session = this.sessions.get(sessionId)
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end('<h1>Session not found</h1>')
      return
    }

    const isRecurring = session.advanced?.isAutoRecurringPayment
    const title = isRecurring ? 'Cardcom Mock - Recurring Payment (הוראת קבע)' : 'Cardcom Mock Payment'
    const recurringInfo = isRecurring
      ? `<div class="recurring-badge">הוראת קבע</div>
         <div class="info">
           ${session.advanced?.numberOfPayments ? `<div>Total payments: ${session.advanced.numberOfPayments}</div>` : '<div>Ongoing recurring</div>'}
           ${session.advanced?.constPayment ? `<div>Monthly: ${session.advanced.constPayment.toFixed(2)} ${session.currency}</div>` : ''}
         </div>`
      : ''

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 0; }
  .provider-banner { background: #dc2626; color: white; text-align: center; padding: 0.6rem 1rem; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.5px; }
  .provider-banner span { opacity: 0.7; font-weight: 400; }
  .content { padding: 1.5rem 1rem; }
  .logo { text-align: center; color: #dc2626; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
  .amount { font-size: 2rem; font-weight: bold; color: #dc2626; text-align: center; margin: 1rem 0; }
  .desc { text-align: center; color: #666; margin-bottom: 1rem; }
  .recurring-badge { background: #fef3c7; color: #92400e; padding: 0.5rem 1rem; border-radius: 6px; text-align: center; font-weight: 600; margin-bottom: 0.75rem; }
  .info { text-align: center; color: #666; margin-bottom: 1.5rem; font-size: 0.9rem; }
  form { display: flex; flex-direction: column; gap: 0.75rem; }
  label { font-weight: 500; }
  input { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
  button { padding: 0.75rem; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; }
  .pay { background: #dc2626; color: white; }
  .fail { background: #6b7280; color: white; }
</style>
</head>
<body>
  <div class="provider-banner">CARDCOM <span>&mdash; Mock Provider Page</span></div>
  <div class="content">
  <div class="logo">CARDCOM Mock</div>
  <div class="amount">${session.amount.toFixed(2)} ${session.currency}</div>
  <div class="desc">${session.description}</div>
  ${recurringInfo}
  <form method="POST" action="/pay/${sessionId}/complete">
    <label>Card Number</label>
    <input name="cardNum" value="4580" />
    <label>Card Type (1=visa, 2=mc, 3=isracard)</label>
    <input name="cardType" value="1" />
    <button type="submit" name="action" value="success" class="pay">${isRecurring ? 'Setup Recurring (Mock)' : 'Pay Now (Mock)'}</button>
    <button type="submit" name="action" value="fail" class="fail">Simulate Failure</button>
  </form>
  </div>
</body>
</html>`)
  }

  private async handlePaymentComplete(sessionId: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end('<h1>Session not found</h1>')
      return
    }

    const formBody = await readFormBody(req)
    const fail = formBody.get('action') === 'fail'

    const txId = this.completePayment(sessionId, {
      fail,
      cardNum: formBody.get('cardNum') ?? '0000',
      cardType: formBody.get('cardType') ?? '1',
    })

    // Send webhook
    if (session.webhookUrl && txId) {
      const stored = this.storedTransactions.get(txId)
      if (stored) {
        const webhookPayload = this.buildWebhookPayload(stored, session)
        fetch(session.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        }).catch(() => {})
      }
    }

    const redirectUrl = fail ? session.failedUrl : session.successUrl
    const messageType = fail ? 'bizup-pay:failure' : 'bizup-pay:success'
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<!DOCTYPE html><html><body>
      <script>
        try {
          window.parent.postMessage({ type: '${messageType}', message: '${fail ? 'Payment failed' : 'Payment successful'}' }, '*');
        } catch(e) {}
        setTimeout(function() {
          try { window.top.location.href = '${redirectUrl}'; } catch(e) {
            window.location.href = '${redirectUrl}';
          }
        }, 500);
      </script>
      <p>Processing payment...</p>
    </body></html>`)
  }

  private buildWebhookPayload(stored: StoredTransaction, session: PendingSession): unknown {
    return {
      ResponseCode: stored.status === 0 ? 0 : 1,
      Description: stored.status === 0 ? 'Success' : 'Failed',
      TerminalNumber: session.terminalNumber,
      LowProfileId: session.id,
      TranzactionId: stored.id,
      ReturnValue: session.returnValue,
      Operation: session.operation,
      UIValues: {
        CardOwnerEmail: session.customer?.email,
        CardOwnerName: session.customer?.name,
        CardOwnerPhone: session.customer?.phone,
        CardOwnerIdentityNumber: session.customer?.identityNumber,
        NumOfPayments: 1,
        CardYear: 30,
        CardMonth: 12,
        IsAbroadCard: false,
      },
      TranzactionInfo: {
        ResponseCode: stored.status === 0 ? 0 : 1,
        Description: stored.status === 0 ? 'Success' : 'Failed',
        TranzactionId: stored.id,
        TerminalNumber: session.terminalNumber,
        Amount: session.amount,
        CoinId: 1,
        CreateDate: stored.createdAt.toISOString(),
        Last4CardDigits: parseInt(stored.cardNum, 10) || 0,
        CardMonth: 12,
        CardYear: 30,
        ApprovalNumber: stored.approvalNumber,
        FirstPaymentAmount: session.amount,
        ConstPaymentAmount: session.advanced?.constPayment ?? 0,
        NumberOfPayments: session.advanced?.numberOfPayments ?? 1,
        CardOwnerName: session.customer?.name ?? '',
        CardOwnerPhone: session.customer?.phone ?? '',
        CardOwnerEmail: session.customer?.email ?? '',
        CardOwnerIdentityNumber: session.customer?.identityNumber ?? '',
      },
      ...(stored.token
        ? {
            TokenInfo: {
              ResponseCode: 0,
              CardToken: stored.token,
              TokenExDate: stored.tokenExpiry,
              TokenApprovalNumber: stored.approvalNumber,
            },
          }
        : {}),
      Country: 'IL',
    }
  }

  private json(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve({})
      }
    })
  })
}

async function readFormBody(req: IncomingMessage): Promise<Map<string, string>> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      const params = new URLSearchParams(data)
      const map = new Map<string, string>()
      for (const [key, value] of params) {
        map.set(key, value)
      }
      resolve(map)
    })
  })
}
