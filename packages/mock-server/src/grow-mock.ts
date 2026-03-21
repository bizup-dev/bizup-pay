import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import type { MockProviderServer, MockTransaction, MockServerOptions } from './types.js'

interface PendingProcess {
  processId: number
  processToken: string
  sum: number
  description: string
  successUrl: string
  cancelUrl: string
  notifyUrl: string
  fullName?: string
  email?: string
  phone?: string
  customFields: Record<string, string>
  createdAt: Date
}

interface StoredTransaction {
  transactionId: number
  transactionToken: string
  processId: number
  processToken: string
  sum: number
  fullName: string
  payerEmail: string
  payerPhone: string
  cardSuffix: string
  cardBrand: string
  cardBrandCode: number
  asmachta: string
  description: string
  status: number
  customFields: Record<string, string>
}

export class GrowMockServer implements MockProviderServer {
  readonly name = 'grow'
  readonly port: number
  readonly baseUrl: string

  private server: Server | null = null
  private processes = new Map<number, PendingProcess>()
  private transactions = new Map<number, StoredTransaction>()
  private mockTransactions = new Map<string, MockTransaction>()
  private processCounter = 395000
  private transactionCounter = 425800
  private readonly autoComplete: boolean
  private readonly latencyMs: number

  constructor(options: MockServerOptions = {}) {
    this.port = options.port ?? 4400
    this.baseUrl = `http://localhost:${this.port}/api/light/server/1.0`
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
    this.processes.clear()
    this.transactions.clear()
    this.mockTransactions.clear()
    this.processCounter = 395000
    this.transactionCounter = 425800
  }

  getTransactions(): MockTransaction[] {
    return Array.from(this.mockTransactions.values())
  }

  getTransaction(id: string): MockTransaction | undefined {
    return this.mockTransactions.get(id)
  }

  completePayment(processId: number, options?: {
    fail?: boolean
    cardSuffix?: string
    cardBrand?: string
  }): number | null {
    const process = this.processes.get(processId)
    if (!process) return null

    const fail = options?.fail ?? false
    const transactionId = ++this.transactionCounter
    const transactionToken = randomUUID()
    const cardSuffix = options?.cardSuffix ?? '4580'
    const cardBrand = options?.cardBrand ?? 'Visa'
    const asmachta = String(Math.floor(Math.random() * 900000) + 100000)

    const stored: StoredTransaction = {
      transactionId,
      transactionToken,
      processId: process.processId,
      processToken: process.processToken,
      sum: process.sum,
      fullName: process.fullName ?? 'Israel Israeli',
      payerEmail: process.email ?? 'israel@example.com',
      payerPhone: process.phone ?? '0541234567',
      cardSuffix,
      cardBrand,
      cardBrandCode: cardBrand.toLowerCase() === 'visa' ? 3 : cardBrand.toLowerCase() === 'mastercard' ? 2 : 1,
      asmachta,
      description: process.description,
      status: fail ? 0 : 1,
      customFields: process.customFields,
    }

    this.transactions.set(transactionId, stored)

    const mockTxId = String(transactionId)
    const now = new Date()
    const mockTx: MockTransaction = {
      id: mockTxId,
      sessionId: String(process.processId),
      amount: process.sum,
      currency: 'ILS',
      description: process.description,
      status: fail ? 'failed' : 'completed',
      customer: process.fullName ? {
        name: process.fullName,
        email: process.email,
        phone: process.phone,
      } : undefined,
      cardNum: cardSuffix,
      cardType: cardBrand.toLowerCase(),
      createdAt: process.createdAt,
      completedAt: now,
      metadata: Object.keys(process.customFields).length > 0 ? process.customFields : undefined,
    }
    this.mockTransactions.set(mockTxId, mockTx)

    return transactionId
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
    const path = url.pathname.replace('/api/light/server/1.0', '')

    try {
      // POST /createPaymentProcess
      if (req.method === 'POST' && path === '/createPaymentProcess') {
        return this.handleCreatePaymentProcess(req, res)
      }

      // POST /getTransactionInfo
      if (req.method === 'POST' && path === '/getTransactionInfo') {
        return this.handleGetTransactionInfo(req, res)
      }

      // POST /refundTransaction
      if (req.method === 'POST' && path === '/refundTransaction') {
        return this.handleRefundTransaction(req, res)
      }

      // GET /pay/:processId — mock payment page
      const payMatch = url.pathname.match(/^\/pay\/(\d+)$/)
      if (req.method === 'GET' && payMatch) {
        return this.handlePaymentPage(parseInt(payMatch[1], 10), res)
      }

      // POST /pay/:processId/complete — simulate payment completion
      const completeMatch = url.pathname.match(/^\/pay\/(\d+)\/complete$/)
      if (req.method === 'POST' && completeMatch) {
        return this.handlePaymentComplete(parseInt(completeMatch[1], 10), req, res)
      }

      this.json(res, 404, { status: 0, errorMessage: 'Not found', path })
    } catch (err) {
      this.json(res, 500, { status: 0, errorMessage: String(err) })
    }
  }

