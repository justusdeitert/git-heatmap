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
  message: string
  author: string
  date: string
}

export function getCommitCount(): number {
  const out = git('git rev-list --no-merges --count HEAD')
  return parseInt(out, 10) || 0
}

export function getRecentCommits(count = 20, skip = 0): RawCommit[] {
  const sep = '---GD---'
  const raw = git(`git log --no-merges --format="%h${sep}%s${sep}%an${sep}%aI" --skip=${skip} -${count}`)
  if (!raw) return []
  return raw.split('\n').filter(Boolean).map(line => {
    const [hash, message, author, date] = line.split(sep)
    return { hash, message, author, date }
  })
}
