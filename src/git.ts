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
