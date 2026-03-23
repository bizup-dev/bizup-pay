# @bizup-pay/icount

iCount adapter for [BizUp Pay](https://pay.bizup.dev) — one SDK for every Israeli payment provider.

> Write payment code once. Swap providers by changing one line of config. TypeScript-first, framework-agnostic, production-ready.

## What This Package Does

`@bizup-pay/icount` connects BizUp Pay to the [iCount](https://www.icount.co.il) accounting and payment platform. It implements the unified `BizupProvider` interface, translating BizUp Pay calls into iCount's REST API.

## How It Fits Together

A typical BizUp Pay integration uses three packages:

| Package | Role |
|---------|------|
| **`@bizup-pay/core`** | Shared types, provider interface, factory |
| **`@bizup-pay/client`** | Browser SDK — mounts payment pages via iframe, modal, or redirect |
| **`@bizup-pay/icount`** | iCount gateway adapter (this package) |

Want to switch to a different provider later? Swap this package for `@bizup-pay/cardcom`, `@bizup-pay/morning`, or `@bizup-pay/grow` — your application code stays the same.

## Install

```bash
npm install @bizup-pay/core @bizup-pay/icount
```

## Quick Start

```typescript
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/icount'

const provider = createProvider('icount', {
  companyId: process.env.ICOUNT_COMPANY_ID,
  user: process.env.ICOUNT_USER,
  pass: process.env.ICOUNT_PASS,
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
| `companyId` | Your iCount company ID |
| `user` | API username |
| `pass` | API password |

## Supported Operations

- `createSession()` — Generate a payment page via iCount's paypage API
- `getTransaction()` — Retrieve document/transaction info
- `refund()` — Cancel a document and refund the credit card charge
- `parseWebhook()` — Parse and validate iCount IPN payloads

## Documentation

Full documentation, setup guides, and examples: **[pay.bizup.dev](https://pay.bizup.dev)**

## Links

- [Documentation](https://pay.bizup.dev)
- [GitHub](https://github.com/bizup-dev/bizup-pay)
- [Issues](https://github.com/bizup-dev/bizup-pay/issues)

## License

MIT
