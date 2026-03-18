import { NextResponse } from 'next/server'
import { createProvider, type ProviderName } from '@bizup-pay/core'
import '@bizup-pay/morning'
import '@bizup-pay/cardcom'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function getProviderConfig(provider: ProviderName) {
  switch (provider) {
    case 'morning':
      return {
        apiKey: process.env.MORNING_API_KEY || 'demo-key',
        apiSecret: process.env.MORNING_API_SECRET || 'demo-secret',
      }
    case 'cardcom':
      return {
        terminalNumber: Number(process.env.CARDCOM_TERMINAL_NUMBER) || 1000,
        apiName: process.env.CARDCOM_API_NAME || 'demo',
        apiPassword: process.env.CARDCOM_API_PASSWORD || 'demo',
      }
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { provider: providerName, items } = body as {
      provider: ProviderName
      items: { id: string; name: string; price: number; quantity: number }[]
    }

    if (!providerName || !items?.length) {
      return NextResponse.json(
        { error: 'Missing provider or items' },
        { status: 400 },
      )
    }

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const description = items.map((i) => `${i.name} x${i.quantity}`).join(', ')

    const provider = createProvider(providerName, getProviderConfig(providerName))

    const session = await provider.createSession({
      amount: total,
      currency: 'ILS',
      description,
      customer: {
        name: 'Demo Customer',
        email: 'demo@example.com',
      },
      successUrl: `${APP_URL}/success`,
      failureUrl: `${APP_URL}/failure`,
      webhookUrl: `${APP_URL}/api/webhooks/payment`,
      metadata: {
        items: JSON.stringify(items),
      },
    })

    return NextResponse.json(session)
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
