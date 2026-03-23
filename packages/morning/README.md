# @bizup-pay/morning

Morning (Green Invoice) adapter for [BizUp Pay](https://pay.bizup.dev) — one SDK for every Israeli payment provider.

> Write payment code once. Swap providers by changing one line of config. TypeScript-first, framework-agnostic, production-ready.

## What This Package Does

`@bizup-pay/morning` connects BizUp Pay to the [Morning](https://www.greeninvoice.co.il) (formerly Green Invoice) payment gateway. It implements the unified `BizupProvider` interface, translating BizUp Pay calls into Morning's REST API.

## How It Fits Together

A typical BizUp Pay integration uses three packages:

| Package | Role |
|---------|------|
| **`@bizup-pay/core`** | Shared types, provider interface, factory |
| **`@bizup-pay/client`** | Browser SDK — mounts payment pages via iframe, modal, or redirect |
| **`@bizup-pay/morning`** | Morning gateway adapter (this package) |

Want to switch to a different provider later? Swap this package for `@bizup-pay/cardcom`, `@bizup-pay/icount`, or `@bizup-pay/grow` — your application code stays the same.

## Install

```bash
npm install @bizup-pay/core @bizup-pay/morning
```

## Quick Start

```typescript
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/morning'

const provider = createProvider('morning', {
  apiKey: process.env.MORNING_API_KEY,
  apiSecret: process.env.MORNING_API_SECRET,
})

const session = await provider.createSession({
  amount: 100,
  description: 'Order #123',
  successUrl: 'https://example.com/success',
  webhookUrl: 'https://example.com/webhook',
})
```

## Configuration

| Option | Description |
|--------|-------------|
| `apiKey` | Your Morning API key |
| `apiSecret` | Your Morning API secret |
| `sandbox` | Use sandbox environment (optional, defaults to false) |

## Supported Operations

- `createSession()` — Create a payment form via Morning's payments API
- `getTransaction()` — Retrieve document/transaction details
- `refund()` — Issue a credit note to refund a transaction
- `parseWebhook()` — Parse and validate Morning webhook payloads

## Documentation

Full documentation, setup guides, and examples: **[pay.bizup.dev](https://pay.bizup.dev)**

## Links

- [Documentation](https://pay.bizup.dev)
- [GitHub](https://github.com/bizup-dev/bizup-pay)
- [Issues](https://github.com/bizup-dev/bizup-pay/issues)

## License

MIT
