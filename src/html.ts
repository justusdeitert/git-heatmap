import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MonthLabel, Stats, Week } from './types.js'

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

// --- Public API ---

export function buildHeatmapSvg(weeks: Week[], labels: MonthLabel[]): string {
  const svgWidth = LABEL_W + weeks.length * (CELL + GAP)
  const svgHeight = HEADER_H + 7 * (CELL + GAP)
  return `<svg width="${svgWidth}" height="${svgHeight}">
          ${monthLabels(labels)}
          ${dayLabels()}
          ${cells(weeks)}
        </svg>`
}

// --- SPA shell ---

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENT_JS = readFileSync(join(__dirname, '_client_bundle.js'), 'utf-8')
const CLIENT_CSS = readFileSync(join(__dirname, '_client_bundle.css'), 'utf-8')
const PKG_VERSION: string = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')).version

const FAVICON = `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><line x1='0' y1='8' x2='4.5' y2='8' stroke='%231f2328' stroke-width='1.5' stroke-linecap='round'/><circle cx='8' cy='8' r='3.5' stroke='%231f2328' stroke-width='1.5' fill='none'/><line x1='11.5' y1='8' x2='16' y2='8' stroke='%231f2328' stroke-width='1.5' stroke-linecap='round'/></svg>" media="(prefers-color-scheme: light)"><link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><line x1='0' y1='8' x2='4.5' y2='8' stroke='%23e6edf3' stroke-width='1.5' stroke-linecap='round'/><circle cx='8' cy='8' r='3.5' stroke='%23e6edf3' stroke-width='1.5' fill='none'/><line x1='11.5' y1='8' x2='16' y2='8' stroke='%23e6edf3' stroke-width='1.5' stroke-linecap='round'/></svg>" media="(prefers-color-scheme: dark)">`

interface InitialData {
  repoName: string
  remoteUrl: string | null
  branch: string
  stats: Stats
  authors: number
  firstCommit: string | null
  availableYears: number[]
  heatmapSvg: string
  dirtyFiles: Array<{ status: string; file: string }>
  traces: Array<{ hash: string; action: string; detail: string; date: string }>
}

export function generateHTML(data: InitialData): string {
  const payload = JSON.stringify({ ...data, version: PKG_VERSION })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="google" content="notranslate">
  <title>${data.repoName} — Git Heatmap</title>
  ${FAVICON}
  <style>${CLIENT_CSS}</style>
</head>
<body style="opacity:0">
  <div id="app"></div>
  <script>window.__DATA__ = ${payload};</script>
  <script>${CLIENT_JS}</script>
</body>
</html>`
}
