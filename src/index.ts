#!/usr/bin/env node

import { exec } from 'node:child_process';
import { watch } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import { parseArgs } from '@/args';
import { buildCalendarWeeks, buildCommitMap, computeStats, filterCommitMapByYear, getMonthLabels } from '@/calendar';
import {
  abortRebase,
  bulkShiftCommits,
  clearReflog,
  dismissBackup,
  getAuthorCount,
  getAuthorStats,
  getBackupRef,
  getCommitCount,
  getCommitDates,
  getCommitDetail,
  getCommitEditableStatus,
  getCommitsByDate,
  getCurrentBranch,
  getFirstCommitDate,
  getGitDir,
  getMovableCommitDays,
  getRecentCommits,
  getReflogTraces,
  getRemoteUrl,
  getRepoName,
  getUncommittedFiles,
  isInsideRepo,
  isRebaseInProgress,
  removeRemote,
  restoreFromBackup,
  rewriteCommit,
  rewriteCommitMessage,
} from '@/git';
import { buildHeatmapSvg, generateHTML } from '@/html';

// --- Request body parsing with size limit ---

const MAX_BODY_SIZE = 10 * 1024; // 10KB

async function parseRequestBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(body) as T);
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', reject);
  });
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`
  Usage: git-heatmap [options]

  Options:
    --port <number>   Port to listen on (default: 3333, or PORT env)
    --no-open         Don't open browser automatically
    -h, --help        Show this help message
`);
  process.exit(0);
}

if (!isInsideRepo()) {
  console.error('Error: Not a git repository.');
  process.exit(1);
}

// --- Dashboard builder ---

function getInitialData() {
  const repoName = getRepoName();
  const remoteUrl = getRemoteUrl();
  const branch = getCurrentBranch();
  const dates = getCommitDates();
  const firstCommit = getFirstCommitDate();
  const authors = getAuthorCount();

  const commitMap = buildCommitMap(dates);
  const availableYears = [...new Set(dates.map((d) => parseInt(d.slice(0, 4), 10)))].sort((a, b) => a - b);
  const defaultYear = availableYears.length > 0 ? availableYears[availableYears.length - 1] : new Date().getFullYear();
  const yearMap = filterCommitMapByYear(commitMap, defaultYear);
  const weeks = buildCalendarWeeks(yearMap, defaultYear);
  const monthLabels = getMonthLabels(weeks);
  const movableDays = getMovableCommitDays(defaultYear);
  const stats = computeStats(commitMap, dates.length);
  const dirtyFiles = getUncommittedFiles();
  const traces = getReflogTraces();
  const heatmapSvg = buildHeatmapSvg(weeks, monthLabels, movableDays);

  return { repoName, remoteUrl, branch, stats, authors, firstCommit, availableYears, heatmapSvg, dirtyFiles, traces };
}

function buildDashboard(): string {
  const data = getInitialData();
  return generateHTML(data);
}

// --- SSE live-reload ---

const sseClients = new Set<ServerResponse>();

const REFS_DEBOUNCE_MS = 300;
const DIRTY_DEBOUNCE_MS = 200;
const WATCH_PAUSE_MS = 500;
const PER_PAGE = 20;

let watchPaused = false;

function notifyClients(): void {
  if (watchPaused) return;
  for (const res of sseClients) {
    res.write('data: reload\n\n');
  }
}

function watchGitDir(): void {
  const gitDir = getGitDir();
  const targets = [join(gitDir, 'refs'), gitDir];
  let debounce: ReturnType<typeof setTimeout> | null = null;

  for (const dir of targets) {
    try {
      watch(dir, { recursive: dir.endsWith('refs') }, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(notifyClients, REFS_DEBOUNCE_MS);
      });
    } catch {
      /* dir may not exist yet */
    }
  }

  // Watch working tree for file changes; update when dirty files change
  let lastDirtyFiles = JSON.stringify(getUncommittedFiles());
  let dirtyDebounce: ReturnType<typeof setTimeout> | null = null;
  const ignoredDirs = ['/node_modules/', '/dist/', '/build/', '/coverage/', '/.next/'];
  try {
    watch('.', { recursive: true }, (_event, filename) => {
      if (watchPaused) return;
      if (typeof filename === 'string') {
        const normalized = `/${filename.replace(/\\/g, '/')}`;
        if (normalized.startsWith('/.git/') || ignoredDirs.some((d) => normalized.includes(d))) return;
      }
      if (dirtyDebounce) clearTimeout(dirtyDebounce);
      dirtyDebounce = setTimeout(() => {
        const dirtyFiles = JSON.stringify(getUncommittedFiles());
        if (dirtyFiles !== lastDirtyFiles) {
          lastDirtyFiles = dirtyFiles;
          notifyClients();
        }
      }, DIRTY_DEBOUNCE_MS);
    });
  } catch {
    /* recursive watch not supported */
  }
}

