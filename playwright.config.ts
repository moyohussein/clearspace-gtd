import { defineConfig, devices } from '@playwright/test'

// Tests target the production-shaped Worker (wrangler dev) so REST and UI share one origin.
const PORT = Number(process.env.PORT ?? 8787)

// The bundled Chromium in this sandbox is older than Playwright's default, so tests
// launch it through CHROMIUM_PATH instead of the usual per-version download.
const launchOptions = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : undefined

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], launchOptions },
    },
  ],
  webServer: {
    command: `npx vite build && npx wrangler dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
