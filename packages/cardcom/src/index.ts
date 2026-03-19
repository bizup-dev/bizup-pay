import { registerProvider } from '@bizup-pay/core'
import { CardcomProvider } from './provider.js'
import type { CardcomConfig } from './types.js'

export { CardcomProvider } from './provider.js'
export type { CardcomConfig } from './types.js'
export type { CardcomExtras } from './types.js'

registerProvider('cardcom', (config) => {
  return new CardcomProvider(config as unknown as CardcomConfig)
})
