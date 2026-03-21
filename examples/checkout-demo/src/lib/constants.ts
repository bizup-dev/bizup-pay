export type ProviderKey = 'morning' | 'cardcom' | 'icount'

export const PROVIDERS: Record<ProviderKey, { label: string; color: string }> = {
  morning: { label: 'Morning (Green Invoice)', color: '#16a34a' },
  cardcom: { label: 'Cardcom', color: '#dc2626' },
  icount: { label: 'iCount', color: '#2563eb' },
}

export type IntegrationMode = 'iframe' | 'modal' | 'redirect' | 'direct'

export const MODE_INFO: Record<IntegrationMode, { label: string; code: string; description: string }> = {
  iframe: {
    label: 'Iframe (Embed)',
    code: 'BizupPay.mount(session, container)',
    description:
      "Payment form loads inline on your page inside an iframe. Customer never leaves your site. Best for seamless checkout UX.",
  },
  modal: {
    label: 'Modal (Popup)',
    code: 'BizupPay.openModal(session)',
    description:
      "Payment form opens in a centered overlay/modal. Customer stays on your page with a dimmed background. Good for single-action payments.",
  },
  redirect: {
    label: 'Redirect (Full Page)',
    code: 'window.location.href = session.pageUrl',
    description:
      "Customer is redirected to the provider's full payment page. After payment, they return via successUrl/failureUrl. Simplest integration, works everywhere.",
  },
  direct: {
    label: 'Direct API',
    code: 'POST /cc/bill { card, amount }',
    description:
      "Card details are collected on YOUR page and sent directly to the provider API. Full control over UX but requires PCI-DSS compliance. Only supported by iCount.",
  },
}

export const MOCK_CUSTOMER = {
  name: 'Israel Israeli',
  email: 'israel@example.com',
  phone: '054-1234567',
  taxId: '012345678',
}
