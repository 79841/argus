import { defineConfig } from '@playwright/test'

const config = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:9845',
    headless: true,
  },
  reporter: 'html',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm dev',
    port: 9845,
    reuseExistingServer: !process.env.CI,
  },
})

export { config as default }
