import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', workers: 1, fullyParallel: false, timeout: 60000,
  reporter: 'list', outputDir: '../.state/e2e-results',
  use: { baseURL: 'http://127.0.0.1:8766', channel: 'chrome', headless: true, trace: 'off', screenshot: 'only-on-failure' },
  webServer: { command: '../.venv/bin/python ../scripts/test_server.py', url: 'http://127.0.0.1:8766/api/health', timeout: 30000, reuseExistingServer: false },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: 'chrome' } }],
})
