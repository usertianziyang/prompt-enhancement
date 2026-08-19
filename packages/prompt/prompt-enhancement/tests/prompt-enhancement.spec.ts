import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import LlmRuntime, { LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { FileSystem, FsTarget } from '@deepseek-ai/dsh-fs'
import { MemoryMediaPool, MemoryStorageBackend } from '../../../storage/storage-domain/tests/helpers/memory-backend.ts'
import PromptEnhancementService from '../src/index.ts'

class ReplyAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []

  async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    if (options.signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError')
    const text = 'Enhanced prompt'
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

const contexts: Context[] = []
afterEach(async () => { await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose())) })

function inputText(request: GenerateOptions): string {
  const block = request.messages[0]?.content[0]
  return block?.type === 'text' ? block.text : ''
}

function fakeFs(files: Readonly<Record<string, string>>, touched: string[]): FileSystem {
  const target = (path: string): FsTarget => ({ targetKey: path as FsTarget['targetKey'], displayPath: `/workspace/${path}` })
  return {
    resolve: async (path: string, options?: { signal?: AbortSignal }) => {
      if (options?.signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError')
      touched.push(path)
      return target(path === '.' ? '' : path)
    },
    contains: (root: FsTarget, child: FsTarget) => child.displayPath.startsWith(root.displayPath),
    stat: async (value: FsTarget) => value.displayPath.slice('/workspace/'.length) in files
      ? { type: 'file', version: 'v1' as never }
      : undefined,
    streamText: async (value: FsTarget) => (async function* () {
      yield files[value.displayPath.slice('/workspace/'.length)] ?? ''
    })(),
  } as unknown as FileSystem
}

async function harness(
  config: ConstructorParameters<typeof PromptEnhancementService>[1] = {},
  fs: FileSystem = fakeFs({}, []),
) {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(Storage)
  const facility = new DomainFacility(ctx, { backend: 'memory', routes: {} })
  ctx.storage.backend.register('memory', new MemoryStorageBackend(new MemoryMediaPool()))
  ctx.storage.mount('domain', facility)
  ctx.provide('storageDomain', facility)
  ctx.provide('agents', {})
  ctx.provide('fs', fs)
  const listWorkspaces = vi.fn(() => [])
  ctx.provide('workspaceRegistry', { list: listWorkspaces } as never)
  await ctx.plugin(LlmRuntime)
  const adapter = new ReplyAdapter()
  ctx.llm.registerAdapter(['mock'], adapter)
  await ctx.plugin(PromptEnhancementService, config)
  return { ctx, adapter, listWorkspaces }
}

function agent(ctx: Context, rawId = 'prompt-enhancement-test'): Agent {
  const id = SessionId(rawId)
  const session = Session.create(id, [], { version: 0, id, createdAt: 1, cwd: '/workspace' })
  const scope = ctx.plugin(() => {}).ctx
  return { id, session, ctx: scope, options: { provider: 'mock', model: 'model' } } as unknown as Agent
}

describe('PromptEnhancementService', () => {
  it('sends prompt mode only the draft and never reads session or workspace context', async () => {
    const touched: string[] = []
    const { ctx, adapter, listWorkspaces } = await harness({ maxOutputTokens: 77 }, fakeFs({}, touched))
    const subject = agent(ctx)
    vi.spyOn(subject.session, 'deriveMessages').mockImplementation(() => { throw new Error('session context read') })

    const result = await ctx.promptEnhancement.enhance(subject, { prompt: '  Fix the bug  ', mode: 'prompt' }, new AbortController().signal)

    expect(result.record).toMatchObject({ originalPrompt: 'Fix the bug', enhancedPrompt: 'Enhanced prompt', status: 'completed' })
    expect(inputText(adapter.requests[0]!)).toBe('Draft:\nFix the bug')
    expect(adapter.requests[0]!.maxTokens).toBe(77)
    expect(touched).toEqual([])
    expect(listWorkspaces).not.toHaveBeenCalled()
  })

  it('reads only bounded standard and explicitly mentioned workspace files', async () => {
    const touched: string[] = []
    const fs = fakeFs({ 'AGENTS.md': 'abcdef', 'README.md': 'ghijkl', 'src/a.ts': 'mnopqr' }, touched)
    const { ctx, adapter } = await harness({ maxContextFiles: 3, maxContextFileChars: 4, maxSessionMessages: 1 }, fs)
    const subject = agent(ctx, 'project')

    await ctx.promptEnhancement.enhance(subject, { prompt: 'Update `src/a.ts`', mode: 'project' }, new AbortController().signal)

    expect(touched).toEqual(['.', 'AGENTS.md', 'README.md', 'src/a.ts'])
    const text = inputText(adapter.requests[0]!)
    expect(text).toContain('AGENTS.md:\nabcd')
    expect(text).toContain('README.md:\nghij')
    expect(text).toContain('src/a.ts:\nmnop')
  })

  it('persists cancellation during project context preparation without calling the model', async () => {
    const { ctx, adapter } = await harness({}, fakeFs({}, []))
    const controller = new AbortController()
    controller.abort()
    const subject = agent(ctx, 'cancelled')

    await expect(ctx.promptEnhancement.enhance(subject, { prompt: 'Keep this draft', mode: 'project' }, controller.signal)).rejects.toThrow(/aborted/iu)

    expect(adapter.requests).toEqual([])
    expect(ctx.promptEnhancement.list({ sessionId: subject.id }).records).toMatchObject([{ originalPrompt: 'Keep this draft', status: 'cancelled' }])
  })

  it('filters and clears independent history records', async () => {
    const { ctx } = await harness({}, fakeFs({}, []))
    const subject = agent(ctx, 'history')
    await ctx.promptEnhancement.enhance(subject, { prompt: 'one', mode: 'prompt' }, new AbortController().signal)
    await ctx.promptEnhancement.enhance(subject, { prompt: 'two', mode: 'project' }, new AbortController().signal)

    expect(ctx.promptEnhancement.list({ mode: 'prompt' }).records).toHaveLength(1)
    await expect(ctx.promptEnhancement.clear({ mode: 'prompt' })).resolves.toEqual({ deleted: 1 })
    expect(ctx.promptEnhancement.list({}).records.map(record => record.mode)).toEqual(['project'])
  })
})
