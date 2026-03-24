# BizUp Pay — Agent & Developer Guide

## What This Is

TypeScript monorepo: unified interface for Israeli payment providers (Morning, Cardcom, iCount, Grow). One API, swap providers by config.

## Commands

```bash
npm run build          # tsc --build (all packages)
npm test               # vitest run (117+ unit tests)
npx playwright test    # 16+ e2e tests (needs mock servers + demo app running)
npm run lint           # eslint
```

### Running the Demo

```bash
# Terminal 1: mock payment servers (ports 4100/4200/4300)
node packages/mock-server/dist/standalone.js

# Terminal 2: Next.js demo app (port 3099)
cd examples/checkout-demo && npx next dev -p 3099
```

## Architecture

### Package Map

| Package | Path | Purpose |
|---------|------|---------|
| `@bizup-pay/core` | `packages/core/` | Types, `BizupProvider` interface, `createProvider()` factory, `BizupPayError` |
| `@bizup-pay/morning` | `packages/morning/` | Morning (Green Invoice) adapter |
| `@bizup-pay/cardcom` | `packages/cardcom/` | Cardcom adapter |
| `@bizup-pay/icount` | `packages/icount/` | iCount adapter |
| `@bizup-pay/client` | `packages/client/` | Browser SDK — iframe/modal mounting, postMessage handling |
| `@bizup-pay/mock-server` | `packages/mock-server/` | Mock servers for all providers |

### Provider Interface (the core contract)

Every provider implements:

```typescript
interface BizupProvider {
  readonly name: ProviderName  // 'morning' | 'cardcom' | 'icount' | 'grow'

  createSession(params: CreateSessionParams): Promise<BizupPaymentSession>
  getTransaction(id: string): Promise<BizupTransaction>
  refund(params: RefundParams): Promise<BizupRefund>
  parseWebhook(body: unknown, headers?: Record<string, string>): Promise<BizupWebhookEvent>
}
```

### Key Types

```typescript
// CreateSessionParams — input to createSession()
{ amount, currency?, description, customer?, successUrl, failureUrl?, cancelUrl?,
  webhookUrl, metadata?, installments?, language?, recurring? }

// BizupPaymentSession — output of createSession()
{ id, provider, amount, currency, description, pageUrl, successUrl, failureUrl?,
  cancelUrl?, webhookUrl, metadata, status, operation?, expiresAt? }

// BizupTransaction — output of getTransaction() and parseWebhook()
{ id, providerTransactionId, provider, amount, currency, status, paymentMethod,
  cardBrand?, cardLastFour?, installments, documentUrl?, customer?, createdAt,
  morning?, cardcom?, icount?, grow?, raw }

// BizupWebhookEvent — output of parseWebhook()
{ type: 'payment.completed' | 'payment.failed' | 'payment.cancelled',
  transaction: BizupTransaction, timestamp: Date }

// BizupRefund — output of refund()
{ id, transactionId, amount, status, createdAt }
```

### Adding a New Provider

1. Create `packages/<name>/` with `provider.ts`, `mapper.ts`, `types.ts`, `index.ts`
2. Implement `BizupProvider` interface
3. Export and register: `registerProvider('<name>', (config) => new XProvider(config))`
4. Add `<name>` to `ProviderName` union in `packages/core/src/types.ts`
5. Add `<name>Extras` interface in `packages/core/src/types.ts`
6. Add `<name>?: <Name>Extras` field to `BizupTransaction`
7. Add to `tsconfig.json` references
8. Add mock server in `packages/mock-server/`
9. Add to demo app: config in `api/checkout/route.ts`, buttons in pages

### Provider File Structure (each adapter)

```
packages/<name>/
  src/
    provider.ts    # <Name>Provider implements BizupProvider
    mapper.ts      # to<Name>Request(), from<Name>Response() — pure transform functions
    types.ts       # Provider-specific request/response types, config interface
    index.ts       # registerProvider() call + exports
    __tests__/     # Unit tests (mock HTTP client, test mapper transforms)
    __fixtures__/  # Real API response examples as JSON
  package.json
  tsconfig.json
```

### Mapper Pattern

Each provider has pure mapper functions:
- `to<Provider>Request(params, config)` → provider API request body
- `from<Provider>Response(response, params)` → `BizupPaymentSession`
- `from<Provider>TransactionInfo(info)` → `BizupTransaction`
- `from<Provider>Webhook(payload)` → `BizupWebhookEvent`

### HTTP Client Injection

All providers accept an optional `httpClient` in their constructor for testing:

```typescript
constructor(config: Config, httpClient?: HttpClient)
```

Default: `globalThis.fetch`. Tests inject a mock that returns fixture data.

### Mock Server Pattern

