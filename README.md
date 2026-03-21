# BizUp Pay

Unified TypeScript framework for Israeli payment providers. Write payment code once, swap providers by changing config.

```typescript
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/cardcom'

const provider = createProvider('cardcom', {
  terminalNumber: 1000,
  apiName: process.env.CARDCOM_API_NAME,
  apiPassword: process.env.CARDCOM_API_PASSWORD,
})

const session = await provider.createSession({
  amount: 100,
  currency: 'ILS',
  description: 'Order #1234',
  successUrl: 'https://myshop.co.il/success',
  webhookUrl: 'https://myshop.co.il/api/webhooks/payment',
  customer: { name: 'Israel Israeli', email: 'israel@example.com' },
})
// session.pageUrl → redirect or iframe this
```

## Add to Your Website

### 1. Install

```bash
# Core + your provider (pick one or more)
npm install @bizup-pay/core @bizup-pay/cardcom

# Client SDK for iframe/modal (optional — not needed for redirect-only)
npm install @bizup-pay/client
```

### 2. Server: Create a Checkout Endpoint

```typescript
// pages/api/checkout.ts (Next.js) or routes/checkout.ts (Express)
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/cardcom' // registers the provider

const provider = createProvider('cardcom', {
  terminalNumber: Number(process.env.CARDCOM_TERMINAL),
  apiName: process.env.CARDCOM_API_NAME!,
  apiPassword: process.env.CARDCOM_API_PASSWORD!,
})

export async function POST(req: Request) {
  const { amount, description, customerName, customerEmail } = await req.json()

  const session = await provider.createSession({
    amount,
    currency: 'ILS',
    description,
    customer: { name: customerName, email: customerEmail },
    successUrl: 'https://yoursite.co.il/thank-you',
    failureUrl: 'https://yoursite.co.il/checkout?error=true',
    webhookUrl: 'https://yoursite.co.il/api/webhook',
  })

  return Response.json({ pageUrl: session.pageUrl, sessionId: session.id })
}
```

### 3. Server: Handle Webhooks

```typescript
// pages/api/webhook.ts
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/cardcom'

const provider = createProvider('cardcom', { /* same config */ })

export async function POST(req: Request) {
  const event = await provider.parseWebhook(await req.json())

  if (event.type === 'payment.completed') {
    const tx = event.transaction
    // tx.amount, tx.status, tx.cardLastFour, tx.documentUrl
    await markOrderPaid(tx.providerTransactionId, tx.amount)
  }

  return Response.json({ received: true })
}
```

### 4. Client: Redirect, Iframe, or Modal

**Option A: Redirect (simplest)**
```html
<button onclick="checkout()">Pay Now</button>
<script>
async function checkout() {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 100, description: 'Order #1' }),
  })
  const { pageUrl } = await res.json()
  window.location.href = pageUrl  // redirect to payment page
}
</script>
```

**Option B: Iframe (embedded)**
```html
<div id="payment-container"></div>
<script type="module">
import { BizupPay } from '@bizup-pay/client'

const res = await fetch('/api/checkout', { method: 'POST', /* ... */ })
const session = await res.json()

const bizupPay = new BizupPay()
bizupPay.mount(session, document.getElementById('payment-container'), {
  width: '100%',
  height: '600px',
  onSuccess: () => window.location.href = '/thank-you',
  onFailure: (e) => alert('Payment failed: ' + e.message),
})
</script>
```

**Option C: Modal (popup overlay)**
```typescript
import { BizupPay } from '@bizup-pay/client'

const bizupPay = new BizupPay()
bizupPay.openModal(session, {
  onSuccess: () => window.location.href = '/thank-you',
  onFailure: (e) => alert(e.message),
  onCancel: () => console.log('cancelled'),
})
```

### 5. Fetch Transaction Details (Optional)

```typescript
// After payment, fetch invoice URL and full details
const tx = await provider.getTransaction(transactionId)

console.log(tx.documentUrl)   // Invoice/receipt PDF link
console.log(tx.amount)        // 100
console.log(tx.cardBrand)     // 'visa'
console.log(tx.cardLastFour)  // '1234'
```

### Switching Providers

