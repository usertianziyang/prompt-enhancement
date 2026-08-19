# DeepSeek Harness Prompt Enhancement

Host and Web Client plugins that turn a draft into a precise coding-agent prompt without starting an Agent turn or changing the Session log.

## Contents

- `packages/prompt/prompt-enhancement`: Host service, independent history storage, bounded project context, and Typert Remote methods.
- `packages/client/ui-prompt-enhancement`: Composer mode menu, enhancement action, cancellation, draft compare-and-set, and history UI.
- `integration/deepseek-harness.patch`: Harness source changes that register the Host Remote, Web bundle rows, Client package, and project references.

## Compatibility

This repository targets the matching DeepSeek Harness source revision and its workspace dependency graph. It is a source plugin repository, not a standalone application or a drop-in npm package for an arbitrary Harness release.

## Install Into A Harness Checkout

From a clean DeepSeek Harness checkout with the compatible source tree:

```sh
git apply /path/to/deepseek-harness-prompt-enhancement/integration/deepseek-harness.patch
cp -R /path/to/deepseek-harness-prompt-enhancement/packages/prompt/prompt-enhancement packages/prompt/prompt-enhancement
cp -R /path/to/deepseek-harness-prompt-enhancement/packages/client/ui-prompt-enhancement packages/client/ui-prompt-enhancement
pnpm install
pnpm run build
pnpm dsh web
```

The Web bundle registers the Host and Client packages automatically. The default Web URL is `http://127.0.0.1:3080`.

For UI-only changes during development, run `pnpm run dev:web` in the same Harness checkout and refresh the existing Web URL after the watcher rebuilds the Client bundle.

## Behavior

`prompt` mode sends only the trimmed draft to the selected model. `project` mode adds bounded recent Session context and read-only files resolved through the current filesystem provider. The service never sends the result, starts an Agent turn, executes commands, writes files, or appends enhancement records to the Session log.

Enhancement history is stored in the independent `prompt_enhancement` domain. It supports filtering, restore, single deletion, filtered clearing, and clearing all records.

## Verification

Run these checks in the compatible Harness checkout:

```sh
pnpm exec vitest run packages/prompt/prompt-enhancement/tests/prompt-enhancement.spec.ts
pnpm exec vitest run packages/client/ui-prompt-enhancement/tests/control.client.spec.tsx
pnpm run build
```
