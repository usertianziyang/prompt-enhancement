// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import type { PromptEnhancementRecord } from '@deepseek-ai/dsh-prompt-enhancement/client'
import { PromptEnhancementControl } from '../src/client/PromptEnhancementControl.tsx'
import type { PromptEnhancementProps } from '../src/client/PromptEnhancementControl.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)
const t = makeTranslate(zh, commonZh)
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
})
