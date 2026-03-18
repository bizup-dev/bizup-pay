import type { BizupPaymentSession } from '@bizup-pay/core'
import type {
  MountOptions,
  ModalOptions,
  BizupPayInstance,
  ClientPaymentEvent,
} from './types.js'

export class BizupPay {
  mount(
    session: BizupPaymentSession,
    container: HTMLElement,
    options: MountOptions = {},
  ): BizupPayInstance {
    const iframe = document.createElement('iframe')
    iframe.src = session.pageUrl
    iframe.style.width = options.width ?? '100%'
    iframe.style.height = options.height ?? '600px'
    iframe.style.border = 'none'
    iframe.setAttribute('allowpaymentrequest', 'true')
    iframe.setAttribute('allow', 'payment')

    const handlers: Record<string, Array<(...args: unknown[]) => void>> = {
      success: [],
      failure: [],
      cancel: [],
      load: [],
    }

    if (options.onSuccess) handlers.success.push(options.onSuccess as (...args: unknown[]) => void)
    if (options.onFailure) handlers.failure.push(options.onFailure as (...args: unknown[]) => void)
    if (options.onCancel) handlers.cancel.push(options.onCancel as (...args: unknown[]) => void)
    if (options.onLoad) handlers.load.push(options.onLoad as (...args: unknown[]) => void)

    const messageHandler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return
      const data = event.data as { type?: string; message?: string }

      const paymentEvent: ClientPaymentEvent = { session, message: data.message }

      switch (data.type) {
        case 'bizup-pay:success':
          handlers.success.forEach((h) => h(paymentEvent))
          break
        case 'bizup-pay:failure':
          handlers.failure.forEach((h) => h(paymentEvent))
          break
        case 'bizup-pay:cancel':
          handlers.cancel.forEach((h) => h())
          break
      }
    }

    window.addEventListener('message', messageHandler)

    iframe.addEventListener('load', () => {
      handlers.load.forEach((h) => h())
    })

    container.appendChild(iframe)

    return {
      destroy() {
        window.removeEventListener('message', messageHandler)
        iframe.remove()
      },
      on(event, handler) {
        if (handlers[event]) {
          handlers[event].push(handler)
        }
      },
    }
  }

  openModal(
    session: BizupPaymentSession,
    options: ModalOptions = {},
  ): BizupPayInstance {
    const overlay = document.createElement('div')
    overlay.style.position = 'fixed'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.width = '100%'
    overlay.style.height = '100%'
    overlay.style.backgroundColor = options.overlayColor ?? 'rgba(0, 0, 0, 0.5)'
    overlay.style.display = 'flex'
    overlay.style.alignItems = 'center'
    overlay.style.justifyContent = 'center'
    overlay.style.zIndex = '99999'

    const modalContainer = document.createElement('div')
    modalContainer.style.backgroundColor = '#fff'
    modalContainer.style.borderRadius = '8px'
    modalContainer.style.overflow = 'hidden'
    modalContainer.style.width = options.width ?? '500px'
    modalContainer.style.height = options.height ?? '700px'
    modalContainer.style.maxWidth = '95vw'
    modalContainer.style.maxHeight = '95vh'

    overlay.appendChild(modalContainer)
    document.body.appendChild(overlay)

    const instance = this.mount(session, modalContainer, options)
    const originalDestroy = instance.destroy

    if (options.closeOnOverlayClick !== false) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          instance.destroy()
        }
      })
    }

    instance.destroy = () => {
      originalDestroy()
      overlay.remove()
    }

    return instance
  }
}
