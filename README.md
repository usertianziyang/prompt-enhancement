# Prompt Enhancement

English | [中文](README.zh.md)

An installable DeepSeek Harness Web bundle that rewrites a draft into a precise coding-agent prompt without starting an Agent turn or changing the Session log.

## Requirements

- DeepSeek Harness `0.1.0-rc.7`
- Node.js `^22.19.0` or `>=24.0.0`
- A configured model provider in the target Web profile

## Install

Install the published npm package into the official `web` profile:

```sh
dsh plugin --profile web add dsh-prompt-enhancement@latest
```

For a reproducible installation, pin a reviewed package version:

```sh
dsh plugin --profile web add dsh-prompt-enhancement@0.1.0
```

Verify that the bundle layer is active, then start the Web profile:

```sh
dsh --profile web --dump-config
dsh web
```

The default Web URL is `http://127.0.0.1:3080`.

## Update Or Reload

Install the latest package and restart the running Web process:

```sh
dsh plugin --profile web add dsh-prompt-enhancement@latest
dsh web
```

Client assets are discovered from the installed package at startup. A browser refresh is sufficient after the Harness process has restarted.

## Uninstall

```sh
dsh plugin --profile web remove dsh-prompt-enhancement
```

## Behavior

`prompt` mode sends only the trimmed draft to the selected model. `project` mode adds bounded recent Session context and read-only files resolved through the current filesystem provider. The service never sends the result, starts an Agent turn, executes commands, writes files, or appends enhancement records to the Session log.

After enhancement completes, the composer action changes to Restore so the current input can be returned to its pre-enhancement draft. Enhancement failures are shown in a modal. Cancellation and failures never clear or replace the draft or publish partial model output.

Enhancement history is stored in the independent `prompt_enhancement` domain and is display-only: it has no restore action. History supports combined Workspace, Session-title, mode, and status filters, plus single deletion, filtered clearing, and clearing all records. A Workspace filter includes every Session belonging to that Workspace.

The mode control follows the Web model selector interaction: a compact trigger opens a selected-state menu for Prompt only and Project mode.

## Package Layout

- `cordis.patch.yml`: profile layer that mounts the dual-face package; `dsh.client` enrolls its Web Client face.
- `src/`: reviewed TypeScript source tracked by Git.
- `lib/index.js`: generated Host plugin included in the npm tarball.
- `lib/client.js`: generated Web Client plugin with its Remote contribution bundled in.
- `lib/remote.js` and `lib/typert.js`: generated Remote and Typert descriptors included in the npm tarball.
- `lib/types/`: generated public declarations included in the npm tarball.

`lib/` is intentionally ignored by Git. CI and the Release workflow build it from source before packing, while `package.json#files` ensures the complete runtime output is present in the published npm package.

## Development

```sh
git clone https://github.com/usertianziyang/deepseek-harness-prompt-enhancement.git
cd deepseek-harness-prompt-enhancement
pnpm install
pnpm typecheck
pnpm test
pnpm check:package
```

`pnpm install` runs the `prepare` build. Run `pnpm build` again after source changes. `pnpm pack` creates the same installable tarball that CI uploads.

## Release

Use one command from a clean, synchronized `main` branch:

```sh
pnpm release patch
pnpm release minor
pnpm release major
```

The command generates the bilingual `CHANGELOG.md` entry, updates the package version, creates the release commit and annotated `vX.Y.Z` tag, and pushes both to `origin`. Commit subjects included in the changelog use Conventional Commits with Chinese first:

```text
feat: 支持恢复原始提示词 / Restore the original prompt
fix: 失败时保留草稿 / Preserve the draft on failure
```

Pushing the tag starts the Release workflow. It verifies the tag and package version, runs type checks, builds, tests, and package validation, then creates a GitHub Release only after those checks pass. The release contains a deterministic source archive generated with `git archive` and the packed npm tarball. npm publishing uses GitHub OIDC with provenance. If a workflow fails, rerun it for transient failures; never move or delete the tag.

Before the first automated release, configure npm Trusted Publishing for user `usertianziyang`, repository `deepseek-harness-prompt-enhancement`, and workflow `release.yml`.
