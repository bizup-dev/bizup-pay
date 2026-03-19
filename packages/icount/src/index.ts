import { registerProvider } from '@bizup-pay/core'
import { IcountProvider } from './provider.js'
import type { IcountConfig } from './types.js'

export { IcountProvider } from './provider.js'
export type { IcountConfig } from './types.js'
export type { IcountExtras } from './types.js'

registerProvider('icount', (config) => {
  return new IcountProvider(config as unknown as IcountConfig)
})
