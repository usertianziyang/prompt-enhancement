import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const packagePath = resolve(root, 'package.json')
const changelogPath = resolve(root, 'CHANGELOG.md')

const categories = {
  feat: ['新功能', 'Features'],
  fix: ['修复', 'Fixes'],
  refactor: ['重构', 'Refactoring'],
  docs: ['文档', 'Documentation'],
  chore: ['操作维护', 'Chores'],
  ci: ['持续集成', 'Continuous integration'],
  test: ['测试', 'Tests'],
  perf: ['性能', 'Performance'],
  revert: ['回滚', 'Reverts'],
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}

function fail(message) {
  throw new Error(message)
}

function parseVersion(version) {
  const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/u.exec(version)
  return match ? match.slice(1).map(Number) : null
}

function compareVersions(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return b[index] - a[index]
  }
  return 0
}

export function bumpVersion(version, kind) {
  const parsed = parseVersion(version)
  if (!parsed) fail(`Only stable SemVer versions are supported: ${version}`)
  if (!['patch', 'minor', 'major'].includes(kind)) fail('Usage: pnpm release <patch|minor|major>')
  const [major, minor, patch] = parsed
  if (kind === 'major') return `${major + 1}.0.0`
  if (kind === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function splitBilingual(text) {
  const separator = text.indexOf(' / ')
  if (separator < 1) return null
  const zh = text.slice(0, separator).trim()
  const en = text.slice(separator + 3).trim()
  return zh && en ? { zh, en } : null
}

// ponytail: parse subjects only; add commit-body parsing if release notes need issue links or longer context.
export function parseCommit(subject) {
  const match = /^(?<type>[a-z]+)(?:\([^)]*\))?(?<breaking>!)?:\s+(?<text>.+)$/u.exec(subject)
  if (!match || !categories[match.groups.type]) return { category: 'other', subject }
  const text = splitBilingual(match.groups.text)
  if (!text) return { category: 'other', subject }
  return {
    category: match.groups.breaking ? 'breaking' : match.groups.type,
    ...text,
  }
}

export function buildChangelogSection(version, date, commits) {
  const grouped = new Map()
  for (const commit of commits) {
    const parsed = parseCommit(commit.subject ?? commit)
    const list = grouped.get(parsed.category) ?? []
    list.push({ ...parsed, hash: commit.hash })
    grouped.set(parsed.category, list)
  }
  if (!grouped.size) fail('No commits found since the previous release tag')

  const order = ['breaking', ...Object.keys(categories), 'other']
  const sections = []
  for (const category of order) {
    const commitsInCategory = grouped.get(category)
    if (!commitsInCategory?.length) continue
    const title = category === 'breaking'
      ? '重大变更 / Breaking changes'
      : category === 'other'
        ? '其他变更 / Other changes'
        : `${categories[category][0]} / ${categories[category][1]}`
    const lines = commitsInCategory.map(commit => {
      const hash = commit.hash ? ` (${commit.hash})` : ''
      if (commit.zh) return `- ${commit.zh} / ${commit.en}${hash}`
      return `- ${commit.subject}${hash}`
    })
    sections.push(`### ${title}\n\n${lines.join('\n')}`)
  }
  return `## [${version}] - ${date}\n\n${sections.join('\n\n')}\n`
}

export function prependChangelog(changelog, section) {
  const firstVersion = changelog.search(/^## /mu)
  if (firstVersion < 0) return `${changelog.trimEnd()}\n\n${section}`
  return `${changelog.slice(0, firstVersion).trimEnd()}\n\n${section}\n${changelog.slice(firstVersion).trimStart()}`
}

export function extractReleaseNotes(changelog, version) {
  const heading = `## [${version}] - `
  const start = changelog.indexOf(heading)
  if (start < 0) fail(`CHANGELOG.md has no entry for ${version}`)
  const next = changelog.indexOf('\n## ', start + heading.length)
  return changelog.slice(start, next < 0 ? changelog.length : next).trim()
}

function readPackage() {
  return JSON.parse(readFileSync(packagePath, 'utf8'))
}

function replacePackageVersion(version) {
  const source = readFileSync(packagePath, 'utf8')
  const updated = source.replace(/("version"\s*:\s*")[^"]+(")/u, `$1${version}$2`)
  if (updated === source) fail('Could not update package.json version')
  writeFileSync(packagePath, updated)
}

function stableTags() {
  return git('tag', '--list', 'v*')
    .split('\n')
    .filter(Boolean)
    .map(tag => ({ tag, version: parseVersion(tag.slice(1)) }))
    .filter(item => item.version)
    .sort((a, b) => compareVersions(a.version, b.version))
}

function ensureReadyToRelease(currentVersion) {
  if (git('branch', '--show-current') !== 'main') fail('Release must run from the main branch')
  if (git('status', '--porcelain')) fail('Release requires a clean working tree')
  git('fetch', 'origin', 'main', '--quiet')
  if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) {
    fail('Release requires main to be synchronized with origin/main')
  }
  const latest = stableTags()[0]
  if (latest && latest.tag !== `v${currentVersion}`) {
    fail(`package.json version ${currentVersion} does not match latest tag ${latest.tag}`)
  }
  return latest?.tag
}

function commitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD'
  return git('log', range, '--no-merges', '--format=%h%x09%s')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [hash, ...subject] = line.split('\t')
      return { hash, subject: subject.join('\t') }
    })
}

function release(kind) {
  const pkg = readPackage()
  const previousTag = ensureReadyToRelease(pkg.version)
  const version = bumpVersion(pkg.version, kind)
  const tag = `v${version}`
  if (stableTags().some(item => item.tag === tag)) fail(`Tag already exists: ${tag}`)

  const commits = commitsSince(previousTag)
  const section = buildChangelogSection(version, new Date().toISOString().slice(0, 10), commits)
  const changelog = readFileSync(changelogPath, 'utf8')
  writeFileSync(changelogPath, prependChangelog(changelog, section))
  replacePackageVersion(version)
  git('add', 'CHANGELOG.md', 'package.json')
  git('commit', '-m', `chore(release): 发布 ${tag} / Release ${tag}`)
  git('tag', '-a', tag, '-m', `Release ${tag}`)
  git('push', 'origin', 'main', tag)
  console.log(`Released ${tag}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [command, value] = process.argv.slice(2)
  if (command === '--notes') {
    console.log(extractReleaseNotes(readFileSync(changelogPath, 'utf8'), value.replace(/^v/u, '')))
  } else {
    release(command)
  }
}
