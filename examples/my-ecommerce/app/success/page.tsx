import Link from 'next/link'

export default function SuccessPage() {
  return (
    <div className="result-page">
      <div className="result-icon">✅</div>
      <h1 className="result-title">Payment Successful!</h1>
      <p className="result-message">
        Your order has been confirmed. You will receive a confirmation email shortly.
      </p>
      <Link href="/" className="btn btn-primary btn-lg">
        Continue Shopping
      </Link>
    </div>
  )
}
