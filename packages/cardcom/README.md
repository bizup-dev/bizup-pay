# @bizup-pay/cardcom

Cardcom adapter for [BizUp Pay](https://pay.bizup.dev) — one SDK for every Israeli payment provider.

> Write payment code once. Swap providers by changing one line of config. TypeScript-first, framework-agnostic, production-ready.

## What This Package Does

`@bizup-pay/cardcom` connects BizUp Pay to the [Cardcom](https://www.cardcom.co.il) payment gateway. It implements the unified `BizupProvider` interface, translating BizUp Pay calls into Cardcom's LowProfile API.

## How It Fits Together

A typical BizUp Pay integration uses three packages:

| Package | Role |
|---------|------|
| **`@bizup-pay/core`** | Shared types, provider interface, factory |
| **`@bizup-pay/client`** | Browser SDK — mounts payment pages via iframe, modal, or redirect |
| **`@bizup-pay/cardcom`** | Cardcom gateway adapter (this package) |

Want to switch to a different provider later? Swap this package for `@bizup-pay/morning`, `@bizup-pay/icount`, or `@bizup-pay/grow` — your application code stays the same.

## Install

```bash
npm install @bizup-pay/core @bizup-pay/cardcom
```

## Quick Start

```typescript
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/cardcom'

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
```

## Configuration

| Option | Description |
|--------|-------------|
| `terminalNumber` | Your Cardcom terminal number |
| `apiName` | API name for authentication |
| `apiPassword` | API password (optional, depends on terminal config) |

## Supported Operations

- `createSession()` — Create a payment page via Cardcom's LowProfile API
- `getTransaction()` — Retrieve transaction details by ID
- `refund()` — Refund a transaction
- `parseWebhook()` — Parse and validate Cardcom webhook payloads

## Documentation

Full documentation, setup guides, and examples: **[pay.bizup.dev](https://pay.bizup.dev)**

## Links

- [Documentation](https://pay.bizup.dev)
- [GitHub](https://github.com/bizup-dev/bizup-pay)
- [Issues](https://github.com/bizup-dev/bizup-pay/issues)

## License

MIT