  private async handleCreatePaymentProcess(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const form = await readFormBody(req)

    const processId = ++this.processCounter
    const processToken = randomUUID()

    const customFields: Record<string, string> = {}
    for (let i = 1; i <= 9; i++) {
      const val = form.get(`cField${i}`)
      if (val) customFields[`cField${i}`] = val
    }

    const process: PendingProcess = {
      processId,
      processToken,
      sum: parseFloat(form.get('sum') ?? '0'),
      description: form.get('description') ?? '',
      successUrl: form.get('successUrl') ?? '',
      cancelUrl: form.get('cancelUrl') ?? '',
      notifyUrl: form.get('notifyUrl') ?? '',
      fullName: form.get('pageField[fullName]') ?? undefined,
      email: form.get('pageField[email]') ?? undefined,
      phone: form.get('pageField[phone]') ?? undefined,
      customFields,
      createdAt: new Date(),
    }

    this.processes.set(processId, process)

    if (this.autoComplete) {
      this.completePayment(processId)
    }

    this.json(res, 200, {
      status: 1,
      data: {
        processId,
        processToken,
        url: `http://localhost:${this.port}/pay/${processId}`,
      },
    })
  }

  private async handleGetTransactionInfo(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const form = await readFormBody(req)
    const transactionId = parseInt(form.get('transactionId') ?? '0', 10)

    const tx = this.transactions.get(transactionId)
    if (!tx) {
      return this.json(res, 200, { status: 0, errorMessage: 'Transaction not found' })
    }

    this.json(res, 200, {
      status: 1,
      data: {
        transactionId: tx.transactionId,
        transactionToken: tx.transactionToken,
        sum: tx.sum,
        fullName: tx.fullName,
        payerEmail: tx.payerEmail,
        payerPhone: tx.payerPhone,
        cardSuffix: tx.cardSuffix,
        cardBrand: tx.cardBrand,
        asmachta: tx.asmachta,
        description: tx.description,
        status: tx.status,
        customFields: tx.customFields,
      },
    })
  }

  private async handleRefundTransaction(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const form = await readFormBody(req)
    const transactionId = parseInt(form.get('transactionId') ?? '0', 10)

    const tx = this.transactions.get(transactionId)
    if (!tx) {
      return this.json(res, 200, { status: 0, errorMessage: 'Transaction not found' })
    }

    tx.status = 0

    // Update mock transaction status
    const mockTx = this.mockTransactions.get(String(transactionId))
    if (mockTx) mockTx.status = 'refunded'

    this.json(res, 200, {
      status: 1,
      data: {
        transactionId: tx.transactionId,
        refundSum: parseFloat(form.get('refundSum') ?? String(tx.sum)),
        message: 'Refund successful',
      },
    })
  }

