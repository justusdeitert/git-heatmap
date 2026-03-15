#!/usr/bin/env node

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { exec } from 'node:child_process'
import { watch } from 'node:fs'
import { join } from 'node:path'
import { isInsideRepo, getGitDir, getRepoName, getRemoteUrl, getCommitDates, getFirstCommitDate, getAuthorCount, getCurrentBranch } from './git.js'
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

  return generateHTML({ repoName, remoteUrl, weeks, monthLabels, stats, authors, branch, firstCommit })
}

// --- SSE live-reload ---

const sseClients = new Set<ServerResponse>()

function notifyClients(): void {
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

  if (req.url !== '/' && req.url !== '/index.html') {
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

const PORT = args.port ?? parseInt(process.env.PORT ?? '3333', 10)

watchGitDir()
createServer(handleRequest).listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`
  console.log(`\n  ● Git Dashboard running at ${url}`)
  console.log('  Live-reloads on git changes. Press Ctrl+C to stop.\n')
  if (args.open) openBrowser(url)
})
