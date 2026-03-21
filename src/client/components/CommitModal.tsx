import { useState, useRef, useEffect } from 'preact/hooks'
import {
  modalVisible, modalData, modalLoading,
  closeModal, renameCommit, updateCommitDate,
} from '@/client/state'
import type { CommitDetailData } from '@/client/state'
import { relTime, formatFullDate, toLocalISOString, toLocalDateTimeValue, esc } from '@/client/utils'
import { CopyHash } from '@/client/components/CopyHash'
import EDIT_SVG from '@/client/icons/edit.svg'

function colorizeStatLine(line: string): string {
  const escaped = esc(line)
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

function RenameForm({ data }: { data: CommitDetailData }) {
  const [renaming, setRenaming] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  const fullMessage = data.body ? data.subject + '\n\n' + data.body : data.subject

  useEffect(() => {
    if (renaming && ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
      ref.current.focus()
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length)
    }
  }, [renaming])

  const handleSave = async () => {
    const msg = ref.current?.value.trim()
    if (!msg) return
    setSaving(true)
    setError('')
    try {
      await renameCommit(data.fullHash, msg)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <>
      <div class="modal-subject-row">
        {!renaming && <div class="modal-subject">{data.subject}</div>}
        {data.editable && !renaming && (
          <button class="rename-btn" title="Rename commit message" onClick={() => setRenaming(true)}>
            <span dangerouslySetInnerHTML={{ __html: EDIT_SVG }} />
          </button>
        )}
      </div>

      {renaming && (
        <div class="rename-form">
          <textarea class="rename-input" ref={ref} rows={3}>{fullMessage}</textarea>
          <div class="rename-actions">
            <button class="rename-cancel" onClick={() => { setRenaming(false); setError('') }}>Cancel</button>
            <button class="rename-save" disabled={saving} onClick={handleSave}>
              {saving ? 'Renaming...' : 'Rename'}
            </button>
          </div>
          {error && <div class="rename-error">{error}</div>}
        </div>
      )}

      {data.body && !renaming && (
        <div class="modal-body" dangerouslySetInnerHTML={{ __html: esc(data.body).replace(/\n/g, '<br>') }} />
      )}
    </>
  )
}

function DateEditForm({ fullHash, date, onClose }: { fullHash: string; date: string; onClose: () => void }) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    const newDate = ref.current?.value
    if (!newDate) return
    setSaving(true)
    setError('')
    try {
      await updateCommitDate(fullHash, toLocalISOString(new Date(newDate)))
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div class="date-edit-form">
      <div class="date-edit-row">
        <input type="datetime-local" class="date-edit-input" ref={ref} step="1" value={toLocalDateTimeValue(date)} />
        <button class="rename-cancel" onClick={() => { onClose(); setError('') }}>Cancel</button>
        <button class="rename-save" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save Date'}
        </button>
      </div>
      {error && <div class="rename-error">{error}</div>}
    </div>
  )
}

function ModalBody({ data }: { data: CommitDetailData }) {
  const [editingDate, setEditingDate] = useState(false)
  const showCommitterRow = data.committer !== data.author || data.committerDate !== data.authorDate

  const statsLines = data.stats.split('\n')
  const summary = statsLines[statsLines.length - 1] || ''
  const files = statsLines.slice(0, -1)

  return (
    <>
      {!data.editable && data.reason && (
        <div class="modal-edit-notice">
          <span class="dirty-icon">&#9888;</span>{data.reason}
        </div>
      )}
      {data.committerDate !== data.authorDate && (
        <div class="modal-edit-notice">
          <span class="dirty-icon">&#9888;</span>Author date and committer date differ. This commit may have been amended or rebased.
        </div>
      )}

      <RenameForm data={data} />

      {/* Meta */}
      <div class="modal-meta">
        <div class="modal-meta-row">
          <span class="modal-meta-label">Author</span> {data.author},&ensp;{relTime(data.authorDate)}{' '}
          <span class="modal-meta-date">({formatFullDate(data.authorDate)})</span>
          {data.editable && !showCommitterRow && !editingDate && (
            <button class="date-edit-btn" title="Change commit date" onClick={() => setEditingDate(true)}>
              <span dangerouslySetInnerHTML={{ __html: EDIT_SVG }} />
            </button>
          )}
        </div>

        {!showCommitterRow && editingDate && (
          <DateEditForm fullHash={data.fullHash} date={data.authorDate} onClose={() => setEditingDate(false)} />
        )}

        {showCommitterRow && (
          <>
            <div class="modal-meta-row">
              <span class="modal-meta-label">Committer</span> {data.committer},&ensp;{relTime(data.committerDate)}{' '}
              <span class="modal-meta-date">({formatFullDate(data.committerDate)})</span>
              {data.editable && !editingDate && (
                <button class="date-edit-btn" title="Change commit date" onClick={() => setEditingDate(true)}>
                  <span dangerouslySetInnerHTML={{ __html: EDIT_SVG }} />
                </button>
              )}
            </div>
            {editingDate && (
              <DateEditForm fullHash={data.fullHash} date={data.authorDate} onClose={() => setEditingDate(false)} />
            )}
          </>
        )}
      </div>

      {/* Stats */}
      {files.length > 0 && (
        <div class="modal-stats">
          <div class="modal-stats-summary" dangerouslySetInnerHTML={{ __html: colorizeSummary(summary.trim()) }} />
          <div class="modal-files">
            {files.map((f, i) => (
              <div key={i} class="modal-file" dangerouslySetInnerHTML={{ __html: colorizeStatLine(f.trim()) }} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export function CommitModal() {
  const visible = modalVisible.value
  const data = modalData.value
  const loading = modalLoading.value

  let mouseDownOnOverlay = false

  return (
    <div
      class={`modal-overlay${visible ? ' visible' : ''}`}
      onMouseDown={(e: MouseEvent) => { mouseDownOnOverlay = e.target === e.currentTarget }}
      onClick={(e: MouseEvent) => {
        if (e.target === e.currentTarget && mouseDownOnOverlay) closeModal()
        mouseDownOnOverlay = false
      }}
    >
      <div class="modal">
        <div class="modal-top-bar">
          {data ? (
            <CopyHash hash={data.fullHash} full={data.fullHash} class="modal-hash" />
          ) : (
            <code class="modal-hash" />
          )}
          <button class="modal-close" onClick={() => closeModal()}>&times;</button>
        </div>
        <div>
          {loading && <div class="modal-loading">Loading...</div>}
          {!loading && !data && visible && <div class="modal-loading">Failed to load commit details</div>}
          {!loading && data && <ModalBody data={data} />}
        </div>
      </div>
    </div>
  )
}
