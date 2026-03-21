'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PROVIDERS, type ProviderKey } from '../../lib/constants'

interface Purchase {
  id: string
  provider: ProviderKey
  source: 'webhook' | 'redirect'
  transactionId: string
  amount: number
  currency: string
  status: string
  customerName?: string
  cardLastFour?: string
  documentUrl?: string
  apiCall: string
  receivedAt: string
}

interface TransactionDetail {
  transaction: {
    id: string
    providerTransactionId: string
    provider: string
    amount: number
    currency: string
    status: string
    paymentMethod: string
    cardBrand?: string
    cardLastFour?: string
    installments: number
    documentUrl?: string
    customer?: { name: string; email?: string; phone?: string; taxId?: string }
    createdAt: string
    morning?: Record<string, unknown>
    cardcom?: Record<string, unknown>
    icount?: Record<string, unknown>
    raw: unknown
  }
  apiUsed: {
    method: string
    providerEndpoint: string
    provider: string
  }
}

export default function AccountPage() {
  const router = useRouter()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [txDetail, setTxDetail] = useState<TransactionDetail | null>(null)
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  const fetchPurchases = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions')
      const data = await res.json()
      setPurchases(data.purchases ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPurchases() }, [fetchPurchases])

  async function fetchTransaction(purchase: Purchase) {
    if (expandedId === purchase.id && txDetail) {
      setExpandedId(null)
      setTxDetail(null)
      return
    }

    setExpandedId(purchase.id)
    setTxLoading(true)
    setTxError(null)
    setTxDetail(null)

    try {
      const res = await fetch(`/api/transactions/${purchase.id}`)
      const data = await res.json()
      if (!res.ok) { setTxError(data.error); return }
      setTxDetail(data)
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setTxLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Account &mdash; Past Purchases</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
            Purchases captured via <strong>webhooks</strong> and <strong>redirects</strong>. Click &ldquo;Fetch Details&rdquo; to call <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>getTransaction()</code>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchPurchases}
            style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer', color: '#666', fontSize: '0.85rem' }}>
            Refresh
          </button>
          <button onClick={() => router.push('/')}
            style={{ background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            Back to Shop
          </button>
        </div>
      </div>

      {/* API Flow Diagram */}
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#0369a1' }}>
        <strong>How purchases arrive here:</strong>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
          <div>
            <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>WEBHOOK</span>
            {' '}<code>POST /api/webhook</code> &rarr; <code>provider.parseWebhook(body)</code> &rarr; <code>BizupWebhookEvent</code>
          </div>
          <div>
            <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>REDIRECT</span>
            {' '}Browser returns to <code>successUrl?status=success</code>
          </div>
        </div>
      </div>

      {/* Purchases List */}
      {loading ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Loading purchases...</p>
      ) : purchases.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 8, padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#999', fontSize: '1.1rem', marginBottom: '0.5rem' }}>No purchases yet</p>
          <p style={{ color: '#bbb', fontSize: '0.9rem' }}>Complete a payment in the shop to see it here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {purchases.map(p => {
            const providerInfo = PROVIDERS[p.provider]
            const isExpanded = expandedId === p.id

            return (
              <div key={p.id} style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {/* Purchase row */}
                <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Source badge */}
                  <span style={{
                    background: p.source === 'webhook' ? '#dbeafe' : '#fef3c7',
                    color: p.source === 'webhook' ? '#1d4ed8' : '#92400e',
                    padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700,
                    minWidth: 65, textAlign: 'center', textTransform: 'uppercase',
                  }}>
                    {p.source}
                  </span>

                  {/* Provider badge */}
                  <span style={{
                    background: providerInfo.color, color: '#fff',
                    padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    {providerInfo.label.split(' (')[0]}
                  </span>

                  {/* Amount + status */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {p.amount.toFixed(2)} {p.currency}
                      <span style={{
                        marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 500,
                        color: p.status === 'approved' ? '#16a34a' : '#dc2626',
                      }}>
                        {p.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#999' }}>
                      {p.customerName && <>{p.customerName} &middot; </>}
                      {p.cardLastFour && <>****{p.cardLastFour} &middot; </>}
                      {new Date(p.receivedAt).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* API call that captured this */}
                  <div style={{ fontSize: '0.75rem', color: '#888', maxWidth: 280 }}>
                    <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{p.apiCall}</code>
                  </div>

                  {/* Document URL */}
                  {p.documentUrl && (
                    <a href={p.documentUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '0.8rem', color: '#0070f3', textDecoration: 'none' }}>
                      Invoice
                    </a>
                  )}

                  {/* Fetch Details button */}
                  <button onClick={() => fetchTransaction(p)}
                    style={{
                      background: isExpanded ? '#e5e7eb' : '#f3f4f6', border: '1px solid #ddd',
                      borderRadius: 6, padding: '0.4rem 0.75rem', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 500, color: '#333', whiteSpace: 'nowrap',
                    }}>
                    {isExpanded ? 'Hide' : 'Fetch Details'}
                  </button>
                </div>

                {/* Expanded transaction detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #eee', padding: '1rem 1.25rem', background: '#fafafa' }}>
                    {txLoading && <p style={{ color: '#999' }}>Calling <code>provider.getTransaction(&quot;{p.transactionId}&quot;)</code>...</p>}
                    {txError && <p style={{ color: '#dc2626' }}>Error: {txError}</p>}
                    {txDetail && (
                      <>
                        {/* API call visualization */}
                        <div style={{ background: '#1e1b2e', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '1rem', fontFamily: 'ui-monospace, monospace' }}>
                          <div style={{ color: '#c4b5fd', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            BizUp Pay API Call
                          </div>
                          <div style={{ color: '#86efac', fontSize: '0.8rem' }}>
                            <code>{txDetail.apiUsed.method}</code>
                          </div>
                          <div style={{ color: '#7dd3fc', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                            Provider endpoint: <code>{txDetail.apiUsed.providerEndpoint}</code>
                          </div>
                        </div>

                        {/* Transaction fields */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                          <Field label="Transaction ID" value={txDetail.transaction.providerTransactionId} />
                          <Field label="Status" value={txDetail.transaction.status} color={txDetail.transaction.status === 'approved' ? '#16a34a' : '#dc2626'} />
                          <Field label="Amount" value={`${txDetail.transaction.amount} ${txDetail.transaction.currency}`} />
                          <Field label="Payment Method" value={txDetail.transaction.paymentMethod} />
                          <Field label="Card" value={txDetail.transaction.cardBrand ? `${txDetail.transaction.cardBrand} ****${txDetail.transaction.cardLastFour}` : txDetail.transaction.cardLastFour ? `****${txDetail.transaction.cardLastFour}` : 'N/A'} />
                          <Field label="Installments" value={String(txDetail.transaction.installments)} />
                          <Field label="Customer" value={txDetail.transaction.customer?.name ?? 'N/A'} />
                          <Field label="Email" value={txDetail.transaction.customer?.email ?? 'N/A'} />
                          {txDetail.transaction.documentUrl && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <Field label="Document URL" value={txDetail.transaction.documentUrl} isLink />
                            </div>
                          )}
                        </div>

                        {/* Provider-specific extras */}
                        {(() => {
                          const extras = txDetail.transaction[txDetail.apiUsed.provider as keyof typeof txDetail.transaction]
                          if (!extras || typeof extras !== 'object') return null
                          return (
                            <div style={{ marginTop: '0.75rem' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '0.35rem' }}>
                                Provider Extras ({txDetail.apiUsed.provider})
                              </div>
                              <pre style={{ background: '#f3f4f6', padding: '0.5rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', margin: 0, overflow: 'auto' }}>
                                {JSON.stringify(extras, null, 2)}
                              </pre>
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, color, isLink }: { label: string; value: string; color?: string; isLink?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.15rem' }}>{label}</div>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer"
          style={{ color: '#0070f3', fontSize: '0.85rem', wordBreak: 'break-all' }}>{value}</a>
      ) : (
        <div style={{ fontWeight: 500, color: color ?? '#333' }}>{value}</div>
      )}
    </div>
  )
}
