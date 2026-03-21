'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, Suspense } from 'react'
import { BizupPay } from '@bizup-pay/client'
import type { BizupPaymentSession } from '@bizup-pay/core'
import { PROVIDERS, MODE_INFO, MOCK_CUSTOMER, type IntegrationMode, type ProviderKey } from '../../lib/constants'
import { FormField, StepBadge, ToggleGroup, ResultScreen, DebugPanel, type DebugLogEntry } from '../../components'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<ReturnType<BizupPay['mount']> | null>(null)

  const [step, setStep] = useState<'details' | 'payment' | 'success' | 'failure' | 'cancelled'>('details')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customer, setCustomer] = useState(MOCK_CUSTOMER)
  const [session, setSession] = useState<BizupPaymentSession | null>(null)
  const [mode, setMode] = useState<IntegrationMode>('iframe')
  const [useMock, setUseMock] = useState(true)
  const [directCard, setDirectCard] = useState({ number: '4580000000000000', expiry: '12/30', cvv: '123', holderName: 'Israel Israeli' })
  const [directProcessing, setDirectProcessing] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([])
  const [debugAvailable, setDebugAvailable] = useState<boolean | null>(null)

  const redirectStatus = searchParams.get('status')
  const provider = searchParams.get('provider') as 'morning' | 'cardcom' | 'icount' | null
  const amount = Number(searchParams.get('amount') || 0)
  const description = searchParams.get('description') || ''
  const itemsJson = searchParams.get('items') || '[]'
  const recurringJson = searchParams.get('recurring')

  const providerLabel = provider ? PROVIDERS[provider].label : ''
  const providerColor = provider ? PROVIDERS[provider].color : '#0070f3'
  const isRecurring = !!recurringJson
  const isIcount = provider === 'icount'
  const isGrow = provider === 'grow'
  const isRedirectOnly = isIcount || isGrow

  // iCount and Grow only support redirect (and iCount also supports direct)
  useEffect(() => {
    if (isRedirectOnly && (mode === 'iframe' || mode === 'modal')) {
      setMode('redirect')
    }
  }, [isRedirectOnly, mode])

  // Handle redirect-based status (from redirect mode or fallback)
  useEffect(() => {
    if (redirectStatus === 'success') {
      setStep('success')
      setMessage('Payment completed successfully!')
      // Save redirect-sourced purchase to store
      if (provider) {
        fetch('/api/transactions/redirect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, amount, description }),
        }).catch(() => {})
      }
    }
    else if (redirectStatus === 'failure') { setStep('failure'); setMessage('Payment failed. Please try again.') }
    else if (redirectStatus === 'cancelled') { setStep('cancelled'); setMessage('Payment was cancelled.') }
  }, [redirectStatus, provider, amount, description])

  // Mount iframe/modal when session is ready
  useEffect(() => {
    if (step !== 'payment') return

    // Direct mode: no mounting needed, card form is rendered inline
    if (mode === 'direct') return

    if (!session?.pageUrl) return

    // Redirect mode: navigate away
    if (mode === 'redirect') {
      window.location.href = session.pageUrl
      return
    }

    // Modal or iframe mode
    if (mode === 'modal') {
      const bizupPay = new BizupPay()
      instanceRef.current = bizupPay.openModal(session, {
        width: '500px',
        height: '650px',
        onSuccess: () => { setStep('success'); setMessage('Payment completed successfully!') },
        onFailure: (event) => {
          setStep('failure')
          setMessage(typeof event === 'object' && event && 'message' in event
            ? String((event as { message?: string }).message) : 'Payment failed')
        },
        onCancel: () => { setStep('cancelled'); setMessage('Payment was cancelled.') },
      })
      return () => { instanceRef.current?.destroy() }
    }

    // Iframe (embed) mode
    if (!containerRef.current) return
    const bizupPay = new BizupPay()
    instanceRef.current = bizupPay.mount(session, containerRef.current, {
      width: '100%',
      height: '600px',
      onLoad: () => {},
      onSuccess: () => { setStep('success'); setMessage('Payment completed successfully!') },
      onFailure: (event) => {
        setStep('failure')
        setMessage(typeof event === 'object' && event && 'message' in event
          ? String((event as { message?: string }).message) : 'Payment failed')
      },
      onCancel: () => { setStep('cancelled'); setMessage('Payment was cancelled.') },
    })
    return () => { instanceRef.current?.destroy() }
  }, [step, session, mode])

  async function createPaymentSession() {
    if (!provider) return

    // Direct mode: skip session creation, go straight to card form
    if (mode === 'direct') {
      setStep('payment')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const items = JSON.parse(itemsJson)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider, amount, description, items, customer, mock: useMock,
          ...(debugMode ? { debug: true } : {}),
          ...(recurringJson ? { recurring: JSON.parse(recurringJson) } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create payment session'); return }

      if (data.debugEnabled !== undefined) setDebugAvailable(data.debugEnabled)
      if (data.debugLogs) setDebugLogs(data.debugLogs)

      setSession(data.session)
      setStep('payment')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDirectPayment() {
    setDirectProcessing(true)
    setError(null)
    try {
      // For mock: simulate success after a short delay
      await new Promise(r => setTimeout(r, 800))
      setStep('success')
      setMessage('Payment completed successfully! (Direct API - mock)')
    } catch (err) {
      setStep('failure')
      setMessage(err instanceof Error ? err.message : 'Direct payment failed')
    } finally {
      setDirectProcessing(false)
    }
  }

  // Result screen
  if (step === 'success' || step === 'failure' || step === 'cancelled') {
    return <ResultScreen status={step} message={message} />
  }

  // No provider
  if (!provider && !redirectStatus) {
    return (
      <div style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <h1>No Checkout Session</h1>
        <p style={{ color: '#666' }}>Start by adding items to your cart.</p>
        <button onClick={() => router.push('/')}
          style={{ background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6,
            padding: '0.75rem 2rem', cursor: 'pointer', fontWeight: 600, marginTop: '1rem' }}>
          Go to Shop
        </button>
      </div>
    )
  }

  const modeInfo = MODE_INFO[mode]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Checkout</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
            Provider: <strong>{providerLabel}</strong>
            {' '}&middot; Amount: <strong>{amount.toFixed(2)} ILS</strong>
            {isRecurring && <span style={{ color: '#92400e', fontWeight: 600 }}> &middot; Recurring</span>}
          </p>
        </div>
        <button onClick={() => router.push('/')}
          style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6,
            padding: '0.5rem 1rem', cursor: 'pointer', color: '#666' }}>Cancel</button>
      </div>

      {/* Integration Mode Toggle */}
      <div style={{ background: '#fff', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Integration Mode:</span>
          <ToggleGroup
            options={(['iframe', 'modal', 'redirect', 'direct'] as IntegrationMode[]).map(m => ({
              value: m,
              label: MODE_INFO[m].label,
              disabled: step === 'payment' || (isRedirectOnly && (m === 'iframe' || m === 'modal')) || (!isIcount && m === 'direct'),
              title: isRedirectOnly && (m === 'iframe' || m === 'modal') ? `${providerLabel} only supports redirect mode` : !isIcount && m === 'direct' ? 'Direct API mode is only available for iCount' : undefined,
            }))}
            value={mode}
            onChange={setMode}
          />
        </div>
        <div style={{ fontSize: '0.85rem', color: '#555' }}>
          <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: '0.8rem' }}>{modeInfo.code}</code>
          <span style={{ margin: '0 0.5rem', color: '#ccc' }}>|</span>
          {modeInfo.description}
        </div>
      </div>

      {/* Backend Toggle */}
      <div style={{ background: '#fff', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Backend:</span>
          <ToggleGroup
            options={[
              { value: 'mock' as const, label: 'Mock Server' },
              { value: 'sandbox' as const, label: 'Provider Sandbox' },
            ]}
            value={useMock ? 'mock' : 'sandbox'}
            onChange={v => setUseMock(v === 'mock')}
            disabled={step === 'payment'}
          />
          {!useMock && (
            <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
              LIVE API
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#555' }}>
          {useMock ? (
            <>Using <strong>local mock server</strong> (localhost:4100/4200/4300). Instant responses, no real charges. Payment page is a simplified mock form.</>
          ) : (
            <>
              Using <strong>real provider sandbox</strong>.{' '}
              {provider === 'cardcom' ? (
                <>Cardcom test terminal 1000 at <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>secure.cardcom.solutions</code>. Test card: <code>4580000000000000</code>, exp 12/30.</>
              ) : provider === 'icount' ? (
                <>iCount sandbox at <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>api.icount.co.il</code>. Uses paypage for hosted checkout or cc/bill for direct API.</>
              ) : (
                <>Morning sandbox at <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>sandbox.d.greeninvoice.co.il</code>. Amounts up to 5,000 ILS succeed; above 5,000 fail.</>
              )}
            </>
          )}
        </div>
      </div>

      {/* Debug Toggle */}
      <div style={{ background: '#fff', borderRadius: 8, padding: '0.75rem 1.25rem', marginBottom: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Debug:</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
          <input
            type="checkbox"
            checked={debugMode}
            onChange={e => { setDebugMode(e.target.checked); setDebugLogs([]) }}
            disabled={step === 'payment'}
            style={{ accentColor: '#7c3aed' }}
          />
          Show server network logs
        </label>
        {debugAvailable === false && debugMode && (
          <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 500 }}>
            Server has DEBUG_PANEL_ENABLED=false
          </span>
        )}
        {debugAvailable === true && debugMode && (
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 500 }}>
            Active
          </span>
        )}
      </div>

      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <StepBadge num={1} label="Customer Details" active={step === 'details'} done={step === 'payment'} />
        <div style={{ flex: '0 0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>&rarr;</div>
        <StepBadge num={2} label={`Pay via ${providerLabel}`} active={step === 'payment'} done={false} />
      </div>

      {/* Flow explanation */}
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#0369a1' }}>
        {step === 'details' ? (
          <>
            <strong>Step 1:</strong> Your app collects customer details. These are sent to <strong>{providerLabel}</strong> via{' '}
            <code style={{ background: '#e0f2fe', padding: '0 4px', borderRadius: 3 }}>createSession()</code>
            {provider === 'cardcom'
              ? <> to pre-fill the Cardcom payment form (<code>AdvancedDefinition.CardOwnerNameValue</code>, etc.)</>
              : provider === 'icount'
              ? <> via <code>paypage/generate_sale</code> to create a hosted payment page on iCount</>
              : <> as the <code>client</code> object in the Morning payment form request</>
            }.
            {isRecurring && (
              <> This is a <strong>recurring payment (הוראת קבע)</strong> &mdash;{' '}
                {provider === 'cardcom'
                  ? <>Cardcom uses <code>Operation: ChargeAndCreateToken</code> with <code>IsAutoRecurringPayment: true</code>.</>
                  : provider === 'icount'
                  ? <>iCount uses <code>hk_*</code> params (hk_issue_every, hk_payments) for recurring billing.</>
                  : <>Morning sets up recurring billing internally.</>
                }
              </>
            )}
          </>
        ) : (
          <>
            <strong>Step 2 ({modeInfo.label}):</strong>{' '}
            {mode === 'redirect' ? (
              <>Customer is <strong>redirected</strong> to {providerLabel}&apos;s payment page at <code>session.pageUrl</code>.
              After payment, they return to your <code>successUrl</code> / <code>failureUrl</code>.
              A <strong>webhook</strong> is also sent to your server.</>
            ) : mode === 'modal' ? (
              <>The provider&apos;s payment page opens in a <strong>modal overlay</strong> via <code>BizupPay.openModal()</code>.
              Customer enters card details on {providerLabel}&apos;s secure page.
              On completion, a <code>postMessage</code> event closes the modal.</>
            ) : (
              <>The provider&apos;s payment page is <strong>embedded inline</strong> via <code>BizupPay.mount()</code>.
              Customer enters card details on {providerLabel}&apos;s secure page within an iframe.
              Your site never touches card data. On completion, a <code>postMessage</code> event updates the page.</>
            )}
          </>
        )}
      </div>

      {/* Step 1: Customer Details */}
      {step === 'details' && (
        <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Customer Details</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 1rem' }}>
            These details are sent to {providerLabel} when creating the payment session.
            {provider === 'cardcom' && ' They pre-fill the Cardcom payment form so the customer doesn\'t have to re-enter them.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="Full Name" value={customer.name}
              onChange={v => setCustomer(c => ({ ...c, name: v }))} />
            <FormField label="Email" value={customer.email} type="email"
              onChange={v => setCustomer(c => ({ ...c, email: v }))} />
            <FormField label="Phone" value={customer.phone} type="tel"
              onChange={v => setCustomer(c => ({ ...c, phone: v }))} />
            <FormField label="Tax ID (optional)" value={customer.taxId}
              onChange={v => setCustomer(c => ({ ...c, taxId: v }))} />
          </div>

          {error && (
            <div style={{ background: '#fee', color: '#c00', padding: '0.75rem', borderRadius: 6, marginTop: '1rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={createPaymentSession}
              disabled={loading || !customer.name}
              style={{
                background: loading ? '#999' : providerColor,
                color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 2rem',
                cursor: 'pointer', fontWeight: 600, fontSize: '1rem',
              }}
            >
              {loading ? 'Creating session...' : mode === 'redirect'
                ? `Redirect to ${providerLabel}`
                : mode === 'direct'
                ? `Pay with ${providerLabel} (Direct)`
                : `Continue to ${providerLabel} Payment`}
            </button>
            <span style={{ color: '#999', fontSize: '0.85rem' }}>
              {provider === 'cardcom' ? 'LowProfile/Create API' : provider === 'icount' ? 'paypage/generate_sale API' : 'POST /payments/form API'}
              {mode === 'redirect' && ' \u2192 full page redirect'}
              {mode === 'direct' && ' \u2192 cc/bill direct charge'}
            </span>
          </div>
        </div>
      )}

      {/* Step 2: Payment — only for iframe mode (modal is handled by BizupPay.openModal, redirect navigates away) */}
      {step === 'payment' && mode === 'iframe' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
              Paying as <strong>{customer.name}</strong> ({customer.email})
              {' '}&middot; Card details are entered on {providerLabel}&apos;s secure page below
            </p>
            <button onClick={() => { instanceRef.current?.destroy(); setStep('details'); setSession(null) }}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6,
                padding: '0.35rem 0.75rem', cursor: 'pointer', color: '#666', fontSize: '0.85rem' }}>
              &larr; Edit Details
            </button>
          </div>
          <div ref={containerRef}
            style={{ background: '#fff', borderRadius: 8, overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: 600 }} />
        </div>
      )}

      {/* Step 2: Modal mode — show waiting state (modal is floating on top) */}
      {step === 'payment' && mode === 'modal' && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Payment modal is open...</p>
          <p>Complete the payment in the modal overlay above.</p>
          <button onClick={() => { instanceRef.current?.destroy(); setStep('details'); setSession(null) }}
            style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6,
              padding: '0.5rem 1rem', cursor: 'pointer', color: '#666', marginTop: '1rem' }}>
            Cancel Payment
          </button>
        </div>
      )}

      {/* Step 2: Redirect mode — show redirecting message */}
      {step === 'payment' && mode === 'redirect' && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Redirecting to {providerLabel}...</p>
          <p>You will be taken to the payment page. After payment, you&apos;ll return here.</p>
        </div>
      )}

      {debugMode && <DebugPanel logs={debugLogs} />}

      {/* Step 2: Direct API mode — card form on our page */}
      {step === 'payment' && mode === 'direct' && (
        <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Credit Card Details (Direct API)</h2>
            <button onClick={() => { setStep('details') }}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6,
                padding: '0.35rem 0.75rem', cursor: 'pointer', color: '#666', fontSize: '0.85rem' }}>
              &larr; Edit Details
            </button>
          </div>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 1rem' }}>
            Card details collected on YOUR page, sent via <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>cc/bill</code> API.
            Amount: <strong>{amount.toFixed(2)} ILS</strong>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Card Number" value={directCard.number}
                onChange={v => setDirectCard(c => ({ ...c, number: v }))} />
            </div>
            <FormField label="Expiry (MM/YY)" value={directCard.expiry}
              onChange={v => setDirectCard(c => ({ ...c, expiry: v }))} />
            <FormField label="CVV" value={directCard.cvv}
              onChange={v => setDirectCard(c => ({ ...c, cvv: v }))} />
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Cardholder Name" value={directCard.holderName}
                onChange={v => setDirectCard(c => ({ ...c, holderName: v }))} />
            </div>
          </div>

          {error && (
            <div style={{ background: '#fee', color: '#c00', padding: '0.75rem', borderRadius: 6, marginTop: '1rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={handleDirectPayment}
              disabled={directProcessing || !directCard.number || !directCard.cvv}
              style={{
                background: directProcessing ? '#999' : providerColor,
                color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 2rem',
                cursor: 'pointer', fontWeight: 600, fontSize: '1rem', width: '100%',
              }}
            >
              {directProcessing ? 'Processing...' : `Pay ${amount.toFixed(2)} ILS (Direct API)`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
