# @bizup-pay/core

Core types, interfaces, and provider factory for [BizUp Pay](https://pay.bizup.dev) — one SDK for every Israeli payment provider.

> Write payment code once. Swap providers by changing one line of config. TypeScript-first, framework-agnostic, production-ready.

## What This Package Does

`@bizup-pay/core` is the foundation of the BizUp Pay SDK. It defines the unified `BizupProvider` interface that all provider adapters implement, along with shared types, error handling, and the `createProvider()` factory function.

**You always need this package** — every BizUp Pay integration starts here.

## How It Fits Together

A typical BizUp Pay integration uses three packages:

| Package | Role |
|---------|------|
| **`@bizup-pay/core`** | Shared types, provider interface, factory (this package) |
| **`@bizup-pay/client`** | Browser SDK — mounts payment pages via iframe, modal, or redirect |
| **Provider adapter** | Connects to a specific gateway: `@bizup-pay/morning`, `@bizup-pay/cardcom`, `@bizup-pay/icount`, or `@bizup-pay/grow` |

Want to switch from Cardcom to Morning? Change one line of config — your application code stays the same.

## Install

```bash
npm install @bizup-pay/core @bizup-pay/cardcom  # pick your provider
```

## Quick Start

```typescript
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/cardcom' // registers the provider

const provider = createProvider('cardcom', {
  terminalNumber: process.env.CARDCOM_TERMINAL,
  apiName: process.env.CARDCOM_API_NAME,
})

const session = await provider.createSession({
  amount: 100,
  description: 'Order #123',
  successUrl: 'https://example.com/success',
  webhookUrl: 'https://example.com/webhook',
})

// session.pageUrl → redirect the customer here
```

## Provider Interface

Every provider adapter implements:

```typescript
interface BizupProvider {
  readonly name: ProviderName

  createSession(params: CreateSessionParams): Promise<BizupPaymentSession>
  getTransaction(id: string): Promise<BizupTransaction>
  refund(params: RefundParams): Promise<BizupRefund>
  parseWebhook(body: unknown, headers?: Record<string, string>): Promise<BizupWebhookEvent>
}
```

## Available Providers

- [`@bizup-pay/cardcom`](https://www.npmjs.com/package/@bizup-pay/cardcom) — Cardcom
- [`@bizup-pay/morning`](https://www.npmjs.com/package/@bizup-pay/morning) — Morning (Green Invoice)
- [`@bizup-pay/icount`](https://www.npmjs.com/package/@bizup-pay/icount) — iCount
- [`@bizup-pay/grow`](https://www.npmjs.com/package/@bizup-pay/grow) — Grow.il (Meshulam)

## Documentation

Full documentation, setup guides, and examples: **[pay.bizup.dev](https://pay.bizup.dev)**

## Links

- [Documentation](https://pay.bizup.dev)
- [GitHub](https://github.com/bizup-dev/bizup-pay)
- [Issues](https://github.com/bizup-dev/bizup-pay/issues)

## License

MIT
