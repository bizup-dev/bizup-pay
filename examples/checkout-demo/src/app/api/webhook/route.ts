import { NextRequest, NextResponse } from 'next/server'
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/morning'
import '@bizup-pay/cardcom'
import '@bizup-pay/icount'
import '@bizup-pay/grow'
import '@bizup-pay/tranzilla'
import { addPurchase } from '../../../lib/store'
import type { ProviderKey } from '../../../lib/constants'

const mockConfigs: Record<string, Record<string, unknown>> = {
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

function detectProvider(body: Record<string, unknown>): ProviderKey | null {
  if (body.LowProfileId || body.TranzactionId !== undefined) return 'cardcom'
  if (body.sale_sid || body.sale_uniqid) return 'icount'
  if (body.transactionId && body.transactionToken && body.asmachta !== undefined) return 'grow'
  if (body.tranzila_id && body.transaction_id) return 'tranzilla'
  if (body.id && body.type !== undefined) return 'morning'
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const providerName = detectProvider(body as Record<string, unknown>)

    if (!providerName) {
      console.log('[webhook] Could not detect provider from payload:', Object.keys(body))
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }

    const provider = createProvider(providerName, mockConfigs[providerName])
    const event = await provider.parseWebhook(body, Object.fromEntries(request.headers))

    const tx = event.transaction

    addPurchase({
      id: `wh-${tx.providerTransactionId}`,
      provider: providerName,
      source: 'webhook',
      transactionId: tx.providerTransactionId,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      customerName: tx.customer?.name,
      cardLastFour: tx.cardLastFour,
      documentUrl: tx.documentUrl,
      apiCall: `provider.parseWebhook(body) → ${event.type}`,
      receivedAt: new Date().toISOString(),
      webhookEvent: event,
    })

    console.log(`[webhook] ${providerName} ${event.type}: tx=${tx.providerTransactionId} amount=${tx.amount} ${tx.currency}`)

    return NextResponse.json({ received: true, type: event.type })
  } catch (err) {
    console.error('[webhook] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
