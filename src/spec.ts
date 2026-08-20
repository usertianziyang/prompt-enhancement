/** Storage Domain specification for independent prompt enhancement history. */
import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { PromptEnhancementId, PromptEnhancementRecord, PromptEnhancementMode, PromptEnhancementStatus, PromptEnhancementTraceStep } from './types.js'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace'

const id = z.string().min(1).transform(value => value as PromptEnhancementId)
const sessionId = z.string().min(1).transform(value => value as SessionId)
const workspaceId = z.string().min(1).transform(value => value as WorkspaceId)
const mode = z.union([z.literal('prompt'), z.literal('project')]) satisfies z.ZodType<PromptEnhancementMode>
const status = z.union([z.literal('completed'), z.literal('failed'), z.literal('cancelled')]) satisfies z.ZodType<PromptEnhancementStatus>
const traceStep = z.object({
  kind: z.union([z.literal('context'), z.literal('model')]),
  label: z.string().min(1),
  reference: z.string().min(1).optional(),
  summary: z.string().optional(),
  status: z.union([z.literal('completed'), z.literal('failed'), z.literal('cancelled')]),
}) as unknown as z.ZodType<PromptEnhancementTraceStep>

/** Durable record validation schema. */
export const promptEnhancementRecordSchema = z.object({
  id,
  sessionId: sessionId.optional(),
  workspaceId: workspaceId.optional(),
  mode,
  originalPrompt: z.string(),
  enhancedPrompt: z.string().optional(),
  status,
  trace: z.array(traceStep),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
}).refine(value => value.updatedAt >= value.createdAt) as unknown as z.ZodType<PromptEnhancementRecord>

/** Independent storage domain for prompt-enhancement history. */
export const promptEnhancementDomainSpec = defineDomain({
  name: 'prompt_enhancement',
  version: 0,
  tables: {
    records: domainTable<PromptEnhancementId, PromptEnhancementRecord>(promptEnhancementRecordSchema),
  },
})
