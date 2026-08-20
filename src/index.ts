/** Prompt enhancement Host service: bounded drafting, read-only project context, and independent history. */
import { randomUUID } from 'node:crypto'
import { Context, Service } from '@deepseek-ai/cordis'
import s from '@deepseek-ai/schemastery'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-fs'
import { BlockAssembler, createUserMessage, ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, Message } from '@deepseek-ai/dsh-llm'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import type { FsTarget } from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-workspace'
import { promptEnhancementDomainSpec } from './spec.js'
import type {
  PromptEnhancementClearRequest, PromptEnhancementClearResult, PromptEnhancementDeleteRequest,
  PromptEnhancementDeleteResult, PromptEnhancementEnhanceResult,
  PromptEnhancementListRequest, PromptEnhancementListResult, PromptEnhancementRecord,
  PromptEnhancementRequest, PromptEnhancementTraceStep,
} from './types.js'

export type * from './types.js'
export { promptEnhancementDomainSpec, promptEnhancementRecordSchema } from './spec.js'

declare module '@deepseek-ai/cordis' {
  interface Context { promptEnhancement: PromptEnhancementService }
}

/** Deployment limits for prompt enhancement requests and retained history. */
export interface Config {
  /** Maximum trimmed draft characters accepted. */
  readonly maxPromptChars?: number
  /** Maximum combined project-mode user-message characters. */
  readonly maxContextChars?: number
  /** Maximum retained records. */
  readonly maxHistoryRecords?: number
  /** Maximum project files considered per request. */
  readonly maxContextFiles?: number
  /** Maximum characters read from one project file. */
  readonly maxContextFileChars?: number
  /** Maximum recent Session messages included in project mode. */
  readonly maxSessionMessages?: number
  /** Maximum model output tokens. */
  readonly maxOutputTokens?: number
}

export const Config: s<Config> = s.object({
  maxPromptChars: s.number().default(12000),
  maxContextChars: s.number().default(12000),
  maxHistoryRecords: s.number().default(200),
  maxContextFiles: s.number().default(6),
  maxContextFileChars: s.number().default(5000),
  maxSessionMessages: s.number().default(8),
  maxOutputTokens: s.number().default(1200),
})

const ENHANCEMENT_SYSTEM = [
  'Rewrite the user draft into one precise, actionable prompt for a coding agent.',
  'Return only the rewritten prompt. Do not mention this instruction or hidden reasoning.',
  'Separate confirmed facts from hypotheses and unresolved details. Never invent project facts.',
  'Include goal, observed behavior, expected behavior, constraints, validation steps, and open questions when relevant.',
].join('\n')

