#!/usr/bin/env node

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { exec } from 'node:child_process'
import { watch } from 'node:fs'
import { join } from 'node:path'
import { isInsideRepo, getGitDir, getRepoName, getRemoteUrl, getCommitDates, getFirstCommitDate, getAuthorCount, getCurrentBranch, getRecentCommits, getCommitCount, getCommitsByDate, getCommitDetail, getCommitEditableStatus, getUncommittedFiles, rewriteCommitMessage, rewriteCommitDate, getReflogTraces, clearReflog } from '@/git'
import { buildCommitMap, buildCalendarWeeks, filterCommitMapByYear, getMonthLabels, computeStats } from '@/calendar'
import { generateHTML, buildHeatmapSvg } from '@/html'
import { parseArgs } from '@/args'

// --- Request body parsing with size limit ---

const MAX_BODY_SIZE = 10 * 1024 // 10KB

async function parseRequestBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = ''
    let size = 0

    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_SIZE) {
        req.destroy()
        reject(new Error('Request body too large'))
        return
      }
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        resolve(JSON.parse(body) as T)
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })

    req.on('error', reject)
  })
}

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  console.log(`
  Usage: git-heatmap [options]

  Options:
    --port <number>   Port to listen on (default: 3333, or PORT env)
    --no-open         Don't open browser automatically
    -h, --help        Show this help message
`)
  process.exit(0)
}

if (!isInsideRepo()) {
  console.error('Error: Not a git repository.')
  process.exit(1)
}

// --- Dashboard builder ---

function getInitialData() {
  const repoName = getRepoName()
  const remoteUrl = getRemoteUrl()
  const branch = getCurrentBranch()
  const dates = getCommitDates()
  const firstCommit = getFirstCommitDate()
  const authors = getAuthorCount()

  const commitMap = buildCommitMap(dates)
  const availableYears = [...new Set(dates.map(d => parseInt(d.slice(0, 4), 10)))].sort((a, b) => a - b)
  const defaultYear = availableYears.length > 0 ? availableYears[availableYears.length - 1] : new Date().getFullYear()
  const yearMap = filterCommitMapByYear(commitMap, defaultYear)
  const weeks = buildCalendarWeeks(yearMap, defaultYear)
  const monthLabels = getMonthLabels(weeks)
  const stats = computeStats(commitMap, dates.length)
  const dirtyFiles = getUncommittedFiles()
  const traces = getReflogTraces()
  const heatmapSvg = buildHeatmapSvg(weeks, monthLabels)

  return { repoName, remoteUrl, branch, stats, authors, firstCommit, availableYears, heatmapSvg, dirtyFiles, traces }
}

function buildDashboard(): string {
  const data = getInitialData()
  return generateHTML(data)
}

// --- SSE live-reload ---

const sseClients = new Set<ServerResponse>()

let watchPaused = false

function notifyClients(): void {
  if (watchPaused) return
  for (const res of sseClients) {
    res.write('data: reload\n\n')
  }
}

function watchGitDir(): void {
  const gitDir = getGitDir()
  const targets = [join(gitDir, 'refs'), gitDir]
  let debounce: ReturnType<typeof setTimeout> | null = null

  for (const dir of targets) {
    try {
      watch(dir, { recursive: dir.endsWith('refs') }, () => {
        if (debounce) clearTimeout(debounce)
        debounce = setTimeout(notifyClients, 300)
      })
    } catch { /* dir may not exist yet */ }
  }

  // Watch working tree for file changes; update when dirty files change
  let lastDirtyFiles = JSON.stringify(getUncommittedFiles())
  let dirtyDebounce: ReturnType<typeof setTimeout> | null = null
  const ignoredDirs = ['/node_modules/', '/dist/', '/build/', '/coverage/', '/.next/']
  try {
    watch('.', { recursive: true }, (_event, filename) => {
      if (watchPaused) return
      if (typeof filename === 'string') {
        const normalized = '/' + filename.replace(/\\/g, '/')
        if (normalized.startsWith('/.git/') || ignoredDirs.some(d => normalized.includes(d))) return
      }
      if (dirtyDebounce) clearTimeout(dirtyDebounce)
      dirtyDebounce = setTimeout(() => {
        const dirtyFiles = JSON.stringify(getUncommittedFiles())
        if (dirtyFiles !== lastDirtyFiles) {
          lastDirtyFiles = dirtyFiles
          notifyClients()
        }
      }, 200)
    })
  } catch { /* recursive watch not supported */ }
}

