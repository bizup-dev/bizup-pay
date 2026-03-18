import type { ProviderName } from './types.js'
import type { BizupProvider, BizupProviderConfig } from './provider.js'
import { BizupPayError } from './errors.js'

export type ProviderFactory = (config: BizupProviderConfig) => BizupProvider

const registry = new Map<ProviderName, ProviderFactory>()

export function registerProvider(
  name: ProviderName,
  factory: ProviderFactory,
): void {
  registry.set(name, factory)
}

export function createProvider(
  name: ProviderName,
  config: BizupProviderConfig,
): BizupProvider {
  const factory = registry.get(name)
  if (!factory) {
    throw new BizupPayError(
      `Provider "${name}" is not registered. Did you forget to import the adapter?`,
      'INVALID_CONFIG',
    )
  }
  return factory(config)
}
