'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, Suspense } from 'react'
import { BizupPay } from '@bizup-pay/client'
import type { BizupPaymentSession } from '@bizup-pay/core'

type IntegrationMode = 'iframe' | 'modal' | 'redirect'

const MODE_INFO: Record<IntegrationMode, { label: string; code: string; description: string }> = {
  iframe: {
    label: 'Iframe (Embed)',
    code: 'BizupPay.mount(session, container)',
    description: 'Payment form loads inline on your page inside an iframe. Customer never leaves your site. Best for seamless checkout UX.',
  },
  modal: {
    label: 'Modal (Popup)',
    code: 'BizupPay.openModal(session)',
    description: 'Payment form opens in a centered overlay/modal. Customer stays on your page with a dimmed background. Good for single-action payments.',
  },
  redirect: {
    label: 'Redirect (Full Page)',
    code: 'window.location.href = session.pageUrl',
    description: 'Customer is redirected to the provider\'s full payment page. After payment, they return via successUrl/failureUrl. Simplest integration, works everywhere.',
  },
}

const MOCK_CUSTOMER = {
  name: 'Israel Israeli',
  email: 'israel@example.com',
  phone: '054-1234567',
  taxId: '012345678',
}

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

  const redirectStatus = searchParams.get('status')
  const provider = searchParams.get('provider') as 'morning' | 'cardcom' | null
  const amount = Number(searchParams.get('amount') || 0)
  const description = searchParams.get('description') || ''
  const itemsJson = searchParams.get('items') || '[]'
  const recurringJson = searchParams.get('recurring')

  const providerLabel = provider === 'cardcom' ? 'Cardcom' : 'Morning (Green Invoice)'
  const isRecurring = !!recurringJson

  // Handle redirect-based status (from redirect mode or fallback)
  useEffect(() => {
    if (redirectStatus === 'success') { setStep('success'); setMessage('Payment completed successfully!') }
    else if (redirectStatus === 'failure') { setStep('failure'); setMessage('Payment failed. Please try again.') }
    else if (redirectStatus === 'cancelled') { setStep('cancelled'); setMessage('Payment was cancelled.') }
  }, [redirectStatus])

  // Mount iframe/modal when session is ready
  useEffect(() => {
    if (step !== 'payment' || !session?.pageUrl) return

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
    setLoading(true)
    setError(null)

    try {
      const items = JSON.parse(itemsJson)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider, amount, description, items, customer,
          ...(recurringJson ? { recurring: JSON.parse(recurringJson) } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create payment session'); return }

      setSession(data.session)
      setStep('payment')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  // Result screen
  if (step === 'success' || step === 'failure' || step === 'cancelled') {
    const colors = {
      success: { bg: '#f0fdf4', border: '#16a34a', text: '#16a34a', icon: 'V' },
      failure: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', icon: 'X' },
      cancelled: { bg: '#fefce8', border: '#ca8a04', text: '#ca8a04', icon: '!' },
    }
    const c = colors[step]
    return (
      <div style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: c.bg, border: `2px solid ${c.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          fontSize: '1.5rem', fontWeight: 700, color: c.text,
        }}>{c.icon}</div>
        <h1 style={{ color: c.text, marginBottom: '0.5rem' }}>
          {step === 'success' ? 'Payment Successful' : step === 'failure' ? 'Payment Failed' : 'Payment Cancelled'}
        </h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>{message}</p>
        <button onClick={() => router.push('/')}
          style={{ background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6,
            padding: '0.75rem 2rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
          Back to Shop
        </button>
      </div>
    )
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
      <div style={{ background: '#fff', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Integration Mode:</span>
          <div style={{ display: 'inline-flex', background: '#e5e7eb', borderRadius: 6, padding: 2 }}>
            {(['iframe', 'modal', 'redirect'] as IntegrationMode[]).map(m => (
              <button
                key={m}
                onClick={() => { if (step === 'details') setMode(m) }}
                disabled={step === 'payment'}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: 5, border: 'none', cursor: step === 'payment' ? 'default' : 'pointer',
                  fontWeight: 600, fontSize: '0.8rem',
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#111' : '#666',
                  boxShadow: mode === m ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  opacity: step === 'payment' ? 0.6 : 1,
                }}
              >
                {MODE_INFO[m].label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#555' }}>
          <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: '0.8rem' }}>{modeInfo.code}</code>
          <span style={{ margin: '0 0.5rem', color: '#ccc' }}>|</span>
          {modeInfo.description}
        </div>
      </div>

      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <StepBadge num={1} label="Customer Details" active={step === 'details'} done={step === 'payment'} />
        <div style={{ flex: '0 0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>&rarr;</div>
        <StepBadge num={2} label={`Pay via ${provider === 'cardcom' ? 'Cardcom' : 'Morning'}`} active={step === 'payment'} done={false} />
      </div>

      {/* Flow explanation */}
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#0369a1' }}>
        {step === 'details' ? (
          <>
            <strong>Step 1:</strong> Your app collects customer details. These are sent to <strong>{providerLabel}</strong> via{' '}
            <code style={{ background: '#e0f2fe', padding: '0 4px', borderRadius: 3 }}>createSession()</code>
            {provider === 'cardcom'
              ? <> to pre-fill the Cardcom payment form (<code>AdvancedDefinition.CardOwnerNameValue</code>, etc.)</>
              : <> as the <code>client</code> object in the Morning payment form request</>
            }.
            {isRecurring && (
              <> This is a <strong>recurring payment (הוראת קבע)</strong> &mdash;{' '}
                {provider === 'cardcom'
                  ? <>Cardcom uses <code>Operation: ChargeAndCreateToken</code> with <code>IsAutoRecurringPayment: true</code>.</>
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
                background: loading ? '#999' : provider === 'cardcom' ? '#dc2626' : '#16a34a',
                color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 2rem',
                cursor: 'pointer', fontWeight: 600, fontSize: '1rem',
              }}
            >
              {loading ? 'Creating session...' : mode === 'redirect'
                ? `Redirect to ${provider === 'cardcom' ? 'Cardcom' : 'Morning'}`
                : `Continue to ${provider === 'cardcom' ? 'Cardcom' : 'Morning'} Payment`}
            </button>
            <span style={{ color: '#999', fontSize: '0.85rem' }}>
              {provider === 'cardcom' ? 'LowProfile/Create API' : 'POST /payments/form API'}
              {mode === 'redirect' && ' → full page redirect'}
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
    </div>
  )
}

function StepBadge({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  const bg = active ? '#0070f3' : done ? '#16a34a' : '#e5e7eb'
  const color = active || done ? '#fff' : '#999'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: bg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 600, fontSize: '0.85rem',
      }}>{done ? 'V' : num}</div>
      <span style={{ fontWeight: active ? 600 : 400, color: active ? '#111' : '#666', fontSize: '0.9rem' }}>{label}</span>
    </div>
  )
}

function FormField({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem', color: '#444' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: 6,
          fontSize: '0.95rem', boxSizing: 'border-box',
        }}
      />
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
