# BizUp Pay — Unified Israeli Payment Framework

## Overview

A TypeScript framework that provides a single interface for Israeli payment providers. Write payment code once, swap providers by changing config.

**Phase 1 (now):** E-commerce payments — hosted checkout pages, refunds, transaction status, document URLs.
**Phase 2 (future):** Recurring/subscriptions — token storage, billing cycles, pause/resume/cancel.
**Phase 3 (future):** Full invoicing — out of scope, but document URLs available from Phase 1.

## Supported Providers

| Provider | Phase 1 (Launch) | Phase 2 (Planned) |
|----------|-------------------|-------------------|
| Morning (Green Invoice) | Yes | Yes |
| Cardcom | Yes | Yes |
| iCount | No | Yes |
| Grow.il (Meshulam) | No | Yes |

## Architecture

### Package Structure (Monorepo)

```
bizup-pay/
  packages/
    core/                    # @bizup-pay/core
      src/
        types.ts             # All entity interfaces
        provider.ts          # BizupProvider interface
        factory.ts           # createProvider() factory
        errors.ts            # Typed error classes
        index.ts
    morning/                 # @bizup-pay/morning
      src/
        provider.ts          # MorningProvider implements BizupProvider
        mapper.ts            # Transform Morning API <-> BizUp entities
        types.ts             # MorningExtras, Morning-specific types
        index.ts
    cardcom/                 # @bizup-pay/cardcom
      src/
        provider.ts          # CardcomProvider implements BizupProvider
        mapper.ts            # Transform Cardcom API <-> BizUp entities
        types.ts             # CardcomExtras, Cardcom-specific types
        index.ts
    client/                  # @bizup-pay/client (bizup-pay.js)
      src/
        bizup-pay.ts         # Browser SDK — iframe, modal, events
        types.ts
        index.ts
  specs/                     # OpenAPI specs (reference)
    morning-openapi.yaml
    cardcom-openapi.json
    icount-openapi.yaml
    grow-il-openapi.yaml
  docs/
  tests/                     # Unit tests (co-located with packages too)
```

### Distribution

**npm packages** — `@bizup-pay/core`, `@bizup-pay/morning`, `@bizup-pay/cardcom`, `@bizup-pay/client`
**Browser bundle** — `bizup-pay.min.js` (CDN/script tag, includes core + client)

### Server / Client Split

- **Server** (`@bizup-pay/core` + adapter): All API calls to payment providers. Creates sessions, processes webhooks, queries transactions, issues refunds.
- **Client** (`@bizup-pay/client`): Provider-agnostic. Receives `BizupPaymentSession` from your server. Renders hosted payment page in iframe/modal. Listens for redirect/postMessage events. Emits typed callbacks (`onSuccess`, `onFailure`, `onCancel`).

The client never talks to payment providers directly.

---

## Core Entities

### BizupPaymentSession

```typescript
interface BizupPaymentSession {
  id: string                          // internal session ID (your DB)
  provider: ProviderName
  amount: number
  currency: string                    // ISO 4217: 'ILS', 'USD', 'EUR', 'GBP'
  description: string
  pageUrl: string                     // hosted payment page URL
  successUrl: string                  // browser redirect on success
  failureUrl?: string                 // browser redirect on failure
  cancelUrl?: string                  // browser redirect on cancel
  webhookUrl: string                  // server-to-server callback
  metadata: Record<string, string>    // pass-through data (order ID, etc.)
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  expiresAt?: Date
}
```

**Provider mapping:**
- `metadata` maps to: Morning `custom`, Cardcom `ReturnValue`, Grow `cField1-9`, iCount custom fields
- `cancelUrl` not supported by Morning (omitted), Grow uses it instead of `failureUrl`
- `failureUrl` not supported by Grow (omitted)

### BizupTransaction

```typescript
type ProviderName = 'morning' | 'cardcom' | 'icount' | 'grow'

type PaymentMethod = 'credit_card' | 'bit' | 'apple_pay' | 'google_pay' | 'bank_transfer' | 'paypal'

type CardBrand = 'visa' | 'mastercard' | 'amex' | 'isracard' | 'diners' | 'discover' | 'jcb'

type TransactionStatus = 'approved' | 'declined' | 'refunded' | 'partially_refunded'

interface BizupTransaction {
  id: string
  providerTransactionId: string
  provider: ProviderName
  amount: number
  currency: string
  status: TransactionStatus
  paymentMethod: PaymentMethod
  cardBrand?: CardBrand
  cardLastFour?: string
  installments: number                // 1 = single payment
  documentUrl?: string                // invoice/receipt URL
  customer?: BizupCustomer
  createdAt: Date

  // Typed provider-specific extras (only populated for matching provider)
  morning?: MorningExtras
  cardcom?: CardcomExtras
  icount?: IcountExtras
  grow?: GrowExtras

  // Full provider response — escape hatch
  raw: unknown
}
```

