import { useEffect, useRef } from 'preact/hooks'
import {
  heatmapSvg, activeDate, activeYear, availableYears,
  selectYear, filterByDate, clearDateFilter,
  firstCommit, remoteUrl, tooltipText, tooltipVisible, tooltipX, tooltipY,
} from '../state'
import { formatDate } from '../utils'
import CLOCK_ICON from '../icons/clock.svg'
import DOT_ICON from '../icons/dot.svg'

const LEGEND_SVG = `
  <svg width="72" height="12">
    <rect x="0"  y="0" width="12" height="12" rx="2" class="level-0"/>
    <rect x="15" y="0" width="12" height="12" rx="2" class="level-1"/>
    <rect x="30" y="0" width="12" height="12" rx="2" class="level-2"/>
    <rect x="45" y="0" width="12" height="12" rx="2" class="level-3"/>
    <rect x="60" y="0" width="12" height="12" rx="2" class="level-4"/>
  </svg>`

function positionTooltipLeftOfCursor(e: MouseEvent): void {
  const tooltipEl = document.getElementById('tooltip')
  if (!tooltipEl) return
  const x = Math.max(8, e.clientX - tooltipEl.offsetWidth - 12)
  tooltipX.value = x
  tooltipY.value = e.clientY - 36
}

export function Heatmap() {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Bind heatmap cell handlers after SVG renders
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const cells = container.querySelectorAll<HTMLElement>('.day')
    const handlers: Array<{ el: HTMLElement; events: Array<[string, EventListener]> }> = []

    cells.forEach(el => {
      const eventList: Array<[string, EventListener]> = []

      const onEnter = () => {
        tooltipText.value = el.dataset.tooltip ?? ''
        tooltipVisible.value = true
      }
      const onMove = (e: Event) => positionTooltipLeftOfCursor(e as MouseEvent)
      const onLeave = () => { tooltipVisible.value = false }
      const onClick = () => {
        const date = el.dataset.date
        if (!date) return
        if (activeDate.value === date) {
          clearDateFilter()
        } else {
          filterByDate(date)
        }
      }

      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseleave', onLeave)
      el.addEventListener('click', onClick)
      eventList.push(['mouseenter', onEnter], ['mousemove', onMove], ['mouseleave', onLeave], ['click', onClick])
      handlers.push({ el, events: eventList })
    })

    // Apply selection state
    cells.forEach(d => {
      d.classList.toggle('day-selected', d.dataset.date === activeDate.value)
    })

    return () => {
      handlers.forEach(({ el, events }) => {
        events.forEach(([type, handler]) => el.removeEventListener(type, handler))
      })
    }
  }, [heatmapSvg.value, activeDate.value])

  const now = new Date().toLocaleString('en', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div class="card">
      <div class="card-title">
        Commit Activity
        <YearSelector />
      </div>
      <div class="heatmap-scroll" id="heatmapScroll" ref={scrollRef}
        dangerouslySetInnerHTML={{ __html: heatmapSvg.value }}
      />
      <div class="legend">
        <span class="legend-text">Less</span>
        <span dangerouslySetInnerHTML={{ __html: LEGEND_SVG }} />
        <span class="legend-text">More</span>
      </div>
      <div class="meta">
        <div class="meta-item">
          <span dangerouslySetInnerHTML={{ __html: CLOCK_ICON }} />
          {' '}First commit: {formatDate(firstCommit.value)}
        </div>
        <div class="meta-item">
          <span dangerouslySetInnerHTML={{ __html: DOT_ICON }} />
          {' '}{remoteUrl.value ?? <span style="color:var(--accent)">No remote</span>}
        </div>
        <div class="meta-item">
          <span dangerouslySetInnerHTML={{ __html: DOT_ICON }} />
          {' '}Generated: {now}
        </div>
      </div>
    </div>
  )
}

function YearSelector() {
  const years = availableYears.value
  if (years.length === 0) return null
  if (years.length === 1) {
    return <span class="year-single">{years[0]}</span>
  }

  return (
    <div class="year-selector">
      {years.map(y => (
        <a
          key={y}
          class={`year-link${y === activeYear.value ? ' year-active' : ''}`}
          onClick={(e: Event) => { e.preventDefault(); selectYear(y) }}
        >
          {y}
        </a>
      ))}
    </div>
  )
}
