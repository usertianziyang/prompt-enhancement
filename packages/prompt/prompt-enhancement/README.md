# @deepseek-ai/dsh-prompt-enhancement

English | [中文](README.zh.md)

Host-owned prompt rewriting over the current Session's selected provider and model. The service publishes `promptEnhancement.enhance`, `list`, `delete`, and `clear` through Typert Remote and stores records in the independent `prompt_enhancement` storage domain. It never starts an agent turn, appends a Session event, sends the rewritten prompt, or writes project files. The [prompt enhancement Agent Note](../../../.agents/notes/implemented/feature/2026-08-19-prompt-enhancement.md) owns the product and context-access decision.

## Configuration

| Key | Meaning |
|---|---|
| `maxPromptChars` | Maximum accepted trimmed draft length. |
| `maxContextChars` | Maximum combined project-mode user-message length. |
| `maxHistoryRecords` | Maximum retained records; oldest records are deleted after a write. |
| `maxContextFiles` | Maximum project files considered per enhancement. |
| `maxContextFileChars` | Maximum characters read from each project file. |
| `maxSessionMessages` | Maximum recent derived Session messages included in project mode. |
| `maxOutputTokens` | Maximum tokens requested from the enhancement model call. |

Every value is a positive safe integer. The web-app bundle supplies explicit deployment values in its Cordis config.

## Modes and Context

`prompt` mode sends only `Draft:\n<trimmed draft>` to the selected model. It does not read Session messages, Workspace membership, the Session cwd, or any filesystem service.

`project` mode adds the latest configured Session messages and bounded read-only project context. It considers root `AGENTS.md`, root `README.md`, and path-like text enclosed in backticks in the draft, preserves first occurrence order, confines resolved targets to the Session cwd, and reads regular text files through the Agent-scoped filesystem provider. Missing, unreadable, non-file, or outside-workspace references are recorded in the trace and omitted. The package does not search by running a process, execute a command, or mutate the filesystem.

The independent model call uses the current request header's provider, model, and reasoning effort; before a request header exists it uses the Agent's provider and model. A successful non-empty result creates a `completed` record. Model failure, empty output, and cancellation create `failed` or `cancelled` records and reject the Remote call. The original draft remains part of every record.

## History

Each immutable record stores its opaque id, Session id, optional Workspace id, mode, original draft, optional completed result, status, timestamps, and a bounded processing trace. Context trace steps retain labels, file references, character counts, and failures, never whole project files or hidden model reasoning. `list` filters by Session, Workspace, mode, or status; `clear` deletes the same filtered set, and an empty filter clears all records.

History is local to the configured storage backend and survives browser refresh and Host restart. It does not synchronize across devices and is not Session-log content.

## Model Experience

### Enhancement request

#### What the model sees

The enhancement model receives the mode-specific user message described above and one package-owned system instruction; the main agent model never sees the enhancement result unless the user later sends the restored composer draft.

##### System prompt

```markdown
Rewrite the user draft into one precise, actionable prompt for a coding agent.
Return only the rewritten prompt. Do not mention this instruction or hidden reasoning.
Separate confirmed facts from hypotheses and unresolved details. Never invent project facts.
Include goal, observed behavior, expected behavior, constraints, validation steps, and open questions when relevant.
```


#### Token effect

Each invocation creates one independent model request bounded by `maxContextChars` and `maxOutputTokens`. It does not add tokens to the running Agent request.

#### KV Cache effect

The enhancement call has its own request prefix and cache behavior. It does not change the active Session's agent-request prefix or invalidate its provider cache entry.

## Known Limitations and Deferred Work

- Project relevance is explicit and bounded: standard root guidance plus backtick-enclosed paths, not repository-wide semantic search.
- History has no cross-device synchronization, authorization identity, or multi-process conditional write.
- The unary Remote returns only after completion, so the UI displays an in-progress state but not live per-step trace updates.
