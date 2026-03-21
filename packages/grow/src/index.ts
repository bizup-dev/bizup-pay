import { registerProvider } from '@bizup-pay/core'
import { GrowProvider } from './provider.js'
import type { GrowConfig } from './types.js'

export { GrowProvider } from './provider.js'
export type { GrowConfig } from './types.js'
export type { GrowExtras } from './types.js'

registerProvider('grow', (config) => {
  return new GrowProvider(config as unknown as GrowConfig)
})
