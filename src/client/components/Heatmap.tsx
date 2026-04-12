import { useEffect, useRef, useState } from 'preact/hooks';
import CLOCK_ICON from '@/client/icons/clock.svg';
import DOT_ICON from '@/client/icons/dot.svg';
import REPO_ICON from '@/client/icons/repo.svg';
import {
  activeDate,
  activeYear,
  availableYears,
  cancelDayShiftConfirm,
  clearDateFilter,
  confirmDayShift,
  dayShiftConfirmVisible,
  dayShiftLoading,
  filterByDate,
  firstCommit,
  heatmapSvg,
  pendingDayShift,
  remoteConfirmVisible,
  remoteHttpUrl,
  remoteOnline,
  remoteRemoving,
  remoteUrl,
  removeRemoteOrigin,
  requestDayShiftConfirm,
  selectYear,
  tooltipText,
  tooltipVisible,
  tooltipX,
  tooltipY,
} from '@/client/state';
import { formatDate, tooltipProps } from '@/client/utils';

const LEGEND_SVG = `
  <svg width="72" height="12">
    <rect x="0"  y="0" width="12" height="12" rx="2" class="level-0"/>
    <rect x="15" y="0" width="12" height="12" rx="2" class="level-1"/>
    <rect x="30" y="0" width="12" height="12" rx="2" class="level-2"/>
    <rect x="45" y="0" width="12" height="12" rx="2" class="level-3"/>
    <rect x="60" y="0" width="12" height="12" rx="2" class="level-4"/>
  </svg>`;

function positionTooltipLeftOfCursor(e: MouseEvent): void {
  const tooltipEl = document.getElementById('tooltip');
  if (!tooltipEl) return;
  const x = Math.max(8, e.clientX - tooltipEl.offsetWidth - 12);
  tooltipX.value = x;
  tooltipY.value = e.clientY - 36;
}

