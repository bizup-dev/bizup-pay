import type { Metadata } from 'next'
import Link from 'next/link'
import { CartProvider } from '@/lib/cart-context'
import { CartBadge } from '@/components/cart-badge'
import './globals.css'

export const metadata: Metadata = {
  title: 'My E-Commerce — BizUp Pay Demo',
  description: 'Sample e-commerce app demonstrating BizUp Pay integration',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <header className="header">
            <div className="container header-inner">
              <Link href="/" className="logo">
                My<span>Shop</span>
              </Link>
              <nav className="nav">
                <Link href="/">Products</Link>
                <Link href="/cart" className="cart-link">
                  Cart <CartBadge />
                </Link>
              </nav>
            </div>
          </header>
          <main className="container">{children}</main>
        </CartProvider>
      </body>
    </html>
  )
}
