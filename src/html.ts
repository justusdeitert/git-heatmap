import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as icons from './icons.js'
import { CSS } from './styles.js'
import type { DashboardData, MonthLabel, RecentCommit, ReflogTrace, Stats, Week } from './types.js'

// --- SVG layout constants ---

const CELL = 12
const GAP = 4
const LABEL_W = 32
const HEADER_H = 20
const DAY_NAMES = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat']

// --- SVG builders ---

function monthLabels(labels: MonthLabel[]): string {
  return labels.map(({ index, name }) =>
    `<text x="${LABEL_W + index * (CELL + GAP)}" y="12" class="month-label">${name}</text>`
  ).join('\n      ')
}

function dayLabels(): string {
  return DAY_NAMES
    .filter(Boolean)
    .map((name) => {
      const i = DAY_NAMES.indexOf(name)
      return `<text x="0" y="${HEADER_H + i * (CELL + GAP) + 10}" class="day-label">${name}</text>`
    })
    .join('\n      ')
}

function cells(weeks: Week[]): string {
  const rects: string[] = []

  for (let wi = 0; wi < weeks.length; wi++) {
    for (let di = 0; di < weeks[wi].length; di++) {
      const day = weeks[wi][di]
      if (day.future) continue

      const x = LABEL_W + wi * (CELL + GAP)
      const y = HEADER_H + di * (CELL + GAP)
      const tip = day.count === 0
        ? `No commits on ${day.date}`
        : `${day.count} commit${day.count > 1 ? 's' : ''} on ${day.date}`

      rects.push(
        `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2"` +
        ` class="day level-${day.level}" data-tooltip="${tip}" data-date="${day.date}" data-count="${day.count}"/>`
      )
    }
  }

  return rects.join('\n      ')
}

// --- HTML helpers ---

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })
}

function statCards(stats: Stats, authors: number): string {
  const items: [string | number, string][] = [
    [stats.total.toLocaleString(), 'Total Commits'],
    [stats.activeDays, 'Active Days (1y)'],
    [stats.streak, 'Current Streak'],
    [stats.longest, 'Longest Streak'],
    [authors, 'Contributors'],
    [stats.busiestCount, 'Busiest Day'],
  ]

  return items
    .map(([value, label]) => `
      <div class="stat-card">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>`)
    .join('')
}

const LEGEND_SVG = `
  <svg width="72" height="12">
    <rect x="0"  y="0" width="12" height="12" rx="2" class="level-0"/>
    <rect x="15" y="0" width="12" height="12" rx="2" class="level-1"/>
    <rect x="30" y="0" width="12" height="12" rx="2" class="level-2"/>
    <rect x="45" y="0" width="12" height="12" rx="2" class="level-3"/>
    <rect x="60" y="0" width="12" height="12" rx="2" class="level-4"/>
  </svg>`

