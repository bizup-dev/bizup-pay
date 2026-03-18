import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@bizup-pay/core',
    '@bizup-pay/client',
    '@bizup-pay/morning',
    '@bizup-pay/cardcom',
  ],
}

export default nextConfig