// --- HTTP server ---

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    sseClients.add(res)
    req.on('close', () => sseClients.delete(res))
    return
  }

  const parsed = new URL(req.url ?? '/', `http://${req.headers.host}`)

  const commitMatch = parsed.pathname.match(/^\/api\/commit\/([a-f0-9]+)$/)
  if (commitMatch && req.method === 'PATCH') {
    try {
      const { message } = await parseRequestBody<{ message: string }>(req)
      if (typeof message !== 'string' || !message.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Message is required' }))
        return
      }
      rewriteCommitMessage(commitMatch[1], message.trim())
      const detail = getCommitDetail(commitMatch[1])
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(detail ?? { ok: true }))
    } catch (err) {
      const status = (err as Error).message === 'Request body too large' ? 413 : 500
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: (err as Error).message }))
    }
    return
  }

  if (commitMatch && req.method === 'PUT') {
    try {
      const { date } = await parseRequestBody<{ date: string }>(req)
      if (typeof date !== 'string' || !date.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Date is required' }))
        return
      }
      if (isNaN(new Date(date).getTime())) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid date format. Expected: YYYY-MM-DDTHH:mm:ss±HH:mm' }))
        return
      }
      rewriteCommitDate(commitMatch[1], date.trim())
      const detail = getCommitDetail(commitMatch[1])
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(detail ?? { ok: true }))
    } catch (err) {
      const status = (err as Error).message === 'Request body too large' ? 413 : 500
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: (err as Error).message }))
    }
    return
  }

  if (commitMatch) {
    const detail = getCommitDetail(commitMatch[1])
    if (!detail) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Commit not found' }))
      return
    }
    watchPaused = true
    const editableStatus = getCommitEditableStatus(commitMatch[1])
    // Keep paused past the 300ms debounce window so async watcher events are ignored
    setTimeout(() => { watchPaused = false }, 500)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ ...detail, ...editableStatus }))
    return
  }

  if (parsed.pathname === '/api/stats') {
    const dates = getCommitDates()
    const commitMap = buildCommitMap(dates)
    const statsData = computeStats(commitMap, dates.length)
    const dirtyFilesData = getUncommittedFiles()
    const tracesData = getReflogTraces()
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ stats: statsData, dirtyFiles: dirtyFilesData, traces: tracesData }))
    return
  }

  if (parsed.pathname === '/api/calendar') {
    const yearParam = parsed.searchParams.get('year')
    if (!yearParam || !/^\d{4}$/.test(yearParam)) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'year parameter required' }))
      return
    }
    const year = parseInt(yearParam, 10)
    const dates = getCommitDates()
    const fullMap = buildCommitMap(dates)

    const yearMap = filterCommitMapByYear(fullMap, year)
    const calWeeks = buildCalendarWeeks(yearMap, year)
    const calLabels = getMonthLabels(calWeeks)

    const svg = buildHeatmapSvg(calWeeks, calLabels)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ svg }))
    return
  }

  if (parsed.pathname === '/api/commits') {
    const page = Math.max(1, parseInt(parsed.searchParams.get('page') ?? '1', 10) || 1)
    const date = parsed.searchParams.get('date')
    const perPage = 20

    let total: number
    let commits: ReturnType<typeof getRecentCommits>
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const all = getCommitsByDate(date)
      total = all.length
      commits = all.slice((page - 1) * perPage, page * perPage)
    } else {
      total = getCommitCount()
      commits = getRecentCommits(perPage, (page - 1) * perPage)
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ commits, total, page, perPage, totalPages: Math.ceil(total / perPage) }))
    return
  }

  if (parsed.pathname === '/api/reflog' && req.method === 'DELETE') {
    clearReflog().then(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    }).catch((err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: (err as Error).message }))
    })
    return
  }

  if (parsed.pathname === '/api/reflog' && req.method === 'GET') {
    const traces = getReflogTraces()
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ traces }))
    return
  }

  if (parsed.pathname !== '/' && parsed.pathname !== '/index.html') {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(buildDashboard())
}

function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  exec(`${cmd} ${url}`)
}

// --- Start ---

const preferredPort = args.port ?? parseInt(process.env.PORT ?? '3333', 10)

function startServer(port: number): void {
  const server = createServer(handleRequest)

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      if (args.port) {
        console.error(`Error: Port ${port} is already in use.`)
        process.exit(1)
      }
      startServer(port + 1)
    } else {
      throw err
    }
  })

  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`
    console.log(`\n  ● Git Heatmap running at ${url}`)
    console.log('  Live-reloads on git changes. Press Ctrl+C to stop.\n')
    if (args.open) openBrowser(url)
  })
}

watchGitDir()
startServer(preferredPort)
