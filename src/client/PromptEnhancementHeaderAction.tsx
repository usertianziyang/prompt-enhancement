import { IconArchiveOutline20, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PromptEnhancementInjected } from './index.js'
import css from './PromptEnhancementControl.module.css'

export type PromptEnhancementHeaderProps = PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<'prompt-enhancement'> & PromptEnhancementInjected

/** Session-header shortcut to history filtered to the current session. */
export function PromptEnhancementHeaderAction({ sessionId, t, controller }: PromptEnhancementHeaderProps) {
  return (
    <Tooltip label={t('sessionHistory')}>
      <button type="button" className={css.iconButton} aria-label={t('sessionHistory')} onClick={() => { controller.open(sessionId) }}>
        <IconArchiveOutline20 size={16} />
      </button>
    </Tooltip>
  )
}
