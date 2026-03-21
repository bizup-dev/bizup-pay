import { NextRequest, NextResponse } from 'next/server'
import { createProvider } from '@bizup-pay/core'
import '@bizup-pay/morning'
import '@bizup-pay/cardcom'
import '@bizup-pay/icount'
import '@bizup-pay/grow'
import { getPurchase, updatePurchase } from '../../../../lib/store'

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
}

const API_ENDPOINTS: Record<string, string> = {
  morning: 'GET /documents/{id} + GET /documents/{id}/download/links',
  cardcom: 'POST /Transactions/GetTransactionInfoById',
  icount: 'POST /doc/info { doctype, docnum, get_pdf_url: true }',
  grow: 'POST /getTransactionInfo { pageCode, transactionId, transactionToken }',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const purchase = getPurchase(id)
    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    const provider = createProvider(purchase.provider, mockConfigs[purchase.provider])
    const transaction = await provider.getTransaction(purchase.transactionId)

    // Update stored purchase with fetched document URL
    if (transaction.documentUrl) {
      updatePurchase(id, { documentUrl: transaction.documentUrl })
    }

    return NextResponse.json({
      transaction,
      apiUsed: {
        method: `provider.getTransaction("${purchase.transactionId}")`,
        providerEndpoint: API_ENDPOINTS[purchase.provider],
        provider: purchase.provider,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch transaction'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