function relativeTime(iso: string): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return 'unknown'
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function commitList(commits: RecentCommit[]): string {
  if (commits.length === 0) return '<div class="commit-empty">No commits found</div>'
  return commits.map(c => {
    const dateMismatch = c.date !== c.committerDate
    const warn = dateMismatch ? '<span class="commit-warn" data-tooltip="Author date and committer date differ">&#9888;</span>' : ''
    const local = !c.onRemote ? '<span class="commit-local" data-tooltip="Not on upstream yet. This commit is still editable.">&#8682;</span>' : ''
    const fullTime = fullDateTime(c.date).replace(/"/g, '&quot;')
    return `
    <div class="commit-row">
      <code class="commit-hash" data-full="${c.fullHash}" title="Click to copy">${c.hash}<svg class="copy-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg></code>
      <span class="commit-msg">${c.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
      <span class="commit-meta">${c.author} &middot; <span class="commit-time-tip" data-tooltip="${fullTime}">${relativeTime(c.date)}</span>${warn}${local}</span>
    </div>`
  }).join('')
}

function tracesPanel(traces: ReflogTrace[]): string {
  if (traces.length === 0) return ''
  const rows = traces.map(t => {
    const msg = t.detail.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const action = t.action.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<div class="trace-row">
      <code class="trace-hash">${t.hash}</code>
      <span class="trace-action">${action}</span>
      <span class="trace-detail">${msg}</span>
      <span class="trace-date">${relativeTime(t.date)}</span>
    </div>`
  }).join('')
  return `
    <div class="card trace-card">
      <div class="card-title">&#9888; History Traces <span class="trace-count">(${traces.length})</span>
        <button class="trace-clear-btn" id="clearTracesBtn">Clear traces</button>
      </div>
      <div class="trace-list" id="traceList">${rows}</div>
    </div>`
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENT_JS = readFileSync(join(__dirname, 'client.js'), 'utf-8')

// --- Page template ---

const FAVICON = `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><line x1='0' y1='8' x2='4.5' y2='8' stroke='%231f2328' stroke-width='1.5' stroke-linecap='round'/><circle cx='8' cy='8' r='3.5' stroke='%231f2328' stroke-width='1.5' fill='none'/><line x1='11.5' y1='8' x2='16' y2='8' stroke='%231f2328' stroke-width='1.5' stroke-linecap='round'/></svg>" media="(prefers-color-scheme: light)"><link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><line x1='0' y1='8' x2='4.5' y2='8' stroke='%23e6edf3' stroke-width='1.5' stroke-linecap='round'/><circle cx='8' cy='8' r='3.5' stroke='%23e6edf3' stroke-width='1.5' fill='none'/><line x1='11.5' y1='8' x2='16' y2='8' stroke='%23e6edf3' stroke-width='1.5' stroke-linecap='round'/></svg>" media="(prefers-color-scheme: dark)">`

export function generateHTML({ repoName, remoteUrl, weeks, monthLabels: labels, stats, authors, branch, firstCommit, recentCommits, dirty, traces }: DashboardData): string {
  const svgWidth = LABEL_W + weeks.length * (CELL + GAP)
  const svgHeight = HEADER_H + 7 * (CELL + GAP)
  const now = new Date().toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const dirtyBanner = dirty ? `
    <div class="dirty-banner">
      <span class="dirty-icon">&#9888;</span>
      You have uncommitted changes in your working directory.
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${repoName} — Git Dashboard</title>
  ${FAVICON}
  <style>${CSS}</style>
</head>
<body>
  <div class="container">
    <header>
      ${icons.repo}
      <h1>${repoName} <span>— Git Dashboard</span></h1>
      <span class="badge">${branch}</span>
    </header>
${dirtyBanner}
    <div class="stats">${statCards(stats, authors)}</div>

    <div class="card">
      <div class="card-title">Commit Activity <span style="color:var(--text-muted);font-weight:400">— last 12 months</span></div>
      <div class="heatmap-scroll">
        <svg width="${svgWidth}" height="${svgHeight}">
          ${monthLabels(labels)}
          ${dayLabels()}
          ${cells(weeks)}
        </svg>
      </div>
      <div class="legend">
        <span class="legend-text">Less</span>${LEGEND_SVG}
        <span class="legend-text">More</span>
      </div>
      <div class="meta">
        <div class="meta-item">${icons.clock} First commit: ${formatDate(firstCommit)}</div>
        <div class="meta-item">${icons.dot} ${remoteUrl ?? '<span style="color:var(--accent)">No remote</span>'}</div>
        <div class="meta-item">${icons.dot} Generated: ${now}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">${icons.gitCommit} Commits <span class="commit-count" id="commitCount"></span> <span id="dateFilter"></span></div>
      <div class="commit-list" id="commitList">${commitList(recentCommits)}</div>
      <div class="pagination" id="pagination"></div>
    </div>
${tracesPanel(traces)}
  </div>

  <footer>Generated by <strong>git-dashboard</strong></footer>

  <div class="tooltip" id="tooltip"></div>
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal" id="commitModal">
      <button class="modal-close" id="modalClose">&times;</button>
      <div id="modalContent"></div>
    </div>
  </div>
  <div class="modal-overlay" id="confirmOverlay">
    <div class="confirm-modal">
      <div class="confirm-title">Clear History Traces</div>
      <div class="confirm-body">This will permanently clear the git reflog and run garbage collection. This action cannot be undone.</div>
      <div class="confirm-error" id="confirmError"></div>
      <div class="confirm-actions">
        <button class="rename-cancel" id="confirmCancel">Cancel</button>
        <button class="confirm-delete" id="confirmOk">Clear traces</button>
      </div>
    </div>
  </div>
  <script>${CLIENT_JS}</script>
</body>
</html>`
}
