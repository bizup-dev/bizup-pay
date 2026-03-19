import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@bizup-pay/core', '@bizup-pay/morning', '@bizup-pay/cardcom', '@bizup-pay/icount', '@bizup-pay/client', '@bizup-pay/mock-server'],
}

export default nextConfig
