import { readFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve as resolvePath, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { TsdownPlugin, UserConfig } from 'tsdown'
import { transform } from 'lightningcss'
import { transpileStandardDecorators } from './scripts/transpile-standard-decorators.ts'

const PLUGIN_ID = 'dsh-prompt-enhancement'
const CLIENT_BUNDLED_DEPENDENCIES = [/^(?:diff|zod)(?:\/|$)/u]
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'
const REPOSITORY_ROOT = fileURLToPath(new URL('.', import.meta.url))

function browserSourcePath(source: string, sourcemapPath: string): string {
  if (!source.startsWith('.')) return source
  return `../../../${relative(REPOSITORY_ROOT, resolvePath(dirname(sourcemapPath), source)).split(sep).join('/')}`
}

function cssPlugin(): TsdownPlugin {
  return {
    name: 'dsh-css-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.css')) return null
      const path = source.startsWith('.') || source.startsWith('/')
        ? importer === undefined ? source : resolvePath(dirname(importer), source)
        : source
      return `${CSS_VIRTUAL_PREFIX}${path}${CSS_VIRTUAL_SUFFIX}`
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code, exports } = transform({
        filename: fileId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classes = Object.fromEntries(Object.entries(exports ?? {}).map(([name, value]) => [name, value.name]))
      const css = code.toString()
      const tagId = `${PLUGIN_ID}/${basename(fileId)}`
      return `
const css = ${JSON.stringify(css)};
const tagId = ${JSON.stringify(tagId)};
if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {
  const tag = document.createElement('style');
  tag.dataset.plugin = ${JSON.stringify(PLUGIN_ID)};
  tag.dataset.pluginCss = tagId;
  tag.textContent = css;
  document.head.appendChild(tag);
}
export default ${JSON.stringify(classes)};
`
    },
  }
}

function decoratorsPlugin(): TsdownPlugin {
  return {
    name: 'dsh-standard-decorators',
    transform(code: string, id: string) {
      if (!id.endsWith('/src/index.ts')) return null
      return transpileStandardDecorators(code, id)
    },
  }
}

export default [
  {
    name: PLUGIN_ID,
    entry: {
      index: 'src/index.ts',
      invariant: 'src/invariant.ts',
      remote: 'src/remote.ts',
      typert: 'src/typert.ts',
    },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    plugins: [decoratorsPlugin()],
  },
  {
    name: `${PLUGIN_ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      alwaysBundle: CLIENT_BUNDLED_DEPENDENCIES,
      onlyBundle: CLIENT_BUNDLED_DEPENDENCIES,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    plugins: [cssPlugin()],
    outputOptions: {
      entryFileNames: 'client.js',
      sourcemapPathTransform: browserSourcePath,
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      codeSplitting: false,
    },
  },
] satisfies UserConfig[]