// --- Route handlers ---

function handleSSE(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
}

async function handleCommitRename(req: IncomingMessage, res: ServerResponse, hash: string): Promise<void> {
  try {
    const { message } = await parseRequestBody<{ message: string }>(req);
    if (typeof message !== 'string' || !message.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Message is required' }));
      return;
    }
    rewriteCommitMessage(hash, message.trim());
    const detail = getCommitDetail(hash);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(detail ?? { ok: true }));
  } catch (err) {
    const status = (err as Error).message === 'Request body too large' ? 413 : 500;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

async function handleCommitDateUpdate(req: IncomingMessage, res: ServerResponse, hash: string): Promise<void> {
  try {
    const body = await parseRequestBody<{
      date?: string;
      authorDate?: string;
      committerDate?: string;
      author?: string;
      committer?: string;
      preserveTimestamps?: boolean;
    }>(req);
    let authorDate: string;
    let committerDate: string | undefined;

    if (body.date) {
      authorDate = body.date.trim();
    } else if (body.authorDate) {
      authorDate = body.authorDate.trim();
      committerDate = body.committerDate?.trim();
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Date is required' }));
      return;
    }

    if (Number.isNaN(new Date(authorDate).getTime())) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid author date format. Expected: YYYY-MM-DDTHH:mm:ss±HH:mm' }));
      return;
    }
    if (committerDate && Number.isNaN(new Date(committerDate).getTime())) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid committer date format. Expected: YYYY-MM-DDTHH:mm:ss±HH:mm' }));
      return;
    }

    // Parse author/committer identity
    const authorPattern = /^.+\s<.+>$/;
    let authorStr: string | undefined;
    let committerName: string | undefined;
    let committerEmail: string | undefined;

    if (body.author) {
      if (!authorPattern.test(body.author.trim())) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid author format. Expected: Name <email>' }));
        return;
      }
      authorStr = body.author.trim();
    }
    if (body.committer) {
      if (!authorPattern.test(body.committer.trim())) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid committer format. Expected: Name <email>' }));
        return;
      }
      const cMatch = body.committer.trim().match(/^(.+)\s<(.+)>$/);
      if (cMatch) {
        committerName = cMatch[1];
        committerEmail = cMatch[2];
      }
    }

    rewriteCommit(hash, {
      authorDate,
      committerDate,
      author: authorStr,
      committerName,
      committerEmail,
      preserveTimestamps: body.preserveTimestamps !== false,
    });
    const detail = getCommitDetail(hash);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(detail ?? { ok: true }));
  } catch (err) {
    const status = (err as Error).message === 'Request body too large' ? 413 : 500;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

async function handleBulkShift(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseRequestBody<{ hashes?: string[]; shiftMs?: number }>(req);

    if (!Array.isArray(body.hashes) || body.hashes.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'hashes must be a non-empty array' }));
      return;
    }
    if (typeof body.shiftMs !== 'number' || body.shiftMs === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'shiftMs must be a non-zero number' }));
      return;
    }
    // Validate hash format
    const hashPattern = /^[a-f0-9]{4,40}$/;
    if (!body.hashes.every((h) => hashPattern.test(h))) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid hash format' }));
      return;
    }

    // Validate all commits are editable (not pushed to remote)
    for (const h of body.hashes) {
      const status = getCommitEditableStatus(h);
      if (!status.editable) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: status.reason || `Commit ${h} is not editable` }));
        return;
      }
    }

    bulkShiftCommits(body.hashes, body.shiftMs);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, shifted: body.hashes.length }));
  } catch (err) {
    const status = (err as Error).message === 'Request body too large' ? 413 : 500;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

async function handleDayShift(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseRequestBody<{ sourceDate?: string; targetDate?: string }>(req);
    const sourceDate = body.sourceDate?.trim();
    const targetDate = body.targetDate?.trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!sourceDate || !targetDate || !datePattern.test(sourceDate) || !datePattern.test(targetDate)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'sourceDate and targetDate must use YYYY-MM-DD format' }));
      return;
    }
    if (sourceDate === targetDate) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Source and target day must be different' }));
      return;
    }

    const commits = getCommitsByDate(sourceDate);
    if (commits.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `No commits found on ${sourceDate}` }));
      return;
    }

    for (const commit of commits) {
      const status = getCommitEditableStatus(commit.fullHash);
      if (!status.editable) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: status.reason || `Commit ${commit.hash} on ${sourceDate} is not editable`,
          }),
        );
        return;
      }
    }

    const shiftMs = new Date(`${targetDate}T12:00:00`).getTime() - new Date(`${sourceDate}T12:00:00`).getTime();
    if (shiftMs === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Source and target day must be different' }));
      return;
    }

    bulkShiftCommits(
      commits.map((commit) => commit.fullHash),
      shiftMs,
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, shifted: commits.length }));
  } catch (err) {
    const status = (err as Error).message === 'Request body too large' ? 413 : 500;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function handleCommitDetail(res: ServerResponse, hash: string): void {
  try {
    const detail = getCommitDetail(hash);
    if (!detail) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Commit not found' }));
      return;
    }
    watchPaused = true;
    const editableStatus = getCommitEditableStatus(hash);
    setTimeout(() => {
      watchPaused = false;
    }, WATCH_PAUSE_MS);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ...detail, ...editableStatus }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function handleStats(res: ServerResponse): void {
  try {
    const dates = getCommitDates();
    const commitMap = buildCommitMap(dates);
    const statsData = computeStats(commitMap, dates.length);
    const dirtyFilesData = getUncommittedFiles();
    const tracesData = getReflogTraces();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ stats: statsData, dirtyFiles: dirtyFilesData, traces: tracesData }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function handleCalendar(res: ServerResponse, searchParams: URLSearchParams): void {
  const yearParam = searchParams.get('year');
  if (!yearParam || !/^\d{4}$/.test(yearParam)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'year parameter required' }));
    return;
  }
  const year = parseInt(yearParam, 10);
  if (year < 1970 || year > new Date().getFullYear() + 1) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'year out of range' }));
    return;
  }
  try {
    const dates = getCommitDates();
    const fullMap = buildCommitMap(dates);
    const yearMap = filterCommitMapByYear(fullMap, year);
    const calWeeks = buildCalendarWeeks(yearMap, year);
    const calLabels = getMonthLabels(calWeeks);
    const movableDays = getMovableCommitDays(year);
    const svg = buildHeatmapSvg(calWeeks, calLabels, movableDays);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ svg }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function handleCommits(res: ServerResponse, searchParams: URLSearchParams): void {
  try {
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const date = searchParams.get('date');
    let total: number;
    let commits: ReturnType<typeof getRecentCommits>;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const all = getCommitsByDate(date);
      total = all.length;
      commits = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    } else {
      total = getCommitCount();
      commits = getRecentCommits(PER_PAGE, (page - 1) * PER_PAGE);
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ commits, total, page, perPage: PER_PAGE, totalPages: Math.ceil(total / PER_PAGE) }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function handleReflogDelete(res: ServerResponse): void {
  clearReflog()
    .then(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    })
    .catch((err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (err as Error).message }));
    });
}

