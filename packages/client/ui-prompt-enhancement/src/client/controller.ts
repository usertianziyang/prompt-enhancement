/** Shared browser controller for the prompt-enhancement history entry points. */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {
  PromptEnhancementClearRequest, PromptEnhancementId, PromptEnhancementListRequest,
  PromptEnhancementRecord,
} from '@deepseek-ai/dsh-prompt-enhancement/client'

interface HistoryViewState {
  readonly open: boolean
  readonly sessionId?: SessionId
}

/** One shared history modal state plus its remote operations. */
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

}
