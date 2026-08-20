# Prompt Enhancement

[English](README.md) | 中文

一个可安装的 DeepSeek Harness Web 组合包（bundle），可将草稿改写为精确的编码代理（coding-agent）提示词，而不会启动 Agent 轮次（turn）或更改 Session 日志。

## 环境要求

- DeepSeek Harness（兼容多个版本）
- Node.js `^22.19.0` 或 `>=24.0.0`
- 目标 Web 配置（profile）中已配置的模型提供方（provider）

## 安装

将组合包安装到官方 `web` 配置中：

```sh
dsh plugin --profile web add github:usertianziyang/prompt-enhancement
```

如需可复现的安装，可固定到某个已审核的提交（commit）：

```sh
dsh plugin --profile web add github:usertianziyang/prompt-enhancement#<commit-sha>
```

仓库已公开，可直接安装，无需额外的 Git 认证。

确认组合包层已激活，然后启动 Web 配置：

```sh
dsh --profile web --dump-config
dsh web
```

默认 Web 地址为 `http://127.0.0.1:3080`。

## 更新或重载

安装新的提交并重启正在运行的 Web 进程：

```sh
dsh plugin --profile web add github:usertianziyang/prompt-enhancement#<new-commit-sha>
dsh web
```

客户端资源会在启动时从已安装的包中自动发现。Harness 进程重启后，刷新浏览器即可。

## 卸载

```sh
dsh plugin --profile web remove dsh-prompt-enhancement
```

## 行为

`prompt` 模式仅向选定模型发送裁剪后的草稿。`project` 模式会额外加入有界的近期 Session 上下文，以及通过当前文件系统提供方解析出的只读文件。该服务不会发送结果、启动 Agent 轮次、执行命令、写入文件，也不会向 Session 日志追加增强记录。

增强历史存储在独立的 `prompt_enhancement` 域（domain）中，支持筛选、恢复、单条删除、按筛选清空以及清空全部记录。取消与失败都会保留原始草稿，且不会发布部分模型输出。

模式控件遵循 Web 模型选择器的交互方式：一个紧凑的触发按钮会打开一个带选中状态的菜单，用于在「仅提示词（Prompt）」与「项目（Project）模式」之间选择。

## 包结构

- `cordis.patch.yml`：挂载双面（dual-face）包的配置层；`dsh.client` 会登记其 Web Client 面（face）。
- `lib/index.js`：预构建的 Host 插件。
- `lib/client.js`：预构建的 Web Client 插件，其中打包了它的 Remote 贡献。
- `lib/remote.js`：生成的 Remote 描述符，供检查与复用。
- `packages/`：保留的 TypeScript 源码，供审查与开发使用；安装时并不需要它。

已提交的 `lib/` 产物使 GitHub 安装无需构建脚本，无需 `prepare` 权限或源码树补丁（patch）。
