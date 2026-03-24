import { NextRequest, NextResponse } from 'next/server'
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/morning'
import '@bizup-pay/cardcom'
import '@bizup-pay/icount'
import '@bizup-pay/grow'
import '@bizup-pay/tranzilla'

// --- Debug logging infrastructure ---

interface DebugLogEntry {
  timestamp: string
  method: string
  url: string
  requestBody?: unknown
  responseStatus?: number
  responseBody?: unknown
  durationMs: number
}

const REDACT_KEYS = new Set([
  'apipassword', 'apisecret', 'apikey', 'password', 'pass',
  'accesstoken', 'authorization', 'sid', 'token', 'secret',
])

function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return obj
  if (Array.isArray(obj)) return obj.map(redactSensitive)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (REDACT_KEYS.has(key.toLowerCase())) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = redactSensitive(value)
      }
    }
    return result
  }
  return obj
}

function createLoggingFetch(logs: DebugLogEntry[]): typeof globalThis.fetch {
  const originalFetch = globalThis.fetch
  return async function loggingFetch(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = init?.method ?? 'GET'
    const start = Date.now()

    let requestBody: unknown
    if (init?.body && typeof init.body === 'string') {
      try { requestBody = JSON.parse(init.body) } catch { requestBody = init.body }
    }

    const response = await originalFetch(input, init)
    const cloned = response.clone()
    let responseBody: unknown
    try { responseBody = await cloned.json() } catch { responseBody = null }

    logs.push({
      timestamp: new Date().toISOString(),
      method,
      url,
      requestBody: redactSensitive(requestBody),
      responseStatus: response.status,
      responseBody: redactSensitive(responseBody),
      durationMs: Date.now() - start,
    })

    return response
  } as typeof globalThis.fetch
}

const mockConfigs = {
  morning: {
    apiKey: 'mock-key',
    apiSecret: 'mock-secret',
    baseUrl: process.env.MORNING_MOCK_URL || 'http://localhost:4100/api/v1',
  },
  cardcom: {
    terminalNumber: 1000,
    apiName: 'mock-api',
    apiPassword: 'mock-pass',
    baseUrl: process.env.CARDCOM_MOCK_URL || 'http://localhost:4200/api/v11',
  },
  icount: {
    cid: 'mock',
    accessToken: 'mock-token',
    paypageId: 1,
    baseUrl: process.env.ICOUNT_MOCK_URL || 'http://localhost:4300/api/v3.php',
  },
  grow: {
    pageCode: 'mock-page',
    userId: 'mock-user',
    baseUrl: process.env.GROW_MOCK_URL || 'http://localhost:4400/api/light/server/1.0',
  },
  tranzilla: {
    appKey: 'mock-app-key',
    secretKey: 'mock-secret-key',
    terminal: 'mock-terminal',
    baseUrl: process.env.TRANZILLA_MOCK_URL || 'http://localhost:4500/v1',
  },
}

const sandboxConfigs = {
  morning: {
    apiKey: process.env.MORNING_SANDBOX_API_KEY || '',
    apiSecret: process.env.MORNING_SANDBOX_API_SECRET || '',
    baseUrl: 'https://sandbox.d.greeninvoice.co.il/api/v1',
  },
  cardcom: {
    terminalNumber: Number(process.env.CARDCOM_SANDBOX_TERMINAL || 1000),
    apiName: process.env.CARDCOM_SANDBOX_API_NAME || '',
    apiPassword: process.env.CARDCOM_SANDBOX_API_PASSWORD || '',
    // No baseUrl = uses default production URL (sandbox uses same endpoint, different credentials)
  },
  icount: {
    cid: 'bizup',
    accessToken: process.env.ICOUNT_SANDBOX_TOKEN || '',
    paypageId: 2,
  },
  grow: {
    pageCode: process.env.GROW_SANDBOX_PAGE_CODE || '',
    userId: process.env.GROW_SANDBOX_USER_ID || '',
    baseUrl: 'https://sandbox.meshulam.co.il/api/light/server/1.0',
  },
  tranzilla: {
    appKey: process.env.TRANZILLA_SANDBOX_APP_KEY || '',
    secretKey: process.env.TRANZILLA_SANDBOX_SECRET_KEY || '',
    terminal: process.env.TRANZILLA_SANDBOX_TERMINAL || '',
  },
}

const DEBUG_PANEL_ENABLED = process.env.DEBUG_PANEL_ENABLED === 'true'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider: providerName, amount, description, items, mock } = body

    if (!providerName || !['morning', 'cardcom', 'icount', 'grow', 'tranzilla'].includes(providerName)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const useMock = mock !== false
    const configs = useMock ? mockConfigs : sandboxConfigs
    const config = configs[providerName as keyof typeof configs]

    // Validate sandbox credentials exist when not using mock
    if (!useMock) {
      if (providerName === 'cardcom' && !sandboxConfigs.cardcom.apiName) {
        return NextResponse.json({ error: 'Cardcom sandbox credentials not configured. Set CARDCOM_SANDBOX_API_NAME and CARDCOM_SANDBOX_API_PASSWORD in .env.local' }, { status: 400 })
      }
      if (providerName === 'morning' && !sandboxConfigs.morning.apiKey) {
        return NextResponse.json({ error: 'Morning sandbox credentials not configured. Set MORNING_SANDBOX_API_KEY and MORNING_SANDBOX_API_SECRET in .env.local' }, { status: 400 })
      }
      if (providerName === 'icount' && !sandboxConfigs.icount.accessToken) {
        return NextResponse.json({ error: 'iCount sandbox credentials not configured. Set ICOUNT_SANDBOX_TOKEN in .env.local' }, { status: 400 })
      }
    }

    // Debug: install logging fetch if both server env and client flag are set
    const debugRequested = body.debug === true && DEBUG_PANEL_ENABLED
    const debugLogs: DebugLogEntry[] = []
    const savedFetch = globalThis.fetch
    if (debugRequested) {
      globalThis.fetch = createLoggingFetch(debugLogs)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3099'

    let session
    try {
      const provider = createProvider(providerName, config)

      const { recurring, customer } = body as {
        recurring?: { interval: string; totalPayments?: number; amount?: number }
        customer?: { name: string; email?: string; phone?: string; taxId?: string }
      }

      session = await provider.createSession({
        amount,
        currency: 'ILS',
        description,
        successUrl: `${appUrl}/checkout?status=success`,
        failureUrl: `${appUrl}/checkout?status=failure`,
        cancelUrl: `${appUrl}/checkout?status=cancelled`,
        webhookUrl: `${appUrl}/api/webhook`,
        customer: customer ?? { name: 'Guest' },
        language: 'he',
        ...(recurring ? {
          recurring: {
            interval: recurring.interval as 'monthly' | 'weekly' | 'yearly',
            totalPayments: recurring.totalPayments,
            amount: recurring.amount,
            firstAmount: amount,
          },
        } : {}),
        metadata: {
          _products: JSON.stringify(
            (items as Array<{ name: string; price: number; quantity: number }>).map(item => ({
              description: item.name,
              unitCost: item.price,
              quantity: item.quantity,
            }))
          ),
        },
      })
    } finally {
      if (debugRequested) {
        globalThis.fetch = savedFetch
      }
    }

    return NextResponse.json({
      session,
      mock: useMock,
      ...(debugRequested ? { debugLogs } : {}),
      ...(DEBUG_PANEL_ENABLED ? { debugEnabled: true } : {}),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    console.error('Checkout error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
