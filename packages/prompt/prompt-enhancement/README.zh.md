# @deepseek-ai/dsh-prompt-enhancement

[English](README.md) | 中文

本包通过当前 Session 选定的提供方和模型，提供由 Host 拥有的提示词改写。服务通过 Typert Remote 发布 `promptEnhancement.enhance`、`list`、`delete` 与 `clear`，并把记录存入独立的 `prompt_enhancement` 存储域。它不会启动 agent 轮次、追加 Session 事件、发送改写后的提示词或写入项目文件。[提示词增强 Agent Note](../../../.agents/notes/implemented/feature/2026-08-19-prompt-enhancement.md)拥有产品与上下文访问决策。

## 配置

| 键 | 含义 |
|---|---|
| `maxPromptChars` | 接受的已 trim 草稿最大长度。 |
| `maxContextChars` | 项目模式组合用户消息的最大长度。 |
| `maxHistoryRecords` | 保留记录上限；写入后删除最旧的超额记录。 |
| `maxContextFiles` | 每次增强最多考虑的项目文件数。 |
| `maxContextFileChars` | 每个项目文件最多读取的字符数。 |
| `maxSessionMessages` | 项目模式最多包含的最近派生 Session 消息数。 |
| `maxOutputTokens` | 增强模型调用请求的最大 token 数。 |

每个值都必须是正 safe integer。Web 应用组合包在 Cordis 配置中提供明确的部署值。

## 模式与上下文

`prompt` 模式只向选定模型发送 `Draft:\n<trim 后的草稿>`。它不读取 Session 消息、Workspace 归属关系、Session cwd 或任何文件系统服务。

`project` 模式会加入配置数量内的最近 Session 消息和有界只读项目上下文。它按首次出现顺序考虑根目录 `AGENTS.md`、根目录 `README.md`，以及草稿中反引号包裹的路径形文本；解析后的目标被限制在 Session cwd 内，并通过 Agent 作用域文件系统提供方读取普通文本文件。缺失、不可读、非文件或 Workspace 外的引用会记入轨迹并被忽略。本包不会通过进程执行搜索、运行命令或变更文件系统。

独立模型调用使用当前请求 header 中的提供方、模型与推理强度；请求 header 尚不存在时，使用 Agent 的提供方与模型。成功且非空的结果创建 `completed` 记录。模型失败、空输出与取消会创建 `failed` 或 `cancelled` 记录，并使 Remote 调用 reject。每条记录都保留原始草稿。

## 历史

每条不可变记录存储 opaque id、Session id、可选 Workspace id、模式、原始草稿、可选完成结果、状态、时间戳与有界处理轨迹。上下文轨迹步骤保留标签、文件引用、字符数与失败信息，不保存完整项目文件或模型隐藏推理。`list` 可按 Session、Workspace、模式或状态筛选；`clear` 删除同一筛选集合，空筛选表示清空全部记录。

历史位于已配置的本地存储后端，可跨浏览器刷新和 Host 重启保留。它不会跨设备同步，也不是 Session 日志内容。

## 模型体验

### 增强请求

#### 模型看到的内容

增强模型接收上文所述的模式特定用户消息，以及一份由本包拥有的系统指令；除非用户随后发送恢复到 composer 的草稿，否则主 agent 模型不会看到增强结果。

##### 系统提示词

```markdown
Rewrite the user draft into one precise, actionable prompt for a coding agent.
Return only the rewritten prompt. Do not mention this instruction or hidden reasoning.
Separate confirmed facts from hypotheses and unresolved details. Never invent project facts.
Include goal, observed behavior, expected behavior, constraints, validation steps, and open questions when relevant.
```


#### Token 影响

每次调用创建一个独立模型请求，受 `maxContextChars` 与 `maxOutputTokens` 限制。它不会向运行中的 Agent 请求增加 token。

#### KV Cache 影响

增强调用拥有独立的请求前缀与缓存行为。它不会改变活跃 Session 的 agent 请求前缀，也不会使其提供方缓存条目失效。

## 已知局限与延后工作

- 项目相关性采用显式且有界的规则：标准根目录指导文件加反引号路径，而非全仓库语义搜索。
- 历史不提供跨设备同步、授权身份或多进程条件写。
- 一元 Remote 只在完成后返回，因此 UI 能显示处理中状态，但不能实时更新逐步轨迹。
