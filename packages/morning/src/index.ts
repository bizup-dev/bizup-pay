import { registerProvider } from '@bizup-pay/core'
import { MorningProvider } from './provider.js'
import type { MorningConfig } from './types.js'

export { MorningProvider } from './provider.js'
export type { MorningConfig } from './types.js'
export type { MorningExtras } from './types.js'

registerProvider('morning', (config) => {
  return new MorningProvider(config as MorningConfig)
})
