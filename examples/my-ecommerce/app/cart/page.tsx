'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart-context'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCart()

  if (items.length === 0) {
    return (
      <>
        <h1 className="page-title">Cart</h1>
        <div className="cart-empty">
          <p>Your cart is empty.</p>
          <Link href="/" className="btn btn-primary mt-4" style={{ display: 'inline-flex', marginTop: 16 }}>
            Browse Products
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title">Cart</h1>

      <div>
        {items.map((item) => (
          <div key={item.product.id} className="cart-item">
            <div className="cart-item-image">{item.product.image}</div>
            <div className="cart-item-info">
              <div className="cart-item-name">{item.product.name}</div>
              <div className="cart-item-price">
                {item.product.price.toFixed(2)} {item.product.currency} each
              </div>
            </div>
            <div className="cart-item-actions">
              <button
                className="qty-btn"
                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                className="qty-btn"
                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
              >
                +
              </button>
              <button className="btn btn-danger" onClick={() => removeItem(item.product.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-total">
          <span>Total</span>
          <span>{total.toFixed(2)} ILS</span>
        </div>
        <Link href="/checkout" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          Proceed to Checkout
        </Link>
      </div>
    </>
  )
}
