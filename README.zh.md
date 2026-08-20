# Prompt Enhancement

[English](README.md) | 中文

一个可安装的 DeepSeek Harness Web 组合包（bundle），可将草稿改写为精确的编码代理（coding-agent）提示词，而不会启动 Agent 轮次（turn）或更改 Session 日志。

## 环境要求

- DeepSeek Harness `0.1.0-rc.7`
- Node.js `^22.19.0` 或 `>=24.0.0`
- 目标 Web 配置（profile）中已配置的模型提供方（provider）

## 安装

将已发布的 npm 包安装到官方 `web` 配置中：

```sh
dsh plugin --profile web add dsh-prompt-enhancement@latest
```

如需可复现的安装，可固定到已审核的包版本：

```sh
dsh plugin --profile web add dsh-prompt-enhancement@0.1.0
```

确认组合包层已激活，然后启动 Web 配置：

```sh
dsh --profile web --dump-config
dsh web
```

默认 Web 地址为 `http://127.0.0.1:3080`。

## 更新或重载

安装最新包并重启正在运行的 Web 进程：

```sh
dsh plugin --profile web add dsh-prompt-enhancement@latest
dsh web
```

客户端资源会在启动时从已安装的包中自动发现。Harness 进程重启后，刷新浏览器即可。

## 卸载

```sh
dsh plugin --profile web remove dsh-prompt-enhancement
```

## 行为

`prompt` 模式仅向选定模型发送裁剪后的草稿。`project` 模式会额外加入有界的近期 Session 上下文，以及通过当前文件系统提供方解析出的只读文件。该服务不会发送结果、启动 Agent 轮次、执行命令、写入文件，也不会向 Session 日志追加增强记录。

增强完成后，composer 中的增强按钮会切换为恢复按钮，可将当前输入恢复为增强前的草稿。增强失败通过弹窗显示；取消与失败都不会清空或替换草稿，也不会发布部分模型输出。

增强历史存储在独立的 `prompt_enhancement` 域（domain）中，仅展示记录，不提供恢复入口。历史支持按工作区、会话标题、模式与状态组合筛选，以及单条删除、按筛选清空和清空全部；工作区筛选会覆盖该工作区内的全部会话。

模式控件遵循 Web 模型选择器的交互方式：一个紧凑的触发按钮会打开一个带选中状态的菜单，用于在「仅提示词（Prompt）」与「项目（Project）模式」之间选择。

## 包结构

- `cordis.patch.yml`：挂载双面（dual-face）包的配置层；`dsh.client` 会登记其 Web Client 面（face）。
- `src/`：由 Git 跟踪、供审查与开发的 TypeScript 源码。
- `lib/index.js`：构建生成并包含在 npm 包中的 Host 插件。
- `lib/client.js`：构建生成并包含在 npm 包中的 Web Client 插件，其中打包了 Remote 贡献。
- `lib/remote.js` 与 `lib/typert.js`：构建生成并包含在 npm 包中的 Remote 与 Typert 描述符。
- `lib/types/`：构建生成并包含在 npm 包中的公开类型声明。

`lib/` 会被 Git 忽略。CI 与 Release Workflow 会先从源码构建再打包，`package.json#files` 则保证发布到 npm 的安装包仍包含完整运行产物。

## 开发

```sh
git clone https://github.com/usertianziyang/deepseek-harness-prompt-enhancement.git
cd deepseek-harness-prompt-enhancement
pnpm install
pnpm typecheck
pnpm test
pnpm check:package
```

`pnpm install` 会通过 `prepare` 自动构建。修改源码后可再次运行 `pnpm build`；`pnpm pack` 会生成与 CI 上传内容相同的可安装压缩包。

## 发布

CI Workflow 会执行类型检查、构建、测试、npm 文件清单验证，并上传打包后的 `.tgz` Artifact。发布标签为 `vX.Y.Z` 的 GitHub Release 后，Release Workflow 会校验标签与 `package.json#version` 一致，再通过 GitHub OIDC 携带 provenance 发布到 npm。

第一次自动发布前，需要在 npm Trusted Publishing 中绑定用户 `usertianziyang`、仓库 `deepseek-harness-prompt-enhancement` 与工作流 `release.yml`。手动运行 Release Workflow 只会验证并执行 npm dry run，不会真正发布。
