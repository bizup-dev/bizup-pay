import { NextRequest, NextResponse } from 'next/server'
import { addPurchase } from '../../../../lib/store'
import type { ProviderKey } from '../../../../lib/constants'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, amount, description } = body as {
      provider: ProviderKey
      amount: number
      description: string
    }

    const id = `rd-${provider}-${Date.now()}`

    addPurchase({
      id,
      provider,
      source: 'redirect',
      transactionId: id,
      amount: amount ?? 0,
      currency: 'ILS',
      status: 'approved',
      apiCall: `Redirect return → successUrl?status=success`,
      receivedAt: new Date().toISOString(),
    })

    return NextResponse.json({ saved: true, id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
