import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import type { MockProviderServer, MockTransaction, MockServerOptions } from './types.js'

interface PendingSession {
  id: string
  amount: number
  currency: string
  description: string
  successUrl: string
  failureUrl?: string
  notifyUrl: string
  customer?: { name: string; email?: string; phone?: string; taxId?: string }
  income: Array<{ description: string; quantity: number; price: number; currency: string; vatType: number }>
  custom?: string
  createdAt: Date
}

export class MorningMockServer implements MockProviderServer {
  readonly name = 'morning'
  readonly port: number
  readonly baseUrl: string

  private server: Server | null = null
  private sessions = new Map<string, PendingSession>()
  private transactions = new Map<string, MockTransaction>()
  private documents = new Map<string, MorningDocumentData>()
  private documentCounter = 1
  private readonly autoComplete: boolean
  private readonly latencyMs: number

  constructor(options: MockServerOptions = {}) {
    this.port = options.port ?? 4100
    this.baseUrl = `http://localhost:${this.port}/api/v1`
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
    this.transactions.clear()
    this.documents.clear()
    this.documentCounter = 1
  }

  getTransactions(): MockTransaction[] {
    return Array.from(this.transactions.values())
  }

  getTransaction(id: string): MockTransaction | undefined {
    return this.transactions.get(id)
  }

  /** Simulate a user completing payment for a session */
  completePayment(sessionId: string, options?: { fail?: boolean; cardNum?: string; cardType?: string }): string | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    const docId = randomUUID()
    const now = new Date()
    const fail = options?.fail ?? false

    const doc: MorningDocumentData = {
      id: docId,
      description: session.description,
      type: 320,
      number: String(this.documentCounter++).padStart(4, '0'),
      documentDate: now.toISOString().split('T')[0],
      creationDate: Math.floor(now.getTime() / 1000),
      status: fail ? 1 : 0,
      lang: 'he',
      amount: session.amount,
      currency: session.currency,
      vatType: 0,
      amountDueVat: +(session.amount / 1.17).toFixed(2),
      vat: +(session.amount - session.amount / 1.17).toFixed(2),
      amountLocal: session.amount,
      linkedDocuments: [],
      income: session.income,
      payment: [
        {
          type: 3,
          date: now.toISOString().split('T')[0],
          dealType: 1,
          cardNum: options?.cardNum ?? '4580',
          cardType: options?.cardType ?? 'visa',
          numPayments: 1,
          firstPayment: session.amount,
          price: session.amount,
          currency: session.currency,
        },
      ],
      client: session.customer
        ? {
            id: randomUUID(),
            name: session.customer.name,
            emails: session.customer.email ? [session.customer.email] : undefined,
            taxId: session.customer.taxId,
            phone: session.customer.phone,
          }
        : undefined,
      custom: session.custom,
    }

    this.documents.set(docId, doc)

    const tx: MockTransaction = {
      id: docId,
      sessionId,
      amount: session.amount,
      currency: session.currency,
      description: session.description,
      status: fail ? 'failed' : 'completed',
      customer: session.customer,
      cardNum: options?.cardNum ?? '4580',
      cardType: options?.cardType ?? 'visa',
      createdAt: now,
      completedAt: now,
      metadata: session.custom ? JSON.parse(session.custom) : undefined,
    }
    this.transactions.set(docId, tx)

