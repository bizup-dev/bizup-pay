import type { Server } from 'node:http'

export interface MockProviderServer {
  readonly name: string
  readonly port: number
  readonly baseUrl: string
  start(): Promise<void>
  stop(): Promise<void>
  reset(): void
  getTransactions(): MockTransaction[]
  getTransaction(id: string): MockTransaction | undefined
}

export interface MockTransaction {
  id: string
  sessionId: string
  amount: number
  currency: string
  description: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  customer?: { name: string; email?: string; phone?: string; taxId?: string }
  cardNum?: string
  cardType?: string
  createdAt: Date
  completedAt?: Date
  metadata?: Record<string, string>
}

export interface MockServerOptions {
  port?: number
  autoComplete?: boolean
  latencyMs?: number
}
