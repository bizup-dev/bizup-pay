import type { BizupWebhookEvent } from '@bizup-pay/core'
import type { ProviderKey } from './constants'

export interface StoredPurchase {
  id: string
  provider: ProviderKey
  source: 'webhook' | 'redirect'
  transactionId: string
  amount: number
  currency: string
  status: string
  customerName?: string
  cardLastFour?: string
  documentUrl?: string
  apiCall: string
  receivedAt: string
  webhookEvent?: BizupWebhookEvent
}

const purchases = new Map<string, StoredPurchase>()

export function addPurchase(purchase: StoredPurchase): void {
  purchases.set(purchase.id, purchase)
}

export function getPurchase(id: string): StoredPurchase | undefined {
  return purchases.get(id)
}

export function getAllPurchases(): StoredPurchase[] {
  return Array.from(purchases.values()).sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  )
}

export function updatePurchase(id: string, update: Partial<StoredPurchase>): void {
  const existing = purchases.get(id)
  if (existing) {
    purchases.set(id, { ...existing, ...update })
  }
}
