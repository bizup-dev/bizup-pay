'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Plan {
  id: string
  name: string
  nameHe: string
  price: number
  interval: 'monthly' | 'yearly'
  features: string[]
  popular?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    nameHe: 'בסיסי',
    price: 49.90,
    interval: 'monthly',
    features: ['5 users', '10GB storage', 'Email support', 'Basic analytics'],
  },
  {
    id: 'pro',
    name: 'Pro',
    nameHe: 'מקצועי',
    price: 99.90,
    interval: 'monthly',
    popular: true,
    features: ['25 users', '100GB storage', 'Priority support', 'Advanced analytics', 'API access'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    nameHe: 'ארגוני',
    price: 249.90,
    interval: 'monthly',
    features: ['Unlimited users', '1TB storage', 'Dedicated support', 'Custom analytics', 'API access', 'SSO & SAML'],
  },
]

export default function SubscribePage() {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  function getPrice(plan: Plan) {
    return billingCycle === 'yearly' ? +(plan.price * 10).toFixed(2) : plan.price
  }

  function getInterval(plan: Plan) {
    return billingCycle === 'yearly' ? 'yearly' : plan.interval
  }

  function subscribe(plan: Plan, provider: 'morning' | 'cardcom' | 'icount') {
    const price = getPrice(plan)
    const interval = getInterval(plan)
    const totalPayments = billingCycle === 'yearly' ? 1 : 12

    const params = new URLSearchParams({
      provider,
      amount: String(price),
      description: `${plan.name} Plan - ${interval} subscription`,
      items: JSON.stringify([{ name: `${plan.name} Plan (${interval})`, price, quantity: 1 }]),
      recurring: JSON.stringify({ interval, totalPayments, amount: price }),
    })
    router.push(`/checkout?${params.toString()}`)
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Choose Your Plan</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Setup recurring payments (הוראת קבע) with any provider
        </p>

        {/* Billing toggle */}
        <div style={{
          display: 'inline-flex', background: '#e5e7eb', borderRadius: 8, padding: 3,
        }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem',
              background: billingCycle === 'monthly' ? '#fff' : 'transparent',
              color: billingCycle === 'monthly' ? '#111' : '#666',
              boxShadow: billingCycle === 'monthly' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem',
              background: billingCycle === 'yearly' ? '#fff' : 'transparent',
              color: billingCycle === 'yearly' ? '#111' : '#666',
              boxShadow: billingCycle === 'yearly' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Yearly (save 17%)
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {PLANS.map(plan => {
          const price = getPrice(plan)
          const interval = getInterval(plan)

          return (
            <div
              key={plan.id}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '2rem 1.5rem',
                border: plan.popular ? '2px solid #0070f3' : '1px solid #e5e7eb',
                position: 'relative',
                boxShadow: plan.popular ? '0 4px 12px rgba(0,112,243,0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: '#0070f3', color: '#fff', padding: '0.25rem 1rem', borderRadius: 12,
                  fontSize: '0.75rem', fontWeight: 600,
                }}>
                  Most Popular
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>{plan.name}</h2>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>{plan.nameHe}</div>
                <div style={{ margin: '1rem 0' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{price.toFixed(0)}</span>
                  <span style={{ fontSize: '1.2rem', color: '#666' }}>.{(price % 1 * 100).toFixed(0).padStart(2, '0')}</span>
                  <span style={{ color: '#999', marginRight: 4 }}> ILS</span>
                  <div style={{ color: '#999', fontSize: '0.85rem' }}>/ {interval === 'yearly' ? 'year' : 'month'}</div>
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ padding: '0.35rem 0', color: '#444', fontSize: '0.9rem' }}>
                    <span style={{ color: '#16a34a', marginLeft: 6 }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={() => subscribe(plan, 'cardcom')}
                  style={{ ...btnStyle, background: '#dc2626' }}
                >
                  Subscribe via Cardcom
                </button>
                <button
                  onClick={() => subscribe(plan, 'morning')}
                  style={{ ...btnStyle, background: '#16a34a' }}
                >
                  Subscribe via Morning
                </button>
                <button
                  onClick={() => subscribe(plan, 'icount')}
                  style={{ ...btnStyle, background: '#2563eb' }}
                >
                  Subscribe via iCount
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', fontSize: '0.95rem' }}
        >
          &larr; Back to Shop
        </button>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.65rem 1rem',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.85rem',
}
