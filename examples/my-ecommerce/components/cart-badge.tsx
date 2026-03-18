'use client'

import { useCart } from '@/lib/cart-context'

export function CartBadge() {
  const { itemCount } = useCart()
  if (itemCount === 0) return null
  return <span className="cart-badge">{itemCount}</span>
}