function handleReflogGet(res: ServerResponse): void {
  try {
    const traces = getReflogTraces();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ traces }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function handleDashboard(res: ServerResponse): void {
  try {
    const html = buildDashboard();
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Internal Server Error: ${(err as Error).message}`);
  }
}

function handleAuthors(res: ServerResponse): void {
  try {
    const authors = getAuthorStats();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ authors }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function handleRebaseStatus(res: ServerResponse): void {
  try {
    const inProgress = isRebaseInProgress();
    const hasBackup = getBackupRef() !== null;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ inProgress, hasBackup }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function handleRebaseAbort(res: ServerResponse): void {
  try {
    abortRebase();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function handleRebaseRestore(res: ServerResponse): void {
  try {
    restoreFromBackup();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function gitUrlToHttps(url: string): string | null {
  // SSH format: git@github.com:user/repo.git
  const sshMatch = url.match(/^git@([^:]+):(.+?)(\.git)?$/);
  if (sshMatch) return `https://${sshMatch[1]}/${sshMatch[2]}`;
  // HTTPS format: https://github.com/user/repo.git
  const httpsMatch = url.match(/^https?:\/\/(.+?)(?:\.git)?$/);
  if (httpsMatch) return `https://${httpsMatch[1]}`;
  return null;
}

function handleRemoteRemove(res: ServerResponse): void {
  try {
    removeRemote();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function handleRemoteCheck(res: ServerResponse): void {
  const raw = getRemoteUrl();
  if (!raw) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ online: false, url: null }));
    return;
  }
  const httpsUrl = gitUrlToHttps(raw);
  exec('git ls-remote --heads origin', { timeout: 10000 }, (err: Error | null) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ online: !err, url: httpsUrl }));
  });
}

