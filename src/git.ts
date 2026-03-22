import { exec, execSync } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CommitEntry } from '@/types';

const git = (cmd: string): string => execSync(cmd, { encoding: 'utf8' }).trim();
const execAsync = (cmd: string): Promise<void> =>
  new Promise((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

export function isInsideRepo(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function getGitDir(): string {
  return git('git rev-parse --git-dir');
}

export function getRepoName(): string {
  try {
    const url = execSync('git remote get-url origin', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const match = url.match(/\/([^/]+?)(?:\.git)?$/);
    return match?.[1] ?? 'unknown';
  } catch {
    return git('basename "$(git rev-parse --show-toplevel)"') || 'unknown';
  }
}

export function getRemoteUrl(): string | null {
  try {
    return execSync('git remote get-url origin', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export function getCommitDates(): string[] {
  return git('git log --format="%aI" --no-merges').split('\n').filter(Boolean);
}

export function getFirstCommitDate(): string | null {
  try {
    return git('git log --reverse --format="%aI" | head -1') || null;
  } catch {
    return null;
  }
}

export function getAuthorCount(): number {
  const out = git('git shortlog -sn --no-merges HEAD');
  return out.split('\n').filter(Boolean).length;
}

export function getCurrentBranch(): string {
  return git('git branch --show-current');
}

export interface CommitDetail {
  hash: string;
  fullHash: string;
  subject: string;
  body: string;
  author: string;
  authorEmail: string;
  authorDate: string;
  committer: string;
  committerEmail: string;
  committerDate: string;
  stats: string;
}

export function getCommitCount(): number {
  const out = git('git rev-list --no-merges --count HEAD');
  return parseInt(out, 10) || 0;
}

const UNPUSHED_CACHE_TTL_MS = 1500;
let unpushedCacheAt = 0;
let unpushedCacheHead = '';
let unpushedCacheValue: Set<string> | null = null;

function getUnpushedCommitSet(): Set<string> | null {
  const now = Date.now();
  const head = git('git rev-parse HEAD');
  if (head === unpushedCacheHead && now - unpushedCacheAt < UNPUSHED_CACHE_TTL_MS) {
    return unpushedCacheValue;
  }

  try {
    // Ensure current branch has an upstream; if not, treat commits as local-only.
    execSync('git rev-parse --abbrev-ref --symbolic-full-name @{upstream}', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const out = git('git rev-list --no-merges @{upstream}..HEAD');
    const result = !out ? new Set<string>() : new Set(out.split('\n').filter(Boolean));
    unpushedCacheAt = now;
    unpushedCacheHead = head;
    unpushedCacheValue = result;
    return result;
  } catch {
    unpushedCacheAt = now;
    unpushedCacheHead = head;
    unpushedCacheValue = null;
    return null;
  }
}

export function getRecentCommits(count = 20, skip = 0): CommitEntry[] {
  const unpushed = getUnpushedCommitSet();
  const sep = '---GD---';
  const raw = git(
    `git log --no-merges --format="%h${sep}%H${sep}%s${sep}%an${sep}%ae${sep}%aI${sep}%cn${sep}%ce${sep}%cI" --skip=${skip} -${count}`,
  );
  if (!raw) return [];
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, fullHash, message, author, authorEmail, date, committer, committerEmail, committerDate] = line.split(sep);
      const onRemote = unpushed ? !unpushed.has(fullHash) : false;
      return { hash, fullHash, message, author, authorEmail, date, committer, committerEmail, committerDate, onRemote };
    });
}

export function getCommitDetail(hash: string): CommitDetail | null {
  const sep = '---GD---';
  try {
    const raw = git(`git log -1 --format="%h${sep}%H${sep}%s${sep}%b${sep}%an${sep}%ae${sep}%aI${sep}%cn${sep}%ce${sep}%cI" ${hash}`);
    if (!raw) return null;
    const parts = raw.split(sep);
    const stats = git(`git diff --stat ${hash}~1 ${hash} 2>/dev/null || git diff --stat --root ${hash}`);
    return {
      hash: parts[0],
      fullHash: parts[1],
      subject: parts[2],
      body: parts[3].trim(),
      author: parts[4],
      authorEmail: parts[5],
      authorDate: parts[6],
      committer: parts[7],
      committerEmail: parts[8],
      committerDate: parts[9],
      stats: stats.trim(),
    };
  } catch {
    return null;
  }
}

export function getCommitsByDate(date: string): CommitEntry[] {
  const unpushed = getUnpushedCommitSet();
  const sep = '---GD---';
  // Use ±2 day window for the git query to account for timezone differences
  // (e.g. a commit at 23:00 UTC-12 could appear as the next day in UTC+12).
  // The exact date match is done by the .filter() at the end using the author's original timezone.
  const d = new Date(`${date}T12:00:00`);
  const prev = new Date(d);
  prev.setDate(prev.getDate() - 2);
  const next = new Date(d);
  next.setDate(next.getDate() + 2);
  const after = prev.toISOString().slice(0, 10);
  const before = next.toISOString().slice(0, 10);
  const raw = git(
    `git log --no-merges --format="%h${sep}%H${sep}%s${sep}%an${sep}%ae${sep}%aI${sep}%cn${sep}%ce${sep}%cI" --after="${after}" --before="${before}"`,
  );
  if (!raw) return [];
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, fullHash, message, author, authorEmail, d, committer, committerEmail, committerDate] = line.split(sep);
      const onRemote = unpushed ? !unpushed.has(fullHash) : false;
      return { hash, fullHash, message, author, authorEmail, date: d, committer, committerEmail, committerDate, onRemote };
    })
    .filter((c) => c.date.startsWith(date));
}

function isHeadCommit(hash: string): boolean {
  const head = git('git rev-parse HEAD');
  const resolved = git(`git rev-parse ${hash}`);
  return head === resolved;
}

export function hasUncommittedChanges(): boolean {
  return execSync('git --no-optional-locks status --porcelain', { encoding: 'utf8' }).trim().length > 0;
}

export interface UncommittedFile {
  status: string;
  file: string;
}

export function getUncommittedFiles(): UncommittedFile[] {
  const output = execSync('git --no-optional-locks status --porcelain', { encoding: 'utf8' }).trim();
  if (!output) return [];
  return output.split('\n').map((line) => {
    const status = line.slice(0, 2).trim();
    const file = line.slice(2).trimStart();
    return { status, file };
  });
}

function isCommitOnRemote(hash: string): boolean {
  try {
    const branches = execSync(`git branch -r --contains ${hash}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return branches.length > 0;
  } catch {
    return false;
  }
}

export function getCommitEditableStatus(hash: string): { editable: boolean; reason?: string } {
  if (hasUncommittedChanges()) {
    return { editable: false, reason: 'You have uncommitted changes. Please commit or stash them first.' };
  }
  if (isCommitOnRemote(hash)) {
    return { editable: false, reason: 'This commit has already been pushed to a remote branch.' };
  }
  return { editable: true };
}

export function rewriteCommitMessage(hash: string, newMessage: string): void {
  const msgFile = join(tmpdir(), `git-heatmap-msg-${Date.now()}.txt`);
  writeFileSync(msgFile, newMessage);
  try {
    if (isHeadCommit(hash)) {
      // Preserve the original committer date
      const committerDate = git(`git log -1 --format="%cI" ${hash}`);
      execSync(`git commit --amend -F ${JSON.stringify(msgFile)}`, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, GIT_COMMITTER_DATE: committerDate },
      });
      return;
    }

    const resolved = git(`git rev-parse ${hash}`);
    // Automate interactive rebase: change 'pick <hash>' to 'reword <hash>'
    const seqEditor = `sed -i.bak 's/^pick ${resolved.slice(0, 7)}/reword ${resolved.slice(0, 7)}/'`;
    const msgEditor = `cp ${JSON.stringify(msgFile)}`;
    try {
      execSync(
        `GIT_SEQUENCE_EDITOR="${seqEditor}" GIT_EDITOR="${msgEditor}" git rebase -i --committer-date-is-author-date ${resolved}~1`,
        { encoding: 'utf8', stdio: 'pipe' },
      );
    } catch (err) {
      try {
        execSync('git rebase --abort', { stdio: 'pipe' });
      } catch {
        /* ignore */
      }
      throw err;
    }
  } finally {
    try {
      unlinkSync(msgFile);
    } catch {
      /* ignore */
    }
  }
}

export function rewriteCommit(
  hash: string,
  opts: {
    authorDate: string;
    committerDate?: string;
    author?: string;
    committerName?: string;
    committerEmail?: string;
  },
): void {
  const effectiveCommitterDate = opts.committerDate ?? opts.authorDate;

  if (isHeadCommit(hash)) {
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      GIT_COMMITTER_DATE: effectiveCommitterDate,
    };
    if (opts.committerName) env.GIT_COMMITTER_NAME = opts.committerName;
    if (opts.committerEmail) env.GIT_COMMITTER_EMAIL = opts.committerEmail;

    let cmd = `git commit --amend --no-edit --date=${JSON.stringify(opts.authorDate)}`;
    if (opts.author) cmd += ` --author=${JSON.stringify(opts.author)}`;

    execSync(cmd, { encoding: 'utf8', stdio: 'pipe', env });
    return;
  }

  const resolved = git(`git rev-parse ${hash}`);
  try {
    const seqEditor = `sed -i.bak 's/^pick ${resolved.slice(0, 7)}/edit ${resolved.slice(0, 7)}/'`;
    execSync(`GIT_SEQUENCE_EDITOR="${seqEditor}" git rebase -i ${resolved}~1`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      GIT_COMMITTER_DATE: effectiveCommitterDate,
    };
    if (opts.committerName) env.GIT_COMMITTER_NAME = opts.committerName;
    if (opts.committerEmail) env.GIT_COMMITTER_EMAIL = opts.committerEmail;

    let cmd = `git commit --amend --no-edit --date=${JSON.stringify(opts.authorDate)}`;
    if (opts.author) cmd += ` --author=${JSON.stringify(opts.author)}`;

    execSync(cmd, { encoding: 'utf8', stdio: 'pipe', env });
    execSync('git rebase --continue', { encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    try {
      execSync('git rebase --abort', { stdio: 'pipe' });
    } catch {
      /* ignore */
    }
    throw err;
  }
}

export interface ReflogEntry {
  hash: string;
  action: string;
  detail: string;
  date: string;
}

const TRACE_ACTIONS = /^(rebase|commit \(amend\)|reset|cherry-pick|revert)/;

export function getReflogTraces(): ReflogEntry[] {
  const sep = '---GD---';
  try {
    const raw = git(`git reflog --date=iso-strict --format="%h${sep}%gs${sep}%gD"`);
    if (!raw) return [];
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, gs, selector] = line.split(sep);
        const colonIdx = gs.indexOf(': ');
        const action = colonIdx >= 0 ? gs.slice(0, colonIdx) : gs;
        const detail = colonIdx >= 0 ? gs.slice(colonIdx + 2) : '';
        const dateMatch = selector?.match(/@\{(.+)\}$/);
        const date = dateMatch?.[1] ?? '';
        return { hash, action, detail, date };
      })
      .filter((e) => TRACE_ACTIONS.test(e.action));
  } catch {
    return [];
  }
}

export async function clearReflog(): Promise<void> {
  await execAsync('git reflog expire --expire=now --all');
  await execAsync('git gc --prune=now');
}
