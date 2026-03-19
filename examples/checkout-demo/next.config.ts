import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@bizup-pay/core', '@bizup-pay/morning', '@bizup-pay/cardcom', '@bizup-pay/client'],
}

export default nextConfig
