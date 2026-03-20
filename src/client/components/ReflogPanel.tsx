import { useState } from 'preact/hooks'
import { traces, confirmVisible, clearTraces } from '../state'
import type { ReflogEntry } from '../state'
import { relTime } from '../utils'

export function ReflogPanel() {
  const entries = traces.value
  if (entries.length === 0) return null

  return (
    <div class="card trace-card">
      <div class="card-title">
        &#9888; History Traces <span class="trace-count">({entries.length})</span>
        <button class="trace-clear-btn" onClick={() => { confirmVisible.value = true }}>
          Clear traces
        </button>
      </div>
      <div class="trace-list">
        {entries.map((t, i) => (
          <div key={i} class="trace-row">
            <code class="trace-hash">{t.hash}</code>
            <span class="trace-action">{t.action}</span>
            <span class="trace-detail">{t.detail}</span>
            <span class="trace-date">{relTime(t.date)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ConfirmDialog() {
  const visible = confirmVisible.value
  const [error, setError] = useState('')
  const [clearing, setClearing] = useState(false)

  const handleClear = async () => {
    setClearing(true)
    setError('')
    try {
      await clearTraces()
    } catch (err) {
      setError('Failed to clear traces: ' + (err as Error).message)
    } finally {
      setClearing(false)
    }
  }

  const handleClose = () => {
    confirmVisible.value = false
    setError('')
  }

  return (
    <div
      class={`modal-overlay${visible ? ' visible' : ''}`}
      onClick={(e: MouseEvent) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div class="confirm-modal">
        <div class="confirm-title">Clear History Traces</div>
        <div class="confirm-body">
          This will permanently clear the git reflog and run garbage collection. This action cannot be undone.
        </div>
        {error && <div class="confirm-error">{error}</div>}
        <div class="confirm-actions">
          <button class="rename-cancel" onClick={handleClose}>Cancel</button>
          <button class="confirm-delete" disabled={clearing} onClick={handleClear}>
            {clearing ? 'Clearing...' : 'Clear traces'}
          </button>
        </div>
      </div>
    </div>
  )
}
