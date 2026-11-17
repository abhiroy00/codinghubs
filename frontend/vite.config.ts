import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { transform } from 'lightningcss'
import { defineConfig, type ResolvedConfig } from 'vite'

// /free-session.css lives in public/ under a fixed name, so browsers may keep an old copy.
// A content hash in its URL makes every change reach users immediately. The hash is taken from the source file
// (scripts/prerender.mjs does the same), so it stays identical in JS and HTML even though the built copy is minified.
const cssVersion = createHash('md5').update(readFileSync('public/free-session.css')).digest('hex').slice(0, 8)

export default defineConfig({
  build: { manifest: true },
  plugins: [
    react(),
    {
      // lets index.html reference the versioned stylesheet URL
      name: 'fs-css-version',
      transformIndexHtml: (html: string) => html.replaceAll('__FS_CSS_VERSION__', cssVersion),
    },
    fsCssMinify(),
  ],
  define: { __CSS_VERSION__: JSON.stringify(cssVersion) },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': { target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})

/**
 * Files in public/ are copied as they are, so the render-blocking /free-session.css used to ship with its comments and
 * whitespace. Minify the built copy (lightningcss: same cascade, ~12% smaller after gzip). Targets are conservative so
 * the vendor prefixes older Safari needs are kept.
 */
function fsCssMinify() {
  let config: ResolvedConfig
  return {
    name: 'fs-css-minify',
    apply: 'build' as const,
    configResolved(resolved: ResolvedConfig) {
      config = resolved
    },
    closeBundle() {
      if (config.build.ssr) return
      const file = path.resolve(config.root, config.build.outDir, 'free-session.css')
      if (!existsSync(file)) return
      const { code } = transform({
        filename: 'free-session.css',
        code: readFileSync(file),
        minify: true,
        targets: { chrome: 90 << 16, edge: 90 << 16, firefox: 90 << 16, safari: 14 << 16, ios_saf: 14 << 16 },
      })
      writeFileSync(file, code)
    },
  }
}
