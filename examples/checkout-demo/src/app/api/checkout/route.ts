import { NextRequest, NextResponse } from 'next/server'
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/morning'
import '@bizup-pay/cardcom'

const providerConfigs = {
  morning: {
    apiKey: process.env.MORNING_API_KEY!,
    apiSecret: process.env.MORNING_API_SECRET!,
  },
  cardcom: {
    terminalNumber: Number(process.env.CARDCOM_TERMINAL_NUMBER),
    apiName: process.env.CARDCOM_API_NAME!,
    apiPassword: process.env.CARDCOM_API_PASSWORD!,
  },
} as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider: providerName, amount, description, items } = body

    if (!providerName || !['morning', 'cardcom'].includes(providerName)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3099'
    const config = providerConfigs[providerName as keyof typeof providerConfigs]
    const provider = createProvider(providerName, config)

    const session = await provider.createSession({
      amount,
      currency: 'ILS',
      description,
      successUrl: `${appUrl}/checkout?status=success`,
      failureUrl: `${appUrl}/checkout?status=failure`,
      cancelUrl: `${appUrl}/checkout?status=cancelled`,
      webhookUrl: `${appUrl}/api/webhook`,
      customer: {
        name: 'Demo Customer',
        email: 'demo@bizup.dev',
      },
      language: 'he',
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

    return NextResponse.json({ session })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    console.error('Checkout error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
