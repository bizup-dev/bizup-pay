# @bizup-pay/client

Browser SDK for [BizUp Pay](https://pay.bizup.dev) — one SDK for every Israeli payment provider.

> Write payment code once. Swap providers by changing one line of config. TypeScript-first, framework-agnostic, production-ready.

## What This Package Does

`@bizup-pay/client` is the browser-side companion to BizUp Pay. After your server creates a payment session, this package mounts the provider's payment page in your frontend — as an **iframe**, **modal**, or **redirect** — and handles the `postMessage` communication back to your app.

Works with any frontend framework (React, Vue, Svelte, vanilla JS) or no framework at all.

## How It Fits Together

A typical BizUp Pay integration uses three packages:

| Package | Role |
|---------|------|
| **`@bizup-pay/core`** | Shared types, provider interface, factory (server-side) |
| **`@bizup-pay/client`** | Browser SDK — mounts payment pages (this package) |
| **Provider adapter** | Connects to a specific gateway: `@bizup-pay/morning`, `@bizup-pay/cardcom`, `@bizup-pay/icount`, or `@bizup-pay/grow` |

The client package works with **any** provider — when you switch providers on the server, the frontend code stays the same.

## Install

```bash
npm install @bizup-pay/client
```

Or use via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@bizup-pay/client/dist/index.js"></script>
```

## Quick Start

```typescript
import { mountPayment } from '@bizup-pay/client'

// After your server returns a session with a pageUrl:
const result = await mountPayment({
  pageUrl: session.pageUrl,
  mode: 'modal',          // 'iframe' | 'modal' | 'redirect'
  containerId: 'payment', // for iframe mode
  onSuccess: (data) => console.log('Paid!', data),
  onError: (error) => console.error('Failed', error),
  onCancel: () => console.log('Cancelled'),
})
```

## Mounting Modes

| Mode | Description |
|------|-------------|
| `iframe` | Embeds the payment page in a container element on your page |
| `modal` | Opens the payment page in an overlay modal |
| `redirect` | Redirects the browser to the provider's payment page |

## Documentation

Full documentation, setup guides, and examples: **[pay.bizup.dev](https://pay.bizup.dev)**

## Links

- [Documentation](https://pay.bizup.dev)
- [GitHub](https://github.com/bizup-dev/bizup-pay)
- [Issues](https://github.com/bizup-dev/bizup-pay/issues)

## License

MIT
