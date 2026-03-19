# BizUp Pay — Phase 2: Recurring/Subscriptions Implementation Plan

## Executive Summary

Phase 2 adds **token storage, token-based charging, and subscription lifecycle management**. Each provider handles recurring billing at different abstraction levels:

| Capability | Cardcom | Morning | iCount |
|---|---|---|---|
| Token from payment | `TokenInfo.CardToken` in webhook | `/payments/tokens/search` | `cc_storage` (auto on paypage) |
| Charge by token | `POST /Transactions/Transaction` with `Token` | `POST /payments/tokens/{id}/charge` | `POST /cc/bill` with `cc_token_id` |
| Native subscription mgmt | None (app-managed) | None (app-managed) | Full: `/hk/create`, `/hk/info`, `/hk/pause`, `/hk/resume`, `/hk/cancel` |

## New Core Types

### BizupToken
```typescript
interface BizupToken {
  id: string                  // provider's token ID
  provider: ProviderName
  lastFour: string
  brand?: CardBrand
  expiryMonth?: number
  expiryYear?: number
  holderName?: string
  customerId?: string
  createdAt: Date
  raw: unknown
}
```

### BizupSubscription
```typescript
type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'completed' | 'failed' | 'pending'
type SubscriptionInterval = 'weekly' | 'monthly' | 'yearly'

interface BizupSubscription {
  id: string
  provider: ProviderName
  status: SubscriptionStatus
  amount: number
  currency: string
  interval: SubscriptionInterval
  customer?: BizupCustomer
  tokenId: string
  nextBillingDate?: Date
  startDate?: Date
  totalPayments?: number      // undefined = unlimited
  completedPayments: number
  metadata?: Record<string, string>
  createdAt: Date
  cancelledAt?: Date
  pausedAt?: Date
  raw?: unknown
}
```

### Extended WebhookEventType
```typescript
type WebhookEventType =
  | 'payment.completed' | 'payment.failed' | 'payment.cancelled'
  | 'token.created'              // NEW
  | 'subscription.created'       // NEW
  | 'subscription.charged'       // NEW
  | 'subscription.failed'        // NEW
  | 'subscription.cancelled'     // NEW
```

## New Provider Interface Methods (Optional)

```typescript
interface ChargeTokenParams {
  tokenId: string
  amount: number
  currency?: string
  description: string
  installments?: number
  customer?: BizupCustomer
  metadata?: Record<string, string>
}

interface CreateSubscriptionParams {
  tokenId: string
  amount: number
  currency?: string
  interval: SubscriptionInterval
  description: string
  customer?: BizupCustomer
  startDate?: string
  totalPayments?: number
  metadata?: Record<string, string>
}

interface BizupProvider {
  // Phase 1 (existing)
  createSession(params: CreateSessionParams): Promise<BizupPaymentSession>
  getTransaction(id: string): Promise<BizupTransaction>
  refund(params: RefundParams): Promise<BizupRefund>
  parseWebhook(body: unknown, headers?: Record<string, string>): Promise<BizupWebhookEvent>

  // Phase 2 (optional)
  chargeToken?(params: ChargeTokenParams): Promise<BizupTransaction>
  getToken?(id: string): Promise<BizupToken>
  createSubscription?(params: CreateSubscriptionParams): Promise<BizupSubscription>
  getSubscription?(id: string): Promise<BizupSubscription>
  cancelSubscription?(id: string): Promise<void>
  pauseSubscription?(id: string): Promise<void>
  resumeSubscription?(id: string): Promise<void>
}
```

### Type Guards
```typescript
function supportsTokens(provider: BizupProvider): boolean
function supportsSubscriptions(provider: BizupProvider): boolean
```

## Provider Capability Matrix

| Method | Cardcom | Morning | iCount |
|---|---|---|---|
| `chargeToken` | Yes | Yes | Yes |
| `getToken` | No (throws) | Yes | Yes |
| `createSubscription` | No | No | Yes |
| `getSubscription` | No | No | Yes |
| `cancelSubscription` | No | No | Yes |
| `pauseSubscription` | No | No | Yes |
| `resumeSubscription` | No | No | Yes |

## Per-Provider Implementation

### Cardcom — Token Charge Only
- **chargeToken**: `POST /Transactions/Transaction` with `Token` field (GUID)
- **getToken**: Not supported (token captured from webhook, stored by app)
- Token extracted from `TokenInfo.CardToken` in webhook response

### Morning — Token Charge Only
- **chargeToken**: `POST /payments/tokens/{id}/charge`
- **getToken**: `POST /payments/tokens/search` → filter by id
- Token types: `MorningTokenSearchResult` with id, holderName, number (last4), expires, cardType

### iCount — Full Token + Subscription Support
- **chargeToken**: `POST /cc/bill` with `cc_token_id`
- **getToken**: `POST /cc_storage/token_info` with `cc_token_id`
- **createSubscription**: `POST /hk/create` with `cc_token_id`, `issue_every`, `num_of_payments`
- **getSubscription**: `POST /hk/info` with `hk_id`
- **cancelSubscription**: `POST /hk/cancel` with `hk_id`
- **pauseSubscription**: `POST /hk/pause` with `hk_id`
- **resumeSubscription**: `POST /hk/resume` with `hk_id`

## Implementation Sequence

1. **Core types + interface** — Add BizupToken, BizupSubscription, optional methods, type guards
2. **Cardcom token charge** — Add chargeToken, update webhook mapper for token extraction
3. **Morning token charge** — Add chargeToken, getToken
4. **iCount full implementation** — chargeToken, getToken, all 5 subscription methods
5. **Webhook enrichment** — Populate event.token when token captured during payment
6. **Mock server + e2e** — Extend mocks for token/subscription endpoints

## Key Design Decisions

1. **Optional methods over separate interface** — Keeps `createProvider()` factory returning one type. Type guards handle runtime checks.
2. **No app-level subscription scheduler** — Phase 2 provides building blocks (token charge). App implements its own billing cron for Cardcom/Morning.
3. **Token ID is provider-native** — No ID normalization. App stores raw provider value.
4. **`BizupWebhookEvent.transaction` becomes optional** — `token.created` events may not have a transaction. Acceptable at v0.0.x.
5. **iCount weekly subscriptions unsupported** — `issue_every` is in months; weekly is unreliable.
