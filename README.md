# BizUp Pay

[![Version](https://img.shields.io/npm/v/@bizup-pay/core.svg)](https://www.npmjs.org/package/@bizup-pay/core)
[![Build Status](https://github.com/bizup-dev/bizup-pay/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bizup-dev/bizup-pay/actions?query=branch%3Amain)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Unified TypeScript SDK for Israeli payment providers. One API — swap providers by config.

## Documentation

See the [BizUp Pay docs](https://pay.bizup.dev) for full documentation.

## Requirements

- Node.js >= 20
- npm or yarn

## Installation

```bash
npm install @bizup-pay/core @bizup-pay/cardcom
```

Pick your provider:

| Provider | Package |
|----------|---------|
| [Morning](https://www.greeninvoice.co.il/) (Green Invoice) | `@bizup-pay/morning` |
| [Cardcom](https://www.cardcom.solutions/) | `@bizup-pay/cardcom` |
| [iCount](https://www.icount.co.il/) | `@bizup-pay/icount` |
| [Grow.il](https://www.grow.link/) (Meshulam) | `@bizup-pay/grow` |

## Usage

### Create a payment session

```typescript
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/cardcom'

const provider = createProvider('cardcom', {
  terminalNumber: 1000,
  apiName: process.env.CARDCOM_API_NAME!,
  apiPassword: process.env.CARDCOM_API_PASSWORD!,
})

const session = await provider.createSession({
  amount: 100,
  currency: 'ILS',
  description: 'Order #1234',
  successUrl: 'https://myshop.co.il/success',
  webhookUrl: 'https://myshop.co.il/api/webhook',
  customer: { name: 'Israel Israeli', email: 'israel@example.com' },
})

// Redirect customer to session.pageUrl
```

### Handle webhooks

```typescript
const event = await provider.parseWebhook(req.body)

if (event.type === 'payment.completed') {
  await fulfillOrder(event.transaction)
}
```

### Get transaction details

```typescript
const tx = await provider.getTransaction('219282004')
// tx.amount, tx.status, tx.cardBrand, tx.documentUrl
```

### Process refunds

```typescript
const refund = await provider.refund({ transactionId: '219282004' })
```

### Switch providers

Change one line — the rest of your code stays identical:

```typescript
// Cardcom
import '@bizup-pay/cardcom'
const provider = createProvider('cardcom', { terminalNumber: 1000, apiName: '...', apiPassword: '...' })

// Morning
import '@bizup-pay/morning'
const provider = createProvider('morning', { apiKey: '...', apiSecret: '...' })
```

### Client SDK (browser)

Optional — for embedding payment pages as iframe or modal:

```bash
npm install @bizup-pay/client
```

```typescript
import { BizupPay } from '@bizup-pay/client'

const bizupPay = new BizupPay()
bizupPay.mount(session, document.getElementById('payment'), {
  onSuccess: () => window.location.href = '/thank-you',
  onFailure: (e) => alert(e.message),
})
```

Or via CDN (no build tools required):

```html
<!-- unpkg -->
<script src="https://unpkg.com/@bizup-pay/client@0.1.0/dist/bizup-pay.min.js"></script>

<!-- jsdelivr -->
<script src="https://cdn.jsdelivr.net/npm/@bizup-pay/client@0.1.0/dist/bizup-pay.min.js"></script>
```

## Development

```bash
git clone https://github.com/bizup-dev/bizup-pay.git
cd bizup-pay
npm install
npm run build
npm test          # 131 unit tests
```

### Run the demo app

```bash
# Terminal 1: mock payment servers
node packages/mock-server/dist/standalone.js

# Terminal 2: Next.js demo
cd examples/checkout-demo && npx next dev -p 3099
```

Open http://localhost:3099

## License

[MIT](LICENSE) — Built with ❤️ by [BizUp.dev](https://bizup.dev)
