import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BizUp Pay - Checkout Demo',
  description: 'Sample checkout using @bizup-pay',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  )
}
