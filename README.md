# DeepSeek Harness Prompt Enhancement

An installable DeepSeek Harness Web bundle that rewrites a draft into a precise coding-agent prompt without starting an Agent turn or changing the Session log.

## Requirements

- DeepSeek Harness `0.1.0-rc.7`
- Node.js `^22.19.0` or `>=24.0.0`
- A configured model provider in the target Web profile

## Install

Install the bundle into the official `web` profile:

```sh
dsh plugin --profile web add github:usertianziyang/deepseek-harness-prompt-enhancement
```

For a reproducible installation, pin a reviewed commit:

```sh
dsh plugin --profile web add github:usertianziyang/deepseek-harness-prompt-enhancement#<commit-sha>
```

The repository is private. Authenticate Git access before installing if needed:

```sh
gh auth setup-git
```

Verify that the bundle layer is active, then start the Web profile:

```sh
dsh --profile web --dump-config
dsh web
```

The default Web URL is `http://127.0.0.1:3080`.

## Update Or Reload

Install the new commit and restart the running Web process:

```sh
dsh plugin --profile web add github:usertianziyang/deepseek-harness-prompt-enhancement#<new-commit-sha>
dsh web
```

Client assets are discovered from the installed package at startup. A browser refresh is sufficient after the Harness process has restarted.

## Uninstall

```sh
dsh plugin --profile web remove dsh-prompt-enhancement
```

## Behavior

`prompt` mode sends only the trimmed draft to the selected model. `project` mode adds bounded recent Session context and read-only files resolved through the current filesystem provider. The service never sends the result, starts an Agent turn, executes commands, writes files, or appends enhancement records to the Session log.

Enhancement history is stored in the independent `prompt_enhancement` domain. It supports filtering, restore, single deletion, filtered clearing, and clearing all records. Cancellation and failures preserve the original draft and never publish partial model output.

The mode control follows the Web model selector interaction: a compact trigger opens a selected-state menu for Prompt only and Project mode.

## Package Layout

- `cordis.patch.yml`: profile layer that mounts the dual-face package; `dsh.client` enrolls its Web Client face.
- `lib/index.js`: prebuilt Host plugin.
- `lib/client.js`: prebuilt Web Client plugin with its Remote contribution bundled in.
- `lib/remote.js`: generated Remote descriptor for inspection and reuse.
- `packages/`: TypeScript source retained for review and development; it is not required at install time.

The committed `lib/` artifacts make GitHub installation build-script-free. No `prepare` permission or source-tree patch is required.
