// Client-side dashboard script
// Compiled separately (tsconfig.client.json) and injected into the HTML template at runtime.

const tooltip = document.getElementById('tooltip')!

document.querySelectorAll<HTMLElement>('.day').forEach(el => {
  el.addEventListener('mouseenter', () => {
    tooltip.textContent = el.dataset.tooltip ?? ''
    tooltip.classList.add('visible')
  })
  el.addEventListener('mousemove', e => {
    tooltip.style.left = e.clientX + 12 + 'px'
    tooltip.style.top = e.clientY - 36 + 'px'
  })
  el.addEventListener('mouseleave', () => tooltip.classList.remove('visible'))
  el.addEventListener('click', () => {
    const date = el.dataset.date
    if (!date) return
    if (activeDate === date) {
      clearDateFilter()
    } else {
      filterByDate(date)
    }
  })
})

new EventSource('/events').addEventListener('message', () => location.reload())

const COPY_ICON = '<svg class="copy-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>'
const CHECK_ICON = '<svg class="copy-icon copied" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>'

function bindCopyHandlers(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.commit-hash').forEach(el => {
    el.addEventListener('click', async () => {
      const full = el.dataset.full
      if (!full) return
      await navigator.clipboard.writeText(full)
      const original = el.innerHTML
      el.innerHTML = el.textContent + ' ' + CHECK_ICON
      el.classList.add('hash-copied')
      setTimeout(() => {
        el.innerHTML = original
        el.classList.remove('hash-copied')
      }, 1500)
    })
  })
}

let currentPage = 1
let activeDate: string | null = null

