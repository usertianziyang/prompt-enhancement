import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

test('bundle package name owns its loader entry and TYPERT manifest', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
  const patch = await readFile(new URL('cordis.patch.yml', root), 'utf8')
  const typert = await readFile(new URL('lib/typert.js', root), 'utf8')
  const manifestPackage = typert.match(/export const TYPERT = \{\s*package: ['"]([^'"]+)['"]/u)?.[1]
  const loaderPackage = patch.match(/^\s+name: (\S+)$/mu)?.[1]

  assert.equal(manifestPackage, pkg.name)
  assert.equal(loaderPackage, pkg.name)
})