function handleRebaseDismiss(res: ServerResponse): void {
  try {
    dismissBackup();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

// --- HTTP router ---

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.url === '/events') return handleSSE(req, res);

  const parsed = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const commitMatch = parsed.pathname.match(/^\/api\/commit\/([a-f0-9]+)$/);

  if (commitMatch && req.method === 'PATCH') return handleCommitRename(req, res, commitMatch[1]);
  if (commitMatch && req.method === 'PUT') return handleCommitDateUpdate(req, res, commitMatch[1]);
  if (commitMatch) return handleCommitDetail(res, commitMatch[1]);
  if (parsed.pathname === '/api/stats') return handleStats(res);
  if (parsed.pathname === '/api/calendar') return handleCalendar(res, parsed.searchParams);
  if (parsed.pathname === '/api/commits/bulk-shift' && req.method === 'PUT') return handleBulkShift(req, res);
  if (parsed.pathname === '/api/commits/day-shift' && req.method === 'PUT') return handleDayShift(req, res);
  if (parsed.pathname === '/api/commits') return handleCommits(res, parsed.searchParams);
  if (parsed.pathname === '/api/authors') return handleAuthors(res);
  if (parsed.pathname === '/api/rebase' && req.method === 'GET') return handleRebaseStatus(res);
  if (parsed.pathname === '/api/rebase/abort' && req.method === 'POST') return handleRebaseAbort(res);
  if (parsed.pathname === '/api/rebase/restore' && req.method === 'POST') return handleRebaseRestore(res);
  if (parsed.pathname === '/api/rebase/dismiss' && req.method === 'POST') return handleRebaseDismiss(res);
  if (parsed.pathname === '/api/reflog' && req.method === 'DELETE') return handleReflogDelete(res);
  if (parsed.pathname === '/api/reflog' && req.method === 'GET') return handleReflogGet(res);
  if (parsed.pathname === '/api/remote-check') return handleRemoteCheck(res);
  if (parsed.pathname === '/api/remote' && req.method === 'DELETE') return handleRemoteRemove(res);

  if (parsed.pathname !== '/' && parsed.pathname !== '/index.html') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  return handleDashboard(res);
}

function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} ${url}`);
}

// --- Start ---

const preferredPort = args.port ?? parseInt(process.env.PORT ?? '3333', 10);

function startServer(port: number): void {
  const server = createServer(handleRequest);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      if (args.port) {
        console.error(`Error: Port ${port} is already in use.`);
        process.exit(1);
      }
      startServer(port + 1);
    } else {
      throw err;
    }
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`\n  ● Git Heatmap running at ${url}`);
    console.log('  Live-reloads on git changes. Press Ctrl+C to stop.\n');
    if (args.open) openBrowser(url);
  });
}

watchGitDir();
startServer(preferredPort);
