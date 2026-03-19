import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3099',
    video: 'on',
    screenshot: 'only-on-failure',
    browserName: 'chromium',
  },
  outputDir: './e2e/results',
  reporter: [['html', { outputFolder: './e2e/report' }], ['list']],
})
