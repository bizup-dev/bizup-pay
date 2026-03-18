'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CheckoutPage;
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const cart_context_1 = require("@/lib/cart-context");
const providers = [
    {
        id: 'morning',
        name: 'Morning (Green Invoice)',
        icon: '🌅',
        description: 'Israeli invoicing & payment platform. Supports credit cards, Bit, bank transfers, and more. Automatically generates tax invoices.',
        methods: ['Credit Card', 'Bit', 'Bank Transfer', 'Apple Pay', 'Google Pay', 'PayPal'],
    },
    {
        id: 'cardcom',
        name: 'Cardcom',
        icon: '💳',
        description: 'Leading Israeli payment gateway. Specializes in credit card processing with installment support and 3D Secure.',
        methods: ['Credit Card', 'Installments', '3D Secure'],
    },
];
function CheckoutPage() {
    const { items, total } = (0, cart_context_1.useCart)();
    const router = (0, navigation_1.useRouter)();
    const [loading, setLoading] = (0, react_1.useState)(null);
    if (items.length === 0) {
        router.replace('/cart');
        return null;
    }
    async function handleCheckout(providerId) {
        setLoading(providerId);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: providerId,
                    items: items.map((i) => ({
                        id: i.product.id,
                        name: i.product.name,
                        price: i.product.price,
                        quantity: i.quantity,
                    })),
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create payment session');
            }
            const session = await res.json();
            // Navigate to the payment page with session data in the URL
            const params = new URLSearchParams({
                sessionId: session.id,
                pageUrl: session.pageUrl,
                provider: session.provider,
            });
            router.push(`/payment?${params.toString()}`);
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Something went wrong');
            setLoading(null);
        }
    }
    return (<>
      <h1 className="page-title">Checkout</h1>

      <div className="checkout-info">
        <h3>How it works</h3>
        <p>
          This demo uses <strong>BizUp Pay</strong> — a unified Israeli payment
          framework. Each button below creates a payment session with a different
          provider using the same <code>createSession()</code> API. The provider
          returns a hosted payment page URL, which we embed using the{' '}
          <code>@bizup-pay/client</code> SDK.
        </p>
        <p style={{ marginTop: 8 }}>
          <strong>Total: {total.toFixed(2)} ILS</strong> &middot;{' '}
          {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      <h2 style={{ marginBottom: 16 }}>Choose a payment provider</h2>

      <div className="provider-grid">
        {providers.map((provider) => (<div key={provider.id} className="provider-card" onClick={() => !loading && handleCheckout(provider.id)} style={{ opacity: loading && loading !== provider.id ? 0.5 : 1 }}>
            <div className="provider-header">
              <span className="provider-icon">{provider.icon}</span>
              <span className="provider-name">{provider.name}</span>
            </div>
            <div className="provider-desc">{provider.description}</div>
            <div className="provider-methods">
              {provider.methods.map((m) => (<span key={m} className="method-tag">{m}</span>))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading !== null}>
              {loading === provider.id ? 'Creating session...' : `Pay with ${provider.name}`}
            </button>
          </div>))}
      </div>
    </>);
}
//# sourceMappingURL=page.js.map