    return docId
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.latencyMs))
    }

    const url = new URL(req.url ?? '/', `http://localhost:${this.port}`)
    const path = url.pathname.replace('/api/v1', '')

    try {
      // POST /payments/form
      if (req.method === 'POST' && path === '/payments/form') {
        return this.handleCreateSession(req, res)
      }

      // GET /documents/:id
      const docMatch = path.match(/^\/documents\/([^/]+)$/)
      if (req.method === 'GET' && docMatch) {
        return this.handleGetDocument(docMatch[1], res)
      }

      // GET /documents/:id/download/links
      const linksMatch = path.match(/^\/documents\/([^/]+)\/download\/links$/)
      if (req.method === 'GET' && linksMatch) {
        return this.handleGetDownloadLinks(linksMatch[1], res)
      }

      // POST /documents (create document — used for refunds)
      if (req.method === 'POST' && path === '/documents') {
        return this.handleCreateDocument(req, res)
      }

      // GET /pay/:sessionId — simulated payment page
      const payMatch = url.pathname.match(/^\/pay\/([^/]+)$/)
      if (req.method === 'GET' && payMatch) {
        return this.handlePaymentPage(payMatch[1], res)
      }

      // POST /pay/:sessionId/complete — simulate payment completion
      const completeMatch = url.pathname.match(/^\/pay\/([^/]+)\/complete$/)
      if (req.method === 'POST' && completeMatch) {
        return this.handlePaymentComplete(completeMatch[1], req, res)
      }

      this.json(res, 404, { error: 'Not found', path })
    } catch (err) {
      this.json(res, 500, { error: String(err) })
    }
  }

  private async handleCreateSession(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)

    const sessionId = randomUUID()
    const session: PendingSession = {
      id: sessionId,
      amount: body.amount,
      currency: body.currency ?? 'ILS',
      description: body.description ?? '',
      successUrl: body.successUrl,
      failureUrl: body.failureUrl,
      notifyUrl: body.notifyUrl,
      customer: body.client
        ? {
            name: body.client.name,
            email: body.client.emails?.[0],
            phone: body.client.phone,
            taxId: body.client.taxId,
          }
        : undefined,
      income: body.income ?? [],
      custom: body.custom,
      createdAt: new Date(),
    }

    this.sessions.set(sessionId, session)

    // If autoComplete, immediately simulate a successful payment
    if (this.autoComplete) {
      this.completePayment(sessionId)
    }

    this.json(res, 200, {
      errorCode: 0,
      url: `http://localhost:${this.port}/pay/${sessionId}`,
    })
  }

  private handleGetDocument(id: string, res: ServerResponse): void {
    const doc = this.documents.get(id)
    if (!doc) {
      return this.json(res, 404, { errorCode: 1, errorMessage: 'Document not found' })
    }
    this.json(res, 200, doc)
  }

  private handleGetDownloadLinks(id: string, res: ServerResponse): void {
    const doc = this.documents.get(id)
    if (!doc) {
      return this.json(res, 404, { errorCode: 1, errorMessage: 'Document not found' })
    }
    this.json(res, 200, {
      he: `http://localhost:${this.port}/documents/${id}/download/he`,
      en: `http://localhost:${this.port}/documents/${id}/download/en`,
      origin: `http://localhost:${this.port}/documents/${id}/download/origin`,
    })
  }

  private async handleCreateDocument(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)

    const docId = randomUUID()
    const now = new Date()

    const doc: MorningDocumentData = {
      id: docId,
      description: body.description ?? '',
      type: body.type ?? 320,
      number: String(this.documentCounter++).padStart(4, '0'),
      documentDate: now.toISOString().split('T')[0],
      creationDate: Math.floor(now.getTime() / 1000),
      status: 0,
      lang: body.lang ?? 'he',
      amount: body.income?.[0]?.price ?? 0,
      currency: body.currency ?? 'ILS',
      vatType: body.vatType ?? 0,
      linkedDocuments: [],
      income: body.income ?? [],
      client: body.client
        ? {
            id: randomUUID(),
            name: body.client.name,
            emails: body.client.emails,
            taxId: body.client.taxId,
          }
        : undefined,
    }

    this.documents.set(docId, doc)

    // If this is a credit note (type 330), mark the original tx as refunded
    if (body.type === 330) {
      for (const tx of this.transactions.values()) {
        if (tx.status === 'completed') {
          tx.status = 'refunded'
          break
        }
      }
    }

    this.json(res, 200, doc)
  }

  private handlePaymentPage(sessionId: string, res: ServerResponse): void {
    const session = this.sessions.get(sessionId)
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end('<h1>Session not found</h1>')
      return
    }

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>Morning Mock Payment</title>
<style>
  body { font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 0; }
  .provider-banner { background: #16a34a; color: white; text-align: center; padding: 0.6rem 1rem; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.5px; }
  .provider-banner span { opacity: 0.7; font-weight: 400; }
  .content { padding: 1.5rem 1rem; }
  .amount { font-size: 2rem; font-weight: bold; color: #16a34a; text-align: center; margin: 1rem 0; }
  .desc { text-align: center; color: #666; margin-bottom: 2rem; }
  form { display: flex; flex-direction: column; gap: 0.75rem; }
  label { font-weight: 500; }
  input { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
  button { padding: 0.75rem; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; }
  .pay { background: #16a34a; color: white; }
  .fail { background: #dc2626; color: white; }
</style>
</head>
<body>
  <div class="provider-banner">MORNING (GREEN INVOICE) <span>&mdash; Mock Provider Page</span></div>
  <div class="content">
  <h2>Morning Mock Payment</h2>
  <div class="amount">${session.amount.toFixed(2)} ${session.currency}</div>
  <div class="desc">${session.description}</div>
  <form method="POST" action="/pay/${sessionId}/complete">
    <label>Card Number</label>
    <input name="cardNum" value="4580" readonly />
    <label>Card Type</label>
    <input name="cardType" value="visa" readonly />
    <button type="submit" name="action" value="success" class="pay">Pay Now (Mock)</button>
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

    const body = await readFormBody(req)
    const fail = body.get('action') === 'fail'

    const docId = this.completePayment(sessionId, {
      fail,
      cardNum: body.get('cardNum') ?? '4580',
      cardType: body.get('cardType') ?? 'visa',
    })

    // Send webhook notification
    if (session.notifyUrl && docId) {
      const doc = this.documents.get(docId)
      if (doc) {
        fetch(session.notifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doc),
        }).catch(() => {})
      }
    }

    // Notify parent via postMessage (for iframe embed) then redirect
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

interface MorningDocumentData {
  id: string
  description: string
  type: number
  number: string
  documentDate: string
  creationDate: number
  status: number
  lang: string
  amount: number
  currency: string
  vatType: number
  amountDueVat?: number
  vat?: number
  amountLocal?: number
  linkedDocuments: string[]
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
    emails?: string[]
    taxId?: string
    phone?: string
  }
  custom?: string
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
