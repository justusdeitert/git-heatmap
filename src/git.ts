import { exec, execSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const git = (cmd: string): string => execSync(cmd, { encoding: 'utf8' }).trim()
const execAsync = (cmd: string): Promise<void> => new Promise((resolve, reject) => {
  exec(cmd, (err) => {
    if (err) reject(err)
    else resolve()
  })
})

export function isInsideRepo(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function getGitDir(): string {
  return git('git rev-parse --git-dir')
}

export function getRepoName(): string {
  try {
    const url = execSync('git remote get-url origin', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
    const match = url.match(/\/([^/]+?)(?:\.git)?$/)
    return match?.[1] ?? 'unknown'
  } catch {
    return git('basename "$(git rev-parse --show-toplevel)"') || 'unknown'
  }
}

export function getRemoteUrl(): string | null {
  try {
    return execSync('git remote get-url origin', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

export function getCommitDates(): string[] {
  return git('git log --format="%aI" --no-merges').split('\n').filter(Boolean)
}

export function getFirstCommitDate(): string | null {
  try {
    return git('git log --reverse --format="%aI" | head -1') || null
  } catch {
    return null
  }
}

export function getAuthorCount(): number {
  const out = git('git shortlog -sn --no-merges HEAD')
  return out.split('\n').filter(Boolean).length
}

export function getCurrentBranch(): string {
  return git('git branch --show-current')
}

export interface RawCommit {
  hash: string
  fullHash: string
  message: string
  author: string
  date: string
  committerDate: string
  onRemote: boolean
}

export interface CommitDetail {
  hash: string
  fullHash: string
  subject: string
  body: string
  author: string
  authorDate: string
  committer: string
  committerDate: string
  stats: string
}

export function getCommitCount(): number {
  const out = git('git rev-list --no-merges --count HEAD')
  return parseInt(out, 10) || 0
}

const UNPUSHED_CACHE_TTL_MS = 1500
let unpushedCacheAt = 0
let unpushedCacheHead = ''
let unpushedCacheValue: Set<string> | null = null

function getUnpushedCommitSet(): Set<string> | null {
  const now = Date.now()
  const head = git('git rev-parse HEAD')
  if (head === unpushedCacheHead && now - unpushedCacheAt < UNPUSHED_CACHE_TTL_MS) {
    return unpushedCacheValue
  }

  try {
    // Ensure current branch has an upstream; if not, treat commits as local-only.
    execSync('git rev-parse --abbrev-ref --symbolic-full-name @{upstream}', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    const out = git('git rev-list --no-merges @{upstream}..HEAD')
    const result = !out ? new Set<string>() : new Set(out.split('\n').filter(Boolean))
    unpushedCacheAt = now
    unpushedCacheHead = head
    unpushedCacheValue = result
    return result
  } catch {
    unpushedCacheAt = now
    unpushedCacheHead = head
    unpushedCacheValue = null
    return null
  }
}

export function getRecentCommits(count = 20, skip = 0): RawCommit[] {
  const unpushed = getUnpushedCommitSet()
  const sep = '---GD---'
  const raw = git(`git log --no-merges --format="%h${sep}%H${sep}%s${sep}%an${sep}%aI${sep}%cI" --skip=${skip} -${count}`)
  if (!raw) return []
  return raw.split('\n').filter(Boolean).map(line => {
    const [hash, fullHash, message, author, date, committerDate] = line.split(sep)
    const onRemote = unpushed ? !unpushed.has(fullHash) : false
    return { hash, fullHash, message, author, date, committerDate, onRemote }
  })
}

export function getCommitDetail(hash: string): CommitDetail | null {
  const sep = '---GD---'
  try {
    const raw = git(`git log -1 --format="%h${sep}%H${sep}%s${sep}%b${sep}%an${sep}%aI${sep}%cn${sep}%cI" ${hash}`)
    if (!raw) return null
    const parts = raw.split(sep)
    const stats = git(`git diff --stat ${hash}~1 ${hash} 2>/dev/null || git diff --stat --root ${hash}`)
    return {
      hash: parts[0],
      fullHash: parts[1],
      subject: parts[2],
      body: parts[3].trim(),
      author: parts[4],
      authorDate: parts[5],
      committer: parts[6],
      committerDate: parts[7],
      stats: stats.trim(),
    }
  } catch {
    return null
  }
}

export function getCommitsByDate(date: string): RawCommit[] {
  const unpushed = getUnpushedCommitSet()
  const sep = '---GD---'
  const d = new Date(date + 'T12:00:00')
  const prev = new Date(d); prev.setDate(prev.getDate() - 2)
  const next = new Date(d); next.setDate(next.getDate() + 2)
  const after = prev.toISOString().slice(0, 10)
  const before = next.toISOString().slice(0, 10)
  const raw = git(`git log --no-merges --format="%h${sep}%H${sep}%s${sep}%an${sep}%aI${sep}%cI" --after="${after}" --before="${before}"`)
  if (!raw) return []
  return raw.split('\n').filter(Boolean)
    .map(line => {
      const [hash, fullHash, message, author, d, committerDate] = line.split(sep)
      const onRemote = unpushed ? !unpushed.has(fullHash) : false
      return { hash, fullHash, message, author, date: d, committerDate, onRemote }
    })
    .filter(c => c.date.startsWith(date))
}

export function isHeadCommit(hash: string): boolean {
  const head = git('git rev-parse HEAD')
  const resolved = git(`git rev-parse ${hash}`)
  return head === resolved
}

export function hasUncommittedChanges(): boolean {
  return execSync('git --no-optional-locks status --porcelain', { encoding: 'utf8' }).trim().length > 0
}

export function isCommitOnRemote(hash: string): boolean {
  try {
    const branches = execSync(`git branch -r --contains ${hash}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
    return branches.length > 0
  } catch {
    return false
  }
}

export function getCommitEditableStatus(hash: string): { editable: boolean; reason?: string } {
  if (hasUncommittedChanges()) {
    return { editable: false, reason: 'You have uncommitted changes. Please commit or stash them first.' }
  }
  if (isCommitOnRemote(hash)) {
    return { editable: false, reason: 'This commit has already been pushed to a remote branch.' }
  }
  return { editable: true }
}

export function rewriteCommitMessage(hash: string, newMessage: string): void {
  const msgFile = join(tmpdir(), 'git-dashboard-msg-' + Date.now() + '.txt')
  writeFileSync(msgFile, newMessage)
  try {
    if (isHeadCommit(hash)) {
      // Preserve the original committer date
      const committerDate = git(`git log -1 --format="%cI" ${hash}`)
      execSync(
        'git commit --amend -F ' + JSON.stringify(msgFile),
        { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, GIT_COMMITTER_DATE: committerDate } }
      )
      return
    }

    const resolved = git(`git rev-parse ${hash}`)
    // Automate interactive rebase: change 'pick <hash>' to 'reword <hash>'
    const seqEditor = `sed -i.bak 's/^pick ${resolved.slice(0, 7)}/reword ${resolved.slice(0, 7)}/'`
    const msgEditor = `cp ${JSON.stringify(msgFile)}`
    try {
      execSync(
        `GIT_SEQUENCE_EDITOR="${seqEditor}" GIT_EDITOR="${msgEditor}" git rebase -i --committer-date-is-author-date ${resolved}~1`,
        { encoding: 'utf8', stdio: 'pipe' }
      )
    } catch (err) {
      try { execSync('git rebase --abort', { stdio: 'pipe' }) } catch { /* ignore */ }
      throw err
    }
  } finally {
    try { unlinkSync(msgFile) } catch { /* ignore */ }
  }
}

export function rewriteCommitDate(hash: string, newDate: string): void {
  if (isHeadCommit(hash)) {
    // Read the current commit message to preserve it
    const subject = git(`git log -1 --format="%s" ${hash}`)
    const body = git(`git log -1 --format="%b" ${hash}`)
    const fullMsg = body ? subject + '\n\n' + body : subject
    const msgFile = join(tmpdir(), 'git-dashboard-date-' + Date.now() + '.txt')
    writeFileSync(msgFile, fullMsg)
    try {
      execSync(
        'git commit --amend -F ' + JSON.stringify(msgFile) + ' --date=' + JSON.stringify(newDate),
        { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, GIT_COMMITTER_DATE: newDate } }
      )
    } finally {
      try { unlinkSync(msgFile) } catch { /* ignore */ }
    }
    return
  }

  const resolved = git(`git rev-parse ${hash}`)
  try {
    const seqEditor = `sed -i.bak 's/^pick ${resolved.slice(0, 7)}/edit ${resolved.slice(0, 7)}/'`
    // Start interactive rebase, pausing at the target commit
    execSync(
      `GIT_SEQUENCE_EDITOR="${seqEditor}" git rebase -i --committer-date-is-author-date ${resolved}~1`,
      { encoding: 'utf8', stdio: 'pipe' }
    )
    // Amend the date while paused
    execSync(
      'git commit --amend --no-edit --date=' + JSON.stringify(newDate),
      { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, GIT_COMMITTER_DATE: newDate } }
    )
    // Continue rebase
    execSync(
      'git rebase --continue',
      { encoding: 'utf8', stdio: 'pipe' }
    )
  } catch (err) {
    // Abort rebase on failure to avoid leaving repo in broken state
    try { execSync('git rebase --abort', { stdio: 'pipe' }) } catch { /* ignore */ }
    throw err
  }
}

export interface ReflogEntry {
  hash: string
  action: string
  detail: string
  date: string
}

const TRACE_ACTIONS = /^(rebase|commit \(amend\)|reset|cherry-pick|revert)/

export function getReflogTraces(): ReflogEntry[] {
  const sep = '---GD---'
  try {
    const raw = git(`git reflog --date=iso-strict --format="%h${sep}%gs${sep}%gD"`)
    if (!raw) return []
    return raw.split('\n').filter(Boolean)
      .map(line => {
        const [hash, gs, selector] = line.split(sep)
        const colonIdx = gs.indexOf(': ')
        const action = colonIdx >= 0 ? gs.slice(0, colonIdx) : gs
        const detail = colonIdx >= 0 ? gs.slice(colonIdx + 2) : ''
        const dateMatch = selector?.match(/@\{(.+)\}$/)
        const date = dateMatch?.[1] ?? ''
        return { hash, action, detail, date }
      })
      .filter(e => TRACE_ACTIONS.test(e.action))
  } catch {
    return []
  }
}

export async function clearReflog(): Promise<void> {
  await execAsync('git reflog expire --expire=now --all')
  await execAsync('git gc --prune=now')
}
