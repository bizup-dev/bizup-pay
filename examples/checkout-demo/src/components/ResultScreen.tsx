'use client'
import { useRouter } from 'next/navigation'

const RESULT_COLORS = {
  success: { bg: '#f0fdf4', border: '#16a34a', text: '#16a34a', icon: 'V' },
  failure: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', icon: 'X' },
  cancelled: { bg: '#fefce8', border: '#ca8a04', text: '#ca8a04', icon: '!' },
} as const

export function ResultScreen({ status, message }: { status: 'success' | 'failure' | 'cancelled'; message: string }) {
  const router = useRouter()
  const c = RESULT_COLORS[status]
  const title = status === 'success' ? 'Payment Successful' : status === 'failure' ? 'Payment Failed' : 'Payment Cancelled'

  return (
    <div>
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.5rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
        BizUp Pay Demo App <span style={{ margin: '0 0.4rem' }}>&mdash;</span> You are back on the merchant&apos;s website
      </div>
      <div style={{ maxWidth: 500, margin: '3rem auto', textAlign: 'center', padding: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: c.bg, border: `2px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem', fontWeight: 700, color: c.text }}>
          {c.icon}
        </div>
        <h1 style={{ color: c.text, marginBottom: '0.5rem' }}>{title}</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>{message}</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => router.push('/')}
            style={{ background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 2rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
            Back to Shop
          </button>
          {status === 'success' && (
            <button onClick={() => router.push('/account')}
              style={{ background: '#fff', color: '#0070f3', border: '1px solid #0070f3', borderRadius: 6, padding: '0.75rem 2rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
              View in Account
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
