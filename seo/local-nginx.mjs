#!/usr/bin/env node
// Serve the production build through the production nginx rules on loopback HTTP, for seo/check-urls.mjs.
//
//   node seo/local-nginx.mjs [port=18183] [backend=127.0.0.1:8000]
//   nginx -p <printed dir> -c nginx.conf            (start)    ·   nginx -p <dir> -c nginx.conf -s stop
//
// Uses frontend/nginx.conf verbatim except: only the main site server block is kept, it listens on plain
// HTTP (TLS/HTTP2 removed), the web root and redirect map point at frontend/dist and frontend/dist-nginx, and
// the backend upstream is the given host. Routing, rewrites, redirects, headers and 404 handling are unchanged.
// TLS, HTTP/2, the www/admin hosts and CDN behaviour are therefore NOT verified by a local run.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const port = process.argv[2] ?? '18183'
const backend = process.argv[3] ?? '127.0.0.1:8000'
const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'frontend/dist'), maps = path.join(root, 'frontend/dist-nginx')
for (const p of [path.join(dist, 'home.html'), path.join(maps, 'lesson-days.map')]) if (!fs.existsSync(p)) { console.error('Build first (cd frontend && npm run build): missing ' + p); process.exit(1) }

const source = fs.readFileSync(path.join(root, 'frontend/nginx.conf'), 'utf8')
// Top-level blocks: the map(s) and the server whose root is the site (the main HTTPS server).
const blocks = []
for (let i = 0, depth = 0, start = 0; i < source.length; i++) {
  if (source[i] === '{') { if (depth++ === 0) start = source.lastIndexOf('\n', i) + 1 }
  else if (source[i] === '}' && --depth === 0) blocks.push(source.slice(start, i + 1))
}
const mapBlocks = blocks.filter(b => /^\s*map\s/.test(b))
const httpDirectives = source.match(/^map_hash_[a-z_]+ [^;]+;$/gm) ?? []
const site = blocks.find(b => /^\s*server\s*\{/.test(b) && /listen 443 ssl;/.test(b) && /root \/usr\/share\/nginx\/html;/.test(b))
if (!site) { console.error('Could not find the main site server block in frontend/nginx.conf'); process.exit(1) }

const sub = text => text
  .replaceAll('${SERVER_NAME}', 'localhost').replaceAll('${ADMIN_SERVER_NAME}', 'admin.invalid').replaceAll('${BACKEND_HOST}', backend)
  .replace('include /etc/nginx/redirects/lesson-days.map;', `include ${maps}/lesson-days.map;`)
  .replace(/listen 443 ssl;/, `listen 127.0.0.1:${port};`)
  .replace(/^\s*http2 on;\n/m, '')
  .replace(/^\s*ssl_[a-z_]+ [^;]+;\n/gm, '')
  .replaceAll('root /usr/share/nginx/html;', `root ${dist};`)

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codinghubs-nginx-'))
const conf = `worker_processes 1;
error_log ${dir}/error.log warn;
pid ${dir}/nginx.pid;
events { worker_connections 256; }
http {
    include ${['/opt/homebrew/etc/nginx/mime.types', '/usr/local/etc/nginx/mime.types', '/etc/nginx/mime.types'].find(f => fs.existsSync(f)) ?? 'mime.types'};
    default_type application/octet-stream;
    access_log ${dir}/access.log;
    client_body_temp_path ${dir}/body; proxy_temp_path ${dir}/proxy; fastcgi_temp_path ${dir}/fastcgi; uwsgi_temp_path ${dir}/uwsgi; scgi_temp_path ${dir}/scgi;
${httpDirectives.join('\n')}
${mapBlocks.map(sub).join('\n')}
${sub(site)}
}
`
fs.writeFileSync(path.join(dir, 'nginx.conf'), conf)
console.log(dir)
