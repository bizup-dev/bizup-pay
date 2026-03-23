# @bizup-pay/mock-server

Mock payment servers for [BizUp Pay](https://pay.bizup.dev) — one SDK for every Israeli payment provider.

> Write payment code once. Swap providers by changing one line of config. TypeScript-first, framework-agnostic, production-ready.

## What This Package Does

`@bizup-pay/mock-server` provides local mock implementations of all supported payment provider APIs. Use it for **development and testing** — run your full payment flow locally without hitting real provider sandboxes.

**Do not use in production.**

## How It Fits Together

A typical BizUp Pay integration uses three packages:

| Package | Role |
|---------|------|
| **`@bizup-pay/core`** | Shared types, provider interface, factory |
| **`@bizup-pay/client`** | Browser SDK — mounts payment pages via iframe, modal, or redirect |
| **Provider adapter** | Connects to a specific gateway (Morning, Cardcom, iCount, Grow) |

This package **replaces the real provider APIs** during development. Point your provider config at `localhost` and get instant, deterministic payment flows with webhook delivery.

## Install

```bash
npm install --save-dev @bizup-pay/mock-server
```

## Usage

### Standalone Server

```bash
npx bizup-mock-server
# Starts mock servers on ports 4100, 4200, 4300
```

### Programmatic

```typescript
import { createMockServer } from '@bizup-pay/mock-server'

const server = createMockServer({ autoComplete: true })
await server.start()

// Run your tests...

await server.stop()
```

## Features

- Mock payment HTML pages with success/fail buttons
- Webhook delivery to your `webhookUrl`
- `postMessage` support for iframe/modal integration testing
- `autoComplete` mode for fully automated test flows
- Transaction storage for `getTransaction()` testing
- `reset()` to clear state between tests

## Mocked Providers

- Morning (Green Invoice)
- Cardcom
- iCount
- Grow.il (Meshulam)

## Documentation

Full documentation, setup guides, and examples: **[pay.bizup.dev](https://pay.bizup.dev)**

## Links

- [Documentation](https://pay.bizup.dev)
- [GitHub](https://github.com/bizup-dev/bizup-pay)
- [Issues](https://github.com/bizup-dev/bizup-pay/issues)

## License

MIT
