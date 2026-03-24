# @bizup-pay/grow

Grow.il (Meshulam) adapter for [BizUp Pay](https://pay.bizup.dev) — one SDK for every Israeli payment provider.

> Write payment code once. Swap providers by changing one line of config. TypeScript-first, framework-agnostic, production-ready.

## What This Package Does

`@bizup-pay/grow` connects BizUp Pay to the [Grow.il](https://www.grow.il) (Meshulam) payment platform. It implements the unified `BizupProvider` interface, translating BizUp Pay calls into Grow's HTTP API.

## How It Fits Together

A typical BizUp Pay integration uses three packages:

| Package | Role |
|---------|------|
| **`@bizup-pay/core`** | Shared types, provider interface, factory |
| **`@bizup-pay/client`** | Browser SDK — mounts payment pages via iframe, modal, or redirect |
| **`@bizup-pay/grow`** | Grow.il gateway adapter (this package) |

Want to switch to a different provider later? Swap this package for `@bizup-pay/cardcom`, `@bizup-pay/morning`, or `@bizup-pay/icount` — your application code stays the same.

## Install

```bash
npm install @bizup-pay/core @bizup-pay/grow
```

## Quick Start

```typescript
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/grow'

const provider = createProvider('grow', {
  pageCode: process.env.GROW_PAGE_CODE,
  apiKey: process.env.GROW_API_KEY,
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
| `pageCode` | Your Grow.il page code |
| `apiKey` | Your Grow.il API key |

## Supported Operations

- `createSession()` — Create a payment page via Grow's API
- `getTransaction()` — Retrieve transaction details
- `refund()` — Refund a transaction
- `parseWebhook()` — Parse and validate Grow webhook payloads

## Documentation

Full documentation, setup guides, and examples: **[pay.bizup.dev](https://pay.bizup.dev)**

## Links

- [Documentation](https://pay.bizup.dev)
- [GitHub](https://github.com/bizup-dev/bizup-pay)
- [Issues](https://github.com/bizup-dev/bizup-pay/issues)

## License

MIT