export function Heatmap() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Event delegation on container (no per-cell listeners needed)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const dragState: {
      sourceDate: string | null;
      targetDate: string | null;
      sourceEl: HTMLElement | null;
      targetEl: HTMLElement | null;
      sourceLevel: string | null;
      targetOriginalLevel: string | null;
      sourceCount: number;
      startX: number;
      startY: number;
      dragging: boolean;
      suppressClick: boolean;
    } = {
      sourceDate: null,
      targetDate: null,
      sourceEl: null,
      targetEl: null,
      sourceLevel: null,
      targetOriginalLevel: null,
      sourceCount: 0,
      startX: 0,
      startY: 0,
      dragging: false,
      suppressClick: false,
    };

    const getLevelClass = (el: Element): string | null => {
      for (const cls of Array.from(el.classList)) {
        if (cls.startsWith('level-')) return cls;
      }
      return null;
    };

    const restoreTargetLevel = () => {
      if (dragState.targetEl && dragState.targetOriginalLevel) {
        const current = getLevelClass(dragState.targetEl);
        if (current) dragState.targetEl.classList.remove(current);
        dragState.targetEl.classList.add(dragState.targetOriginalLevel);
      }
      dragState.targetOriginalLevel = null;
    };

    const applySourceLevelToTarget = () => {
      if (!dragState.targetEl || !dragState.sourceLevel) return;
      const current = getLevelClass(dragState.targetEl);
      dragState.targetOriginalLevel = current;
      if (current) dragState.targetEl.classList.remove(current);
      dragState.targetEl.classList.add(dragState.sourceLevel);
    };

    const getDayFromTarget = (target: EventTarget | null): HTMLElement | null =>
      (target as HTMLElement | null)?.closest('.day') as HTMLElement | null;

    const getDayFromPoint = (x: number, y: number): HTMLElement | null =>
      document.elementFromPoint(x, y)?.closest('.day') as HTMLElement | null;

    const clearDragStyles = () => {
      restoreTargetLevel();
      if (dragState.sourceEl && dragState.sourceLevel) {
        const current = getLevelClass(dragState.sourceEl);
        if (current) dragState.sourceEl.classList.remove(current);
        dragState.sourceEl.classList.add(dragState.sourceLevel);
      }
      dragState.sourceEl?.classList.remove('day-drag-source');
      dragState.targetEl?.classList.remove('day-drag-target');
      container.classList.remove('heatmap-dragging');
    };

    const resetDragState = () => {
      clearDragStyles();
      dragState.sourceDate = null;
      dragState.targetDate = null;
      dragState.sourceEl = null;
      dragState.targetEl = null;
      dragState.sourceLevel = null;
      dragState.targetOriginalLevel = null;
      dragState.sourceCount = 0;
      dragState.dragging = false;
    };

    const onEnter = (e: Event) => {
      const el = getDayFromTarget(e.target);
      if (!el) return;
      if (dragState.dragging) return;
      tooltipText.value = el.dataset.tooltip ?? '';
      tooltipVisible.value = true;
    };
    const onMove = (e: Event) => {
      if (dragState.dragging) return;
      if (!getDayFromTarget(e.target)) return;
      positionTooltipLeftOfCursor(e as MouseEvent);
    };
    const onLeave = (e: Event) => {
      const el = e.target as HTMLElement;
      if (!el.closest('.day')) return;
      const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
      if (related?.closest('.day') === el.closest('.day')) return;
      tooltipVisible.value = false;
    };
    const onClick = (e: Event) => {
      if (dragState.suppressClick) {
        dragState.suppressClick = false;
        return;
      }

      const el = getDayFromTarget(e.target);
      if (!el) return;
      const date = el.dataset.date;
      if (!date) return;
      if (activeDate.value === date) {
        clearDateFilter();
      } else {
        filterByDate(date);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || dayShiftLoading.value) return;

      const el = getDayFromTarget(e.target);
      if (!el) return;

      const date = el.dataset.date;
      const count = Number.parseInt(el.dataset.count ?? '0', 10);
      const movable = el.dataset.movable === 'true';
      if (!date || count <= 0 || !movable) return;

      dragState.sourceDate = date;
      dragState.targetDate = null;
      dragState.sourceEl = el;
      dragState.targetEl = null;
      dragState.sourceLevel = getLevelClass(el);
      dragState.targetOriginalLevel = null;
      dragState.sourceCount = count;
      dragState.startX = e.clientX;
      dragState.startY = e.clientY;
      dragState.dragging = false;
      tooltipVisible.value = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragState.sourceDate || !dragState.sourceEl) return;

      const movedEnough = Math.abs(e.clientX - dragState.startX) > 4 || Math.abs(e.clientY - dragState.startY) > 4;
      if (!dragState.dragging) {
        if (!movedEnough) return;
        dragState.dragging = true;
        dragState.suppressClick = true;
        dragState.sourceEl.classList.add('day-drag-source');
        const currentSourceLevel = getLevelClass(dragState.sourceEl);
        if (currentSourceLevel) dragState.sourceEl.classList.remove(currentSourceLevel);
        dragState.sourceEl.classList.add('level-0');
        container.classList.add('heatmap-dragging');
      }

      tooltipVisible.value = false;

      const hovered = getDayFromPoint(e.clientX, e.clientY);
      const hoveredDate = hovered?.dataset.date ?? null;
      const nextTarget = hoveredDate && hoveredDate !== dragState.sourceDate ? hovered : null;

      if (dragState.targetEl !== nextTarget) {
        restoreTargetLevel();
        dragState.targetEl?.classList.remove('day-drag-target');
        dragState.targetEl = nextTarget;
        dragState.targetEl?.classList.add('day-drag-target');
        applySourceLevelToTarget();
      }
      dragState.targetDate = dragState.targetEl?.dataset.date ?? null;
    };

    const onPointerUp = () => {
      const sourceDate = dragState.sourceDate;
      const targetDate = dragState.targetDate;
      const sourceCount = dragState.sourceCount;
      const shouldShift = dragState.dragging && !!sourceDate && !!targetDate && sourceDate !== targetDate;

      resetDragState();

      if (shouldShift) {
        requestDayShiftConfirm(sourceDate!, targetDate!, sourceCount);
      }
    };

    container.addEventListener('mouseenter', onEnter, true);
    container.addEventListener('mousemove', onMove, true);
    container.addEventListener('mouseleave', onLeave, true);
    container.addEventListener('click', onClick);
    container.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);

    return () => {
      resetDragState();
      container.removeEventListener('mouseenter', onEnter, true);
      container.removeEventListener('mousemove', onMove, true);
      container.removeEventListener('mouseleave', onLeave, true);
      container.removeEventListener('click', onClick);
      container.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  // Apply selection state separately, no handler teardown needed
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.querySelectorAll<HTMLElement>('.day').forEach((d) => {
      d.classList.toggle('day-selected', d.dataset.date === activeDate.value);
    });
  }, [heatmapSvg.value, activeDate.value]);

  const now = new Date().toLocaleString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div class="card">
      <div class="card-title">
        Commit Activity
        <YearSelector />
      </div>
      <div
        class="heatmap-scroll"
        id="heatmapScroll"
        ref={scrollRef}
        dangerouslySetInnerHTML={{ __html: heatmapSvg.value }}
      />
      <div class="legend">
        <span class="legend-text">Less</span>
        <span dangerouslySetInnerHTML={{ __html: LEGEND_SVG }} />
        <span class="legend-text">More</span>
      </div>
      <div class="heatmap-hint">
        {dayShiftLoading.value
          ? 'Moving day commits...'
          : 'Click a day to filter commits. Only days whose commits are still local can be dragged onto another day.'}
      </div>
      <div class="meta">
        <div class="meta-item">
          <span dangerouslySetInnerHTML={{ __html: CLOCK_ICON }} /> First commit: {formatDate(firstCommit.value)}
        </div>
        <div class="meta-item">
          <RemoteStatus />
        </div>
        <div class="meta-item">
          <span dangerouslySetInnerHTML={{ __html: DOT_ICON }} /> Generated: {now}
        </div>
      </div>
    </div>
  );
}

