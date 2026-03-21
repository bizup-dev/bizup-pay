# Demo App Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the checkout-demo app for readability by extracting shared components, constants, and reducing the 688-line checkout page to ~250 lines.

**Architecture:** Extract reusable UI components (`FormField`, `StepBadge`, `ToggleGroup`, `DebugPanel`, `ResultScreen`) into `src/components/`. Move shared constants (`PROVIDERS`, `MODE_INFO`, `MOCK_CUSTOMER`) into `src/lib/constants.ts`. Each page imports what it needs — no duplication.

**Tech Stack:** Next.js 15, React 18, TypeScript, @bizup-pay/core, @bizup-pay/client

**Current state:** 3 pages totaling 1096 lines. `checkout/page.tsx` alone is 688 lines with inline styles, 12+ state variables, and mixed concerns (controls, payment mounting, result display, debug panel).

---

### Task 1: Create shared constants (`src/lib/constants.ts`)

**Files:**
- Create: `examples/checkout-demo/src/lib/constants.ts`

**Step 1: Create the constants file**

Extract from `checkout/page.tsx` and `page.tsx`:

```typescript
// Provider metadata
export type ProviderKey = 'morning' | 'cardcom' | 'icount'

export const PROVIDERS: Record<ProviderKey, { label: string; color: string }> = {
  morning: { label: 'Morning (Green Invoice)', color: '#16a34a' },
  cardcom: { label: 'Cardcom', color: '#dc2626' },
  icount: { label: 'iCount', color: '#2563eb' },
}

// Integration modes
export type IntegrationMode = 'iframe' | 'modal' | 'redirect' | 'direct'

export const MODE_INFO: Record<IntegrationMode, { label: string; code: string; description: string }> = {
  iframe: {
    label: 'Iframe (Embed)',
    code: 'BizupPay.mount(session, container)',
    description: "Payment form loads inline on your page inside an iframe. Customer never leaves your site. Best for seamless checkout UX.",
  },
  modal: {
    label: 'Modal (Popup)',
    code: 'BizupPay.openModal(session)',
    description: "Payment form opens in a centered overlay/modal. Customer stays on your page with a dimmed background. Good for single-action payments.",
  },
  redirect: {
    label: 'Redirect (Full Page)',
    code: 'window.location.href = session.pageUrl',
    description: "Customer is redirected to the provider's full payment page. After payment, they return via successUrl/failureUrl. Simplest integration, works everywhere.",
  },
  direct: {
    label: 'Direct API',
    code: 'POST /cc/bill { card, amount }',
    description: "Card details are collected on YOUR page and sent directly to the provider API. Full control over UX but requires PCI-DSS compliance. Only supported by iCount.",
  },
}

// Default test customer
export const MOCK_CUSTOMER = {
  name: 'Israel Israeli',
  email: 'israel@example.com',
  phone: '054-1234567',
  taxId: '012345678',
}
```

**Step 2: Commit**

```bash
git add examples/checkout-demo/src/lib/constants.ts
git commit -m "refactor(demo): extract shared constants into lib/constants"
```

---

### Task 2: Create shared UI components

**Files:**
- Create: `examples/checkout-demo/src/components/FormField.tsx`
- Create: `examples/checkout-demo/src/components/StepBadge.tsx`
- Create: `examples/checkout-demo/src/components/ToggleGroup.tsx`
- Create: `examples/checkout-demo/src/components/ResultScreen.tsx`
- Create: `examples/checkout-demo/src/components/DebugPanel.tsx`
- Create: `examples/checkout-demo/src/components/index.ts`

**Step 1: Create FormField** — extracted from checkout page

```tsx
// FormField.tsx
export function FormField({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem', color: '#444' }}>
        {label}
      </label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' }} />
    </div>
  )
}
```

**Step 2: Create StepBadge** — extracted from checkout page

```tsx
// StepBadge.tsx
export function StepBadge({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  const bg = active ? '#0070f3' : done ? '#16a34a' : '#e5e7eb'
  const color = active || done ? '#fff' : '#999'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
        {done ? 'V' : num}
      </div>
      <span style={{ fontWeight: active ? 600 : 400, color: active ? '#111' : '#666', fontSize: '0.9rem' }}>{label}</span>
    </div>
  )
}
```

**Step 3: Create ToggleGroup** — generic pill toggle used for mode, backend, billing cycle

```tsx
// ToggleGroup.tsx
export interface ToggleOption<T extends string> {
  value: T
  label: string
  disabled?: boolean
  title?: string
}

export function ToggleGroup<T extends string>({ options, value, onChange, disabled }: {
  options: ToggleOption<T>[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div style={{ display: 'inline-flex', background: '#e5e7eb', borderRadius: 6, padding: 2 }}>
      {options.map(opt => {
        const isDisabled = disabled || opt.disabled
        const isActive = value === opt.value
        return (
          <button key={opt.value} onClick={() => { if (!isDisabled) onChange(opt.value) }}
            disabled={isDisabled} title={opt.title}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: 5, border: 'none',
              cursor: isDisabled ? 'default' : 'pointer',
              fontWeight: 600, fontSize: '0.8rem',
              background: isActive ? '#fff' : 'transparent',
              color: isActive ? '#111' : '#666',
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              opacity: isDisabled ? 0.4 : 1,
            }}>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
```

