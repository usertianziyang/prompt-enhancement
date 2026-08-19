/** Package-owned invariant companion for prompt enhancement. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-prompt-enhancement'
export const name = 'prompt-enhancement-invariant'
export const inject = ['invariants']
/** No runtime invariant: records are schema-validated by Storage Domain and written by one service. */
const install: InvariantInstaller = Object.assign(() => {}, { inject: ['promptEnhancement'] })
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
