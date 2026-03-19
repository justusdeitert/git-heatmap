// Client-side dashboard script
// Compiled separately (tsconfig.client.json) and injected into the HTML template at runtime.

const tooltip = document.getElementById('tooltip')!

function positionTooltipLeftOfCursor(e: MouseEvent): void {
  const x = Math.max(8, e.clientX - tooltip.offsetWidth - 12)
  tooltip.style.left = x + 'px'
  tooltip.style.top = e.clientY - 36 + 'px'
}

function bindHeatmapCellHandlers(): void {
  document.querySelectorAll<HTMLElement>('.day').forEach(el => {
    el.addEventListener('mouseenter', () => {
      tooltip.textContent = el.dataset.tooltip ?? ''
      tooltip.classList.add('visible')
    })
    el.addEventListener('mousemove', e => {
      positionTooltipLeftOfCursor(e)
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
}

bindHeatmapCellHandlers()

// Dirty files toggle with persistence
const dirtyBanner = document.querySelector('.dirty-banner')
const dirtyToggle = document.querySelector('.dirty-toggle')
if (dirtyBanner && dirtyToggle) {
  if (sessionStorage.getItem('dirtyFilesExpanded') === 'true') {
    dirtyBanner.classList.add('expanded')
  }
  dirtyToggle.addEventListener('click', () => {
    dirtyBanner.classList.toggle('expanded')
    sessionStorage.setItem('dirtyFilesExpanded', dirtyBanner.classList.contains('expanded') ? 'true' : 'false')
  })
}

let reloadSuppressed = false
new EventSource('/events').addEventListener('message', () => {
  if (!reloadSuppressed) location.reload()
})

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
let activeYear: number | null = (() => {
  const el = document.querySelector<HTMLElement>('.year-link.year-active')
  return el ? parseInt(el.dataset.year!, 10) : null
})()

function saveState(): void {
  sessionStorage.setItem('ghm_page', String(currentPage))
  if (activeDate) sessionStorage.setItem('ghm_date', activeDate)
  else sessionStorage.removeItem('ghm_date')
  if (activeYear !== null) sessionStorage.setItem('ghm_year', String(activeYear))
  else sessionStorage.removeItem('ghm_year')
}

function applyDaySelection(): void {
  document.querySelectorAll<HTMLElement>('.day').forEach(d => {
    d.classList.toggle('day-selected', d.dataset.date === activeDate)
  })
  updateFilterBadge()
}

function filterByDate(date: string): void {
  activeDate = date
  applyDaySelection()
  saveState()
  loadCommits(1).then(scrollToCommits)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- called from inline onclick
function clearDateFilter(): void {
  activeDate = null
  applyDaySelection()
  saveState()
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

function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
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
  committerDate: string
  onRemote: boolean
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
  saveState()

  const list = document.getElementById('commitList')!
  const countEl = document.getElementById('commitCount')!
  countEl.textContent = '(' + data.total + ')'

  if (data.commits.length === 0) {
    list.innerHTML = '<div class="commit-empty">No commits found</div>'
  } else {
    list.innerHTML = data.commits.map(c => {
      const dateMismatch = c.date !== c.committerDate
      const warn = dateMismatch ? '<span class="commit-warn" data-tooltip="Author date and committer date differ">&#9888;</span>' : ''
      const local = !c.onRemote ? '<span class="commit-local" data-tooltip="Not on upstream yet. This commit is still editable.">&#8682;</span>' : ''
      return '<div class="commit-row">' +
        '<code class="commit-hash" data-full="' + c.fullHash + '" title="Click to copy">' + c.hash + COPY_ICON + '</code>' +
        '<span class="commit-msg">' + esc(c.message) + '</span>' +
        '<span class="commit-meta">' + esc(c.author) + ' &middot; ' + fullDateTime(c.date) + warn + local + '</span>' +
        '</div>'
    }).join('')
    bindCopyHandlers(list)
    bindCommitClickHandlers(list)
    bindWarnTooltips(list)
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
  editable: boolean
  reason?: string
}

const modalOverlay = document.getElementById('modalOverlay')!
const modalContent = document.getElementById('modalContent')!
const modalClose = document.getElementById('modalClose')!

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString('en', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function toLocalISOString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absOff = Math.abs(offset)
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' +
    pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) +
    sign + pad(Math.floor(absOff / 60)) + ':' + pad(absOff % 60)
}

function toLocalDateTimeValue(iso: string): string {
  return toLocalISOString(new Date(iso)).slice(0, 19)
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

const EDIT_ICON = '<svg class="edit-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"/></svg>'

let currentModalHash = ''

function renderModal(d: CommitDetailData): void {
  currentModalHash = d.fullHash
  const bodyHtml = d.body ? '<div class="modal-body">' + esc(d.body).replace(/\n/g, '<br>') + '</div>' : ''
  const statsLines = d.stats.split('\n')
  const summary = statsLines[statsLines.length - 1] || ''
  const files = statsLines.slice(0, -1)

  // Build fullMessage for editing (subject + body)
  const fullMessage = d.body ? d.subject + '\n\n' + d.body : d.subject

  let html = ''
  // Update hash in top bar
  const hashEl = document.getElementById('modalHash')!
  hashEl.dataset.full = d.fullHash
  hashEl.title = 'Click to copy'
  hashEl.innerHTML = d.fullHash + COPY_ICON
  if (!d.editable && d.reason) {
    html += '<div class="modal-edit-notice"><span class="dirty-icon">&#9888;</span>' + esc(d.reason) + '</div>'
  }
  if (d.committerDate !== d.authorDate) {
    html += '<div class="modal-edit-notice"><span class="dirty-icon">&#9888;</span>Author date and committer date differ. This commit may have been amended or rebased.</div>'
  }
  html += '<div class="modal-subject-row">'
  html += '<div class="modal-subject">' + esc(d.subject) + '</div>'
  if (d.editable) {
    html += '<button class="rename-btn" id="renameBtn" title="Rename commit message">' + EDIT_ICON + '</button>'
  }
  html += '</div>'
  if (d.editable) {
    html += '<div class="rename-form" id="renameForm" style="display:none">'
    html += '<textarea class="rename-input" id="renameInput" rows="3">' + esc(fullMessage) + '</textarea>'
    html += '<div class="rename-actions">'
    html += '<button class="rename-cancel" id="renameCancel">Cancel</button>'
    html += '<button class="rename-save" id="renameSave">Rename</button>'
    html += '</div>'
    html += '<div class="rename-error" id="renameError"></div>'
    html += '</div>'
  }
  html += bodyHtml
  html += '<div class="modal-meta">'
  const showCommitterRow = d.committer !== d.author || d.committerDate !== d.authorDate
  html += '<div class="modal-meta-row"><span class="modal-meta-label">Author</span> ' + esc(d.author) + ',&ensp;' + relTime(d.authorDate) + ' <span class="modal-meta-date">(' + formatFullDate(d.authorDate) + ')</span>'
  if (d.editable && !showCommitterRow) {
    html += ' <button class="date-edit-btn" id="dateEditBtn" title="Change commit date">' + EDIT_ICON + '</button>'
  }
  html += '</div>'
  if (!showCommitterRow && d.editable) {
    html += '<div class="date-edit-form" id="dateEditForm" style="display:none">'
    html += '<div class="date-edit-row">'
    html += '<input type="datetime-local" class="date-edit-input" id="dateEditInput" step="1" value="' + toLocalDateTimeValue(d.authorDate) + '">'
    html += '<button class="rename-cancel" id="dateEditCancel">Cancel</button>'
    html += '<button class="rename-save" id="dateEditSave">Save Date</button>'
    html += '</div>'
    html += '<div class="rename-error" id="dateEditError"></div>'
    html += '</div>'
  }
  if (showCommitterRow) {
    html += '<div class="modal-meta-row"><span class="modal-meta-label">Committer</span> ' + esc(d.committer) + ',&ensp;' + relTime(d.committerDate) + ' <span class="modal-meta-date">(' + formatFullDate(d.committerDate) + ')</span>'
    if (d.editable) {
      html += ' <button class="date-edit-btn" id="dateEditBtn" title="Change commit date">' + EDIT_ICON + '</button>'
    }
    html += '</div>'
    if (d.editable) {
      html += '<div class="date-edit-form" id="dateEditForm" style="display:none">'
      html += '<div class="date-edit-row">'
      html += '<input type="datetime-local" class="date-edit-input" id="dateEditInput" step="1" value="' + toLocalDateTimeValue(d.authorDate) + '">'
      html += '<button class="rename-cancel" id="dateEditCancel">Cancel</button>'
      html += '<button class="rename-save" id="dateEditSave">Save Date</button>'
      html += '</div>'
      html += '<div class="rename-error" id="dateEditError"></div>'
      html += '</div>'
    }
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
  hashEl.onclick = async () => {
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
  }

  // Bind rename handlers
  const renameBtn = document.getElementById('renameBtn')
  const renameForm = document.getElementById('renameForm')
  const renameInput = document.getElementById('renameInput') as HTMLTextAreaElement | null
  const renameCancel = document.getElementById('renameCancel')
  const renameSave = document.getElementById('renameSave')
  const renameError = document.getElementById('renameError')
  const subjectEl = modalContent.querySelector<HTMLElement>('.modal-subject')
  const bodyEl = modalContent.querySelector<HTMLElement>('.modal-body')

  if (renameBtn && renameForm && renameInput) {
    renameBtn.addEventListener('click', () => {
      renameForm.style.display = 'block'
      renameBtn.style.display = 'none'
      if (subjectEl) subjectEl.style.display = 'none'
      if (bodyEl) bodyEl.style.display = 'none'
      // Auto-size textarea to fit content
      renameInput.style.height = 'auto'
      renameInput.style.height = renameInput.scrollHeight + 'px'
      renameInput.focus()
      renameInput.setSelectionRange(renameInput.value.length, renameInput.value.length)
    })

    renameCancel?.addEventListener('click', () => {
      renameForm.style.display = 'none'
      renameBtn.style.display = ''
      if (subjectEl) subjectEl.style.display = ''
      if (bodyEl) bodyEl.style.display = ''
      if (renameError) renameError.textContent = ''
    })

    renameSave?.addEventListener('click', async () => {
      const newMsg = renameInput.value.trim()
      if (!newMsg) return
      renameSave.setAttribute('disabled', 'true')
      renameSave.textContent = 'Renaming...'
      if (renameError) renameError.textContent = ''
      reloadSuppressed = true
      try {
        const res = await fetch('/api/commit/' + currentModalHash, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: newMsg })
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to rename')
        }
        // Reload the modal with fresh data and refresh commits
        reloadSuppressed = false
        closeModal()
        loadCommits(currentPage)
      } catch (err) {
        if (renameError) renameError.textContent = (err as Error).message
        renameSave.removeAttribute('disabled')
        renameSave.textContent = 'Rename'
        // Keep reload suppressed briefly so delayed SSE events don't close the modal
        setTimeout(() => { reloadSuppressed = false }, 2000)
      }
    })
  }

  // Bind date edit handlers
  const dateEditBtn = document.getElementById('dateEditBtn')
  const dateEditForm = document.getElementById('dateEditForm')
  const dateEditInput = document.getElementById('dateEditInput') as HTMLInputElement | null
  const dateEditCancel = document.getElementById('dateEditCancel')
  const dateEditSave = document.getElementById('dateEditSave')
  const dateEditError = document.getElementById('dateEditError')

  if (dateEditBtn && dateEditForm && dateEditInput) {
    dateEditBtn.addEventListener('click', () => {
      dateEditForm.style.display = 'block'
      dateEditBtn.style.display = 'none'
      dateEditInput.focus()
    })

    dateEditCancel?.addEventListener('click', () => {
      dateEditForm.style.display = 'none'
      dateEditBtn.style.display = ''
      if (dateEditError) dateEditError.textContent = ''
    })

    dateEditSave?.addEventListener('click', async () => {
      const newDate = dateEditInput.value
      if (!newDate) return
      dateEditSave.setAttribute('disabled', 'true')
      dateEditSave.textContent = 'Saving...'
      if (dateEditError) dateEditError.textContent = ''
      reloadSuppressed = true
      try {
        const isoDate = toLocalISOString(new Date(newDate))
        const res = await fetch('/api/commit/' + currentModalHash, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: isoDate })
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update date')
        }
        reloadSuppressed = false
        closeModal()
        loadCommits(currentPage)
      } catch (err) {
        if (dateEditError) dateEditError.textContent = (err as Error).message
        dateEditSave.removeAttribute('disabled')
        dateEditSave.textContent = 'Save Date'
        setTimeout(() => { reloadSuppressed = false }, 2000)
      }
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
let mouseDownOnOverlay = false
modalOverlay.addEventListener('mousedown', e => {
  mouseDownOnOverlay = e.target === modalOverlay
})
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay && mouseDownOnOverlay) closeModal()
  mouseDownOnOverlay = false
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

function bindWarnTooltips(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.commit-warn, .commit-local').forEach(el => {
    el.addEventListener('mouseenter', () => {
      tooltip.textContent = el.dataset.tooltip ?? ''
      tooltip.classList.add('visible')
    })
    el.addEventListener('mousemove', e => {
      positionTooltipLeftOfCursor(e)
    })
    el.addEventListener('mouseleave', () => tooltip.classList.remove('visible'))
  })
}

// --- Reflog traces ---

const clearTracesBtn = document.getElementById('clearTracesBtn')
const confirmOverlay = document.getElementById('confirmOverlay')!
const confirmCancel = document.getElementById('confirmCancel')!
const confirmOk = document.getElementById('confirmOk')!
const confirmError = document.getElementById('confirmError')!

function closeConfirm(): void {
  confirmError.textContent = ''
  confirmOverlay.classList.remove('visible')
}

confirmCancel.addEventListener('click', closeConfirm)
confirmOverlay.addEventListener('click', e => {
  if (e.target === confirmOverlay) closeConfirm()
})

if (clearTracesBtn) {
  clearTracesBtn.addEventListener('click', () => {
    confirmError.textContent = ''
    confirmOverlay.classList.add('visible')
  })
}

confirmOk.addEventListener('click', async () => {
  confirmError.textContent = ''
  confirmOk.setAttribute('disabled', 'true')
  confirmOk.textContent = 'Clearing...'
  try {
    const res = await fetch('/api/reflog', { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to clear')
    }
    closeConfirm()
    const card = document.querySelector('.trace-card')
    if (card) card.remove()
  } catch (err) {
    confirmError.textContent = 'Failed to clear traces: ' + (err as Error).message
  } finally {
    confirmOk.removeAttribute('disabled')
    confirmOk.textContent = 'Clear traces'
  }
})

// --- Year selector ---

function selectYear(year: number): void {
  activeYear = year
  fetchCalendar(activeYear)
  updateYearLinks()
  saveState()
}

function updateYearLinks(): void {
  document.querySelectorAll<HTMLElement>('.year-link').forEach(el => {
    const y = parseInt(el.dataset.year!, 10)
    el.classList.toggle('year-active', y === activeYear)
  })
}

async function fetchCalendar(year: number): Promise<void> {
  const url = '/api/calendar?year=' + year
  const res = await fetch(url)
  const data = await res.json()

  const scroll = document.getElementById('heatmapScroll')!
  scroll.innerHTML = data.svg

  bindHeatmapCellHandlers()
  applyDaySelection()
}

function bindYearLinks(): void {
  document.querySelectorAll<HTMLElement>('.year-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault()
      const year = parseInt(el.dataset.year!, 10)
      selectYear(year)
    })
  })
}

bindYearLinks()

// Restore persisted state after reload
;(() => {
  const savedPage = parseInt(sessionStorage.getItem('ghm_page') ?? '1', 10) || 1
  const savedDate = sessionStorage.getItem('ghm_date')
  const savedYear = sessionStorage.getItem('ghm_year')

  if (savedDate) {
    activeDate = savedDate
    applyDaySelection()
  }

  if (savedYear) {
    const y = parseInt(savedYear, 10)
    if (y !== activeYear) selectYear(y)
  }

  loadCommits(savedPage)
})()
