import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { diffWords } from 'diff'
import {
  Button, IconArchiveOutline20, IconTrashOutline16, Modal, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  PromptEnhancementMode, PromptEnhancementRecord, PromptEnhancementStatus,
} from '../types.js'
import type { PromptEnhancementInjected } from './index.js'
import css from './PromptEnhancementControl.module.css'

export type PromptEnhancementSidebarProps = PropsRuntime<'sidebar.footer.action'>
  & PropsLocale<'prompt-enhancement'> & PromptEnhancementInjected

type Confirmation = { kind: 'delete' | 'clear' | 'clearAll'; record?: PromptEnhancementRecord }

function statusLabel(status: PromptEnhancementStatus, t: PromptEnhancementSidebarProps['t']): string {
  return t(`status.${status}`)
}

function recordWorkspaceId(record: PromptEnhancementRecord, workspaces: readonly { workspaceId: string; sessionIds: readonly string[] }[]): string | undefined {
  return record.workspaceId ?? workspaces.find(workspace => record.sessionId !== undefined && workspace.sessionIds.includes(record.sessionId))?.workspaceId
}

/** Sidebar trigger and the single shared history modal. */
export function PromptEnhancementHistory({ wide, useSessions, useWorkspaces, t, controller }: PromptEnhancementSidebarProps) {
  const view = useSyncExternalStore(controller.view.subscribe, controller.view.getSnapshot)
  const sessions = useSessions(state => state)
  const workspaces = useWorkspaces(state => state.items)
  const [records, setRecords] = useState<readonly PromptEnhancementRecord[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [sessionScopeId, setSessionScopeId] = useState('')
  const [sessionQuery, setSessionQuery] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [mode, setMode] = useState<PromptEnhancementMode | ''>('')
  const [status, setStatus] = useState<PromptEnhancementStatus | ''>('')
  const [error, setError] = useState<string>()
  const [confirmation, setConfirmation] = useState<Confirmation>()

  const reload = (): void => {
    void controller.list().then((next) => {
      setRecords(next)
      setSelectedId(current => current !== undefined && next.some(record => record.id === current) ? current : next[0]?.id)
      setError(undefined)
    }, (reason: unknown) => { setError(reason instanceof Error ? reason.message : String(reason)) })
  }

  useEffect(() => {
    if (!view.open) return
    setSessionScopeId(view.sessionId ?? '')
    setSessionQuery(view.sessionId === undefined ? '' : sessions.byId[view.sessionId]?.displayTitle ?? view.sessionId)
    setWorkspaceId('')
    setMode('')
    setStatus('')
    reload()
  }, [view.open, view.sessionId])

  const filtered = useMemo(() => {
    const query = sessionQuery.trim().toLocaleLowerCase()
    return records.filter(record =>
      (sessionScopeId !== ''
        ? record.sessionId === sessionScopeId
        : query === '' || (record.sessionId === undefined ? '' : sessions.byId[record.sessionId]?.displayTitle ?? record.sessionId).toLocaleLowerCase().includes(query))
      && (workspaceId === '' || recordWorkspaceId(record, workspaces) === workspaceId)
      && (mode === '' || record.mode === mode)
      && (status === '' || record.status === status))
  }, [mode, records, sessionQuery, sessionScopeId, sessions.byId, status, workspaceId, workspaces])
  const selected = filtered.find(record => record.id === selectedId) ?? filtered[0]
  const workspaceOptions = useMemo(() => [...new Set(records.flatMap(record => {
    const id = recordWorkspaceId(record, workspaces)
    return id === undefined ? [] : [id]
  }))], [records, workspaces])

  const executeConfirmation = (): void => {
    const action = confirmation
    setConfirmation(undefined)
    if (action === undefined) return
    if (action.kind === 'delete' && action.record !== undefined) {
      void controller.remove(action.record.id).then(reload, reason => { setError(reason instanceof Error ? reason.message : String(reason)) })
      return
    }
    const request = action.kind === 'clearAll'
      ? controller.clear({})
      : Promise.all(filtered.map(record => controller.remove(record.id)))
    void request.then(reload, reason => { setError(reason instanceof Error ? reason.message : String(reason)) })
  }

  return (
    <>
      <Tooltip label={t('history')} disabled={wide}>
        <button type="button" className={css.sidebarButton} aria-label={t('history')} onClick={() => { controller.open() }}>
          <IconArchiveOutline20 size={18} />
          {wide && <span>{t('history')}</span>}
        </button>
      </Tooltip>
      <Modal open={view.open} onClose={() => { controller.close() }} title={t('historyTitle')} closeLabel={t('close')} className={css.historyModal ?? ''} contentClassName={css.historyContent ?? ''}>
        <div className={css.filters}>
          <label>{t('filter.session')}<input type="search" value={sessionQuery} placeholder={t('filter.sessionPlaceholder')} onChange={event => { setSessionScopeId(''); setSessionQuery(event.currentTarget.value) }} /></label>
          <label>{t('filter.workspace')}<select value={workspaceId} onChange={event => { setWorkspaceId(event.currentTarget.value) }}><option value="">{t('filter.all')}</option>{workspaceOptions.map(id => <option key={id} value={id}>{workspaces.find(item => item.workspaceId === id)?.title ?? id}</option>)}</select></label>
          <label>{t('filter.mode')}<select value={mode} onChange={event => { setMode(event.currentTarget.value as PromptEnhancementMode | '') }}><option value="">{t('filter.all')}</option><option value="prompt">{t('prompt')}</option><option value="project">{t('project')}</option></select></label>
          <label>{t('filter.status')}<select value={status} onChange={event => { setStatus(event.currentTarget.value as PromptEnhancementStatus | '') }}><option value="">{t('filter.all')}</option><option value="completed">{t('status.completed')}</option><option value="failed">{t('status.failed')}</option><option value="cancelled">{t('status.cancelled')}</option></select></label>
        </div>
        {error !== undefined && <p className={css.error} role="alert">{error}</p>}
        <div className={css.historyLayout}>
          <div className={css.historyList}>
            <div className={css.listActions}><span>{t('recordCount', { count: filtered.length })}</span><Button size="sm" variant="ghost" onClick={() => { setConfirmation({ kind: 'clear' }) }} disabled={filtered.length === 0}>{t('clearFiltered')}</Button></div>
            {filtered.length === 0 && <p className={css.empty}>{t('empty')}</p>}
            {filtered.map(record => <button type="button" key={record.id} className={record.id === selected?.id ? `${css.historyRow} ${css.historyRowSelected}` : css.historyRow} onClick={() => { setSelectedId(record.id) }}>
              <span className={css.rowPrompt}>{record.originalPrompt}</span>
              <span className={css.rowMeta}>{record.mode === 'prompt' ? t('prompt') : t('project')} · {statusLabel(record.status, t)} · {new Date(record.createdAt).toLocaleString()}</span>
            </button>)}
          </div>
          <div className={css.detail}>
            {selected === undefined ? <p className={css.empty}>{t('selectRecord')}</p> : <>
              <div className={css.detailActions}>
                <Button size="sm" variant="outline" icon={<IconTrashOutline16 />} onClick={() => { setConfirmation({ kind: 'delete', record: selected }) }}>{t('delete')}</Button>
              </div>
              <section>
                <h3>{t('original')}</h3>
                <pre>{selected.originalPrompt}</pre>
              </section>
              <section>
                <h3>{t('enhanced')}</h3>
                <pre>{selected.enhancedPrompt ?? t('noResult')}</pre>
              </section>
              {selected.enhancedPrompt !== undefined && <section><h3>{t('diff')}</h3><div className={css.diff}>{diffWords(selected.originalPrompt, selected.enhancedPrompt).map((part, index) => part.added ? <ins key={index}>{part.value}</ins> : part.removed ? <del key={index}>{part.value}</del> : <span key={index}>{part.value}</span>)}</div></section>}
              <section><h3>{t('trace')}</h3><ol className={css.trace}>{selected.trace.map((step, index) => <li key={`${step.label}-${index}`}><span>{step.label}</span><small>{statusLabel(step.status, t)}{step.reference === undefined ? '' : ` · ${step.reference}`}{step.summary === undefined ? '' : ` · ${step.summary}`}</small></li>)}</ol></section>
            </>}
          </div>
        </div>
        <div className={css.modalFooter}><Button variant="ghost" onClick={() => { setConfirmation({ kind: 'clearAll' }) }} disabled={records.length === 0}>{t('clearAll')}</Button><Button variant="outline" onClick={() => { controller.close() }}>{t('close')}</Button></div>
      </Modal>
      <Modal open={confirmation !== undefined} onClose={() => { setConfirmation(undefined) }} title={t('confirmDeleteTitle')} closeLabel={t('close')} description={confirmation?.kind === 'clearAll' ? t('confirmClearAllDescription') : t('confirmDeleteDescription')} footer={<><Button variant="outline" onClick={() => { setConfirmation(undefined) }}>{t('cancel')}</Button><Button variant="primary" onClick={executeConfirmation}>{t('confirm')}</Button></>} />
    </>
  )
}
