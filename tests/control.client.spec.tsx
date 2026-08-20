// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PromptEnhancementRecord } from '../src/types.ts'
import { PromptEnhancementControl } from '../src/client/PromptEnhancementControl.tsx'
import type { PromptEnhancementProps } from '../src/client/PromptEnhancementControl.tsx'
import { PromptEnhancementHistory } from '../src/client/PromptEnhancementHistory.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)
const t = (key: keyof typeof zh, params?: Record<string, string | number>): string => {
  let text: string = zh[key]
  for (const [name, value] of Object.entries(params ?? {})) text = text.replace(`{${name}}`, String(value))
  return text
}
const SID = 'enhancement-ui' as SessionId

function record(): PromptEnhancementRecord {
  return {
    id: 'r1' as PromptEnhancementRecord['id'], sessionId: SID, mode: 'prompt', originalPrompt: 'old', enhancedPrompt: 'enhanced',
    status: 'completed', trace: [], createdAt: 1, updatedAt: 1,
  }
}

function input(draft: string, draftRev: number) {
  return { draft, draftRev, imageIds: [], phase: 'plain', occurrences: [], queue: [] } as never
}

describe('PromptEnhancementControl', () => {
  it('replaces an unchanged draft after enhancement', async () => {
    const setDraft = vi.fn()
    const enhance = vi.fn(() => Promise.resolve({ ok: true as const, value: { record: record() } }))
    const props = { sessionId: SID, input: input('old', 1), inputActions: { setDraft }, enhance, controller: { open: vi.fn() }, t } as unknown as Parameters<typeof PromptEnhancementControl>[0]
    const ui = render(<PromptEnhancementControl {...props} />)

    fireEvent.click(ui.getByLabelText(zh.enhance))

    await waitFor(() => { expect(setDraft).toHaveBeenCalledWith('enhanced') })
    await waitFor(() => { expect(ui.getByLabelText(zh.restore)).toBeTruthy() })
    fireEvent.click(ui.getByLabelText(zh.restore))
    expect(setDraft).toHaveBeenLastCalledWith('old')
    expect(ui.getByLabelText(zh.enhance)).toBeTruthy()
  })

  it('selects project mode from the composer menu', async () => {
    const enhance = vi.fn(() => Promise.resolve({ ok: true as const, value: { record: record() } }))
    const props = { sessionId: SID, input: input('old', 1), inputActions: { setDraft: vi.fn() }, enhance, controller: { open: vi.fn() }, t } as unknown as Parameters<typeof PromptEnhancementControl>[0]
    const ui = render(<PromptEnhancementControl {...props} />)

    fireEvent.click(ui.getByRole('button', { name: zh.modeCurrent.replace('{mode}', zh.prompt) }))
    fireEvent.click(ui.getByRole('menuitem', { name: zh.project }))
    fireEvent.click(ui.getByLabelText(zh.enhance))

    await waitFor(() => { expect(enhance).toHaveBeenCalledWith(SID, 'old', 'project', expect.any(AbortSignal)) })
  })

  it('does not overwrite a draft edited while enhancement is running', async () => {
    const pending = Promise.withResolvers<{ ok: true; value: { record: PromptEnhancementRecord } }>()
    const setDraft = vi.fn()
    const enhance = vi.fn(() => pending.promise)
    const base = { session: {} as never, sessionId: SID, inputActions: { setDraft }, enhance, controller: { open: vi.fn() }, t }
    const ui = render(<PromptEnhancementControl {...({ ...base, input: input('old', 1) } as unknown as PromptEnhancementProps)} />)
    fireEvent.click(ui.getByLabelText(zh.enhance))

    ui.rerender(<PromptEnhancementControl {...({ ...base, input: input('new user draft', 2) } as unknown as PromptEnhancementProps)} />)
    pending.resolve({ ok: true, value: { record: record() } })

    await waitFor(() => { expect(ui.getByText(zh.draftChanged)).toBeTruthy() })
    expect(setDraft).not.toHaveBeenCalled()
  })

  it('aborts without showing an error', async () => {
    const pending = Promise.withResolvers<{ ok: false; error: { message: string } }>()
    const enhance = vi.fn((_sessionId, _prompt, _mode, signal: AbortSignal) => {
      signal.addEventListener('abort', () => { pending.resolve({ ok: false, error: { message: 'aborted' } }) })
      return pending.promise
    })
    const ui = render(<PromptEnhancementControl {...({ session: {}, sessionId: SID, input: input('old', 1), inputActions: { setDraft: vi.fn() }, enhance, controller: { open: vi.fn() }, t } as unknown as PromptEnhancementProps)} />)
    fireEvent.click(ui.getByLabelText(zh.enhance))
    fireEvent.click(ui.getByLabelText(zh.stop))

    await waitFor(() => { expect(ui.queryByText('aborted')).toBeNull() })
  })

  it('shows enhancement failures in a modal', async () => {
    const enhance = vi.fn(() => Promise.resolve({ ok: false as const, error: { message: 'provider unavailable' } }))
    const ui = render(<PromptEnhancementControl {...({ sessionId: SID, input: input('old', 1), inputActions: { setDraft: vi.fn() }, enhance, controller: { open: vi.fn() }, t } as unknown as PromptEnhancementProps)} />)

    fireEvent.click(ui.getByLabelText(zh.enhance))

    await waitFor(() => { expect(ui.getByRole('dialog', { name: zh.failed })).toBeTruthy() })
    expect(ui.getByText('provider unavailable')).toBeTruthy()
  })
})