**Three-tier data access:**
1. Common fields — on `BizupTransaction` directly
2. Typed provider extras — namespaced (`tx.cardcom?.approvalNumber`)
3. Full dump — `tx.raw`

### BizupCustomer

```typescript
interface BizupCustomer {
  name: string
  email?: string
  phone?: string
  taxId?: string                      // Israeli ID / business registration
  address?: {
    city?: string
    street?: string
    zip?: string
    country?: string                  // ISO 3166-1 alpha-2, default 'IL'
  }
}
```

### BizupRefund

```typescript
interface BizupRefund {
  id: string
  transactionId: string
  amount: number                      // partial or full
  status: 'pending' | 'completed' | 'failed'
  createdAt: Date
}
```

### BizupWebhookEvent

```typescript
interface BizupWebhookEvent {
  type: 'payment.completed' | 'payment.failed' | 'payment.cancelled'
  transaction: BizupTransaction
  timestamp: Date
}
```

---

## Provider Interface (Server-Side Contract)

```typescript
interface BizupProviderConfig {
  // Each provider has different auth — adapter validates its own config
  [key: string]: unknown
}

interface CreateSessionParams {
  amount: number
  currency?: string                   // default 'ILS'
  description: string
  customer?: BizupCustomer
  successUrl: string
  failureUrl?: string
  cancelUrl?: string
  webhookUrl: string
  metadata?: Record<string, string>
  installments?: {
    min?: number
    max?: number
    fixed?: number                    // exact number of installments
  }
  language?: 'he' | 'en'
}

interface RefundParams {
  transactionId: string
  amount?: number                     // omit for full refund
}

interface BizupProvider {
  readonly name: ProviderName

  // Phase 1: E-commerce
  createSession(params: CreateSessionParams): Promise<BizupPaymentSession>
  getTransaction(id: string): Promise<BizupTransaction>
  refund(params: RefundParams): Promise<BizupRefund>
  parseWebhook(body: unknown, headers?: Record<string, string>): Promise<BizupWebhookEvent>

  // Phase 2: Subscriptions (optional)
  createToken?(params: CreateSessionParams): Promise<BizupPaymentSession>
  chargeToken?(params: ChargeTokenParams): Promise<BizupTransaction>
}
```

### Factory

```typescript
import { createProvider } from '@bizup-pay/core'
import { MorningProvider } from '@bizup-pay/morning'
import { CardcomProvider } from '@bizup-pay/cardcom'

// Register adapters
const provider = createProvider('morning', {
  apiKey: process.env.MORNING_API_KEY,
  apiSecret: process.env.MORNING_API_SECRET,
})

// Same code, different provider
const provider = createProvider('cardcom', {
  terminalNumber: process.env.CARDCOM_TERMINAL,
  apiName: process.env.CARDCOM_API_NAME,
  apiPassword: process.env.CARDCOM_API_PASSWORD,
})

// Usage is identical
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

---

## Client SDK (bizup-pay.js)

Provider-agnostic browser library. Works with BizupPaymentSession objects from your server.

```typescript
// @bizup-pay/client
interface BizupPayClient {
  // Mount hosted payment page in a container
  mount(session: BizupPaymentSession, container: HTMLElement, options?: MountOptions): BizupPayInstance

  // Open as modal overlay
  openModal(session: BizupPaymentSession, options?: ModalOptions): BizupPayInstance
}

interface MountOptions {
  width?: string
  height?: string
  onSuccess?: (event: ClientPaymentEvent) => void
  onFailure?: (event: ClientPaymentEvent) => void
  onCancel?: () => void
  onLoad?: () => void
}

interface BizupPayInstance {
  destroy(): void
  on(event: 'success' | 'failure' | 'cancel' | 'load', handler: Function): void
}

