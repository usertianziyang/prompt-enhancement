/** Browser prompt enhancement control in the composer's right accessory seat. */
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { PromptEnhancementMode, PromptEnhancementRecord } from '../types.js'
import promptEnhancementRemote from '../remote.js'
import { PromptEnhancementControl } from './PromptEnhancementControl.js'
import { PromptEnhancementHeaderAction } from './PromptEnhancementHeaderAction.js'
import { PromptEnhancementHistory } from './PromptEnhancementHistory.js'
import { PromptEnhancementController } from './controller.js'
import { en, zh, type PromptEnhancementKey } from './locales.js'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'

/** Browser actions and shared controller injected into each prompt-enhancement slot. */
export interface PromptEnhancementInjected {
  enhance: (sessionId: SessionId, prompt: string, mode: PromptEnhancementMode, signal: AbortSignal) => Promise<RemoteResult<{ record: PromptEnhancementRecord }>>
  controller: PromptEnhancementController
}

declare module '@deepseek-ai/dsh-client-ui-slots' { interface LocaleNamespaceMap { 'prompt-enhancement': PromptEnhancementKey } }
const NS = 'prompt-enhancement'
export const inject = ['remote']

export async function apply(ctx: ClientContext): Promise<void> {
  await ctx.remote.$mount(promptEnhancementRemote)
  await ctx.inject(['slots', 'remote', 'remote.promptEnhancement', 'locale', 'sessions', 'conversation'], applyUi)
}

function applyUi(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-prompt-enhancement: dictionaries')
  const controller = new PromptEnhancementController(ctx)
  const injected = (): PromptEnhancementInjected => ({
      enhance: (sessionId, prompt, mode, signal) => ctx.remote.promptEnhancement.enhance(sessionId, { prompt, mode }, signal),
      controller,
    })
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right', id: 'prompt-enhancement', order: 30, locale: NS, inject: injected,
  }, PromptEnhancementControl))
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions', id: 'prompt-enhancement-history', order: 30, locale: NS, inject: injected,
  }, PromptEnhancementHeaderAction))
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'prompt-enhancement-history', order: 30, locale: NS, inject: injected,
  }, PromptEnhancementHistory))
}
