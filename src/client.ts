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
})

new EventSource('/events').addEventListener('message', () => location.reload())

let currentPage = 1

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
  const res = await fetch('/api/commits?page=' + page)
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
      '<code class="commit-hash">' + c.hash + '</code>' +
      '<span class="commit-msg">' + esc(c.message) + '</span>' +
      '<span class="commit-meta">' + esc(c.author) + ' &middot; ' + relTime(c.date) + '</span>' +
      '</div>'
    ).join('')
  }

  const pag = document.getElementById('pagination')!
  if (data.totalPages <= 1) { pag.innerHTML = ''; return }

  let html = '<button class="pag-btn" ' + (page <= 1 ? 'disabled' : '') + ' onclick="loadCommits(' + (page - 1) + ')">&larr;</button>'
  html += '<span class="pag-info">Page ' + page + ' of ' + data.totalPages + '</span>'
  html += '<button class="pag-btn" ' + (page >= data.totalPages ? 'disabled' : '') + ' onclick="loadCommits(' + (page + 1) + ')">&rarr;</button>'
  pag.innerHTML = html
}

loadCommits(1)