**Step 4: Create ResultScreen** — success/failure/cancelled display

```tsx
// ResultScreen.tsx
'use client'
import { useRouter } from 'next/navigation'

const RESULT_COLORS = {
  success: { bg: '#f0fdf4', border: '#16a34a', text: '#16a34a', icon: 'V' },
  failure: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', icon: 'X' },
  cancelled: { bg: '#fefce8', border: '#ca8a04', text: '#ca8a04', icon: '!' },
} as const

export function ResultScreen({ status, message }: { status: 'success' | 'failure' | 'cancelled'; message: string }) {
  const router = useRouter()
  const c = RESULT_COLORS[status]
  const title = status === 'success' ? 'Payment Successful' : status === 'failure' ? 'Payment Failed' : 'Payment Cancelled'

  return (
    <div>
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.5rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
        BizUp Pay Demo App <span style={{ margin: '0 0.4rem' }}>&mdash;</span> You are back on the merchant&apos;s website
      </div>
      <div style={{ maxWidth: 500, margin: '3rem auto', textAlign: 'center', padding: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: c.bg, border: `2px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem', fontWeight: 700, color: c.text }}>
          {c.icon}
        </div>
        <h1 style={{ color: c.text, marginBottom: '0.5rem' }}>{title}</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>{message}</p>
        <button onClick={() => router.push('/')}
          style={{ background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 2rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
          Back to Shop
        </button>
      </div>
    </div>
  )
}
```

**Step 5: Create DebugPanel** — the debug log viewer

```tsx
// DebugPanel.tsx
'use client'
import { useState } from 'react'

export interface DebugLogEntry {
  timestamp: string; method: string; url: string
  requestBody?: unknown; responseStatus?: number; responseBody?: unknown; durationMs: number
}

