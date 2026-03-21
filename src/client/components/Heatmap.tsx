import { useEffect, useRef } from 'preact/hooks';
import CLOCK_ICON from '@/client/icons/clock.svg';
import DOT_ICON from '@/client/icons/dot.svg';
import {
  activeDate,
  activeYear,
  availableYears,
  clearDateFilter,
  filterByDate,
  firstCommit,
  heatmapSvg,
  remoteUrl,
  selectYear,
  tooltipText,
  tooltipVisible,
  tooltipX,
  tooltipY,
} from '@/client/state';
import { formatDate } from '@/client/utils';

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

  // Event delegation on container — no per-cell listeners needed
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onEnter = (e: Event) => {
      const el = (e.target as HTMLElement).closest('.day') as HTMLElement | null;
      if (!el) return;
      tooltipText.value = el.dataset.tooltip ?? '';
      tooltipVisible.value = true;
    };
    const onMove = (e: Event) => {
      if (!(e.target as HTMLElement).closest('.day')) return;
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
      const el = (e.target as HTMLElement).closest('.day') as HTMLElement | null;
      if (!el) return;
      const date = el.dataset.date;
      if (!date) return;
      if (activeDate.value === date) {
        clearDateFilter();
      } else {
        filterByDate(date);
      }
    };

    container.addEventListener('mouseenter', onEnter, true);
    container.addEventListener('mousemove', onMove, true);
    container.addEventListener('mouseleave', onLeave, true);
    container.addEventListener('click', onClick);

    return () => {
      container.removeEventListener('mouseenter', onEnter, true);
      container.removeEventListener('mousemove', onMove, true);
      container.removeEventListener('mouseleave', onLeave, true);
      container.removeEventListener('click', onClick);
    };
  }, []);

  // Apply selection state separately — no handler teardown needed
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
      <div class="meta">
        <div class="meta-item">
          <span dangerouslySetInnerHTML={{ __html: CLOCK_ICON }} /> First commit: {formatDate(firstCommit.value)}
        </div>
        <div class="meta-item">
          <span dangerouslySetInnerHTML={{ __html: DOT_ICON }} />{' '}
          {remoteUrl.value ?? <span style="color:var(--accent)">No remote</span>}
        </div>
        <div class="meta-item">
          <span dangerouslySetInnerHTML={{ __html: DOT_ICON }} /> Generated: {now}
        </div>
      </div>
    </div>
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
