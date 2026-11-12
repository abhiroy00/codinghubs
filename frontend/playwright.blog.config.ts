import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'blog.spec.ts',
  outputDir: '../artifacts/blog-tests',
  workers: 1,
  use: {
    baseURL: process.env.BLOG_SITE_BASE_URL ?? 'http://127.0.0.1:5183',
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
  },
})