function filterByDate(date: string): void {
  activeDate = date
  document.querySelectorAll<HTMLElement>('.day').forEach(d => {
    d.classList.toggle('day-selected', d.dataset.date === date)
  })
  updateFilterBadge()
  loadCommits(1).then(scrollToCommits)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- called from inline onclick
function clearDateFilter(): void {
  activeDate = null
  document.querySelectorAll<HTMLElement>('.day-selected').forEach(d => d.classList.remove('day-selected'))
  updateFilterBadge()
  loadCommits(1)
}

function updateFilterBadge(): void {
  const badge = document.getElementById('dateFilter')!
  if (activeDate) {
    const formatted = new Date(activeDate + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
    badge.innerHTML = '<span class="filter-badge">' + formatted + ' <button class="filter-clear" onclick="clearDateFilter()">&times;</button></span>'
  } else {
    badge.innerHTML = ''
  }
}

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h ago'
  const d = Math.floor(h / 24)
  if (d < 30) return d + 'd ago'
  return Math.floor(d / 30) + 'mo ago'
}

function esc(s: string): string {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface CommitEntry {
  hash: string
  fullHash: string
  message: string
  author: string
  date: string
}

interface CommitResponse {
  commits: CommitEntry[]
  total: number
  page: number
  totalPages: number
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- called from inline onclick handlers
async function loadCommits(page: number): Promise<void> {
  let url = '/api/commits?page=' + page
  if (activeDate) url += '&date=' + activeDate
  const res = await fetch(url)
  const data: CommitResponse = await res.json()
  currentPage = data.page

  const list = document.getElementById('commitList')!
  const countEl = document.getElementById('commitCount')!
  countEl.textContent = '(' + data.total + ')'

  if (data.commits.length === 0) {
    list.innerHTML = '<div class="commit-empty">No commits found</div>'
  } else {
    list.innerHTML = data.commits.map(c =>
      '<div class="commit-row">' +
      '<code class="commit-hash" data-full="' + c.fullHash + '" title="Click to copy">' + c.hash + COPY_ICON + '</code>' +
      '<span class="commit-msg">' + esc(c.message) + '</span>' +
      '<span class="commit-meta">' + esc(c.author) + ' &middot; ' + relTime(c.date) + '</span>' +
      '</div>'
    ).join('')
    bindCopyHandlers(list)
    bindCommitClickHandlers(list)
  }

  const pag = document.getElementById('pagination')!
  if (data.totalPages <= 1) { pag.innerHTML = ''; return }

  let html = '<button class="pag-btn" ' + (page <= 1 ? 'disabled' : '') + ' onclick="loadCommits(' + (page - 1) + ')">&larr;</button>'
  html += '<span class="pag-info">Page ' + page + ' of ' + data.totalPages + '</span>'
  html += '<button class="pag-btn" ' + (page >= data.totalPages ? 'disabled' : '') + ' onclick="loadCommits(' + (page + 1) + ')">&rarr;</button>'
  pag.innerHTML = html
}

// Scroll to commits panel when filtering
function scrollToCommits(): void {
  document.getElementById('commitList')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// --- Commit detail modal ---

interface CommitDetailData {
  hash: string
  fullHash: string
  subject: string
  body: string
  author: string
  authorDate: string
  committer: string
  committerDate: string
  stats: string
}

const modalOverlay = document.getElementById('modalOverlay')!
const modalContent = document.getElementById('modalContent')!
const modalClose = document.getElementById('modalClose')!

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function colorizeStatLine(line: string): string {
  const escaped = esc(line)
  // Match: filename | count ++++----
  const match = escaped.match(/^(.+?)(\|)(\s*\d+\s*)(.*?)$/)
  if (!match) return '<span class="stat-summary">' + escaped + '</span>'
  const [, file, pipe, count, bar] = match
  const coloredBar = bar.replace(/(\++|-+)/g, (m) => m[0] === '+' ? '<span class="stat-add">' + m + '</span>' : '<span class="stat-del">' + m + '</span>')
  return '<span class="stat-filename">' + file + '</span>' + pipe + '<span class="stat-count">' + count + '</span>' + coloredBar
}

function colorizeSummary(line: string): string {
  return esc(line)
    .replace(/(\d+ files? changed)/, '<span class="stat-summary">$1</span>')
    .replace(/(\d+ insertions?\(\+\))/, '<span class="stat-add">$1</span>')
    .replace(/(\d+ deletions?\(-\))/, '<span class="stat-del">$1</span>')
}

function renderModal(d: CommitDetailData): void {
  const bodyHtml = d.body ? '<div class="modal-body">' + esc(d.body).replace(/\n/g, '<br>') + '</div>' : ''
  const statsLines = d.stats.split('\n')
  const summary = statsLines[statsLines.length - 1] || ''
  const files = statsLines.slice(0, -1)

  let html = '<div class="modal-header">'
  html += '<code class="modal-hash" data-full="' + d.fullHash + '" title="Click to copy">' + d.fullHash + COPY_ICON + '</code>'
  html += '</div>'
  html += '<div class="modal-subject">' + esc(d.subject) + '</div>'
  html += bodyHtml
  html += '<div class="modal-meta">'
  html += '<div class="modal-meta-row"><span class="modal-meta-label">Author</span> ' + esc(d.author) + ',&ensp;' + relTime(d.authorDate) + ' <span class="modal-meta-date">(' + formatFullDate(d.authorDate) + ')</span></div>'
  if (d.committer !== d.author || d.committerDate !== d.authorDate) {
    html += '<div class="modal-meta-row"><span class="modal-meta-label">Committer</span> ' + esc(d.committer) + ',&ensp;' + relTime(d.committerDate) + ' <span class="modal-meta-date">(' + formatFullDate(d.committerDate) + ')</span></div>'
  }
  html += '</div>'
  if (files.length > 0) {
    html += '<div class="modal-stats">'
    html += '<div class="modal-stats-summary">' + colorizeSummary(summary.trim()) + '</div>'
    html += '<div class="modal-files">' + files.map(f => '<div class="modal-file">' + colorizeStatLine(f.trim()) + '</div>').join('') + '</div>'
    html += '</div>'
  }
  modalContent.innerHTML = html

  // Bind copy on modal hash
  const hashEl = modalContent.querySelector<HTMLElement>('.modal-hash')
  if (hashEl) {
    hashEl.addEventListener('click', async () => {
      const full = hashEl.dataset.full
      if (!full) return
      await navigator.clipboard.writeText(full)
      const original = hashEl.innerHTML
      hashEl.innerHTML = hashEl.textContent + ' ' + CHECK_ICON
      hashEl.classList.add('hash-copied')
      setTimeout(() => {
        hashEl.innerHTML = original
        hashEl.classList.remove('hash-copied')
      }, 1500)
    })
  }
}

async function showCommitDetail(fullHash: string): Promise<void> {
  modalContent.innerHTML = '<div class="modal-loading">Loading...</div>'
  modalOverlay.classList.add('visible')
  document.body.style.overflow = 'hidden'
  try {
    const res = await fetch('/api/commit/' + fullHash)
    if (!res.ok) throw new Error('Not found')
    const data: CommitDetailData = await res.json()
    renderModal(data)
  } catch {
    modalContent.innerHTML = '<div class="modal-loading">Failed to load commit details</div>'
  }
}

function closeModal(): void {
  modalOverlay.classList.remove('visible')
  document.body.style.overflow = ''
}

modalClose.addEventListener('click', closeModal)
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal()
})
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal()
})

function bindCommitClickHandlers(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.commit-row').forEach(row => {
    const msgEl = row.querySelector<HTMLElement>('.commit-msg')
    const metaEl = row.querySelector<HTMLElement>('.commit-meta')
    const hashEl = row.querySelector<HTMLElement>('.commit-hash')
    const fullHash = hashEl?.dataset.full
    if (!fullHash) return
    const handler = () => showCommitDetail(fullHash)
    msgEl?.addEventListener('click', handler)
    metaEl?.addEventListener('click', handler)
  })
}

loadCommits(1)
