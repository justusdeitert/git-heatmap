import { tooltipText, tooltipVisible, tooltipX, tooltipY } from '@/client/state'

export function Tooltip() {
  return (
    <div
      class={`tooltip${tooltipVisible.value ? ' visible' : ''}`}
      id="tooltip"
      style={{ left: tooltipX.value + 'px', top: tooltipY.value + 'px' }}
    >
      {tooltipText.value}
    </div>
  )
}
