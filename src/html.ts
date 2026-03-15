import * as icons from './icons.js'
import { CSS } from './styles.js'
import type { DashboardData, MonthLabel, RecentCommit, Stats, Week } from './types.js'

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
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
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

function commitList(commits: RecentCommit[]): string {
  if (commits.length === 0) return '<div class="commit-empty">No commits found</div>'
  return commits.map(c => `
    <div class="commit-row">
      <code class="commit-hash">${c.hash}</code>
      <span class="commit-msg">${c.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
      <span class="commit-meta">${c.author} &middot; ${relativeTime(c.date)}</span>
    </div>`).join('')
}

const CLIENT_JS = `
  const t = document.getElementById('tooltip');
  document.querySelectorAll('.day').forEach(el => {
    el.addEventListener('mouseenter', () => { t.textContent = el.dataset.tooltip; t.classList.add('visible'); });
    el.addEventListener('mousemove', e => { t.style.left = e.clientX + 12 + 'px'; t.style.top = e.clientY - 36 + 'px'; });
    el.addEventListener('mouseleave', () => t.classList.remove('visible'));
  });
  new EventSource('/events').addEventListener('message', () => location.reload());`

// --- Page template ---

const FAVICON = `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><line x1='0' y1='8' x2='4.5' y2='8' stroke='%231f2328' stroke-width='1.5' stroke-linecap='round'/><circle cx='8' cy='8' r='3.5' stroke='%231f2328' stroke-width='1.5' fill='none'/><line x1='11.5' y1='8' x2='16' y2='8' stroke='%231f2328' stroke-width='1.5' stroke-linecap='round'/></svg>" media="(prefers-color-scheme: light)"><link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><line x1='0' y1='8' x2='4.5' y2='8' stroke='%23e6edf3' stroke-width='1.5' stroke-linecap='round'/><circle cx='8' cy='8' r='3.5' stroke='%23e6edf3' stroke-width='1.5' fill='none'/><line x1='11.5' y1='8' x2='16' y2='8' stroke='%23e6edf3' stroke-width='1.5' stroke-linecap='round'/></svg>" media="(prefers-color-scheme: dark)">`

export function generateHTML({ repoName, remoteUrl, weeks, monthLabels: labels, stats, authors, branch, firstCommit, recentCommits }: DashboardData): string {
  const svgWidth = LABEL_W + weeks.length * (CELL + GAP)
  const svgHeight = HEADER_H + 7 * (CELL + GAP)
  const now = new Date().toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

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
      <div class="card-title">${icons.gitCommit} Recent Commits</div>
      <div class="commit-list">${commitList(recentCommits)}</div>
    </div>
  </div>

  <footer>Generated by <strong>git-dashboard</strong></footer>

  <div class="tooltip" id="tooltip"></div>
  <script>${CLIENT_JS}</script>
</body>
</html>`
}