// Browser usage
const bizupPay = new BizupPay()
bizupPay.mount(sessionFromServer, document.getElementById('payment-container'), {
  onSuccess: (event) => { window.location.href = '/thank-you' },
  onFailure: (event) => { showError(event.message) },
})
```

---

## Provider Adapter Mapping

### Morning (Green Invoice)

| BizUp Method | Morning API | Notes |
|---|---|---|
| `createSession` | `POST /payments/form` | Returns iframe URL |
| `getTransaction` | `GET /documents/{id}` + `GET /documents/{id}/download/links` | Transaction = document in Morning |
| `refund` | `POST /documents` with type 330 (credit note) | Morning refunds are credit note documents |
| `parseWebhook` | Parse `notifyUrl` callback payload | |

**Auth:** JWT Bearer token (obtained via login endpoint, not part of BizUp scope — config takes the token or credentials).

**Morning-specific extras:**
```typescript
interface MorningExtras {
  documentId: string
  documentType: number          // 300, 305, 320, etc.
  documentNumber: string
  vatType: number               // 0=inclusive, 1=exclusive, 2=exempt
  linkedDocuments: string[]
}
```

### Cardcom

| BizUp Method | Cardcom API | Notes |
|---|---|---|
| `createSession` | `POST /LowProfile/Create` | Returns URL, also UrlToBit, UrlToPayPal |
| `getTransaction` | `POST /Transactions/GetTransactionInfoById` | |
| `refund` | `POST /Transactions/RefundByTransactionId` | Supports partial via PartialSum |
| `parseWebhook` | Parse `WebHookUrl` POST + `POST /LowProfile/GetLpResult` | Webhook fires, then server verifies via GetLpResult |

**Auth:** Per-request body params (TerminalNumber, ApiName, ApiPassword).

**Cardcom-specific extras:**
```typescript
interface CardcomExtras {
  approvalNumber: string
  dealType: string
  lowProfileId: string
  threeDSecureStatus?: string
  acquirer?: string             // Isracard, CAL, etc.
  token?: string                // if ChargeAndCreateToken was used
  tokenExpiry?: string
}
```

---

## Error Handling

```typescript
class BizupPayError extends Error {
  constructor(
    message: string,
    public code: BizupErrorCode,
    public provider?: ProviderName,
    public providerError?: unknown,   // original provider error
  ) { super(message) }
}

type BizupErrorCode =
  | 'INVALID_CONFIG'
  | 'INVALID_PARAMS'
  | 'PROVIDER_ERROR'              // provider returned an error
  | 'NETWORK_ERROR'               // HTTP failure
  | 'WEBHOOK_PARSE_ERROR'         // malformed webhook payload
  | 'TRANSACTION_NOT_FOUND'
  | 'REFUND_FAILED'
  | 'UNSUPPORTED_OPERATION'       // e.g., chargeToken on provider without Phase 2
```

---

## Testing Strategy

### Unit Tests (Phase 1 — TDD)

Mock only the HTTP client (fetch). Real adapter code all the way to the HTTP boundary.

```
packages/
  core/
    src/__tests__/
      factory.test.ts            — createProvider routes correctly
      types.test.ts              — entity validation
  morning/
    src/__tests__/
      create-session.test.ts     — params → Morning API request shape
      get-transaction.test.ts    — Morning response → BizupTransaction
      refund.test.ts             — refund params → credit note creation
      parse-webhook.test.ts      — Morning webhook → BizupWebhookEvent
    src/__fixtures__/
      create-session-response.json
      get-document-response.json
      webhook-payload.json
  cardcom/
    src/__tests__/
      create-session.test.ts     — params → LowProfile/Create shape
      get-transaction.test.ts    — Cardcom response → BizupTransaction
      refund.test.ts             — refund → RefundByTransactionId
      parse-webhook.test.ts      — Cardcom webhook → BizupWebhookEvent
    src/__fixtures__/
      lowprofile-create-response.json
      transaction-info-response.json
      webhook-payload.json
```

**Test fixtures** are real response examples from the OpenAPI specs we have.

**Test runner:** Vitest

### Integration Tests (Future)

Hit real sandbox APIs:
- Cardcom sandbox: `https://secure.cardcom.solutions/` (test terminals)
- Grow sandbox: `https://sandbox.meshulam.co.il/`
- Morning sandbox: `https://sandbox.d.greeninvoice.co.il/`

### E2E Tests (Future)

Sample checkout app + Playwright. Full browser flow against sandbox.

---

## SOLID Principles Applied

- **S (Single Responsibility):** Each adapter handles one provider. Core defines interfaces only. Client handles UI only.
- **O (Open/Closed):** New providers are added by implementing `BizupProvider` — no changes to core or existing adapters.
- **L (Liskov Substitution):** Any `BizupProvider` is interchangeable. Code using `createSession()` works identically regardless of provider.
- **I (Interface Segregation):** Phase 2 methods (token, recurring) are optional on the interface. Phase 1 adapters don't implement what they don't need.
- **D (Dependency Inversion):** Core depends on `BizupProvider` interface, not concrete adapters. Adapters depend on core types, not each other. Factory injects the adapter at runtime.
