# @deepseek-ai/dsh-client-ui-prompt-enhancement

[English](README.md) | 中文

本包是 `@deepseek-ai/dsh-prompt-enhancement` 的浏览器 UI。它向 `conversation.input.right` 注入与模型选择器一致的模式菜单及图标操作，向 `conversation.session.header.actions` 注入当前 Session 历史快捷入口，并向 `sidebar.footer.action` 注入全局历史入口和共享 modal。

每个已挂载 composer 控件只允许一个增强任务，并可通过 `AbortController` 取消。控件会快照草稿文本与 `draftRev`；仅当两者在完成时仍匹配，才会替换 composer。增强成功后按钮切换为恢复，可还原增强前的当前草稿。并发编辑的草稿保持不变，完成结果仍留在持久历史中。失败通过 modal 显示，失败和取消都不会清空或替换草稿。

共享历史 modal 可按会话标题搜索，并与 Workspace、模式和状态组合筛选记录；Workspace 会覆盖其中的全部 Session。详情仅展示原始文本、完成结果、单词级差异与处理轨迹，不提供恢复入口。用户可以删除单条记录、清空筛选集合或清空全部记录。

## 模型体验

### 浏览器控件

#### 模型看到的内容

无直接内容。UI 独立调用 Host 包 `@deepseek-ai/dsh-prompt-enhancement`；只有用户随后通过普通 composer 发送的结果才会进入主 Agent 模型。

#### Token 影响

除 Host 包记录的增强请求外，UI 不增加模型 token。

#### KV Cache 影响

打开、筛选或删除历史不会发起模型请求，也不会影响提供方缓存。

## 已知局限与延后工作

- Host endpoint 是一元调用，因此处理中轨迹步骤不会实时流式更新。
- 历史时间戳使用浏览器的语言环境与时区。
