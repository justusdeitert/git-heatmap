import { execSync } from 'node:child_process'

const git = (cmd: string): string => execSync(cmd, { encoding: 'utf8' }).trim()

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

export function getRecentCommits(count = 20, skip = 0): RawCommit[] {
  const sep = '---GD---'
  const raw = git(`git log --no-merges --format="%h${sep}%H${sep}%s${sep}%an${sep}%aI" --skip=${skip} -${count}`)
  if (!raw) return []
  return raw.split('\n').filter(Boolean).map(line => {
    const [hash, fullHash, message, author, date] = line.split(sep)
    return { hash, fullHash, message, author, date }
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
  const sep = '---GD---'
  const d = new Date(date + 'T12:00:00')
  const prev = new Date(d); prev.setDate(prev.getDate() - 2)
  const next = new Date(d); next.setDate(next.getDate() + 2)
  const after = prev.toISOString().slice(0, 10)
  const before = next.toISOString().slice(0, 10)
  const raw = git(`git log --no-merges --format="%h${sep}%H${sep}%s${sep}%an${sep}%aI" --after="${after}" --before="${before}"`)
  if (!raw) return []
  return raw.split('\n').filter(Boolean)
    .map(line => {
      const [hash, fullHash, message, author, d] = line.split(sep)
      return { hash, fullHash, message, author, date: d }
    })
    .filter(c => c.date.startsWith(date))
}