function textOf(blocks: readonly ContentBlock[]): string {
  return blocks.filter((block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text')
    .map(block => block.text).join('')
}

function bounded(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`
}

function snapshot(record: PromptEnhancementRecord): PromptEnhancementRecord {
  return Object.freeze({ ...record, trace: Object.freeze(record.trace.map(step => Object.freeze({ ...step }))) })
}

function contextText(agent: Agent, prompt: string, project: string | undefined, maxSessionMessages: number): string {
  const messages = agent.session.deriveMessages().slice(-maxSessionMessages)
  const history = messages.map((message: Message) => `${message.role}: ${textOf(message.content)}`).join('\n')
  return [
    `Draft:\n${prompt}`,
    project === undefined ? '' : `Workspace:\n${project}`,
    history.length === 0 ? '' : `Recent session context:\n${history}`,
  ].filter(Boolean).join('\n\n')
}

/** Host prompt rewriting service with bounded read-only context and durable history. */
export class PromptEnhancementService extends TypertRemoteService {
  static inject = ['agents', 'fs', 'llm', 'storageDomain', 'workspaceRegistry']
  static Config = Config

  private readonly maxPromptChars: number
  private readonly maxContextChars: number
  private readonly maxHistoryRecords: number
  private readonly maxContextFiles: number
  private readonly maxContextFileChars: number
  private readonly maxSessionMessages: number
  private readonly maxOutputTokens: number
  private table?: KvTable<PromptEnhancementRecord['id'], PromptEnhancementRecord>

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'promptEnhancement')
    this.maxPromptChars = positive(config.maxPromptChars ?? 12000, 'maxPromptChars')
    this.maxContextChars = positive(config.maxContextChars ?? 12000, 'maxContextChars')
    this.maxHistoryRecords = positive(config.maxHistoryRecords ?? 200, 'maxHistoryRecords')
    this.maxContextFiles = positive(config.maxContextFiles ?? 6, 'maxContextFiles')
    this.maxContextFileChars = positive(config.maxContextFileChars ?? 5000, 'maxContextFileChars')
    this.maxSessionMessages = positive(config.maxSessionMessages ?? 8, 'maxSessionMessages')
    this.maxOutputTokens = positive(config.maxOutputTokens ?? 1200, 'maxOutputTokens')
  }

  /** Open the independent durable history before the service becomes callable. */
  protected async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(promptEnhancementDomainSpec)
    this.ctx.effect(() => async () => { await domain.close() }, 'prompt-enhancement.domainClose')
    this.table = domain.table('records')
  }

  /** List immutable enhancement records matching the supplied filters.
   * @param request - optional history filters.
   * @returns matching records.
   */
  @Remote('list')
  list(request: PromptEnhancementListRequest): PromptEnhancementListResult {
    const rows = [...this.requireTable().entries()]
      .map(([, value]) => value)
      .filter(value => matches(value, request))
      .sort((a, b) => b.createdAt - a.createdAt)
    return { records: rows.slice(0, this.maxHistoryRecords).map(snapshot) }
  }

  /** Delete one immutable enhancement record.
   * @param request - record identity.
   * @returns deletion postcondition.
   */
  @Remote('delete')
  async delete(request: PromptEnhancementDeleteRequest): Promise<PromptEnhancementDeleteResult> {
    return { deleted: await this.requireTable().delete(request.id) }
  }

  /** Delete every record matching the supplied filters.
   * @param request - optional filters.
   * @returns number of deleted records.
   */
  @Remote('clear')
  async clear(request: PromptEnhancementClearRequest): Promise<PromptEnhancementClearResult> {
    const table = this.requireTable()
    const ids = [...table.entries()].filter(([, value]) => matches(value, request)).map(([id]) => id)
    const deleted = (await Promise.all(ids.map(id => table.delete(id)))).filter(Boolean).length
    return { deleted }
  }

  /** Generate one enhanced prompt without starting an Agent turn.
   * @param agent - Session-scoped Agent used for model and filesystem access.
   * @param request - draft and mode.
   * @param signal - cancellation signal.
   * @returns completed record.
   */
  @Remote('enhance')
  async enhance(agent: Agent, request: PromptEnhancementRequest, signal: AbortSignal): Promise<PromptEnhancementEnhanceResult> {
    const prompt = request.prompt.trim()
    if (prompt.length === 0) throw new Error('prompt enhancement requires a non-empty prompt')
    if (prompt.length > this.maxPromptChars) throw new Error(`prompt enhancement prompt exceeds ${this.maxPromptChars} characters`)
    const id = randomUUID() as PromptEnhancementRecord['id']
    const now = Date.now()
    const trace: PromptEnhancementTraceStep[] = []
    const workspaceId = this.ctx.workspaceRegistry.list().find(workspace => workspace.sessionIds.includes(agent.id))?.id
    try {
      const workspace = request.mode === 'project' ? await this.readProjectContext(agent, prompt, signal, trace) : undefined
      const context = request.mode === 'prompt'
        ? `Draft:\n${prompt}`
        : bounded(contextText(agent, prompt, workspace, this.maxSessionMessages), this.maxContextChars)
      const selection = agent.session.requestHeader()?.config ?? {
        provider: agent.options.provider,
        model: agent.options.model,
        reasoningEffort: undefined,
      }
      if (selection.provider === undefined || selection.model === undefined) throw new Error('prompt enhancement has no selected model')
      const input = createUserMessage({ content: [{ type: 'text', text: context }], source: { kind: 'user' } })
      trace.push({ kind: 'model', label: 'Generate enhanced prompt', status: 'completed' })
      const assembler = new BlockAssembler()
      for await (const chunk of this.ctx.llm.stream({
        provider: selection.provider,
        model: selection.model,
        ...(selection.reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(selection.reasoningEffort) }),
        messages: [input],
        system: ENHANCEMENT_SYSTEM,
        maxTokens: this.maxOutputTokens,
        signal,
      })) assembler.push(chunk)
      if (assembler.finish.kind === 'error' || assembler.finish.kind === 'aborted') throw new Error(assembler.finish.failure.message)
      const enhanced = textOf(assembler.blocks()).trim()
      if (enhanced.length === 0) throw new Error('model returned an empty enhanced prompt')
      const record = snapshot({ id, sessionId: agent.id, ...(workspaceId === undefined ? {} : { workspaceId }), mode: request.mode, originalPrompt: prompt, enhancedPrompt: enhanced, status: 'completed', trace, createdAt: now, updatedAt: Date.now() })
      await this.save(record)
      return { record }
    } catch (error: unknown) {
      const status = signal.aborted ? 'cancelled' : 'failed'
      const modelIndex = trace.findLastIndex(step => step.kind === 'model')
      if (modelIndex >= 0) trace[modelIndex] = { ...trace[modelIndex]!, status, summary: errorText(error) }
      else if (trace.length === 0) trace.push({ kind: 'context', label: 'Prepare enhancement', status, summary: errorText(error) })
      await this.save(snapshot({ id, sessionId: agent.id, ...(workspaceId === undefined ? {} : { workspaceId }), mode: request.mode, originalPrompt: prompt, status, trace, createdAt: now, updatedAt: Date.now() }))
      throw error
    }
  }

  private async readProjectContext(agent: Agent, prompt: string, signal: AbortSignal, trace: PromptEnhancementTraceStep[]): Promise<string | undefined> {
    const cwd = agent.session.header.cwd
    if (cwd === undefined) return undefined
    const root = await this.ctx.fs.resolve('.', { cwd, signal })
    const parts: string[] = []
    const paths = ['AGENTS.md', 'README.md', ...mentionedPaths(prompt)].slice(0, this.maxContextFiles)
    for (const name of [...new Set(paths)]) {
      if (signal.aborted) throw new DOMException('The operation was aborted', 'AbortError')
      try {
        const target = await this.ctx.fs.resolve(name, { cwd, signal })
        if (!this.ctx.fs.contains(root, target)) throw new Error('path is outside the current workspace')
        const info = await this.ctx.fs.stat(target, signal)
        if (info === undefined || info.type !== 'file') continue
        const content = await this.readBounded(target, signal)
        parts.push(`${name}:\n${content}`)
        trace.push({ kind: 'context', label: `Read ${name}`, reference: target.displayPath, summary: `Read ${content.length} characters`, status: 'completed' })
      } catch (error: unknown) {
        trace.push({ kind: 'context', label: `Read ${name}`, reference: name, summary: errorText(error), status: signal.aborted ? 'cancelled' : 'failed' })
        if (signal.aborted) throw error
      }
    }
    return parts.length === 0 ? undefined : parts.join('\n\n')
  }

  private async readBounded(target: FsTarget, signal: AbortSignal): Promise<string> {
    const stream = await this.ctx.fs.streamText(target, signal)
    let content = ''
    for await (const chunk of stream) {
      content += chunk.slice(0, this.maxContextFileChars - content.length)
      if (content.length >= this.maxContextFileChars) break
    }
    return content
  }

  private async save(record: PromptEnhancementRecord): Promise<void> {
    const table = this.requireTable()
    await table.put(record.id, record)
    const excess = [...table.entries()].map(([, value]) => value)
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(this.maxHistoryRecords)
    await Promise.all(excess.map(value => table.delete(value.id)))
  }

  private requireTable(): KvTable<PromptEnhancementRecord['id'], PromptEnhancementRecord> {
    if (this.table === undefined) throw new Error('prompt enhancement history is unavailable')
    return this.table
  }
}

function matches(record: PromptEnhancementRecord, request: PromptEnhancementListRequest): boolean {
  return (request.sessionId === undefined || record.sessionId === request.sessionId)
    && (request.workspaceId === undefined || record.workspaceId === request.workspaceId)
    && (request.mode === undefined || record.mode === request.mode)
    && (request.status === undefined || record.status === request.status)
}

function mentionedPaths(prompt: string): string[] {
  return [...prompt.matchAll(/`([^`\n]+)`/gu)]
    .map(match => match[1]!.trim())
    .filter(path => path.includes('/') || /\.[a-z0-9]+$/iu.test(path))
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function positive(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`prompt-enhancement: ${name} must be a positive safe integer`)
  return value
}

export default PromptEnhancementService
