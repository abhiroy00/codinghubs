// Writes a .gz next to every compressible build file, at the highest gzip level, for nginx's gzip_static
// (nginx.conf). Compressing once at build time is smaller than nginx's on-the-fly gzip and costs no CPU per request.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync, constants } from 'node:zlib'

const dist = path.resolve(import.meta.dirname, '..', 'dist')
const EXT = /\.(html|js|mjs|css|svg|json|xml|txt|ico|webmanifest)$/
const MIN = 1024 // same as gzip_min_length

let files = 0, before = 0, after = 0
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) { if (entry.name !== '.vite') await walk(file); continue }
    if (!EXT.test(entry.name) || (await stat(file)).size < MIN) continue
    const data = await readFile(file)
    const gz = gzipSync(data, { level: constants.Z_BEST_COMPRESSION })
    if (gz.length >= data.length) continue
    await writeFile(`${file}.gz`, gz)
    files++, before += data.length, after += gz.length
  }
}
await walk(dist)
console.log(`precompressed ${files} files: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB gzip`)