export function DebugPanel({ logs }: { logs: DebugLogEntry[] }) {
  const [expanded, setExpanded] = useState(true)
  if (logs.length === 0) return null

  return (
    <div style={{ background: '#1e1b2e', borderRadius: 8, marginBottom: '1rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', fontFamily: 'ui-monospace, monospace' }}>
      <button onClick={() => setExpanded(v => !v)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: '#2d2640', border: 'none', cursor: 'pointer', color: '#c4b5fd', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit' }}>
        <span>Server Network Logs ({logs.length} request{logs.length !== 1 ? 's' : ''})</span>
        <span>{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0.75rem 1rem', maxHeight: 500, overflowY: 'auto' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: i < logs.length - 1 ? '0.75rem' : 0, borderBottom: i < logs.length - 1 ? '1px solid #3b3555' : 'none', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ background: log.responseStatus && log.responseStatus < 400 ? '#065f46' : '#991b1b', color: '#fff', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem', fontWeight: 600 }}>
                  {log.responseStatus ?? '???'}
                </span>
                <span style={{ color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem' }}>{log.method}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', wordBreak: 'break-all' }}>{log.url}</span>
                <span style={{ color: '#64748b', fontSize: '0.7rem', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{log.durationMs}ms</span>
              </div>
              {log.requestBody && (
                <details style={{ marginBottom: '0.25rem' }}>
                  <summary style={{ color: '#7dd3fc', fontSize: '0.75rem', cursor: 'pointer' }}>Request Body</summary>
                  <pre style={{ color: '#cbd5e1', fontSize: '0.75rem', margin: '0.25rem 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(log.requestBody, null, 2)}
                  </pre>
                </details>
              )}
              {log.responseBody && (
                <details>
                  <summary style={{ color: '#86efac', fontSize: '0.75rem', cursor: 'pointer' }}>Response Body</summary>
                  <pre style={{ color: '#cbd5e1', fontSize: '0.75rem', margin: '0.25rem 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(log.responseBody, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 6: Create barrel export**

```typescript
// index.ts
export { FormField } from './FormField'
export { StepBadge } from './StepBadge'
export { ToggleGroup } from './ToggleGroup'
export type { ToggleOption } from './ToggleGroup'
export { ResultScreen } from './ResultScreen'
export { DebugPanel } from './DebugPanel'
export type { DebugLogEntry } from './DebugPanel'
```

**Step 7: Commit**

```bash
git add examples/checkout-demo/src/components/
git commit -m "refactor(demo): extract shared UI components"
```

---

### Task 3: Rewrite shop page (`page.tsx`)

**Files:**
- Modify: `examples/checkout-demo/src/app/page.tsx`

**Step 1: Rewrite using shared constants**

Import `PROVIDERS` and `ProviderKey` from `@/lib/constants`. Replace hardcoded provider colors and labels with the shared map. Generate checkout buttons from the `PROVIDERS` map instead of 3 separate `<button>` blocks.

Key changes:
- Import `{ PROVIDERS, ProviderKey }` from `@/lib/constants`
- Replace 3 checkout buttons with `Object.entries(PROVIDERS).map(...)` loop
- No other structural changes — this page is already clean

**Step 2: Verify the page renders**

Open http://localhost:3099 — add item to cart, verify 3 provider buttons still appear with correct colors.

**Step 3: Commit**

```bash
git add examples/checkout-demo/src/app/page.tsx
git commit -m "refactor(demo): shop page uses shared provider constants"
```

---

### Task 4: Rewrite subscribe page (`subscribe/page.tsx`)

**Files:**
- Modify: `examples/checkout-demo/src/app/subscribe/page.tsx`

**Step 1: Rewrite using shared components**

Import `{ PROVIDERS, ProviderKey }` from `@/lib/constants` and `{ ToggleGroup }` from `@/components`. Replace the billing cycle toggle with `<ToggleGroup>`. Replace 3 provider subscribe buttons per plan with a loop over `PROVIDERS`.

Key changes:
- Billing cycle toggle becomes `<ToggleGroup>` component
- 3 subscribe buttons per card become `Object.entries(PROVIDERS).map(...)` loop
- Remove the `btnStyle` constant (moved to inline in the loop or kept minimal)

**Step 2: Verify the page renders**

Open http://localhost:3099/subscribe — toggle billing cycle, click a subscribe button, verify it navigates to checkout.

**Step 3: Commit**

```bash
git add examples/checkout-demo/src/app/subscribe/page.tsx
git commit -m "refactor(demo): subscribe page uses shared components"
```

---

### Task 5: Rewrite checkout page (`checkout/page.tsx`)

**Files:**
- Modify: `examples/checkout-demo/src/app/checkout/page.tsx`

This is the big one. The page drops from ~688 lines to ~300 by using extracted components.

**Step 1: Replace imports and constants**

- Remove local `IntegrationMode`, `MODE_INFO`, `MOCK_CUSTOMER` definitions
- Import from `@/lib/constants` and `@/components`
- Remove local `FormField`, `StepBadge` function definitions

**Step 2: Replace result screen**

Replace the 35-line result screen block (`if (step === 'success' || ...)`) with:
```tsx
if (step === 'success' || step === 'failure' || step === 'cancelled') {
  return <ResultScreen status={step} message={message} />
}
```

**Step 3: Replace integration mode toggle**

Replace the 30-line mode toggle with:
```tsx
<ToggleGroup
  options={(['iframe', 'modal', 'redirect', 'direct'] as IntegrationMode[]).map(m => ({
    value: m,
    label: MODE_INFO[m].label,
    disabled: step === 'payment' || (isIcount && (m === 'iframe' || m === 'modal')) || (!isIcount && m === 'direct'),
    title: isIcount && (m === 'iframe' || m === 'modal') ? 'iCount only supports redirect and direct modes' : !isIcount && m === 'direct' ? 'Direct API mode is only available for iCount' : undefined,
  }))}
  value={mode}
  onChange={setMode}
/>
```

**Step 4: Replace backend toggle**

Replace the 30-line backend toggle with:
```tsx
<ToggleGroup
  options={[{ value: 'mock' as const, label: 'Mock Server' }, { value: 'sandbox' as const, label: 'Provider Sandbox' }]}
  value={useMock ? 'mock' : 'sandbox'}
  onChange={v => setUseMock(v === 'mock')}
  disabled={step === 'payment'}
/>
```

**Step 5: Replace debug panel**

Replace the 50-line debug log panel with:
```tsx
{debugMode && <DebugPanel logs={debugLogs} />}
```

**Step 6: Use PROVIDERS constant for provider colors/labels**

Replace `providerLabel` computation and hardcoded color references with `PROVIDERS[provider]`.

**Step 7: Verify all flows work**

Test each combination:
- Morning/Cardcom/iCount
- Mock/Sandbox
- Iframe/Modal/Redirect/Direct
- Debug toggle on/off
- Recurring via subscribe page

**Step 8: Commit**

```bash
git add examples/checkout-demo/src/app/checkout/page.tsx
git commit -m "refactor(demo): checkout page uses extracted components (~300 lines from 688)"
```

---

### Task 6: Run full test suite

**Step 1: Run unit tests**

```bash
npm run build && npx vitest run
```
Expected: 116 tests pass

**Step 2: Run e2e tests**

```bash
npx playwright test --reporter=list
```
Expected: 16 tests pass (no e2e changes needed — tests interact via roles/text, not implementation details)

**Step 3: Final commit if any fixups needed**

---

### Summary

| File | Before | After |
|------|--------|-------|
| `src/lib/constants.ts` | - | ~50 lines (new) |
| `src/components/` | - | ~140 lines (5 components) |
| `src/app/page.tsx` | 206 | ~180 |
| `src/app/subscribe/page.tsx` | 202 | ~150 |
| `src/app/checkout/page.tsx` | 688 | ~300 |
| **Total** | 1096 | ~820 |

Net: fewer lines, but the real win is each file has a single clear purpose and shared components eliminate duplication.
