import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3099',
    video: 'on',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  outputDir: './e2e/results',
  reporter: [['html', { outputFolder: './e2e/report' }], ['list']],
  projects: [
    {
      name: 'checkout-e2e',
      use: { browserName: 'chromium' },
    },
  ],
})
