import type { BizupPaymentSession } from '@bizup-pay/core'

export interface ClientPaymentEvent {
  session: BizupPaymentSession
  message?: string
}

export interface MountOptions {
  width?: string
  height?: string
  onSuccess?: (event: ClientPaymentEvent) => void
  onFailure?: (event: ClientPaymentEvent) => void
  onCancel?: () => void
  onLoad?: () => void
}

export interface ModalOptions extends MountOptions {
  overlayColor?: string
  closeOnOverlayClick?: boolean
}

export interface BizupPayInstance {
  destroy(): void
  on(
    event: 'success' | 'failure' | 'cancel' | 'load',
    handler: (...args: unknown[]) => void,
  ): void
}
