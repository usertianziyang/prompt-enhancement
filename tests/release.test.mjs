import assert from 'node:assert/strict'
import test from 'node:test'

import { buildChangelogSection, bumpVersion, extractReleaseNotes, parseCommit } from '../scripts/release.mjs'

test('builds bilingual release sections from conventional commits', () => {
  const section = buildChangelogSection('0.1.1', '2026-08-21', [
    { hash: 'abc1234', subject: 'feat(prompt): 支持恢复 / Restore prompts' },
    { hash: 'def5678', subject: 'fix: 修复失败清理 / Preserve drafts on failure' },
    { hash: 'ghi9012', subject: 'Update the README' },
  ])

  assert.match(section, /### 新功能 \/ Features/u)
  assert.match(section, /- 支持恢复 \/ Restore prompts \(abc1234\)/u)
  assert.match(section, /### 修复 \/ Fixes/u)
  assert.match(section, /### 其他变更 \/ Other changes/u)
  assert.match(section, /- Update the README \(ghi9012\)/u)
  assert.equal(extractReleaseNotes(section, '0.1.1'), section.trim())
})

test('supports stable version bumps and rejects non-bilingual release commits', () => {
  assert.equal(bumpVersion('0.1.0', 'patch'), '0.1.1')
  assert.equal(bumpVersion('0.1.0', 'minor'), '0.2.0')
  assert.equal(bumpVersion('0.1.0', 'major'), '1.0.0')
  assert.deepEqual(parseCommit('feat: only English'), { category: 'other', subject: 'feat: only English' })
  assert.throws(() => bumpVersion('0.1.0-rc.1', 'patch'), /Only stable SemVer/u)
})