describe('PromptEnhancementHistory', () => {
  it('is read-only and combines workspace membership with session-title search', async () => {
    const sid2 = 'enhancement-ui-2' as SessionId
    const sid3 = 'enhancement-ui-3' as SessionId
    const records: PromptEnhancementRecord[] = [
      record(),
      { ...record(), id: 'r2' as PromptEnhancementRecord['id'], sessionId: sid2, workspaceId: 'w1' as never, originalPrompt: 'second' },
      { ...record(), id: 'r3' as PromptEnhancementRecord['id'], sessionId: sid3, workspaceId: 'w2' as never, originalPrompt: 'third' },
    ]
    const view = { open: true }
    const controller = {
      view: { getSnapshot: () => view, subscribe: () => () => {} },
      list: vi.fn(() => Promise.resolve(records)), remove: vi.fn(), clear: vi.fn(), close: vi.fn(), open: vi.fn(),
    }
    const sessions = {
      byId: {
        [SID]: { displayTitle: 'Fix login' }, [sid2]: { displayTitle: 'Refactor login flow' }, [sid3]: { displayTitle: 'Write docs' },
      },
    }
    const workspaces = { items: [
      { workspaceId: 'w1', title: 'Application', sessionIds: [SID, sid2] },
      { workspaceId: 'w2', title: 'Documentation', sessionIds: [sid3] },
    ] }
    const ui = render(<PromptEnhancementHistory {...({
      wide: true, t, controller,
      useSessions: (selector: (state: typeof sessions) => unknown) => selector(sessions),
      useWorkspaces: (selector: (state: typeof workspaces) => unknown) => selector(workspaces),
    } as unknown as Parameters<typeof PromptEnhancementHistory>[0])} />)

    await waitFor(() => { expect(ui.getByText(zh.recordCount.replace('{count}', '3'))).toBeTruthy() })
    expect(ui.queryByRole('button', { name: zh.restore })).toBeNull()

    fireEvent.change(ui.getByLabelText(zh['filter.workspace']), { target: { value: 'w1' } })
    expect(ui.getByText(zh.recordCount.replace('{count}', '2'))).toBeTruthy()

    fireEvent.change(ui.getByLabelText(zh['filter.session']), { target: { value: 'refactor' } })
    expect(ui.getByText(zh.recordCount.replace('{count}', '1'))).toBeTruthy()
    expect(ui.queryAllByText('third')).toHaveLength(0)
  })
})
