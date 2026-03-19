import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import type { MockProviderServer, MockTransaction, MockServerOptions } from './types.js'

interface PendingSession {
  id: string
  saleUniqid: string
  saleSid: string
  amount: number
  currency: string
  description: string
  successUrl: string
  failureUrl?: string
  cancelUrl?: string
  ipnUrl: string
  paypageId: number
  customer?: { name: string; email?: string; phone?: string; taxId?: string }
  recurring?: {
    hkIssueEvery?: number
    hkPayments?: number
    hkStartDate?: string
  }
  custom?: string
  createdAt: Date
}

interface StoredDocument {
  doctype: string
  docnum: number
  client_id?: number
  client_name?: string
  email?: string
  phone?: string
  vat_id?: string
  currency_id: number
  currency_code: string
  total: number
  total_vat: number
  issue_date: string
  created: string
  status: string
  cc_confirmation?: string
  cc_last4?: string
  cc_type?: string
  cc_num_of_payments: number
  items: Array<{
    description: string
    unitprice: number
    quantity: number
    total: number
  }>
  pdf_url: string
}

export class IcountMockServer implements MockProviderServer {
  readonly name = 'icount'
  readonly port: number
  readonly baseUrl: string

  private server: Server | null = null
  private sessions = new Map<string, PendingSession>()
  private documents = new Map<string, StoredDocument>()
  private mockTransactions = new Map<string, MockTransaction>()
  private docCounter = 1000
  private readonly autoComplete: boolean
  private readonly latencyMs: number

