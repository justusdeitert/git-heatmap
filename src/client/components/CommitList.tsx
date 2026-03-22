import { CopyHash } from '@/client/components/CopyHash';
import CLOCK_ALERT_ICON from '@/client/icons/clock-alert.svg';
import GIT_COMMIT_ICON from '@/client/icons/git-commit.svg';
import TAG_ICON from '@/client/icons/tag.svg';
import type { CommitEntry, RefDecoration } from '@/client/state';
import {
  activeDate,
  clearDateFilter,
  commits,
  commitTotal,
  commitTotalPages,
  currentPage,
  deselectAll,
  fetchCommits,
  selectAllEditable,
  selectedHashes,
  selectionMode,
  showCommitDetail,
  toggleCommitSelection,
  toggleSelectionMode,
  tooltipText,
  tooltipVisible,
  tooltipX,
  tooltipY,
} from '@/client/state';
import { fullDateTime } from '@/client/utils';

function RefBadges({ refs }: { refs: RefDecoration[] }) {
  if (!refs || refs.length === 0) return null;
  return (
    <>
      {refs.map((ref) => (
        <span key={`${ref.type}-${ref.name}`} class={`ref-badge ref-${ref.type}`}>
          {ref.type === 'tag' && <span class="ref-icon" dangerouslySetInnerHTML={{ __html: TAG_ICON }} />}
          {ref.name}
        </span>
      ))}
    </>
  );
}

function CommitRow({ commit, outOfOrder }: { commit: CommitEntry; outOfOrder?: boolean }) {
  const dateMismatch = commit.date !== commit.committerDate ||
    commit.author !== commit.committer ||
    commit.authorEmail !== commit.committerEmail;
  const openDetail = () => showCommitDetail(commit.fullHash);
  const inSelectionMode = selectionMode.value;
  const isSelected = selectedHashes.value.has(commit.fullHash);
  const isEditable = !commit.onRemote;

  const showWarnTooltip = (e: MouseEvent, text: string) => {
    tooltipText.value = text;
    tooltipVisible.value = true;
    const el = document.getElementById('tooltip');
    if (el) {
      tooltipX.value = Math.max(8, e.clientX - el.offsetWidth - 12);
      tooltipY.value = e.clientY - 36;
    }
  };
  const hideTooltip = () => {
    tooltipVisible.value = false;
  };

  return (
    <div class={`commit-row${inSelectionMode ? ' commit-row-selectable' : ''}${isSelected ? ' commit-row-selected' : ''}`}>
      {inSelectionMode && (
        <label class={`commit-checkbox${!isEditable ? ' commit-checkbox-disabled' : ''}`}>
          <input
            type="checkbox"
            checked={isSelected}
            disabled={!isEditable}
            onChange={() => toggleCommitSelection(commit.fullHash)}
          />
        </label>
      )}
      <CopyHash hash={commit.hash} full={commit.fullHash} />
      <span class="commit-msg" onClick={openDetail}>
        {commit.message}
        <RefBadges refs={commit.refs} />
      </span>
      <span class="commit-meta" onClick={openDetail}>
        {commit.author} &middot; {fullDateTime(commit.date)}
        {outOfOrder && (
          <span
            class="commit-time-warn"
            onMouseEnter={(e: MouseEvent) => showWarnTooltip(e, 'Timestamp out of order \u2014 this commit\'s date doesn\'t match its position')}
            onMouseMove={(e: MouseEvent) => showWarnTooltip(e, 'Timestamp out of order \u2014 this commit\'s date doesn\'t match its position')}
            onMouseLeave={hideTooltip}
            dangerouslySetInnerHTML={{ __html: CLOCK_ALERT_ICON }}
          />
        )}
        {dateMismatch && (
          <span
            class="commit-warn"
            onMouseEnter={(e: MouseEvent) => showWarnTooltip(e, 'Author and committer differ')}
            onMouseMove={(e: MouseEvent) => showWarnTooltip(e, 'Author and committer differ')}
            onMouseLeave={hideTooltip}
          >
            &#9888;
          </span>
        )}
        {!commit.onRemote && (
          <span
            class="commit-local"
            onMouseEnter={(e: MouseEvent) => showWarnTooltip(e, 'Not on upstream yet. This commit is still editable.')}
            onMouseMove={(e: MouseEvent) => showWarnTooltip(e, 'Not on upstream yet. This commit is still editable.')}
            onMouseLeave={hideTooltip}
          >
            &#8682;
          </span>
        )}
      </span>
    </div>
  );
}

function DateFilter() {
  const date = activeDate.value;
  if (!date) return <span id="dateFilter" />;

  const formatted = new Date(`${date}T12:00:00`).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <span id="dateFilter">
      <span class="filter-badge">
        {formatted}
        <button class="filter-clear" onClick={() => clearDateFilter()}>
          &times;
        </button>
      </span>
    </span>
  );
}

function Pagination() {
  const page = currentPage.value;
  const totalPages = commitTotalPages.value;
  if (totalPages <= 1) return null;

  return (
    <div class="pagination">
      <button class="pag-btn" disabled={page <= 1} onClick={() => fetchCommits(page - 1)}>
        &larr;
      </button>
      <span class="pag-info">
        Page {page} of {totalPages}
      </span>
      <button class="pag-btn" disabled={page >= totalPages} onClick={() => fetchCommits(page + 1)}>
        &rarr;
      </button>
    </div>
  );
}

export function CommitList() {
  const inSelectionMode = selectionMode.value;
  const selected = selectedHashes.value;
  const editableCount = commits.value.filter((c) => !c.onRemote).length;
  const allEditableSelected = editableCount > 0 && commits.value.filter((c) => !c.onRemote).every((c) => selected.has(c.fullHash));

  return (
    <div class="card">
      <div class="card-title">
        <span dangerouslySetInnerHTML={{ __html: GIT_COMMIT_ICON }} /> Commits{' '}
        <span class="commit-count" id="commitCount">
          ({commitTotal})
        </span>
        <DateFilter />
        {editableCount > 0 && (
          <button
            class={`select-toggle${inSelectionMode ? ' select-toggle-active' : ''}`}
            onClick={() => toggleSelectionMode()}
          >
            {inSelectionMode ? 'Cancel' : 'Select'}
          </button>
        )}
      </div>
      {inSelectionMode && editableCount > 0 && (
        <div class="select-bar">
          <label class="select-all-label">
            <input
              type="checkbox"
              checked={allEditableSelected}
              ref={(el) => { if (el) el.indeterminate = !allEditableSelected && selected.size > 0; }}
              onChange={() => allEditableSelected ? deselectAll() : selectAllEditable()}
            />
            Select editable on this page ({editableCount})
          </label>
          {selected.size > 0 && (
            <span class="select-count">{selected.size} selected</span>
          )}
        </div>
      )}
      <div class="commit-list" id="commitList">
        {commits.value.length === 0 ? (
          <div class="commit-empty">No commits found</div>
        ) : (
          commits.value.map((c, i) => {
            const prev = commits.value[i - 1];
            const ts = new Date(c.date).getTime();
            const outOfOrder = prev && ts > new Date(prev.date).getTime();
            return <CommitRow key={c.fullHash} commit={c} outOfOrder={outOfOrder} />;
          })
        )}
      </div>
      <Pagination />
    </div>
  );
}
