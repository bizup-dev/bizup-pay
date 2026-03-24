import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import type { MockProviderServer, MockTransaction, MockServerOptions } from './types.js'

interface PendingSession {
  id: string
  terminal: string
  amount: number
  currency: string
  description: string
  successUrl: string
  failureUrl: string
  cancelUrl?: string
  webhookUrl: string
  customer?: { name?: string; email?: string; phone?: string; identityNumber?: string }
  installments?: { max?: number; fixed?: number }
  language: string
  metadata?: string
  recurring?: {
    cycle: string
    totalPayments?: number
    amount?: number
    firstAmount?: number
  }
  createdAt: Date
}

interface StoredTransaction {
  id: string
  tranzilaId: string
  session: PendingSession
  status: string
  cardLastFour: string
  cardBrand: string
  approvalNumber: string
  token?: string
  tokenExpiry?: string
  standingOrderId?: string
  createdAt: Date
}

export class TranzillaMockServer implements MockProviderServer {
  readonly name = 'tranzilla'
  readonly port: number
  readonly baseUrl: string

  private server: Server | null = null
  private sessions = new Map<string, PendingSession>()
  private storedTransactions = new Map<string, StoredTransaction>()
  private mockTransactions = new Map<string, MockTransaction>()
  private txCounter = 700000
  private standingOrderCounter = 500000
  private readonly autoComplete: boolean
  private readonly latencyMs: number

  constructor(options: MockServerOptions = {}) {
    this.port = options.port ?? 4500
    this.baseUrl = `http://localhost:${this.port}/v1`
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
    this.txCounter = 700000
    this.standingOrderCounter = 500000
  }

  getTransactions(): MockTransaction[] {
    return Array.from(this.mockTransactions.values())
  }

  getTransaction(id: string): MockTransaction | undefined {
    return this.mockTransactions.get(id)
  }

  completePayment(sessionId: string, options?: {
    fail?: boolean
    cardLastFour?: string
    cardBrand?: string
  }): string | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    const txId = String(++this.txCounter)
    const tranzilaId = `TRZ-${txId}`
    const now = new Date()
    const fail = options?.fail ?? false
    const cardLastFour = options?.cardLastFour ?? '4580'
    const cardBrand = options?.cardBrand ?? 'visa'

    const isRecurring = !!session.recurring
    const token = isRecurring ? randomUUID() : undefined
    const standingOrderId = isRecurring ? `SO-${++this.standingOrderCounter}` : undefined

    const stored: StoredTransaction = {
      id: txId,
      tranzilaId,
      session,
      status: fail ? 'declined' : 'approved',
      cardLastFour,
      cardBrand,
      approvalNumber: String(Math.floor(Math.random() * 9000000) + 1000000),
      token,
      tokenExpiry: token ? '2030-12-01' : undefined,
      standingOrderId,
      createdAt: now,
    }
    this.storedTransactions.set(txId, stored)

    const mockTx: MockTransaction = {
      id: txId,
      sessionId,
      amount: session.amount,
      currency: session.currency,
      description: session.description,
      status: fail ? 'failed' : 'completed',
      customer: session.customer ? {
        name: session.customer.name ?? '',
        email: session.customer.email,
        phone: session.customer.phone,
      } : undefined,
      cardNum: cardLastFour,
      cardType: cardBrand,
      createdAt: now,
      completedAt: now,
      metadata: session.metadata ? JSON.parse(session.metadata) : undefined,
    }
    this.mockTransactions.set(txId, mockTx)

