import { defineConfig } from '@playwright/test'
import performance from './playwright.performance.config'

export default defineConfig({
  ...performance,
  testMatch: ['seo-growth.spec.ts'],
  outputDir: '../artifacts/seo-growth/e2e-results',
})
