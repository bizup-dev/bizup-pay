import { registerProvider } from '@bizup-pay/core'
import { TranzillaProvider } from './provider.js'
import type { TranzillaConfig } from './types.js'

export { TranzillaProvider } from './provider.js'
export type { TranzillaConfig } from './types.js'
export type { TranzillaExtras } from './types.js'

registerProvider('tranzilla', (config) => {
  return new TranzillaProvider(config as unknown as TranzillaConfig)
})
