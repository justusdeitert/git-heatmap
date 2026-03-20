import {
  commits, commitTotal, commitTotalPages, currentPage, activeDate,
  fetchCommits, clearDateFilter, showCommitDetail,
  tooltipText, tooltipVisible, tooltipX, tooltipY,
} from '@/client/state'
import type { CommitEntry } from '@/client/state'
import { fullDateTime } from '@/client/utils'
import { CopyHash } from '@/client/components/CopyHash'
import GIT_COMMIT_ICON from '@/client/icons/git-commit.svg'

function esc(s: string): string {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function CommitRow({ commit }: { commit: CommitEntry }) {
  const dateMismatch = commit.date !== commit.committerDate
  const openDetail = () => showCommitDetail(commit.fullHash)

  const showWarnTooltip = (e: MouseEvent, text: string) => {
    tooltipText.value = text
    tooltipVisible.value = true
    const el = document.getElementById('tooltip')
    if (el) {
      tooltipX.value = Math.max(8, e.clientX - el.offsetWidth - 12)
      tooltipY.value = e.clientY - 36
    }
  }
  const hideTooltip = () => { tooltipVisible.value = false }

  return (
    <div class="commit-row">
      <CopyHash hash={commit.hash} full={commit.fullHash} />
      <span class="commit-msg" onClick={openDetail}>{commit.message}</span>
      <span class="commit-meta" onClick={openDetail}>
        {commit.author} &middot; {fullDateTime(commit.date)}
        {dateMismatch && (
          <span
            class="commit-warn"
            onMouseEnter={(e: MouseEvent) => showWarnTooltip(e, 'Author date and committer date differ')}
            onMouseMove={(e: MouseEvent) => showWarnTooltip(e, 'Author date and committer date differ')}
            onMouseLeave={hideTooltip}
          >&#9888;</span>
        )}
        {!commit.onRemote && (
          <span
            class="commit-local"
            onMouseEnter={(e: MouseEvent) => showWarnTooltip(e, 'Not on upstream yet. This commit is still editable.')}
            onMouseMove={(e: MouseEvent) => showWarnTooltip(e, 'Not on upstream yet. This commit is still editable.')}
            onMouseLeave={hideTooltip}
          >&#8682;</span>
        )}
      </span>
    </div>
  )
}

function DateFilter() {
  const date = activeDate.value
  if (!date) return <span id="dateFilter" />

  const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <span id="dateFilter">
      <span class="filter-badge">
        {formatted}
        <button class="filter-clear" onClick={() => clearDateFilter()}>&times;</button>
      </span>
    </span>
  )
}

function Pagination() {
  const page = currentPage.value
  const totalPages = commitTotalPages.value
  if (totalPages <= 1) return null

  return (
    <div class="pagination">
      <button
        class="pag-btn"
        disabled={page <= 1}
        onClick={() => fetchCommits(page - 1)}
      >&larr;</button>
      <span class="pag-info">Page {page} of {totalPages}</span>
      <button
        class="pag-btn"
        disabled={page >= totalPages}
        onClick={() => fetchCommits(page + 1)}
      >&rarr;</button>
    </div>
  )
}

export function CommitList() {
  return (
    <div class="card">
      <div class="card-title">
        <span dangerouslySetInnerHTML={{ __html: GIT_COMMIT_ICON }} />
        {' '}Commits{' '}
        <span class="commit-count" id="commitCount">({commitTotal})</span>
        <DateFilter />
      </div>
      <div class="commit-list" id="commitList">
        {commits.value.length === 0 ? (
          <div class="commit-empty">No commits found</div>
        ) : (
          commits.value.map(c => <CommitRow key={c.fullHash} commit={c} />)
        )}
      </div>
      <Pagination />
    </div>
  )
}