  private handlePaymentPage(processId: number, res: ServerResponse): void {
    const process = this.processes.get(processId)
    if (!process) {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end('<h1>Process not found</h1>')
      return
    }

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>Grow.il Mock Payment</title>
<style>
  body { font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 0; }
  .provider-banner { background: #059669; color: white; text-align: center; padding: 0.6rem 1rem; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.5px; }
  .provider-banner span { opacity: 0.7; font-weight: 400; }
  .content { padding: 1.5rem 1rem; }
  .logo { text-align: center; color: #059669; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
  .amount { font-size: 2rem; font-weight: bold; color: #059669; text-align: center; margin: 1rem 0; }
  .desc { text-align: center; color: #666; margin-bottom: 1rem; }
  form { display: flex; flex-direction: column; gap: 0.75rem; }
  label { font-weight: 500; }
  input { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
  button { padding: 0.75rem; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; }
  .pay { background: #059669; color: white; }
  .fail { background: #6b7280; color: white; }
</style>
</head>
<body>
  <div class="provider-banner">GROW.IL <span>&mdash; Mock Provider Page</span></div>
  <div class="content">
  <div class="logo">Grow.il Mock</div>
  <div class="amount">${process.sum.toFixed(2)} ILS</div>
  <div class="desc">${process.description}</div>
  <form method="POST" action="/pay/${processId}/complete">
    <label>Card Suffix</label>
    <input name="cardSuffix" value="4580" />
    <label>Card Brand</label>
    <input name="cardBrand" value="Visa" />
    <label>Full Name</label>
    <input name="fullName" value="${process.fullName ?? 'Israel Israeli'}" />
    <button type="submit" name="action" value="success" class="pay">Pay Now (Mock)</button>
    <button type="submit" name="action" value="fail" class="fail">Simulate Failure</button>
  </form>
  </div>
</body>
</html>`)
  }

  private async handlePaymentComplete(processId: number, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const process = this.processes.get(processId)
    if (!process) {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end('<h1>Process not found</h1>')
      return
    }

    const formBody = await readFormBody(req)
    const fail = formBody.get('action') === 'fail'
    const cardSuffix = formBody.get('cardSuffix') ?? '4580'
    const cardBrand = formBody.get('cardBrand') ?? 'Visa'

    // Override fullName if provided in form
    const fullName = formBody.get('fullName')
    if (fullName) process.fullName = fullName

    const transactionId = this.completePayment(processId, {
      fail,
      cardSuffix,
      cardBrand,
    })

    // Send webhook to notifyUrl
    if (process.notifyUrl && transactionId) {
      const tx = this.transactions.get(transactionId)
      if (tx) {
        const webhookPayload = {
          transactionId: tx.transactionId,
          transactionToken: tx.transactionToken,
          sum: tx.sum,
          fullName: tx.fullName,
          payerEmail: tx.payerEmail,
          payerPhone: tx.payerPhone,
          cardSuffix: tx.cardSuffix,
          cardBrand: tx.cardBrand,
          cardBrandCode: tx.cardBrandCode,
          asmachta: tx.asmachta,
          description: tx.description,
          processId: process.processId,
          processToken: process.processToken,
          customFields: tx.customFields,
        }
        fetch(process.notifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        }).catch(() => {})
      }
    }

    const redirectUrl = fail ? process.cancelUrl || process.successUrl : process.successUrl
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

async function readFormBody(req: IncomingMessage): Promise<Map<string, string>> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      const map = new Map<string, string>()
      // Try form-urlencoded first
      if (data.includes('=')) {
        const params = new URLSearchParams(data)
        for (const [key, value] of params) {
          map.set(key, value)
        }
      } else {
        // Try JSON
        try {
          const json = JSON.parse(data)
          for (const [key, value] of Object.entries(json)) {
            if (typeof value === 'object' && value !== null) {
              // Handle nested objects like pageField
              for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
                map.set(`${key}[${subKey}]`, String(subValue))
              }
            } else {
              map.set(key, String(value))
            }
          }
        } catch {
          // empty
        }
      }
      resolve(map)
    })
  })
}
