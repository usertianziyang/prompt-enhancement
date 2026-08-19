# @deepseek-ai/dsh-client-ui-prompt-enhancement

English | [中文](README.zh.md)

Browser UI for `@deepseek-ai/dsh-prompt-enhancement`. It contributes a model-selector-style mode menu and icon actions to `conversation.input.right`, a current-Session history shortcut to `conversation.session.header.actions`, and a global history trigger plus the shared modal to `sidebar.footer.action`.

Enhancement is single-flight per mounted composer control and cancellable with `AbortController`. The control snapshots the draft text and `draftRev`; completion replaces the composer only when both still match. A concurrently edited draft remains untouched and the completed result stays in durable history. Failure and cancellation never clear or replace the draft.

The shared history modal filters records by Session, Workspace, mode, and status. Its details show the original text, completed result, word diff, and processing trace. Users can restore a completed result, delete one record, clear the filtered set, or clear all records. Restoring to a non-empty target draft requires explicit confirmation and opens the owning Session after replacement.

## Model Experience

### Browser controls

#### What the model sees

Nothing directly. The UI invokes the Host package `@deepseek-ai/dsh-prompt-enhancement` independently; only a result that the user later sends through the ordinary composer reaches the main Agent model.

#### Token effect

The UI adds no model tokens beyond the Host enhancement request documented by the Host package.

#### KV Cache effect

Opening, filtering, restoring, or deleting history does not issue a model request and has no provider-cache effect.

## Known Limitations and Deferred Work

- In-progress trace steps are not streamed because the Host endpoint is unary.
- History timestamps use the browser's locale and time zone.
