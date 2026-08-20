/** Pure wire and persistence types for prompt enhancement. */
import type { Branded } from '@deepseek-ai/dsh-brand'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace'

export type { WorkspaceId } from '@deepseek-ai/dsh-workspace'

/** Opaque prompt-enhancement history identity. */
export type PromptEnhancementId = Branded<'PromptEnhancementId'>
/** Context selection mode. */
export type PromptEnhancementMode = 'prompt' | 'project'
/** Durable request outcome. */
export type PromptEnhancementStatus = 'completed' | 'failed' | 'cancelled'

/** One bounded project/model processing step. */
export interface PromptEnhancementTraceStep {
  readonly kind: 'context' | 'model'
  readonly label: string
  readonly reference?: string
  readonly summary?: string
  readonly status: 'completed' | 'failed' | 'cancelled'
}

/** Immutable durable enhancement record. */
export interface PromptEnhancementRecord {
  readonly id: PromptEnhancementId
  readonly sessionId?: SessionId
  readonly workspaceId?: WorkspaceId
  readonly mode: PromptEnhancementMode
  readonly originalPrompt: string
  readonly enhancedPrompt?: string
  readonly status: PromptEnhancementStatus
  readonly trace: readonly PromptEnhancementTraceStep[]
  readonly createdAt: number
  readonly updatedAt: number
}

/** Enhancement request submitted by the browser. */
export interface PromptEnhancementRequest {
  readonly prompt: string
  readonly mode: PromptEnhancementMode
}

/** Successful enhancement response. */
export interface PromptEnhancementEnhanceResult {
  readonly record: PromptEnhancementRecord
}

/** History filters. */
export interface PromptEnhancementListRequest {
  readonly sessionId?: SessionId
  readonly workspaceId?: WorkspaceId
  readonly mode?: PromptEnhancementMode
  readonly status?: PromptEnhancementStatus
}

/** History list response. */
export interface PromptEnhancementListResult {
  readonly records: readonly PromptEnhancementRecord[]
}

/** One-record deletion request. */
export interface PromptEnhancementDeleteRequest {
  readonly id: PromptEnhancementId
}

/** One-record deletion response. */
export interface PromptEnhancementDeleteResult {
  readonly deleted: boolean
}

/** Filtered history deletion request. */
export interface PromptEnhancementClearRequest extends PromptEnhancementListRequest {}

/** Filtered history deletion response. */
export interface PromptEnhancementClearResult {
  readonly deleted: number
}
