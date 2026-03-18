'use client'

import { useCart } from '@/lib/cart-context'
import type { Product } from '@/lib/products'

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()

  return (
    <div className="product-card">
      <div className="product-image">{product.image}</div>
      <div className="product-name">{product.name}</div>
      <div className="product-desc">{product.description}</div>
      <div className="product-footer">
        <div className="product-price">
          {product.price.toFixed(2)} {product.currency}
        </div>
        <button className="btn btn-primary" onClick={() => addItem(product)}>
          Add to Cart
        </button>
      </div>
    </div>
  )
}
