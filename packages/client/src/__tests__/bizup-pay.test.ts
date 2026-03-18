// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BizupPay } from '../bizup-pay.js'
import type { BizupPaymentSession } from '@bizup-pay/core'

const mockSession: BizupPaymentSession = {
  id: 'sess_123',
  provider: 'morning',
  amount: 100,
  currency: 'ILS',
  description: 'Test Order',
  pageUrl: 'https://pay.example.com/form/abc123',
  successUrl: 'https://shop.example.com/success',
  webhookUrl: 'https://shop.example.com/webhook',
  metadata: { orderId: 'order_456' },
  status: 'pending',
}

function createMockContainer() {
  const children: HTMLElement[] = []
  return {
    appendChild: vi.fn((child: HTMLElement) => {
      children.push(child)
    }),
    children,
    get lastChild() {
      return children[children.length - 1]
    },
  } as unknown as HTMLElement
}

function createMockIframe() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {}
  return {
    src: '',
    style: {} as CSSStyleDeclaration,
    setAttribute: vi.fn(),
    addEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(handler)
    }),
    remove: vi.fn(),
    _triggerEvent(event: string) {
      listeners[event]?.forEach((h) => h())
    },
  }
}

describe('BizupPay', () => {
  let originalCreateElement: typeof document.createElement
  let originalAddEventListener: typeof window.addEventListener
  let originalRemoveEventListener: typeof window.removeEventListener
  let mockIframe: ReturnType<typeof createMockIframe>
  let messageHandlers: Array<(event: MessageEvent) => void>

  beforeEach(() => {
    mockIframe = createMockIframe()
    messageHandlers = []

    originalCreateElement = document.createElement
    document.createElement = vi.fn((tag: string) => {
      if (tag === 'iframe') return mockIframe as unknown as HTMLIFrameElement
      return {
        style: {} as CSSStyleDeclaration,
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        remove: vi.fn(),
      } as unknown as HTMLElement
    }) as typeof document.createElement

    originalAddEventListener = window.addEventListener
    window.addEventListener = vi.fn((event: string, handler: unknown) => {
      if (event === 'message') {
        messageHandlers.push(handler as (event: MessageEvent) => void)
      }
    }) as typeof window.addEventListener

    originalRemoveEventListener = window.removeEventListener
    window.removeEventListener = vi.fn() as typeof window.removeEventListener
  })

  describe('mount', () => {
    it('should create an iframe with the session pageUrl', () => {
      const bizupPay = new BizupPay()
      const container = createMockContainer()

      bizupPay.mount(mockSession, container)

      expect(mockIframe.src).toBe('https://pay.example.com/form/abc123')
      expect(container.appendChild).toHaveBeenCalled()
    })

    it('should set default width and height', () => {
      const bizupPay = new BizupPay()
      const container = createMockContainer()

      bizupPay.mount(mockSession, container)

      expect(mockIframe.style.width).toBe('100%')
      expect(mockIframe.style.height).toBe('600px')
    })

    it('should use custom width and height', () => {
      const bizupPay = new BizupPay()
      const container = createMockContainer()

      bizupPay.mount(mockSession, container, {
        width: '400px',
        height: '500px',
      })

      expect(mockIframe.style.width).toBe('400px')
      expect(mockIframe.style.height).toBe('500px')
    })

    it('should set payment attributes on iframe', () => {
      const bizupPay = new BizupPay()
      const container = createMockContainer()

      bizupPay.mount(mockSession, container)

      expect(mockIframe.setAttribute).toHaveBeenCalledWith(
        'allowpaymentrequest',
        'true',
      )
    })

    it('should call onSuccess when success message received', () => {
      const bizupPay = new BizupPay()
      const container = createMockContainer()
      const onSuccess = vi.fn()

      bizupPay.mount(mockSession, container, { onSuccess })

      expect(messageHandlers).toHaveLength(1)

      messageHandlers[0]({
        data: { type: 'bizup-pay:success', message: 'Payment approved' },
      } as MessageEvent)

      expect(onSuccess).toHaveBeenCalledWith({
        session: mockSession,
        message: 'Payment approved',
      })
    })

    it('should call onFailure when failure message received', () => {
      const bizupPay = new BizupPay()
      const container = createMockContainer()
      const onFailure = vi.fn()

      bizupPay.mount(mockSession, container, { onFailure })

      messageHandlers[0]({
        data: { type: 'bizup-pay:failure', message: 'Card declined' },
      } as MessageEvent)

      expect(onFailure).toHaveBeenCalledWith({
        session: mockSession,
        message: 'Card declined',
      })
    })

    it('should call onCancel when cancel message received', () => {
      const bizupPay = new BizupPay()
      const container = createMockContainer()
      const onCancel = vi.fn()

      bizupPay.mount(mockSession, container, { onCancel })

      messageHandlers[0]({
        data: { type: 'bizup-pay:cancel' },
      } as MessageEvent)

      expect(onCancel).toHaveBeenCalled()
    })

    it('should call onLoad when iframe loads', () => {
      const bizupPay = new BizupPay()
      const container = createMockContainer()
      const onLoad = vi.fn()

      bizupPay.mount(mockSession, container, { onLoad })

      mockIframe._triggerEvent('load')

      expect(onLoad).toHaveBeenCalled()
    })

    it('should ignore invalid message data', () => {
      const bizupPay = new BizupPay()
      const container = createMockContainer()
      const onSuccess = vi.fn()

      bizupPay.mount(mockSession, container, { onSuccess })

      messageHandlers[0]({ data: null } as MessageEvent)
      messageHandlers[0]({ data: 'string' } as MessageEvent)

      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('should return instance with destroy method', () => {
      const bizupPay = new BizupPay()
      const container = createMockContainer()

      const instance = bizupPay.mount(mockSession, container)

      instance.destroy()

      expect(mockIframe.remove).toHaveBeenCalled()
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      )
    })

    it('should support on() for adding event handlers', () => {
      const bizupPay = new BizupPay()
      const container = createMockContainer()
      const handler = vi.fn()

      const instance = bizupPay.mount(mockSession, container)
      instance.on('success', handler)

      messageHandlers[0]({
        data: { type: 'bizup-pay:success' },
      } as MessageEvent)

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('openModal', () => {
    let originalBodyAppendChild: typeof document.body.appendChild
    let appendedOverlay: HTMLElement | null

    beforeEach(() => {
      appendedOverlay = null
      originalBodyAppendChild = document.body.appendChild
      document.body.appendChild = vi.fn((child: Node) => {
        appendedOverlay = child as HTMLElement
        return child
      }) as typeof document.body.appendChild
    })

    it('should create overlay and modal container', () => {
      const bizupPay = new BizupPay()

      bizupPay.openModal(mockSession)

      expect(document.body.appendChild).toHaveBeenCalled()
      expect(document.createElement).toHaveBeenCalledWith('div')
      expect(document.createElement).toHaveBeenCalledWith('iframe')
    })

    it('should destroy overlay on destroy()', () => {
      const bizupPay = new BizupPay()

      const instance = bizupPay.openModal(mockSession)
      instance.destroy()

      expect(mockIframe.remove).toHaveBeenCalled()
    })
  })
})