Each mock server:
- Implements `MockProviderServer` interface (`start()`, `stop()`, `reset()`, `getTransactions()`)
- Serves a mock payment HTML page at `/pay/:sessionId`
- Handles form POST at `/pay/:sessionId/complete` (success/fail buttons)
- Sends postMessage to parent (for iframe/modal) and redirects (for redirect mode)
- Fires webhook to `webhookUrl` on payment completion
- `autoComplete` option: if true, auto-completes payment on session creation (for unit tests)

### Demo App Structure

```
examples/checkout-demo/src/
  lib/constants.ts          # PROVIDERS, MODE_INFO, MOCK_CUSTOMER
  lib/store.ts              # In-memory purchase store
  components/               # FormField, StepBadge, ToggleGroup, ResultScreen, DebugPanel
  app/
    page.tsx                # Shop — product grid + cart
    subscribe/page.tsx      # Subscription plans (recurring)
    checkout/page.tsx        # Checkout — mode selector, customer form, payment
    account/page.tsx         # Purchase history + getTransaction() details
    api/checkout/route.ts    # POST: createSession() with debug logging
    api/webhook/route.ts     # POST: parseWebhook() + store purchase
    api/transactions/        # GET: list purchases, GET [id]: getTransaction()
```

## Versioning & Publishing

This repo uses [Changesets](https://github.com/changesets/changesets) for version management and npm publishing.

### Rules

- **Every commit/PR that changes package code MUST include a changeset.** Run `npx changeset` before committing and select the affected packages.
- **Patch bump** for bug fixes, docs, refactors within a package.
- **Minor bump** for new features, new exports, non-breaking additions.
- **Major bump** only at release time (see below).
- If a commit only touches non-package files (docs site, CI, root config, examples), no changeset is needed.
- `@bizup-pay/core` changes often affect all providers — select all dependent packages when bumping core.

### Workflow

```bash
# 1. After making changes, record what changed (interactive prompt)
npx changeset
# → Select affected packages, pick patch/minor, write summary
# → Creates a file in .changeset/ — commit it with your code

# 2. At release time: consume all pending changesets, bump versions, generate CHANGELOGs
npx changeset version
# → Review the version bumps and CHANGELOG.md updates in each package
# → Commit the result

# 3. Publish all updated packages to npm (in dependency order, core first)
npx changeset publish
```

### Publishing (manual)

If `changeset publish` fails or you need to publish manually, **order matters** — core must go first:

```bash
npm run build
npm publish --workspace packages/core --access public
npm publish --workspace packages/morning --access public
npm publish --workspace packages/cardcom --access public
npm publish --workspace packages/icount --access public
npm publish --workspace packages/grow --access public
npm publish --workspace packages/client --access public
npm publish --workspace packages/mock-server --access public
```

### Agent Instructions

When committing code that modifies any file under `packages/*/src/`:
1. Run `npx changeset` — select affected packages, use **patch** for fixes/refactors, **minor** for features.
2. Commit the generated `.changeset/*.md` file together with the code changes.
3. Do NOT run `changeset version` or `changeset publish` unless explicitly asked — those are release-time operations.

## Conventions

- **TypeScript strict mode**, ES2022 target, Node16 module resolution
- **Vitest** for unit tests, **Playwright** for e2e
- **Test fixtures**: real API response examples as JSON in `__fixtures__/`
- **No database**: demo uses in-memory store; framework is stateless
- **Three-tier data**: common fields → typed provider extras → `raw` escape hatch
- **Error handling**: all errors wrapped in `BizupPayError` with code, provider, providerError
- **OpenAPI specs** in `specs/` for reference (not generated, hand-curated from provider docs)

## Provider API Mapping

| BizUp Method | Morning | Cardcom | iCount |
|---|---|---|---|
| `createSession` | `POST /payments/form` | `POST /LowProfile/Create` | `POST /paypage/generate_sale` |
| `getTransaction` | `GET /documents/{id}` | `POST /Transactions/GetTransactionInfoById` | `POST /doc/info` |
| `refund` | `POST /documents` (credit note) | `POST /Transactions/RefundByTransactionId` | `POST /doc/cancel` + `refund_cc` |
| `parseWebhook` | Document payload | LowProfile webhook | IPN payload |
| `documentUrl` | Download links endpoint | `DocumentUrl` in transaction info | `pdf_url` in doc info |
| Auth | Bearer token (key:secret) | Per-request body params | SID (cached 19min) |

## Testing

- **Unit tests**: mock only the HTTP client. Real adapter code all the way to the HTTP boundary.
- **E2e tests**: Playwright against mock servers. Tests use helper functions in `e2e/helpers.ts`.
- **Sandbox tests**: some e2e specs hit real provider sandboxes (Cardcom terminal 1000).
- Always run `npm run build` before tests (TypeScript project references).
