'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, Suspense } from 'react'
import { BizupPay } from '@bizup-pay/client'
import type { BizupPaymentSession } from '@bizup-pay/core'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<ReturnType<BizupPay['mount']> | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'failure' | 'cancelled'>('loading')
  const [message, setMessage] = useState('')

  const redirectStatus = searchParams.get('status')
  const pageUrl = searchParams.get('pageUrl')
  const provider = searchParams.get('provider')
  const amount = searchParams.get('amount')
  const sessionId = searchParams.get('sessionId')
  const description = searchParams.get('description')

  // Handle redirect-based status (provider redirects back here)
  useEffect(() => {
    if (redirectStatus === 'success') {
      setStatus('success')
      setMessage('Payment completed successfully!')
    } else if (redirectStatus === 'failure') {
      setStatus('failure')
      setMessage('Payment failed. Please try again.')
    } else if (redirectStatus === 'cancelled') {
      setStatus('cancelled')
      setMessage('Payment was cancelled.')
    }
  }, [redirectStatus])

  // Mount iframe for active checkout
  useEffect(() => {
    if (redirectStatus || !pageUrl || !containerRef.current) return

    const bizupPay = new BizupPay()
    const session: BizupPaymentSession = {
      id: sessionId || '',
      provider: (provider as 'morning' | 'cardcom') || 'morning',
      amount: Number(amount) || 0,
      currency: 'ILS',
      description: description || '',
      pageUrl,
      successUrl: '',
      webhookUrl: '',
      metadata: {},
      status: 'pending',
    }

    instanceRef.current = bizupPay.mount(session, containerRef.current, {
      width: '100%',
      height: '700px',
      onLoad: () => setStatus('ready'),
      onSuccess: () => {
        setStatus('success')
        setMessage('Payment completed successfully!')
      },
      onFailure: (event) => {
        setStatus('failure')
        setMessage(typeof event === 'object' && event && 'message' in event
          ? String((event as { message?: string }).message)
          : 'Payment failed')
      },
      onCancel: () => {
        setStatus('cancelled')
        setMessage('Payment was cancelled.')
      },
    })

    return () => {
      instanceRef.current?.destroy()
    }
  }, [pageUrl, redirectStatus, sessionId, provider, amount, description])

  const providerLabel = provider === 'cardcom' ? 'Cardcom' : 'Morning (Green Invoice)'

  // Status screens
  if (status === 'success' || status === 'failure' || status === 'cancelled') {
    const colors = {
      success: { bg: '#f0fdf4', border: '#16a34a', text: '#16a34a', icon: 'V' },
      failure: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', icon: 'X' },
      cancelled: { bg: '#fefce8', border: '#ca8a04', text: '#ca8a04', icon: '!' },
    }
    const c = colors[status]

    return (
      <div style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: c.bg, border: `2px solid ${c.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          fontSize: '1.5rem', fontWeight: 700, color: c.text,
        }}>
          {c.icon}
        </div>
        <h1 style={{ color: c.text, marginBottom: '0.5rem' }}>
          {status === 'success' ? 'Payment Successful' : status === 'failure' ? 'Payment Failed' : 'Payment Cancelled'}
        </h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>{message}</p>
        <button
          onClick={() => router.push('/')}
          style={{
            background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6,
            padding: '0.75rem 2rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem',
          }}
        >
          Back to Shop
        </button>
      </div>
    )
  }

  // No session data — probably navigated directly
  if (!pageUrl && !redirectStatus) {
    return (
      <div style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <h1>No Checkout Session</h1>
        <p style={{ color: '#666' }}>Start by adding items to your cart.</p>
        <button
          onClick={() => router.push('/')}
          style={{
            background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6,
            padding: '0.75rem 2rem', cursor: 'pointer', fontWeight: 600, marginTop: '1rem',
          }}
        >
          Go to Shop
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Checkout</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
            Provider: <strong>{providerLabel}</strong> &middot; Amount: <strong>{Number(amount).toFixed(2)} ILS</strong>
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none', border: '1px solid #ddd', borderRadius: 6,
            padding: '0.5rem 1rem', cursor: 'pointer', color: '#666',
          }}
        >
          Cancel
        </button>
      </div>

      {status === 'loading' && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          Loading payment page...
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          background: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          minHeight: 700,
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
