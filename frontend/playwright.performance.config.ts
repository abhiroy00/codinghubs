import { defineConfig } from '@playwright/test'
import home from './playwright.home.config'

// Run against the production build, where prerendering, hydration and deferred CSS exist.
export default defineConfig({
  ...home,
  testMatch: ['performance.spec.ts', 'header.spec.ts', 'home.spec.ts', 'enrollment.spec.ts', 'account-menu.spec.ts', 'redesign.spec.ts'],
  use: { ...home.use, baseURL: process.env.PERF_BASE_URL || 'http://127.0.0.1:4173' },
  webServer: process.env.PERF_BASE_URL ? undefined : {
    command: 'node scripts/serve-audit-build.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  outputDir: '../artifacts/performance-20261118/e2e-results',
})
