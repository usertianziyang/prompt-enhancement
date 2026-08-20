import { useEffect, useRef, useState } from 'react'
import {
  Button, IconArchiveOutline20, IconChevronDownOutline14, IconCloseOutline16,
  IconRefreshOutline16, IconSparkle16, Menu, Modal, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PromptEnhancementMode } from '@deepseek-ai/dsh-prompt-enhancement/client'
import type { PromptEnhancementInjected } from './index.ts'
import css from './PromptEnhancementControl.module.css'

export type PromptEnhancementProps = PropsRuntime<'conversation.input.right'> & PropsLocale<'prompt-enhancement'> & PromptEnhancementInjected

export function PromptEnhancementControl({ sessionId, input, t, enhance, controller, inputActions }: PromptEnhancementProps) {
  const [mode, setMode] = useState<PromptEnhancementMode>('prompt')
  const [modeOpen, setModeOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [restorePoint, setRestorePoint] = useState<{ sessionId: typeof sessionId; draft: string }>()
  const abortRef = useRef<AbortController>()
  const latestInput = useRef(input)
  latestInput.current = input
  const modeLabel = t(mode)
  const canRestore = restorePoint?.sessionId === sessionId
  const actionLabel = busy ? t('stop') : canRestore ? t('restore') : t('enhance')

  useEffect(() => () => { abortRef.current?.abort() }, [])

  const run = (): void => {
    if (busy || input.draft.trim() === '') return
    const controller = new AbortController()
    abortRef.current = controller
    const started = { draft: input.draft, draftRev: input.draftRev }
    setBusy(true); setError(null); setNotice(null)
    void enhance(sessionId, input.draft, mode, controller.signal).then((result) => {
      if (result.ok && result.value.record.enhancedPrompt !== undefined) {
        const current = latestInput.current
        if (current.draftRev === started.draftRev && current.draft === started.draft) {
          setRestorePoint({ sessionId, draft: started.draft })
          inputActions.setDraft(result.value.record.enhancedPrompt)
        } else setNotice(t('draftChanged'))
      } else if (!result.ok && !controller.signal.aborted) setError(result.error.message)
    }, (reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason)) })
      .finally(() => { setBusy(false); abortRef.current = undefined })
  }

  const restore = (): void => {
    if (restorePoint?.sessionId !== sessionId) return
    inputActions.setDraft(restorePoint.draft)
    setRestorePoint(undefined)
    setNotice(null)
  }

  return (
    <span className={css.root}>
      <Menu
        open={modeOpen}
        items={[{ id: 'prompt', label: t('prompt') }, { id: 'project', label: t('project') }]}
        selectedId={mode}
        onSelect={(id) => { setMode(id as PromptEnhancementMode); setModeOpen(false) }}
        onClose={() => { setModeOpen(false) }}
        side="top"
        anchor={
          <button
            type="button"
            className={css.modeTrigger}
            aria-label={t('modeCurrent', { mode: modeLabel })}
            aria-haspopup="menu"
            aria-expanded={modeOpen}
            disabled={busy}
            onClick={() => { setModeOpen(!modeOpen) }}
          >
            <span className={css.modeLabel}>{modeLabel}</span>
            <span className={modeOpen ? `${css.chevron} ${css.chevronOpen}` : css.chevron} aria-hidden>
              <IconChevronDownOutline14 />
            </span>
          </button>
        }
      />
      <Tooltip label={actionLabel}><button type="button" className={css.iconButton} aria-label={actionLabel} disabled={!busy && !canRestore && input.draft.trim() === ''} onClick={() => busy ? abortRef.current?.abort() : canRestore ? restore() : run()}>{busy ? <IconCloseOutline16 /> : canRestore ? <IconRefreshOutline16 /> : <IconSparkle16 />}</button></Tooltip>
      <Tooltip label={t('sessionHistory')}><button type="button" className={css.iconButton} aria-label={t('sessionHistory')} onClick={() => { controller.open(sessionId) }}><IconArchiveOutline20 size={16} /></button></Tooltip>
      {notice !== null && <span className={css.status} role="status" title={notice}>{notice}</span>}
      <Modal open={error !== null} onClose={() => { setError(null) }} title={t('failed')} closeLabel={t('close')} description={error ?? ''} footer={<Button variant="primary" onClick={() => { setError(null) }}>{t('close')}</Button>} />
    </span>
  )
}
