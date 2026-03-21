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

function ModalBody({ data }: { data: CommitDetailData }) {
  const [renaming, setRenaming] = useState(false)
  const [renameError, setRenameError] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const [dateError, setDateError] = useState('')
  const [dateSaving, setDateSaving] = useState(false)
  const renameRef = useRef<HTMLTextAreaElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  const fullMessage = data.body ? data.subject + '\n\n' + data.body : data.subject
  const showCommitterRow = data.committer !== data.author || data.committerDate !== data.authorDate

  const statsLines = data.stats.split('\n')
  const summary = statsLines[statsLines.length - 1] || ''
  const files = statsLines.slice(0, -1)

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.style.height = 'auto'
      renameRef.current.style.height = renameRef.current.scrollHeight + 'px'
      renameRef.current.focus()
      renameRef.current.setSelectionRange(renameRef.current.value.length, renameRef.current.value.length)
    }
  }, [renaming])

  const handleRename = async () => {
    const msg = renameRef.current?.value.trim()
    if (!msg) return
    setRenameSaving(true)
    setRenameError('')
    try {
      await renameCommit(data.fullHash, msg)
    } catch (err) {
      setRenameError((err as Error).message)
      setRenameSaving(false)
    }
  }

  const handleDateSave = async () => {
    const newDate = dateRef.current?.value
    if (!newDate) return
    setDateSaving(true)
    setDateError('')
    try {
      const isoDate = toLocalISOString(new Date(newDate))
      await updateCommitDate(data.fullHash, isoDate)
    } catch (err) {
      setDateError((err as Error).message)
      setDateSaving(false)
    }
  }

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

      {/* Subject */}
      <div class="modal-subject-row">
        {!renaming && <div class="modal-subject">{data.subject}</div>}
        {data.editable && !renaming && (
          <button class="rename-btn" title="Rename commit message" onClick={() => setRenaming(true)}>
            <span dangerouslySetInnerHTML={{ __html: EDIT_SVG }} />
          </button>
        )}
      </div>

      {/* Rename form */}
      {renaming && (
        <div class="rename-form">
          <textarea class="rename-input" ref={renameRef} rows={3}>{fullMessage}</textarea>
          <div class="rename-actions">
            <button class="rename-cancel" onClick={() => { setRenaming(false); setRenameError('') }}>Cancel</button>
            <button class="rename-save" disabled={renameSaving} onClick={handleRename}>
              {renameSaving ? 'Renaming...' : 'Rename'}
            </button>
          </div>
          {renameError && <div class="rename-error">{renameError}</div>}
        </div>
      )}

      {/* Body */}
      {data.body && !renaming && (
        <div class="modal-body" dangerouslySetInnerHTML={{ __html: esc(data.body).replace(/\n/g, '<br>') }} />
      )}

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
          <div class="date-edit-form">
            <div class="date-edit-row">
              <input type="datetime-local" class="date-edit-input" ref={dateRef} step="1" value={toLocalDateTimeValue(data.authorDate)} />
              <button class="rename-cancel" onClick={() => { setEditingDate(false); setDateError('') }}>Cancel</button>
              <button class="rename-save" disabled={dateSaving} onClick={handleDateSave}>
                {dateSaving ? 'Saving...' : 'Save Date'}
              </button>
            </div>
            {dateError && <div class="rename-error">{dateError}</div>}
          </div>
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
              <div class="date-edit-form">
                <div class="date-edit-row">
                  <input type="datetime-local" class="date-edit-input" ref={dateRef} step="1" value={toLocalDateTimeValue(data.authorDate)} />
                  <button class="rename-cancel" onClick={() => { setEditingDate(false); setDateError('') }}>Cancel</button>
                  <button class="rename-save" disabled={dateSaving} onClick={handleDateSave}>
                    {dateSaving ? 'Saving...' : 'Save Date'}
                  </button>
                </div>
                {dateError && <div class="rename-error">{dateError}</div>}
              </div>
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