    return txId
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.latencyMs))
    }

    const url = new URL(req.url ?? '/', `http://localhost:${this.port}`)
    const path = url.pathname.replace('/v1', '')

    try {
      if (req.method === 'POST' && path === '/payment/session') {
        return this.handleCreateSession(req, res)
      }

      const txMatch = path.match(/^\/transactions\/([^/]+)$/)
      if (req.method === 'GET' && txMatch) {
        return this.handleGetTransaction(txMatch[1], res)
      }

      const refundMatch = path.match(/^\/transactions\/([^/]+)\/refund$/)
      if (req.method === 'POST' && refundMatch) {
        return this.handleRefund(refundMatch[1], req, res)
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

      this.json(res, 404, { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    } catch (err) {
      this.json(res, 500, { success: false, error: { code: 'INTERNAL', message: String(err) } })
    }
  }

  private async handleCreateSession(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)

    const sessionId = randomUUID()
    const session: PendingSession = {
      id: sessionId,
      terminal: body.terminal ?? '',
      amount: body.amount ?? 0,
      currency: body.currency ?? 'ILS',
      description: body.description ?? '',
      successUrl: body.success_url ?? '',
      failureUrl: body.failure_url ?? '',
      cancelUrl: body.cancel_url,
      webhookUrl: body.webhook_url ?? '',
      customer: body.customer ? {
        name: body.customer.name,
        email: body.customer.email,
        phone: body.customer.phone,
        identityNumber: body.customer.identity_number,
      } : undefined,
      installments: body.installments,
      language: body.language ?? 'he',
      metadata: body.metadata,
      recurring: body.recurring ? {
        cycle: body.recurring.cycle,
        totalPayments: body.recurring.total_payments,
        amount: body.recurring.amount,
        firstAmount: body.recurring.first_amount,
      } : undefined,
      createdAt: new Date(),
    }

    this.sessions.set(sessionId, session)

    if (this.autoComplete) {
      this.completePayment(sessionId)
    }

    this.json(res, 200, {
      success: true,
      data: {
        session_id: sessionId,
        page_url: `http://localhost:${this.port}/pay/${sessionId}`,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    })
  }

  private handleGetTransaction(txId: string, res: ServerResponse): void {
    const stored = this.storedTransactions.get(txId)
    if (!stored) {
      this.json(res, 404, { success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } })
      return
    }

    this.json(res, 200, {
      success: true,
      data: this.buildTransactionData(stored),
    })
  }

  private async handleRefund(txId: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)
    const stored = this.storedTransactions.get(txId)
    if (!stored) {
      this.json(res, 404, { success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } })
      return
    }

    const refundAmount = body.amount ?? stored.session.amount
    stored.status = refundAmount < stored.session.amount ? 'partially_refunded' : 'refunded'

    const mockTx = this.mockTransactions.get(txId)
    if (mockTx) mockTx.status = 'refunded'

    this.json(res, 200, {
      success: true,
      data: {
        refund_id: `REF-${randomUUID().slice(0, 8)}`,
        transaction_id: txId,
        amount: refundAmount,
        status: 'completed',
      },
    })
  }

  private handlePaymentPage(sessionId: string, res: ServerResponse): void {
    const session = this.sessions.get(sessionId)
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end('<h1>Session not found</h1>')
      return
    }

    const isRecurring = !!session.recurring
    const title = isRecurring ? 'Tranzilla Mock - Recurring Payment (הוראת קבע)' : 'Tranzilla Mock Payment'
    const recurringInfo = isRecurring
      ? `<div class="recurring-badge">הוראת קבע</div>
         <div class="info">
           ${session.recurring?.totalPayments ? `<div>Total payments: ${session.recurring.totalPayments}</div>` : '<div>Ongoing recurring</div>'}
           ${session.recurring?.cycle ? `<div>Cycle: ${session.recurring.cycle}</div>` : ''}
         </div>`
      : ''

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 0; }
  .provider-banner { background: #f59e0b; color: white; text-align: center; padding: 0.6rem 1rem; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.5px; }
  .provider-banner span { opacity: 0.7; font-weight: 400; }
  .content { padding: 1.5rem 1rem; }
  .logo { text-align: center; color: #f59e0b; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
  .amount { font-size: 2rem; font-weight: bold; color: #f59e0b; text-align: center; margin: 1rem 0; }
  .desc { text-align: center; color: #666; margin-bottom: 1rem; }
  .recurring-badge { background: #fef3c7; color: #92400e; padding: 0.5rem 1rem; border-radius: 6px; text-align: center; font-weight: 600; margin-bottom: 0.75rem; }
  .info { text-align: center; color: #666; margin-bottom: 1.5rem; font-size: 0.9rem; }
  form { display: flex; flex-direction: column; gap: 0.75rem; }
  label { font-weight: 500; }
  input { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
  button { padding: 0.75rem; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; }
  .pay { background: #f59e0b; color: white; }
  .fail { background: #6b7280; color: white; }
</style>
</head>
<body>
  <div class="provider-banner">TRANZILLA <span>&mdash; Mock Provider Page</span></div>
  <div class="content">
  <div class="logo">Tranzilla Mock</div>
  <div class="amount">${session.amount.toFixed(2)} ${session.currency}</div>
  <div class="desc">${session.description}</div>
  ${recurringInfo}
  <form method="POST" action="/pay/${sessionId}/complete">
    <label>Card Number (last 4)</label>
    <input name="cardLastFour" value="4580" />
    <label>Card Brand</label>
    <input name="cardBrand" value="visa" />
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
      cardLastFour: formBody.get('cardLastFour') ?? '4580',
      cardBrand: formBody.get('cardBrand') ?? 'visa',
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

    const redirectUrl = fail ? session.failureUrl : session.successUrl
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

  private buildTransactionData(stored: StoredTransaction): unknown {
    return {
      transaction_id: stored.id,
      tranzila_id: stored.tranzilaId,
      status: stored.status,
      amount: stored.session.amount,
      currency: stored.session.currency,
      card_last_four: stored.cardLastFour,
      card_brand: stored.cardBrand,
      approval_number: stored.approvalNumber,
      installments: 1,
      customer: stored.session.customer ? {
        name: stored.session.customer.name,
        email: stored.session.customer.email,
        phone: stored.session.customer.phone,
        identity_number: stored.session.customer.identityNumber,
      } : undefined,
      token: stored.token,
      token_expiry: stored.tokenExpiry,
      standing_order_id: stored.standingOrderId,
      document_url: stored.status === 'approved' ? `http://localhost:${this.port}/mock-doc/${stored.id}.pdf` : undefined,
      metadata: stored.session.metadata,
      created_at: stored.createdAt.toISOString(),
    }
  }

  private buildWebhookPayload(stored: StoredTransaction, session: PendingSession): unknown {
    return {
      event: stored.status === 'approved' ? 'payment.completed' : 'payment.failed',
      transaction_id: stored.id,
      tranzila_id: stored.tranzilaId,
      terminal: session.terminal,
      amount: session.amount,
      currency: session.currency,
      status: stored.status,
      card_last_four: stored.cardLastFour,
      card_brand: stored.cardBrand,
      approval_number: stored.approvalNumber,
      installments: 1,
      customer: session.customer ? {
        name: session.customer.name,
        email: session.customer.email,
        phone: session.customer.phone,
        identity_number: session.customer.identityNumber,
      } : undefined,
      token: stored.token,
      token_expiry: stored.tokenExpiry,
      standing_order_id: stored.standingOrderId,
      metadata: session.metadata,
      created_at: stored.createdAt.toISOString(),
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
