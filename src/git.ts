import { exec, execSync } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CommitEntry, RefDecoration } from '@/types';

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

export function removeRemote(): void {
  git('git remote remove origin');
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

export interface AuthorStat {
  name: string;
  commits: number;
}

export function getAuthorStats(): AuthorStat[] {
  const out = git('git shortlog -sne --no-merges HEAD');
  return out.split('\n').filter(Boolean).map((line) => {
    const match = line.trim().match(/^(\d+)\t(.+?)(?:\s+<.+>)?$/);
    if (!match) return null;
    return { name: match[2], commits: parseInt(match[1], 10) };
  }).filter((a): a is AuthorStat => a !== null);
}

export function getCurrentBranch(): string {
  return git('git branch --show-current');
}

const BACKUP_REF = 'refs/git-heatmap/pre-rebase-backup';

export function isRebaseInProgress(): boolean {
  const gitDir = getGitDir();
  return existsSync(join(gitDir, 'rebase-merge')) || existsSync(join(gitDir, 'rebase-apply'));
}

export function getBackupRef(): string | null {
  try {
    return execSync(`git rev-parse --verify ${BACKUP_REF}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export function abortRebase(): void {
  if (!isRebaseInProgress()) throw new Error('No rebase in progress');
  execSync('git rebase --abort', { stdio: 'pipe' });
  // Abort restores pre-rebase state, so backup ref is no longer needed
  deleteBackupRef();
}

export function restoreFromBackup(): void {
  const ref = getBackupRef();
  if (!ref) throw new Error('No backup ref found');
  // Abort rebase first if one is active
  if (isRebaseInProgress()) {
    execSync('git rebase --abort', { stdio: 'pipe' });
  }
  execSync(`git reset --hard ${ref}`, { stdio: 'pipe' });
  execSync(`git update-ref -d ${BACKUP_REF}`, { stdio: 'pipe' });
}

function createBackupRef(): void {
  execSync(`git update-ref ${BACKUP_REF} HEAD`, { stdio: 'pipe' });
}

function deleteBackupRef(): void {
  try { execSync(`git update-ref -d ${BACKUP_REF}`, { stdio: 'pipe' }); } catch { /* ignore */ }
}

export function dismissBackup(): void {
  if (!getBackupRef()) throw new Error('No backup ref found');
  deleteBackupRef();
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
  refs: RefDecoration[];
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

let cachedRemoteNames: string[] | null = null;

function getRemoteNames(): string[] {
  if (cachedRemoteNames) return cachedRemoteNames;
  try {
    cachedRemoteNames = git('git remote').split('\n').filter(Boolean);
  } catch {
    cachedRemoteNames = [];
  }
  return cachedRemoteNames;
}

function parseRefs(raw: string): RefDecoration[] {
  if (!raw) return [];
  const remotes = getRemoteNames();
  return raw.split(',').map((s) => s.trim()).filter(Boolean).map((ref) => {
    if (ref.startsWith('tag: ')) return { name: ref.slice(5), type: 'tag' as const };
    if (ref.startsWith('HEAD -> ')) return { name: ref.slice(8), type: 'head' as const };
    if (ref === 'HEAD') return { name: 'HEAD', type: 'head' as const };
    if (remotes.some((r) => ref.startsWith(`${r}/`))) return { name: ref, type: 'remote' as const };
    return { name: ref, type: 'branch' as const };
  });
}

export function getRecentCommits(count = 20, skip = 0): CommitEntry[] {
  const unpushed = getUnpushedCommitSet();
  const sep = '---GD---';
  const raw = git(
    `git log --no-merges --format="%h${sep}%H${sep}%s${sep}%an${sep}%ae${sep}%aI${sep}%cn${sep}%ce${sep}%cI${sep}%D" --skip=${skip} -${count}`,
  );
  if (!raw) return [];
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, fullHash, message, author, authorEmail, date, committer, committerEmail, committerDate, ...refParts] = line.split(sep);
      const onRemote = unpushed ? !unpushed.has(fullHash) : false;
      const refs = parseRefs(refParts.join(sep));
      return { hash, fullHash, message, author, authorEmail, date, committer, committerEmail, committerDate, onRemote, refs };
    });
}

export function getCommitDetail(hash: string): CommitDetail | null {
  const sep = '---GD---';
  try {
    const raw = git(`git log -1 --format="%h${sep}%H${sep}%s${sep}%b${sep}%an${sep}%ae${sep}%aI${sep}%cn${sep}%ce${sep}%cI${sep}%D" ${hash}`);
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
      refs: parseRefs(parts.slice(10).join(sep)),
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
    `git log --no-merges --format="%h${sep}%H${sep}%s${sep}%an${sep}%ae${sep}%aI${sep}%cn${sep}%ce${sep}%cI${sep}%D" --after="${after}" --before="${before}"`,
  );
  if (!raw) return [];
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, fullHash, message, author, authorEmail, d, committer, committerEmail, committerDate, ...refParts] = line.split(sep);
      const onRemote = unpushed ? !unpushed.has(fullHash) : false;
      const refs = parseRefs(refParts.join(sep));
      return { hash, fullHash, message, author, authorEmail, date: d, committer, committerEmail, committerDate, onRemote, refs };
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

interface HiddenFile {
  file: string;
  type: 'skip-worktree' | 'assume-unchanged';
}

/** Temporarily clear skip-worktree and assume-unchanged flags that would block rebase. Returns a restore function. */
function suspendHiddenFlags(): () => void {
  let hidden: HiddenFile[];
  try {
    const output = execSync('git ls-files -v', { encoding: 'utf8' }).trim();
    if (!output) return () => {};
    hidden = output
      .split('\n')
      .filter((line) => line[0] === 'S' || (line[0] >= 'a' && line[0] <= 'z'))
      .map((line) => ({
        file: line.slice(2),
        type: line[0] === 'S' ? 'skip-worktree' as const : 'assume-unchanged' as const,
      }));
  } catch {
    return () => {};
  }
  if (hidden.length === 0) return () => {};

  // Clear the flags
  for (const h of hidden) {
    const flag = h.type === 'skip-worktree' ? '--no-skip-worktree' : '--no-assume-unchanged';
    try { execSync(`git update-index ${flag} '${h.file.replace(/'/g, "'\\''")}'`, { stdio: 'pipe' }); } catch { /* ignore */ }
  }

  // Stash the now-visible unstaged changes (only the hidden files)
  let stashed = false;
  const fileArgs = hidden.map((h) => `'${h.file.replace(/'/g, "'\\''")}'`).join(' ');
  try {
    const before = execSync('git stash list', { encoding: 'utf8' }).trim();
    execSync(`git stash push -q -- ${fileArgs}`, { stdio: 'pipe' });
    const after = execSync('git stash list', { encoding: 'utf8' }).trim();
    stashed = before !== after;
  } catch { /* nothing to stash, files may match HEAD */ }

  return () => {
    // Pop stash first, then restore flags
    if (stashed) {
      try { execSync('git stash pop -q', { stdio: 'pipe' }); } catch { /* ignore */ }
    }
    for (const h of hidden) {
      const flag = h.type === 'skip-worktree' ? '--skip-worktree' : '--assume-unchanged';
      try { execSync(`git update-index ${flag} '${h.file.replace(/'/g, "'\\''")}'`, { stdio: 'pipe' }); } catch { /* ignore */ }
    }
  };
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
  if (isRebaseInProgress()) throw new Error('A rebase is already in progress. Abort or resolve it first.');
  const msgFile = join(tmpdir(), `git-heatmap-msg-${Date.now()}.txt`);
  writeFileSync(msgFile, newMessage);
  try {
    if (isHeadCommit(hash)) {
      createBackupRef();
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
    createBackupRef();
    const restoreFlags = suspendHiddenFlags();
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
        deleteBackupRef();
      } catch {
        /* ignore */
      }
      throw err;
    } finally {
      restoreFlags();
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
    preserveTimestamps?: boolean;
  },
): void {
  if (isRebaseInProgress()) throw new Error('A rebase is already in progress. Abort or resolve it first.');
  const effectiveCommitterDate = opts.committerDate ?? opts.authorDate;

  if (isHeadCommit(hash)) {
    createBackupRef();
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
  createBackupRef();
  const restoreFlags = suspendHiddenFlags();
  try {
    const seqEditor = `sed -i.bak 's/^pick ${resolved.slice(0, 7)}/edit ${resolved.slice(0, 7)}/'`;
    execSync(`GIT_SEQUENCE_EDITOR="${seqEditor}" git rebase -i${opts.preserveTimestamps !== false ? ' --committer-date-is-author-date' : ''} ${resolved}~1`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      GIT_COMMITTER_DATE: effectiveCommitterDate,
    };
    if (opts.committerName) env.GIT_COMMITTER_NAME = opts.committerName;
    if (opts.committerEmail) env.GIT_COMMITTER_EMAIL = opts.committerEmail;

    let cmd = `git commit --amend --allow-empty --no-edit --date=${JSON.stringify(opts.authorDate)}`;
    if (opts.author) cmd += ` --author=${JSON.stringify(opts.author)}`;

    execSync(cmd, { encoding: 'utf8', stdio: 'pipe', env });
    execSync('git rebase --continue', { encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    try {
      execSync('git rebase --abort', { stdio: 'pipe' });
      deleteBackupRef();
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    restoreFlags();
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

export function bulkShiftCommits(hashes: string[], shiftMs: number): void {
  if (hashes.length === 0) return;
  if (isRebaseInProgress()) throw new Error('A rebase is already in progress. Abort or resolve it first.');
  if (hasUncommittedChanges()) {
    throw new Error('You have uncommitted changes. Please commit or stash them first.');
  }

  // Resolve full hashes and collect dates
  const targets = hashes.map((h) => {
    const fullHash = git(`git rev-parse ${h}`);
    const authorDate = git(`git log -1 --format="%aI" ${fullHash}`);
    const committerDate = git(`git log -1 --format="%cI" ${fullHash}`);
    return { fullHash, authorDate, committerDate };
  });
  const targetSet = new Set(targets.map((t) => t.fullHash));

  // Build a map of hash → shifted dates
  const dateMap = new Map<string, { authorDate: string; committerDate: string }>();
  for (const t of targets) {
    const newAuthor = new Date(new Date(t.authorDate).getTime() + shiftMs).toISOString();
    const newCommitter = new Date(new Date(t.committerDate).getTime() + shiftMs).toISOString();
    dateMap.set(t.fullHash, { authorDate: newAuthor, committerDate: newCommitter });
  }

  // Find the oldest commit in the selection (furthest from HEAD)
  const allHashes = git('git rev-list HEAD').split('\n').filter(Boolean);
  const sorted = allHashes.filter((h) => targetSet.has(h));
  if (sorted.length === 0) throw new Error('None of the selected commits are on the current branch');

  const oldest = sorted[sorted.length - 1];
  const headHash = allHashes[0];
  const isRootCommit = oldest === allHashes[allHashes.length - 1];

  // If all selected commits include HEAD, or it's a single HEAD commit
  if (sorted.length === 1 && sorted[0] === headHash) {
    const dates = dateMap.get(headHash)!;
    execSync(
      `git commit --amend --no-edit --date=${JSON.stringify(dates.authorDate)}`,
      { encoding: 'utf8', stdio: 'pipe', env: { ...(process.env as Record<string, string>), GIT_COMMITTER_DATE: dates.committerDate } },
    );
    return;
  }

  // Build exec commands keyed by short hash. Each amends dates inline during rebase.
  const execMap: Record<string, string> = {};
  for (const hash of sorted) {
    const dates = dateMap.get(hash)!;
    execMap[hash.slice(0, 7)] =
      `exec GIT_COMMITTER_DATE='${dates.committerDate}' git commit --amend --allow-empty --no-edit --date='${dates.authorDate}'`;
  }

  // Write a temp Node script as GIT_SEQUENCE_EDITOR that inserts exec lines
  // after each target pick so the rebase runs to completion in one pass
  const editorScript = [
    'const fs = require("fs");',
    'const todoFile = process.argv[2];',
    'const lines = fs.readFileSync(todoFile, "utf8").split("\\n");',
    `const execMap = ${JSON.stringify(execMap)};`,
    'const result = [];',
    'for (const line of lines) {',
    '  result.push(line);',
    '  const m = line.match(/^pick ([a-f0-9]+)/);',
    '  if (m && execMap[m[1]]) result.push(execMap[m[1]]);',
    '}',
    'fs.writeFileSync(todoFile, result.join("\\n"));',
  ].join('\n');

  const scriptPath = join(tmpdir(), `git-heatmap-seqed-${Date.now()}.js`);
  writeFileSync(scriptPath, editorScript);

  createBackupRef();
  const restoreFlags = suspendHiddenFlags();
  try {
    execSync(`git rebase -i --committer-date-is-author-date ${isRootCommit ? '--root' : `${oldest}~1`}`, {
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...(process.env as Record<string, string>), GIT_SEQUENCE_EDITOR: `"${process.execPath}" "${scriptPath}"` },
    });
  } catch (err) {
    try {
      execSync('git rebase --abort', { stdio: 'pipe' });
      deleteBackupRef();
    } catch { /* ignore */ }
    throw err;
  } finally {
    restoreFlags();
    try { unlinkSync(scriptPath); } catch { /* ignore */ }
  }
}
