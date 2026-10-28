import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Separate app, served by the site's nginx under /admin-panel/ (and at the root of the admin subdomain).
export default defineConfig({
  base: '/admin-panel/',
  // read VITE_* variables from the repository root .env (one file for the whole project; only VITE_ names reach the browser)
  envDir: '..',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
