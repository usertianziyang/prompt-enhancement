# Agent Note: Prompt enhancement outside the agent turn

Status: implemented

English | [中文](2026-08-19-prompt-enhancement.zh.md)

## Problem

The composer needs a user-controlled way to turn an unfinished draft into a precise coding-agent prompt without sending it, starting an agent turn, or mixing the transformation into the Session log. Users also need an independent durable history for inspecting previous requests and the project references they used.

## Decision

The package `dsh-prompt-enhancement` owns one unary Typert Remote service and the `prompt_enhancement` storage domain. `prompt` mode sends only the trimmed draft. `project` mode adds bounded recent Session messages and read-only files resolved through the Agent-scoped filesystem provider. It considers root `AGENTS.md`, root `README.md`, and path-like backtick references from the draft, confines targets to the Session cwd, and never executes commands or writes files.

The request uses the current Session header's provider, model, and reasoning effort, with the Agent options as the pre-header fallback. The model receives a fixed rewriting system prompt and a separately configured output-token limit. Success, failure, and cancellation each persist an immutable record; failed or cancelled requests reject after the record is written. Records retain original and completed prompt text, status, Session/Workspace references, timestamps, and bounded trace metadata, but not complete project files or hidden reasoning.

The browser face contributes the composer control, a Session-header shortcut, and a global sidebar history entry backed by one shared modal. The control uses `draftRev` plus the original draft as a compare-and-set before replacing the composer, then exposes Restore only in the composer. Failures open a modal. History is read-only apart from deletion and clearing; it combines Workspace membership, Session-title search, mode, and status filters and has no restore action.

## Alternatives considered

**Read all project files or execute repository search.** Rejected because prompt enhancement is a bounded read-only aid; broad discovery would expose unrelated data, make latency unpredictable, and require a second execution policy.

**Write the enhancement into the Session event log or automatically send it.** Rejected because the action is an editing aid, not a user message or agent turn; explicit composer submission remains the only send path.

**Let a completed request overwrite any current draft.** Rejected because a user edit can occur while the model is streaming; the `draftRev` compare-and-set preserves the newer edit and leaves the result in history.

**Keep history only in browser memory.** Rejected because users asked for history across refresh and Host restart; the independent storage domain provides that durability without changing Session format.

## Consequences

Enhancement calls are independent model requests and do not alter the active Agent request prefix or KV Cache state. The Host retains a configured maximum number of records and deletes the oldest excess rows after writes. Project relevance is intentionally explicit and bounded rather than repository-wide semantic search. The unary endpoint can show only an in-progress UI state; live trace updates remain deferred.

## Verification

Host tests cover prompt-only isolation, bounded project reads, cancellation during context preparation, filtered history, and clear semantics. Client tests cover successful replacement and restore, draft compare-and-set, modal failures, cancellation, read-only history, Workspace membership, and Session-title search. TypeScript and npm-package checks cover both faces of the single package.
