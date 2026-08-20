/** Prompt enhancement browser copy. */
export const zh = {
  mode: '增强模式',
  modeCurrent: '增强模式，当前：{mode}',
  prompt: '仅优化',
  project: '项目模式',
  enhance: '增强提示词',
  stop: '停止增强',
  restore: '恢复',
  history: '历史',
  delete: '删除',
  loading: '处理中…',
  empty: '暂无增强记录',
  failed: '提示词增强失败',
  cancelled: '已取消',
  sessionHistory: '当前会话增强历史', historyTitle: '提示词增强历史', close: '关闭', cancel: '取消', confirm: '确认',
  draftChanged: '草稿已在增强期间修改，结果已保存在历史中',
  'filter.session': '会话', 'filter.workspace': '项目', 'filter.mode': '模式', 'filter.status': '状态', 'filter.all': '全部',
  'status.completed': '已完成', 'status.failed': '失败', 'status.cancelled': '已取消', recordCount: '{count} 条记录',
  clearFiltered: '清空筛选结果', clearAll: '清空全部', selectRecord: '选择一条记录查看详情', original: '原始提示词', enhanced: '增强结果',
  noResult: '没有可恢复的结果', diff: '差异', trace: '处理轨迹', confirmRestoreTitle: '覆盖当前草稿？',
  confirmRestoreDescription: '目标会话已有未发送草稿。恢复会覆盖该草稿。', confirmRestoreOriginalDescription: '目标会话已有未发送草稿。恢复原始提示词会覆盖该草稿。', confirmDeleteTitle: '删除增强历史？',
  confirmDeleteDescription: '此操作会永久删除所选记录。', confirmClearAllDescription: '此操作会永久删除全部提示词增强记录。',
} as const
/** Locale keys owned by the prompt-enhancement browser package. */
export type PromptEnhancementKey = keyof typeof zh
/** English prompt-enhancement copy. */
export const en = {
  mode: 'Enhancement mode', modeCurrent: 'Enhancement mode, current: {mode}', prompt: 'Prompt only', project: 'Project mode', enhance: 'Enhance prompt',
  stop: 'Stop enhancement', restore: 'Restore', history: 'History', delete: 'Delete', loading: 'Working…',
  empty: 'No enhancement history', failed: 'Prompt enhancement failed', cancelled: 'Cancelled',
  sessionHistory: 'Enhancement history for this session', historyTitle: 'Prompt enhancement history', close: 'Close', cancel: 'Cancel', confirm: 'Confirm',
  draftChanged: 'The draft changed during enhancement. The result was saved to history.',
  'filter.session': 'Session', 'filter.workspace': 'Workspace', 'filter.mode': 'Mode', 'filter.status': 'Status', 'filter.all': 'All',
  'status.completed': 'Completed', 'status.failed': 'Failed', 'status.cancelled': 'Cancelled', recordCount: '{count} records',
  clearFiltered: 'Clear filtered', clearAll: 'Clear all', selectRecord: 'Select a record to inspect', original: 'Original prompt', enhanced: 'Enhanced prompt',
  noResult: 'No restorable result', diff: 'Diff', trace: 'Processing trace', confirmRestoreTitle: 'Replace the current draft?',
  confirmRestoreDescription: 'The target session has an unsent draft. Restoring will replace it.', confirmRestoreOriginalDescription: 'The target session has an unsent draft. Restoring the original prompt will replace it.', confirmDeleteTitle: 'Delete enhancement history?',
  confirmDeleteDescription: 'This permanently deletes the selected record.', confirmClearAllDescription: 'This permanently deletes all prompt enhancement records.',
} satisfies Record<PromptEnhancementKey, string>
