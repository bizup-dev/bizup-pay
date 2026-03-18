import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@bizup-pay/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@bizup-pay/morning': path.resolve(__dirname, 'packages/morning/src/index.ts'),
      '@bizup-pay/cardcom': path.resolve(__dirname, 'packages/cardcom/src/index.ts'),
      '@bizup-pay/client': path.resolve(__dirname, 'packages/client/src/index.ts'),
    },
  },
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.ts'],
  },
})
