'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PaymentPage;
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const client_1 = require("@bizup-pay/client");
function PaymentContent() {
    const searchParams = (0, navigation_1.useSearchParams)();
    const containerRef = (0, react_1.useRef)(null);
    const instanceRef = (0, react_1.useRef)(null);
    const [status, setStatus] = (0, react_1.useState)('loading');
    const sessionId = searchParams.get('sessionId');
    const pageUrl = searchParams.get('pageUrl');
    const provider = searchParams.get('provider');
    const handleSuccess = (0, react_1.useCallback)(() => {
        setStatus('success');
        window.location.href = '/success';
    }, []);
    const handleFailure = (0, react_1.useCallback)(() => {
        setStatus('failed');
        window.location.href = '/failure';
    }, []);
    (0, react_1.useEffect)(() => {
        if (!containerRef.current || !sessionId || !pageUrl)
            return;
        const bizupPay = new client_1.BizupPay();
        // Build a minimal session object for the client SDK
        const session = {
            id: sessionId,
            provider,
            amount: 0,
            currency: 'ILS',
            description: '',
            pageUrl,
            successUrl: '/success',
            webhookUrl: '',
            metadata: {},
            status: 'pending',
        };
        instanceRef.current = bizupPay.mount(session, containerRef.current, {
            width: '100%',
            height: '600px',
            onSuccess: handleSuccess,
            onFailure: handleFailure,
            onCancel: () => {
                window.location.href = '/cart';
            },
            onLoad: () => setStatus('ready'),
        });
        return () => {
            instanceRef.current?.destroy();
        };
    }, [sessionId, pageUrl, provider, handleSuccess, handleFailure]);
    if (!sessionId || !pageUrl) {
        return (<div className="result-page">
        <div className="result-icon">⚠️</div>
        <h1 className="result-title">Invalid payment session</h1>
        <p className="result-message">No payment session found. Please start checkout again.</p>
        <a href="/cart" className="btn btn-primary btn-lg">Back to Cart</a>
      </div>);
    }
    return (<div className="payment-container">
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Complete Payment</h1>
        <span className="method-tag" style={{ fontSize: 14 }}>
          {provider === 'morning' ? '🌅 Morning' : '💳 Cardcom'}
        </span>
      </div>

      <div className="payment-iframe-wrapper">
        {status === 'loading' && <div className="payment-loading">Loading payment form...</div>}
        <div ref={containerRef} style={{ width: '100%', display: status === 'loading' ? 'none' : 'block' }}/>
      </div>
    </div>);
}
function PaymentPage() {
    return (<react_1.Suspense fallback={<div className="payment-loading">Loading...</div>}>
      <PaymentContent />
    </react_1.Suspense>);
}
//# sourceMappingURL=page.js.map