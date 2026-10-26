import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// /free-session.css lives in public/ under a fixed name, so browsers may keep an old copy.
// A content hash in its URL makes every change reach users immediately.
const cssVersion = createHash('md5').update(readFileSync('public/free-session.css')).digest('hex').slice(0, 8)

export default defineConfig({
  plugins: [react()],
  define: { __CSS_VERSION__: JSON.stringify(cssVersion) },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
