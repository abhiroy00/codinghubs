// Local production-build verification only. Public APIs use explicit empty fixtures; submissions are rejected.
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../dist')
await stat(path.join(root, 'home.html')) // Build first; never silently audit an empty app shell.
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.ico': 'image/x-icon' }
const exists = file => stat(file).catch(() => null)

http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (pathname.startsWith('/api/')) {
      const data = pathname === '/api/interview/resources/' ? { count: 0, results: [], categories: [], difficulties: [] }
        : pathname === '/api/gigs/status/' ? { enabled: false }
        : pathname === '/api/newsletter/feed/' ? { refreshed_at: null, stale: false, categories: [], sources: [], items: [] }
        : /^\/api\/(blogs|projects|case-studies|newsletter\/issues)\//.test(pathname) ? { count: 0, results: [], next: null, previous: null }
        : []
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(data))
      return
    }
    let file = path.join(root, pathname === '/' ? 'home.html' : pathname)
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return }
    if ((await exists(file))?.isDirectory()) file = path.join(file, 'index.html')
    if (!(await exists(file))) {
      if (await exists(file + '.html')) file += '.html'
      else if (/\.[a-z0-9]+$/i.test(pathname)) { response.writeHead(404).end(); return }
      else file = path.join(root, 'index.html')
    }
    const headers = {
      'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
      // Match the deployed nginx policy: hashed assets are immutable, fixed-name media lasts a week.
      'Cache-Control': /\/assets\/.+-[\w-]{8}\.(js|css|woff2|webp|avif|png|jpe?g|svg)$/.test(file) || pathname === '/free-session.css'
        ? 'public, max-age=31536000, immutable' : pathname.startsWith('/assets/') ? 'public, max-age=604800' : 'no-cache',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN',
    }
    let content
    if (/gzip/.test(request.headers['accept-encoding'] || '') && await exists(file + '.gz')) {
      content = await readFile(file + '.gz'); headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'
    } else content = await readFile(file)
    headers['Content-Length'] = content.length
    response.writeHead(200, headers).end(request.method === 'HEAD' ? undefined : content)
  } catch {
    response.writeHead(500).end('Local audit server error')
  }
}).listen(4173, '127.0.0.1', () => console.log('Production build: http://127.0.0.1:4173; fixed empty public API fixtures; no submissions.'))
