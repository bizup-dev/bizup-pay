'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { BizupPay } from '@bizup-pay/client'
import type { BizupPaymentSession, ProviderName } from '@bizup-pay/core'

function PaymentContent() {
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<ReturnType<BizupPay['mount']> | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'failed'>('loading')

  const sessionId = searchParams.get('sessionId')
  const pageUrl = searchParams.get('pageUrl')
  const provider = searchParams.get('provider') as ProviderName

  const handleSuccess = useCallback(() => {
    setStatus('success')
    window.location.href = '/success'
  }, [])

  const handleFailure = useCallback(() => {
    setStatus('failed')
    window.location.href = '/failure'
  }, [])

  useEffect(() => {
    if (!containerRef.current || !sessionId || !pageUrl) return

    const bizupPay = new BizupPay()

    // Build a minimal session object for the client SDK
    const session: BizupPaymentSession = {
      id: sessionId,
      provider,
      amount: 0,
      currency: 'ILS',
      description: '',
      pageUrl,
      successUrl: '/success',
      webhookUrl: '',
      metadata: {},
      status: 'pending',
    }

    instanceRef.current = bizupPay.mount(session, containerRef.current, {
      width: '100%',
      height: '600px',
      onSuccess: handleSuccess,
      onFailure: handleFailure,
      onCancel: () => {
        window.location.href = '/cart'
      },
      onLoad: () => setStatus('ready'),
    })

    return () => {
      instanceRef.current?.destroy()
    }
  }, [sessionId, pageUrl, provider, handleSuccess, handleFailure])

  if (!sessionId || !pageUrl) {
    return (
      <div className="result-page">
        <div className="result-icon">⚠️</div>
        <h1 className="result-title">Invalid payment session</h1>
        <p className="result-message">No payment session found. Please start checkout again.</p>
        <a href="/cart" className="btn btn-primary btn-lg">Back to Cart</a>
      </div>
    )
  }

  return (
    <div className="payment-container">
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Complete Payment</h1>
        <span className="method-tag" style={{ fontSize: 14 }}>
          {provider === 'morning' ? '🌅 Morning' : '💳 Cardcom'}
        </span>
      </div>

      <div className="payment-iframe-wrapper">
        {status === 'loading' && <div className="payment-loading">Loading payment form...</div>}
        <div ref={containerRef} style={{ width: '100%', display: status === 'loading' ? 'none' : 'block' }} />
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="payment-loading">Loading...</div>}>
      <PaymentContent />
    </Suspense>
  )
}