  constructor(options: MockServerOptions = {}) {
    this.port = options.port ?? 4300
    this.baseUrl = `http://localhost:${this.port}/api/v3.php`
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
    this.documents.clear()
    this.mockTransactions.clear()
    this.docCounter = 1000
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
  }): string | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    const fail = options?.fail ?? false
    const docnum = ++this.docCounter
    const doctype = 'invrec'
    const docId = `${doctype}-${docnum}`
    const now = new Date()
    const cardNum = options?.cardNum ?? '4580'
    const cardType = options?.cardType ?? 'visa'

    const doc: StoredDocument = {
      doctype,
      docnum,
      client_name: session.customer?.name,
      email: session.customer?.email,
      phone: session.customer?.phone,
      vat_id: session.customer?.taxId,
      currency_id: session.currency === 'USD' ? 2 : 1,
      currency_code: session.currency,
      total: session.amount,
      total_vat: +(session.amount / 1.17 * 0.17).toFixed(2),
      issue_date: now.toISOString().split('T')[0],
      created: now.toISOString(),
      status: fail ? 'cancelled' : 'closed',
      cc_confirmation: fail ? undefined : String(Math.floor(Math.random() * 9000000) + 1000000),
      cc_last4: cardNum.slice(-4),
      cc_type: cardType,
      cc_num_of_payments: 1,
      items: [{
        description: session.description,
        unitprice: session.amount,
        quantity: 1,
        total: session.amount,
      }],
      pdf_url: `http://localhost:${this.port}/mock-pdf/${doctype}-${docnum}.pdf`,
    }

    this.documents.set(docId, doc)

    const mockTx: MockTransaction = {
      id: docId,
      sessionId,
      amount: session.amount,
      currency: session.currency,
      description: session.description,
      status: fail ? 'failed' : 'completed',
      customer: session.customer,
      cardNum: cardNum.slice(-4),
      cardType,
      createdAt: now,
      completedAt: now,
      metadata: session.custom ? JSON.parse(session.custom) : undefined,
    }
    this.mockTransactions.set(docId, mockTx)

    return docId
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.latencyMs))
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url ?? '/', `http://localhost:${this.port}`)
    const path = url.pathname.replace('/api/v3.php', '')

    try {
      // POST /auth/login
      if (req.method === 'POST' && path === '/auth/login') {
        return this.handleAuth(req, res)
      }

      // POST /paypage/generate_sale
      if (req.method === 'POST' && path === '/paypage/generate_sale') {
        return this.handleGenerateSale(req, res)
      }

      // POST /doc/info
      if (req.method === 'POST' && path === '/doc/info') {
        return this.handleDocInfo(req, res)
      }

      // POST /doc/cancel
      if (req.method === 'POST' && path === '/doc/cancel') {
        return this.handleDocCancel(req, res)
      }

      // GET /pay/:sessionId — mock payment page
      const payMatch = url.pathname.match(/^\/pay\/([^/]+)$/)
      if (req.method === 'GET' && payMatch) {
        return this.handlePaymentPage(payMatch[1], res)
      }

      // POST /pay/:sessionId/complete — simulate payment completion
      const completeMatch = url.pathname.match(/^\/pay\/([^/]+)\/complete$/)
      if (req.method === 'POST' && completeMatch) {
        return this.handlePaymentComplete(completeMatch[1], req, res)
      }

      this.json(res, 404, { status: false, reason: 'Not found', path })
    } catch (err) {
      this.json(res, 500, { status: false, reason: String(err) })
    }
  }

  private async handleAuth(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)

    if (!body.cid) {
      return this.json(res, 200, { status: false, reason: 'Missing cid' })
    }

    this.json(res, 200, {
      status: true,
      reason: '',
      sid: `mock-sid-${randomUUID().slice(0, 8)}`,
      cid: body.cid,
      user: body.user ?? 'api',
    })
  }

  private async handleGenerateSale(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)

    const sessionId = randomUUID()
    const saleUniqid = randomUUID()
    const saleSid = randomUUID()

    const session: PendingSession = {
      id: sessionId,
      saleUniqid,
      saleSid,
      amount: body.sum ?? 0,
      currency: body.currency_code ?? 'ILS',
      description: body.description ?? '',
      successUrl: body.success_url ?? '',
      failureUrl: body.failure_url ?? '',
      cancelUrl: body.cancel_url ?? '',
      ipnUrl: body.ipn_url ?? '',
      paypageId: body.paypage_id ?? 1,
      customer: body.client_name ? {
        name: body.client_name,
        email: body.email,
        phone: body.phone,
        taxId: body.vat_id,
      } : undefined,
      recurring: body.hk_issue_every !== undefined ? {
        hkIssueEvery: body.hk_issue_every,
        hkPayments: body.hk_payments,
        hkStartDate: body.hk_start_date,
      } : undefined,
      custom: body.custom,
      createdAt: new Date(),
    }

    this.sessions.set(sessionId, session)

    if (this.autoComplete) {
      this.completePayment(sessionId)
    }

    this.json(res, 200, {
      status: true,
      reason: '',
      paypage_id: String(session.paypageId),
      sale_uniqid: saleUniqid,
      sale_sid: saleSid,
      sale_url: `http://localhost:${this.port}/pay/${sessionId}`,
    })
  }

  private async handleDocInfo(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)
    const doctype = body.doctype ?? 'invrec'
    const docnum = body.docnum
    const docId = `${doctype}-${docnum}`

    const doc = this.documents.get(docId)
    if (!doc) {
      return this.json(res, 200, { status: false, reason: 'Document not found' })
    }

    this.json(res, 200, {
      status: true,
      reason: '',
      doc,
    })
  }

  private async handleDocCancel(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)
    const doctype = body.doctype ?? 'invrec'
    const docnum = body.docnum
    const docId = `${doctype}-${docnum}`

    const doc = this.documents.get(docId)
    if (!doc) {
      return this.json(res, 200, { status: false, reason: 'Document not found' })
    }

    doc.status = 'cancelled'

    // Update mock transaction status
    const mockTx = this.mockTransactions.get(docId)
    if (mockTx) mockTx.status = 'refunded'

    const refundDocnum = ++this.docCounter
    const refundDoctype = 'refund'

    this.json(res, 200, {
      status: true,
      reason: '',
      refund_doctype: refundDoctype,
      refund_docnum: refundDocnum,
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
    const title = isRecurring ? 'iCount Mock - Recurring Payment' : 'iCount Mock Payment'
    const recurringInfo = isRecurring
      ? `<div class="recurring-badge">Recurring Payment</div>
         <div class="info">
           ${session.recurring?.hkPayments ? `<div>Total payments: ${session.recurring.hkPayments}</div>` : '<div>Ongoing recurring</div>'}
           ${session.recurring?.hkIssueEvery ? `<div>Every ${session.recurring.hkIssueEvery} month(s)</div>` : ''}
         </div>`
      : ''

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 0; }
  .provider-banner { background: #2563eb; color: white; text-align: center; padding: 0.6rem 1rem; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.5px; }
  .provider-banner span { opacity: 0.7; font-weight: 400; }
  .content { padding: 1.5rem 1rem; }
  .logo { text-align: center; color: #2563eb; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
  .amount { font-size: 2rem; font-weight: bold; color: #2563eb; text-align: center; margin: 1rem 0; }
  .desc { text-align: center; color: #666; margin-bottom: 1rem; }
  .recurring-badge { background: #fef3c7; color: #92400e; padding: 0.5rem 1rem; border-radius: 6px; text-align: center; font-weight: 600; margin-bottom: 0.75rem; }
  .info { text-align: center; color: #666; margin-bottom: 1.5rem; font-size: 0.9rem; }
  form { display: flex; flex-direction: column; gap: 0.75rem; }
  label { font-weight: 500; }
  input { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
  button { padding: 0.75rem; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; }
  .pay { background: #2563eb; color: white; }
  .fail { background: #6b7280; color: white; }
</style>
</head>
<body>
  <div class="provider-banner">ICOUNT <span>&mdash; Mock Provider Page</span></div>
  <div class="content">
  <div class="logo">iCount Mock</div>
  <div class="amount">${session.amount.toFixed(2)} ${session.currency}</div>
  <div class="desc">${session.description}</div>
  ${recurringInfo}
  <form method="POST" action="/pay/${sessionId}/complete">
    <label>Card Number</label>
    <input name="cardNum" value="4580" />
    <label>Card Type</label>
    <input name="cardType" value="visa" />
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

    const docId = this.completePayment(sessionId, {
      fail,
      cardNum: formBody.get('cardNum') ?? '4580',
      cardType: formBody.get('cardType') ?? 'visa',
    })

    // Send IPN webhook
    if (session.ipnUrl && docId) {
      const doc = this.documents.get(docId)
      if (doc) {
        const ipnPayload = {
          sale_sid: session.saleSid,
          sale_uniqid: session.saleUniqid,
          paypage_id: session.paypageId,
          status: fail ? 'failed' : 'success',
          confirmation_code: doc.cc_confirmation,
          sum: session.amount,
          currency_code: session.currency,
          client_name: session.customer?.name,
          email: session.customer?.email,
          phone: session.customer?.phone,
          doctype: doc.doctype,
          docnum: doc.docnum,
          cc_last4: doc.cc_last4,
          cc_type: doc.cc_type,
          num_of_payments: doc.cc_num_of_payments,
        }
        fetch(session.ipnUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ipnPayload),
        }).catch(() => {})
      }
    }

    const redirectUrl = fail
      ? session.failureUrl ?? session.successUrl
      : session.successUrl
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
