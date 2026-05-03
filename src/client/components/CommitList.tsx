import { useEffect, useRef } from 'preact/hooks';
import { CopyHash } from '@/client/components/CopyHash';
import CLOCK_ALERT_ICON from '@/client/icons/clock-alert.svg';
import GIT_COMMIT_ICON from '@/client/icons/git-commit.svg';
import TAG_ICON from '@/client/icons/tag.svg';
import type { CommitEntry, RefDecoration } from '@/client/state';
import {
  activeDate,
  activeYear,
  clearDateFilter,
  commits,
  commitTimeFlags,
  commitTotal,
  commitTotalPages,
  currentPage,
  deselectAll,
  fetchCommits,
  selectAllEditable,
  selectedHashes,
  selectionMode,
  setCommitSelected,
  showCommitDetail,
  toggleSelectionMode,
  toggleYearFilter,
  tooltipVisible,
  yearFilterEnabled,
} from '@/client/state';
import { fullDateTime, tooltipProps } from '@/client/utils';

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
  const dateMismatch =
    commit.date !== commit.committerDate ||
    commit.author !== commit.committer ||
    commit.authorEmail !== commit.committerEmail;
  const openDetail = () => showCommitDetail(commit.fullHash);
  const inSelectionMode = selectionMode.value;
  const isSelected = selectedHashes.value.has(commit.fullHash);
  const isEditable = !commit.onRemote;

  return (
    <div
      class={`commit-row${inSelectionMode ? ' commit-row-selectable' : ''}${isSelected ? ' commit-row-selected' : ''}`}
      data-hash={inSelectionMode ? commit.fullHash : undefined}
      data-editable={inSelectionMode && isEditable ? '' : undefined}
    >
      {inSelectionMode && (
        <span class={`commit-checkbox${!isEditable ? ' commit-checkbox-disabled' : ''}`}>
          <span class={`commit-checkbox-box${isSelected ? ' commit-checkbox-box--checked' : ''}`}>
            {isSelected ? '✓' : ''}
          </span>
        </span>
      )}
      <CopyHash hash={commit.hash} full={commit.fullHash} />
      <span class="commit-msg" onClick={inSelectionMode ? undefined : openDetail}>
        {commit.message}
        <RefBadges refs={commit.refs} />
      </span>
      <span class="commit-meta" onClick={inSelectionMode ? undefined : openDetail}>
        {commit.author} &middot; {fullDateTime(commit.date)}
        {outOfOrder && (
          <span
            class="commit-time-warn"
            {...tooltipProps("Timestamp doesn't follow chronological order")}
            dangerouslySetInnerHTML={{ __html: CLOCK_ALERT_ICON }}
          />
        )}
        {dateMismatch && (
          <span class="commit-warn" {...tooltipProps('Author and committer differ')}>
            &#9888;
          </span>
        )}
        {!commit.onRemote && (
          <span class="commit-local" {...tooltipProps('Not on upstream yet. This commit is still editable.')}>
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

function YearFilter() {
  const year = activeYear.value;
  const enabled = yearFilterEnabled.value;
  if (!year || activeDate.value) return <span id="yearFilter" />;

  if (enabled) {
    return (
      <span id="yearFilter">
        <span class="filter-badge">
          {year}
          <button
            class="filter-clear"
            onClick={() => {
              tooltipVisible.value = false;
              toggleYearFilter();
            }}
            {...tooltipProps('Unpin year (show all commits)')}
          >
            &times;
          </button>
        </span>
      </span>
    );
  }

  return (
    <span id="yearFilter">
      <button
        class="filter-badge filter-badge-inactive"
        onClick={() => toggleYearFilter()}
        {...tooltipProps(`Show only commits from ${year}`)}
      >
        Pin to {year}
      </button>
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

let dragActive = false;
let dragPainting = true;

function useDragSelect(listRef: ReturnType<typeof useRef<HTMLDivElement>>) {
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    function rowFromPoint(x: number, y: number): { hash: string; editable: boolean } | null {
      const target = document.elementFromPoint(x, y) as HTMLElement | null;
      if (!target) return null;
      const row = target.closest<HTMLElement>('[data-hash]');
      if (!row) return null;
      return { hash: row.dataset.hash!, editable: row.hasAttribute('data-editable') };
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0 || !selectionMode.value) return;
      const hit = rowFromPoint(e.clientX, e.clientY);
      if (!hit || !hit.editable) return;
      dragActive = true;
      dragPainting = !selectedHashes.value.has(hit.hash);
      setCommitSelected(hit.hash, dragPainting);
      e.preventDefault();
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragActive) return;
      const hit = rowFromPoint(e.clientX, e.clientY);
      if (!hit || !hit.editable) return;
      setCommitSelected(hit.hash, dragPainting);
    }

    function onPointerUp() {
      dragActive = false;
    }

    el.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);
}

export function CommitList() {
  const inSelectionMode = selectionMode.value;
  const selected = selectedHashes.value;
  const editableCount = commits.value.filter((c) => !c.onRemote).length;
  const allEditableSelected =
    editableCount > 0 && commits.value.filter((c) => !c.onRemote).every((c) => selected.has(c.fullHash));
  const listRef = useRef<HTMLDivElement>(null);
  useDragSelect(listRef);

  return (
    <div class="card">
      <div class="card-title">
        <span dangerouslySetInnerHTML={{ __html: GIT_COMMIT_ICON }} /> Commits{' '}
        <span class="commit-count" id="commitCount">
          ({commitTotal})
        </span>
        <DateFilter />
        <YearFilter />
        {(editableCount > 0 || inSelectionMode) && (
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
          <label
            class="select-all-label"
            onClick={(e) => {
              e.preventDefault();
              allEditableSelected ? deselectAll() : selectAllEditable();
            }}
          >
            <span
              class={`commit-checkbox-box${allEditableSelected ? ' commit-checkbox-box--checked' : ''}${!allEditableSelected && selected.size > 0 ? ' commit-checkbox-box--indeterminate' : ''}`}
            >
              {allEditableSelected ? '\u2713' : !allEditableSelected && selected.size > 0 ? '\u2012' : ''}
            </span>
            Select editable on this page ({editableCount})
          </label>
          {selected.size > 0 && <span class="select-count">{selected.size} selected</span>}
        </div>
      )}
      <div class={`commit-list${inSelectionMode ? ' commit-list--selecting' : ''}`} id="commitList" ref={listRef}>
        {commits.value.length === 0 ? (
          <div class="commit-empty">No commits found</div>
        ) : (
          (() => {
            const list = commits.value;
            const flags = commitTimeFlags.value;
            return list.map((c, i) => <CommitRow key={c.fullHash} commit={c} outOfOrder={!!flags[i]} />);
          })()
        )}
      </div>
      <Pagination />
    </div>
  );
}
