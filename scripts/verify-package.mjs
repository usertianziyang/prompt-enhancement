import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const packed = spawnSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], { encoding: 'utf8' })
if (packed.status !== 0) throw new Error(packed.stderr || packed.stdout)
const [{ files }] = JSON.parse(packed.stdout)
const paths = new Set(files.map(file => file.path))
for (const path of [
  'lib/index.js', 'lib/invariant.js', 'lib/client.js', 'lib/remote.js', 'lib/typert.js',
  'lib/types/index.d.ts', 'lib/types/client/index.d.ts', 'lib/types/remote.d.ts',
  'cordis.patch.yml', 'README.md', 'README.zh.md', 'LICENSE',
]) assert(paths.has(path), `npm package is missing ${path}`)

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
for (const [subpath, value] of Object.entries(pkg.exports)) {
  for (const target of typeof value === 'string' ? [value] : Object.values(value)) {
    const path = target.replace(/^\.\//u, '')
    assert(paths.has(path), `npm export ${subpath} points to missing ${path}`)
  }
}
for (const path of paths) {
  if (!path.endsWith('.d.ts')) continue
  const declaration = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
  assert.doesNotMatch(declaration, /(?:from\s+|import\()['"][^'"]+\.tsx?['"]/u, `${path} references unpacked TypeScript source`)
}

const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
const typert = await readFile(new URL('../lib/typert.js', import.meta.url), 'utf8')
assert.match(client, /id:\s*["']dsh-prompt-enhancement["']/u)
assert.match(typert, /package:\s*["']dsh-prompt-enhancement["']/u)
