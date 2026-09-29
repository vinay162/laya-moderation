// Copies the demo JSON from /data into public/data for the site.
// The source files are kept as they are; the copies are minified, and bare
// NaN values (written by pandas) become null so browsers can parse them.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(root, '..', 'data')
const out = join(root, 'public', 'data')
mkdirSync(out, { recursive: true })

for (const name of readdirSync(src).filter((f) => f.endsWith('.json'))) {
  const raw = readFileSync(join(src, name), 'utf8').replace(/\bNaN\b/g, 'null')
  writeFileSync(join(out, name), JSON.stringify(JSON.parse(raw)))
}
console.log(`synced data to ${out}`)
