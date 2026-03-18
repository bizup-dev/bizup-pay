import { products } from '@/lib/products'
import { ProductCard } from '@/components/product-card'

export default function HomePage() {
  return (
    <>
      <h1 className="page-title">Products</h1>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  )
}
