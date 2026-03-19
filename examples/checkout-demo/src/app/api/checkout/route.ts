import { NextRequest, NextResponse } from 'next/server'
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/morning'
import '@bizup-pay/cardcom'

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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider: providerName, amount, description, items, mock } = body

    if (!providerName || !['morning', 'cardcom'].includes(providerName)) {
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
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3099'
    const provider = createProvider(providerName, config)

    const { recurring, customer } = body as {
      recurring?: { interval: string; totalPayments?: number; amount?: number }
      customer?: { name: string; email?: string; phone?: string; taxId?: string }
    }

    const session = await provider.createSession({
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

    return NextResponse.json({ session, mock: useMock })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    console.error('Checkout error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
