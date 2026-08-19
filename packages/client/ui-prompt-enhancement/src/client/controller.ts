/** Shared browser controller for the three prompt-enhancement entry points. */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ISessions } from '@deepseek-ai/dsh-client-runtime/client'
import type { IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {
  PromptEnhancementClearRequest, PromptEnhancementId, PromptEnhancementListRequest,
  PromptEnhancementRecord,
} from '@deepseek-ai/dsh-prompt-enhancement/client'

interface HistoryViewState {
  readonly open: boolean
  readonly sessionId?: SessionId
}

/** One shared modal state plus remote and draft operations. */
export class PromptEnhancementController {
  /** Shared open/closed state consumed by every history entry point. */
  readonly view = createSnapshotStore<HistoryViewState>({ open: false })

  /** @param ctx - browser root context containing Remote, sessions, and conversation services. */
  constructor(private readonly ctx: ClientContext) {}

  /** Open global history or prefilter it to one session.
   * @param sessionId - optional Session filter.
   */
  open(sessionId?: SessionId): void {
    this.view.set(sessionId === undefined ? { open: true } : { open: true, sessionId })
  }

  /** Close the shared history modal. */
  close(): void {
    this.view.set({ open: false })
  }

  /** Read durable records using Host-owned filters.
   * @param request - optional history filter.
   * @returns matching immutable records.
   */
  async list(request: PromptEnhancementListRequest = {}): Promise<readonly PromptEnhancementRecord[]> {
    const result = await this.ctx.remote.promptEnhancement.list(request)
    if (!result.ok) throw new Error(result.error.message)
    return result.value.records
  }

  /** Delete one durable record.
   * @param id - record identity.
   */
  async remove(id: PromptEnhancementId): Promise<void> {
    const result = await this.ctx.remote.promptEnhancement.delete({ id })
    if (!result.ok) throw new Error(result.error.message)
  }

  /** Delete every record matching the supplied filter.
   * @param request - filter to apply.
   * @returns number of deleted records.
   */
  async clear(request: PromptEnhancementClearRequest): Promise<number> {
    const result = await this.ctx.remote.promptEnhancement.clear(request)
    if (!result.ok) throw new Error(result.error.message)
    return result.value.deleted
  }

  /** Read the target session's current draft without staging it.
   * @param sessionId - target Session identity.
   * @returns current draft text, or empty text when the session is unavailable.
   */
  draft(sessionId: SessionId): string {
    const scope = this.sessions().scope(sessionId)
    return scope === undefined ? '' : this.conversation().input.for(scope).state.getSnapshot().draft
  }

  /** Restore a completed result to its owning session and navigate there.
   * @param record - completed history record.
   */
  restore(record: PromptEnhancementRecord): void {
    if (record.sessionId === undefined || record.enhancedPrompt === undefined) return
    const scope = this.sessions().scope(record.sessionId)
    if (scope === undefined) throw new Error(`prompt enhancement session is unavailable: ${record.sessionId}`)
    this.conversation().input.for(scope).setDraft(record.enhancedPrompt)
    this.sessions().open(record.sessionId)
    this.close()
  }

  private sessions(): ISessions {
    const sessions = this.ctx.get('sessions') as ISessions | undefined
    if (sessions === undefined) throw new Error('prompt enhancement sessions service is unavailable')
    return sessions
  }

  private conversation(): IConversation {
    const conversation = this.ctx.get('conversation') as IConversation | undefined
    if (conversation === undefined) throw new Error('prompt enhancement conversation service is unavailable')
    return conversation
  }
}
