'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PROVIDERS, type ProviderKey } from '../lib/constants'

interface Product {
  id: string
  name: string
  price: number
  emoji: string
}

const PRODUCTS: Product[] = [
  { id: 'tshirt', name: 'T-Shirt', price: 79.90, emoji: '👕' },
  { id: 'hoodie', name: 'Hoodie', price: 149.90, emoji: '🧥' },
  { id: 'cap', name: 'Cap', price: 39.90, emoji: '🧢' },
  { id: 'mug', name: 'Coffee Mug', price: 29.90, emoji: '☕' },
  { id: 'sticker', name: 'Sticker Pack', price: 14.90, emoji: '🏷️' },
]

interface CartItem {
  product: Product
  quantity: number
}

export default function ShopPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  function updateQuantity(productId: string, delta: number) {
    setCart(prev =>
      prev
        .map(item =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    )
  }

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  function goToCheckout(provider: ProviderKey) {
    if (cart.length === 0) return
    const params = new URLSearchParams({
      provider,
      amount: String(total),
      description: `Order: ${cart.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}`,
      items: JSON.stringify(cart.map(item => ({
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }))),
    })
    router.push(`/checkout?${params.toString()}`)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.25rem' }}>BizUp Pay Demo Shop</h1>
          <p style={{ color: '#666', margin: 0 }}>Add items to your cart and checkout with any provider</p>
        </div>
        <button
          onClick={() => router.push('/subscribe')}
          style={{
            background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6,
            padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            whiteSpace: 'nowrap',
          }}
        >
          Subscription Plans &rarr;
        </button>
      </div>

      {/* Products Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {PRODUCTS.map(product => (
          <div
            key={product.id}
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: '1.5rem',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{product.emoji}</div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{product.name}</div>
            <div style={{ color: '#666', marginBottom: '0.75rem' }}>{product.price.toFixed(2)} ILS</div>
            <button
              onClick={() => addToCart(product)}
              style={{
                background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6,
                padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 500,
              }}
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      {/* Cart */}
      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.3rem', marginTop: 0 }}>Cart</h2>

        {cart.length === 0 ? (
          <p style={{ color: '#999' }}>Your cart is empty</p>
        ) : (
          <>
            {cart.map(item => (
              <div
                key={item.product.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 0', borderBottom: '1px solid #eee',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span>{item.product.emoji}</span>
                  <span style={{ fontWeight: 500 }}>{item.product.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button onClick={() => updateQuantity(item.product.id, -1)} style={qtyBtnStyle}>-</button>
                    <span style={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} style={qtyBtnStyle}>+</button>
                  </div>
                  <span style={{ minWidth: 80, textAlign: 'right', fontWeight: 500 }}>
                    {(item.product.price * item.quantity).toFixed(2)} ILS
                  </span>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    style={{ background: 'none', border: 'none', color: '#e00', cursor: 'pointer', fontSize: '1.1rem' }}
                  >
                    x
                  </button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0 0.5rem', fontWeight: 700, fontSize: '1.1rem' }}>
              <span>Total</span>
              <span>{total.toFixed(2)} ILS</span>
            </div>

            {/* Checkout Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              {(Object.keys(PROVIDERS) as ProviderKey[]).map(key => (
                <button key={key} onClick={() => goToCheckout(key)}
                  style={{ ...checkoutBtnStyle, background: PROVIDERS[key].color }}>
                  Checkout with {key === 'morning' ? 'Morning' : key === 'cardcom' ? 'Cardcom' : 'iCount'}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const qtyBtnStyle: React.CSSProperties = {
  width: 28, height: 28, border: '1px solid #ddd', borderRadius: 4,
  background: '#fff', cursor: 'pointer', fontSize: '1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const checkoutBtnStyle: React.CSSProperties = {
  flex: 1, color: '#fff', border: 'none', borderRadius: 6,
  padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
}
