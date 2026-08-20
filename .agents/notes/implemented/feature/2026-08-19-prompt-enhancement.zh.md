# Agent Note: 在 agent 轮次之外增强提示词

Status: implemented

[English](2026-08-19-prompt-enhancement.md) | 中文

## 问题

composer 需要一种由用户控制的方式，把未完成草稿变成更精确的编程智能体提示词，同时不发送草稿、不启动 agent 轮次，也不把转换混入 Session 日志。用户还需要独立且持久的历史，用于查看以往请求及其使用的项目引用。

## 决策

单包 `dsh-prompt-enhancement` 拥有一个一元 Typert Remote 服务和 `prompt_enhancement` 存储域。`prompt` 模式只发送 trim 后的草稿。`project` 模式通过 Agent 作用域文件系统提供方加入有界的最近 Session 消息和只读文件；它考虑根目录 `AGENTS.md`、根目录 `README.md` 与草稿中的反引号路径形引用，把目标限制在 Session cwd 内，并且不运行命令或写入文件。

请求使用当前 Session header 中的提供方、模型与推理强度；header 尚不存在时回退到 Agent options。模型接收固定的改写系统提示词和独立配置的输出 token 上限。成功、失败和取消都会持久化不可变记录；失败或取消会在记录写入后 reject。记录保留原始与完成后的提示词、状态、Session/Workspace 引用、时间戳和有界轨迹元数据，但不保存完整项目文件或隐藏推理。

浏览器端贡献 composer 控件、Session header 快捷入口和全局 sidebar 历史入口，三者共享一个 modal。控件在替换 composer 前同时使用 `draftRev` 与原始草稿执行 compare-and-set，恢复操作只出现在 composer；增强失败通过弹窗显示。历史除删除与清空外只读，支持组合使用工作区成员关系、会话标题搜索、模式与状态筛选，不提供恢复操作。

## 曾考虑的替代方案

**读取所有项目文件或执行仓库搜索。** 不采用：提示词增强是有界的只读辅助；广泛发现会暴露无关数据，使延迟不可预测，并需要第二套执行策略。

**把增强结果写入 Session 事件日志或自动发送。** 不采用：该操作是编辑辅助，而不是用户消息或 agent 轮次；显式 composer 提交仍是唯一发送路径。

**让完成请求覆盖任何当前草稿。** 不采用：模型流式生成期间用户可能编辑草稿；`draftRev` compare-and-set 保留更新后的编辑，并把结果留在历史中。

**只在浏览器内存中保留历史。** 不采用：用户要求刷新页面和 Host 重启后仍有历史；独立存储域提供该持久性，而无需改变 Session 格式。

## 后果

增强请求是独立的模型请求，不改变活跃 Agent 请求前缀或 KV Cache 状态。Host 按配置保留最大记录数，写入后删除最旧的超额行。项目相关性刻意采用显式且有界的规则，而非全仓库语义搜索。一元 endpoint 只能展示处理中状态，实时轨迹更新延后。

## 验证

Host 测试覆盖仅提示词隔离、有界项目读取、上下文准备阶段取消、历史筛选与清空语义。客户端测试覆盖成功替换与恢复、草稿 compare-and-set、失败弹窗、取消、只读历史、工作区成员关系和会话标题搜索。TypeScript 与 npm 包检查覆盖该单包的 Host 与浏览器两端。
