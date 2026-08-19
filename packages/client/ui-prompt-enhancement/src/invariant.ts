/** Package-owned invariant companion for the browser prompt enhancement surface. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'
const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-prompt-enhancement'
export const name = 'client-ui-prompt-enhancement-invariant'
export const inject = ['invariants']
/** No runtime invariant: the slot disposer owns all browser registrations. */
const install: InvariantInstaller = () => {}
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