function RemoteStatus() {
  const icon = <span dangerouslySetInnerHTML={{ __html: REPO_ICON }} />;
  const url = remoteUrl.value;

  if (!url) {
    return <span class="remote-no-remote">{icon} No remote</span>;
  }

  // Check still pending
  if (remoteOnline.value === null) {
    return (
      <>
        {icon} {url}
      </>
    );
  }

  // Offline: show disconnect button
  if (!remoteOnline.value) {
    return (
      <span class="remote-offline">
        {icon} {url}{' '}
        <button
          class="remote-offline-remove"
          onClick={() => {
            tooltipVisible.value = false;
            remoteConfirmVisible.value = true;
          }}
          disabled={remoteRemoving.value}
          {...tooltipProps('Remote is offline. Click to disconnect')}
        >
          &times;
        </button>
      </span>
    );
  }

  // Online: link if we have an HTTPS URL, plain text otherwise
  const label = remoteHttpUrl.value ? (
    <a href={remoteHttpUrl.value} target="_blank" rel="noopener noreferrer">
      {url}
    </a>
  ) : (
    url
  );

  return (
    <span class="remote-online">
      {icon} {label}
    </span>
  );
}

function YearSelector() {
  const years = availableYears.value;
  if (years.length === 0) return null;
  if (years.length === 1) {
    return <span class="year-single">{years[0]}</span>;
  }

  return (
    <div class="year-selector">
      {years.map((y) => (
        <a
          key={y}
          class={`year-link${y === activeYear.value ? ' year-active' : ''}`}
          onClick={(e: Event) => {
            e.preventDefault();
            selectYear(y);
          }}
        >
          {y}
        </a>
      ))}
    </div>
  );
}

export function RemoteConfirmDialog() {
  const visible = remoteConfirmVisible.value;
  const [error, setError] = useState('');

  const handleRemove = async () => {
    setError('');
    try {
      await removeRemoteOrigin();
      remoteConfirmVisible.value = false;
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleClose = () => {
    remoteConfirmVisible.value = false;
    setError('');
  };

  return (
    <div
      class={`modal-overlay${visible ? ' visible' : ''}`}
      onClick={(e: MouseEvent) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div class="confirm-modal">
        <div class="confirm-title">Remove remote origin</div>
        <div class="confirm-body">
          This will unlink the remote <strong>{remoteUrl.value}</strong> from your local repository. The remote itself
          won't be affected.
        </div>
        {error && <div class="confirm-error">{error}</div>}
        <div class="confirm-actions">
          <button class="rename-cancel" onClick={handleClose}>
            Cancel
          </button>
          <button class="confirm-delete" disabled={remoteRemoving.value} onClick={handleRemove}>
            {remoteRemoving.value ? 'Removing...' : 'Remove remote'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DayShiftConfirmDialog() {
  const visible = dayShiftConfirmVisible.value;
  const pending = pendingDayShift.value;
  const sourceLabel = pending ? formatDate(`${pending.sourceDate}T12:00:00`) : '';
  const targetLabel = pending ? formatDate(`${pending.targetDate}T12:00:00`) : '';

  return (
    <div
      class={`modal-overlay${visible ? ' visible' : ''}`}
      onClick={(e: MouseEvent) => {
        if (e.target === e.currentTarget) cancelDayShiftConfirm();
      }}
    >
      <div class="confirm-modal">
        <div class="confirm-title">Move Day Commits</div>
        <div class="confirm-body">
          {pending
            ? `Move ${pending.commitCount} commit${pending.commitCount !== 1 ? 's' : ''} from ${sourceLabel} to ${targetLabel}? This rewrites local commit timestamps.`
            : "Move this day's commits to the selected target day?"}
        </div>
        <div class="confirm-actions">
          <button class="rename-cancel" onClick={() => cancelDayShiftConfirm()} disabled={dayShiftLoading.value}>
            Cancel
          </button>
          <button
            class="confirm-delete"
            disabled={!pending || dayShiftLoading.value}
            onClick={() => void confirmDayShift()}
          >
            {dayShiftLoading.value ? 'Moving...' : 'Move commits'}
          </button>
        </div>
      </div>
    </div>
  );
}
