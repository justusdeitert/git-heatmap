#!/usr/bin/env node

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { exec } from 'node:child_process'
import { watch } from 'node:fs'
import { join } from 'node:path'
import { isInsideRepo, getGitDir, getRepoName, getRemoteUrl, getCommitDates, getFirstCommitDate, getAuthorCount, getCurrentBranch, getRecentCommits, getCommitCount, getCommitsByDate, getCommitDetail, getCommitEditableStatus, hasUncommittedChanges, rewriteCommitMessage, rewriteCommitDate } from './git.js'
import { buildCommitMap, buildCalendarWeeks, getMonthLabels, computeStats } from './calendar.js'
import { generateHTML } from './html.js'
import { parseArgs } from './args.js'

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  console.log(`
  Usage: git-dashboard [options]

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

function buildDashboard(): string {
  const repoName = getRepoName()
  const remoteUrl = getRemoteUrl()
  const branch = getCurrentBranch()
  const dates = getCommitDates()
  const firstCommit = getFirstCommitDate()
  const authors = getAuthorCount()

  const commitMap = buildCommitMap(dates)
  const weeks = buildCalendarWeeks(commitMap)
  const monthLabels = getMonthLabels(weeks)
  const stats = computeStats(commitMap, dates.length)
  const recentCommits = getRecentCommits()
  const dirty = hasUncommittedChanges()

  return generateHTML({ repoName, remoteUrl, weeks, monthLabels, stats, authors, branch, firstCommit, recentCommits, dirty })
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

  // Watch working tree for file changes; only run git status when something changes
  let lastDirty = hasUncommittedChanges()
  let dirtyDebounce: ReturnType<typeof setTimeout> | null = null
  try {
    watch('.', { recursive: true }, (_event, filename) => {
      if (watchPaused) return
      if (typeof filename === 'string' && (filename.startsWith('.git') || filename.includes('node_modules'))) return
      if (dirtyDebounce) clearTimeout(dirtyDebounce)
      dirtyDebounce = setTimeout(() => {
        const dirty = hasUncommittedChanges()
        if (dirty !== lastDirty) {
          lastDirty = dirty
          notifyClients()
        }
      }, 200)
    })
  } catch { /* recursive watch not supported */ }
}

// --- HTTP server ---

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
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
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const { message } = JSON.parse(body)
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
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: (err as Error).message }))
      }
    })
    return
  }

  if (commitMatch && req.method === 'PUT') {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const { date } = JSON.parse(body)
        if (typeof date !== 'string' || !date.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Date is required' }))
          return
        }
        // Validate it's a parseable date
        if (isNaN(new Date(date).getTime())) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid date format' }))
          return
        }
        rewriteCommitDate(commitMatch[1], date.trim())
        const detail = getCommitDetail(commitMatch[1])
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(detail ?? { ok: true }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: (err as Error).message }))
      }
    })
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
    console.log(`\n  ● Git Dashboard running at ${url}`)
    console.log('  Live-reloads on git changes. Press Ctrl+C to stop.\n')
    if (args.open) openBrowser(url)
  })
}

watchGitDir()
startServer(preferredPort)
