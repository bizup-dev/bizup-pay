import type { ProviderName } from './types.js'

export type BizupErrorCode =
  | 'INVALID_CONFIG'
  | 'INVALID_PARAMS'
  | 'PROVIDER_ERROR'
  | 'NETWORK_ERROR'
  | 'WEBHOOK_PARSE_ERROR'
  | 'TRANSACTION_NOT_FOUND'
  | 'REFUND_FAILED'
  | 'TOKEN_FAILED'
  | 'UNSUPPORTED_OPERATION'

export class BizupPayError extends Error {
  constructor(
    message: string,
    public readonly code: BizupErrorCode,
    public readonly provider?: ProviderName,
    public readonly providerError?: unknown,
  ) {
    super(message)
    this.name = 'BizupPayError'
  }
}
