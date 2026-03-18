import Link from 'next/link'

export default function FailurePage() {
  return (
    <div className="result-page">
      <div className="result-icon">❌</div>
      <h1 className="result-title">Payment Failed</h1>
      <p className="result-message">
        Something went wrong with your payment. Please try again or use a different payment method.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link href="/checkout" className="btn btn-primary btn-lg">
          Try Again
        </Link>
        <Link href="/" className="btn btn-outline btn-lg">
          Back to Shop
        </Link>
      </div>
    </div>
  )
}
