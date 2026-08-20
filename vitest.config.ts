import { defineConfig } from 'vitest/config'
import { transpileStandardDecorators } from './scripts/transpile-standard-decorators.ts'

export default defineConfig({
  plugins: [{
    name: 'dsh-standard-decorators',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/index.ts')) return null
      return transpileStandardDecorators(code, id)
    },
  }],
  test: {
    server: { deps: { inline: [/@deepseek-ai\/dsh-client-ui-primitives/] } },
  },
})