Change one line — the rest of your code stays identical:

```typescript
// Before: Cardcom
import '@bizup-pay/cardcom'
const provider = createProvider('cardcom', { terminalNumber: 1000, apiName: '...', apiPassword: '...' })

// After: Morning
import '@bizup-pay/morning'
const provider = createProvider('morning', { apiKey: '...', apiSecret: '...' })

// Same API works for both:
const session = await provider.createSession({ amount: 100, /* ... */ })
```

## Supported Providers

| Provider | Package | Auth | Modes | Documents |
|----------|---------|------|-------|-----------|
| [Morning](https://www.greeninvoice.co.il/) (Green Invoice) | `@bizup-pay/morning` | API key + secret | Iframe, Modal, Redirect | Invoice/Receipt PDF |
| [Cardcom](https://www.cardcom.solutions/) | `@bizup-pay/cardcom` | Terminal + API name/password | Iframe, Modal, Redirect | Tax Invoice & Receipt |
| [iCount](https://www.icount.co.il/) | `@bizup-pay/icount` | Bearer token or user/pass | Redirect, Direct API | Invoice-Receipt PDF |
| [Grow.il](https://www.grow.link/) (Meshulam) | `@bizup-pay/grow` | pageCode + userId | Redirect | Via invoice webhook |

## Packages

```
bizup-pay/
  packages/
    core/          @bizup-pay/core      Types, provider interface, factory, errors
    morning/       @bizup-pay/morning   Morning (Green Invoice) adapter
    cardcom/       @bizup-pay/cardcom   Cardcom adapter
    icount/        @bizup-pay/icount    iCount adapter
    client/        @bizup-pay/client    Browser SDK (iframe/modal mounting)
    mock-server/   @bizup-pay/mock-server  Mock servers for all 3 providers
  examples/
    checkout-demo/                      Next.js demo app
  specs/                                OpenAPI specs (reference)
```

## Quick Start

### Prerequisites

- Node.js >= 20
- npm

### Install & Build

```bash
git clone https://github.com/bizup-dev/bizup-pay.git
cd bizup-pay
npm install
npm run build
```

### Run Demo App

```bash
# Terminal 1: Start mock payment servers
node packages/mock-server/dist/standalone.js

# Terminal 2: Start demo app
cd examples/checkout-demo
npx next dev -p 3099
```

Open http://localhost:3099 — you'll see a shop with products, subscription plans, and checkout with all 3 providers.

### Run Tests

```bash
# Unit tests (117 tests)
npm test

# E2E tests (16 tests, requires mock servers + demo app running)
npx playwright test
```

## Server-Side API

### Provider Interface

Every provider implements the same interface:

```typescript
interface BizupProvider {
  readonly name: ProviderName

  createSession(params: CreateSessionParams): Promise<BizupPaymentSession>
  getTransaction(id: string): Promise<BizupTransaction>
  refund(params: RefundParams): Promise<BizupRefund>
  parseWebhook(body: unknown, headers?: Record<string, string>): Promise<BizupWebhookEvent>
}
```

### Create a Payment Session

```typescript
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/morning' // registers the provider

const provider = createProvider('morning', {
  apiKey: process.env.MORNING_API_KEY,
  apiSecret: process.env.MORNING_API_SECRET,
})

const session = await provider.createSession({
  amount: 79.90,
  currency: 'ILS',
  description: 'T-Shirt',
  successUrl: 'https://myshop.co.il/success',
  failureUrl: 'https://myshop.co.il/failure',
  webhookUrl: 'https://myshop.co.il/api/webhook',
  customer: {
    name: 'Israel Israeli',
    email: 'israel@example.com',
    phone: '054-1234567',
  },
  language: 'he',
})

// session.pageUrl → hosted payment page URL
// Redirect the customer there, or embed in iframe/modal
```

### Recurring Payments

```typescript
const session = await provider.createSession({
  amount: 99.90,
  currency: 'ILS',
  description: 'Pro Plan - Monthly',
  successUrl: '...',
  webhookUrl: '...',
  customer: { name: 'Israel Israeli' },
  recurring: {
    interval: 'monthly',
    totalPayments: 12,
    amount: 99.90,
  },
})
```

Each provider handles recurring differently under the hood:
- **Cardcom:** `ChargeAndCreateToken` + `IsAutoRecurringPayment`
- **Morning:** Internal recurring setup
- **iCount:** `hk_issue_every`, `hk_payments` params

### Get Transaction Details

```typescript
const tx = await provider.getTransaction('219282004')

console.log(tx.amount)        // 79.90
console.log(tx.status)        // 'approved'
console.log(tx.cardBrand)     // 'visa'
console.log(tx.cardLastFour)  // '1111'
console.log(tx.documentUrl)   // Invoice/receipt PDF URL
console.log(tx.customer)      // { name, email, phone }

// Provider-specific extras
console.log(tx.cardcom?.approvalNumber)
console.log(tx.morning?.documentNumber)
console.log(tx.icount?.confirmationCode)

// Full provider response (escape hatch)
console.log(tx.raw)
```

### Process Webhooks

```typescript
// Express / Next.js API route
app.post('/api/webhook', async (req, res) => {
  const event = await provider.parseWebhook(req.body, req.headers)

  switch (event.type) {
    case 'payment.completed':
      // event.transaction has all the details
      await fulfillOrder(event.transaction)
      break
    case 'payment.failed':
      await handleFailure(event.transaction)
      break
  }

  res.json({ received: true })
})
```

### Issue Refunds

```typescript
// Full refund
const refund = await provider.refund({
  transactionId: '219282004',
})

// Partial refund
const refund = await provider.refund({
  transactionId: '219282004',
  amount: 30.00,
})
```

## Client-Side SDK

The browser SDK is provider-agnostic. It receives a `BizupPaymentSession` from your server and handles iframe/modal/redirect rendering.

### Iframe (Embed)

```typescript
import { BizupPay } from '@bizup-pay/client'

const bizupPay = new BizupPay()
bizupPay.mount(session, document.getElementById('payment-container'), {
  width: '100%',
  height: '600px',
  onSuccess: (event) => { /* payment completed */ },
  onFailure: (event) => { /* payment failed */ },
  onCancel: () => { /* user cancelled */ },
})
```

### Modal (Popup)

```typescript
const instance = bizupPay.openModal(session, {
  width: '500px',
  height: '700px',
  onSuccess: (event) => { window.location.href = '/thank-you' },
  onFailure: (event) => { showError(event.message) },
})

// Close programmatically
instance.destroy()
```

### Redirect

```typescript
// Simply redirect to the provider's hosted page
window.location.href = session.pageUrl
// User returns to successUrl / failureUrl after payment
```

## Core Types

### BizupPaymentSession

```typescript
interface BizupPaymentSession {
  id: string
  provider: ProviderName           // 'morning' | 'cardcom' | 'icount'
  amount: number
  currency: string                 // 'ILS', 'USD', 'EUR', 'GBP'
  description: string
  pageUrl: string                  // Hosted payment page URL
  successUrl: string
  failureUrl?: string
  webhookUrl: string
  metadata: Record<string, string>
  status: SessionStatus            // 'pending' | 'completed' | 'failed' | 'cancelled'
}
```

### BizupTransaction

```typescript
interface BizupTransaction {
  id: string
  providerTransactionId: string
  provider: ProviderName
  amount: number
  currency: string
  status: TransactionStatus        // 'approved' | 'declined' | 'refunded' | 'partially_refunded'
  paymentMethod: PaymentMethod     // 'credit_card' | 'bit' | 'apple_pay' | ...
  cardBrand?: CardBrand            // 'visa' | 'mastercard' | 'amex' | 'isracard' | ...
  cardLastFour?: string
  installments: number
  documentUrl?: string             // Invoice/receipt PDF URL
  customer?: BizupCustomer
  createdAt: Date
  morning?: MorningExtras          // documentId, documentType, documentNumber, vatType
  cardcom?: CardcomExtras          // approvalNumber, dealType, lowProfileId, token
  icount?: IcountExtras            // doctype, docnum, confirmationCode
  raw: unknown                     // Full provider response
}
```

### Error Handling

```typescript
import { BizupPayError } from '@bizup-pay/core'

try {
  await provider.createSession(params)
} catch (error) {
  if (error instanceof BizupPayError) {
    console.log(error.code)          // 'PROVIDER_ERROR' | 'NETWORK_ERROR' | ...
    console.log(error.provider)      // 'cardcom'
    console.log(error.providerError) // Original provider response
  }
}
```

Error codes: `INVALID_CONFIG`, `INVALID_PARAMS`, `PROVIDER_ERROR`, `NETWORK_ERROR`, `WEBHOOK_PARSE_ERROR`, `TRANSACTION_NOT_FOUND`, `REFUND_FAILED`, `UNSUPPORTED_OPERATION`

## Provider Configuration

### Morning (Green Invoice)

```typescript
createProvider('morning', {
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  baseUrl: 'https://api.greeninvoice.co.il/api/v1', // optional, default
})
```

### Cardcom

```typescript
createProvider('cardcom', {
  terminalNumber: 1000,
  apiName: 'your-api-name',
  apiPassword: 'your-api-password',
  baseUrl: 'https://secure.cardcom.solutions/api/v11', // optional, default
})
```

### iCount

```typescript
// Option A: Bearer token
createProvider('icount', {
  cid: 'your-company-id',
  accessToken: 'your-bearer-token',
  paypageId: 2,
})

// Option B: Username/password
createProvider('icount', {
  cid: 'your-company-id',
  user: 'your-username',
  pass: 'your-password',
  paypageId: 2,
})
```

iCount authenticates via session ID (SID) cached for 19 minutes with automatic renewal.

## Demo App

The demo app at `examples/checkout-demo/` demonstrates all framework features:

| Page | URL | Purpose |
|------|-----|---------|
| Shop | `/` | Product grid with cart, checkout with any provider |
| Subscription Plans | `/subscribe` | Recurring payment plans with billing cycle toggle |
| Checkout | `/checkout` | Integration mode selector (iframe/modal/redirect/direct), mock/sandbox toggle, debug panel |
| Account | `/account` | Purchase history from webhooks & redirects, "Fetch Details" calls `getTransaction()` |

### Debug Panel

Enable server-side network logging to see the actual HTTP requests/responses to payment providers:

1. Set `DEBUG_PANEL_ENABLED=true` in `examples/checkout-demo/.env.local`
2. Toggle "Debug: Show server network logs" on the checkout page
3. Complete a payment to see captured API calls with sanitized request/response bodies

### Mock vs Sandbox

The demo supports two backends:
- **Mock Server** (default): Local mock servers on ports 4100/4200/4300. Instant responses, no real charges.
- **Provider Sandbox**: Real provider sandbox APIs. Requires credentials in `.env.local`.

## Architecture

### Three-Tier Data Access

1. **Common fields** — `tx.amount`, `tx.status`, `tx.cardBrand` (same for all providers)
2. **Typed provider extras** — `tx.cardcom?.approvalNumber`, `tx.morning?.documentNumber` (provider-specific but typed)
3. **Raw response** — `tx.raw` (full provider response, escape hatch)

### Server / Client Split

- **Server** (`@bizup-pay/core` + provider adapter): All API calls to payment providers. Creates sessions, processes webhooks, queries transactions, issues refunds.
- **Client** (`@bizup-pay/client`): Provider-agnostic. Receives session from server. Renders payment page in iframe/modal. Listens for postMessage events.

The client never talks to payment providers directly.

### SOLID Principles

- **S:** Each adapter handles one provider. Core defines interfaces only.
- **O:** New providers added by implementing `BizupProvider` — no changes to core.
- **L:** Any provider is interchangeable. Code using `createSession()` works identically.
- **I:** Phase 2 methods (token, recurring lifecycle) are optional on the interface.
- **D:** Core depends on interface, not concrete adapters. Factory injects at runtime.

## Roadmap

- **Phase 1** (complete): E-commerce payments, refunds, transaction status, document URLs, webhooks
- **Phase 2** (designed): Token storage, `chargeToken()`, subscription lifecycle (create/pause/resume/cancel)
- **Phase 3** (future): Full invoicing integration
- **Grow.il** (Meshulam): Fourth provider adapter

## License

Private
