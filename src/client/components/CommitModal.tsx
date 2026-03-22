import { useEffect, useRef, useState } from 'preact/hooks';
import { CopyHash } from '@/client/components/CopyHash';
import ERROR_SVG from '@/client/icons/error-circle.svg';
import EDIT_SVG from '@/client/icons/edit.svg';
import TAG_ICON from '@/client/icons/tag.svg';
import type { CommitDetailData, RefDecoration } from '@/client/state';
import { closeModal, modalData, modalError, modalLoading, modalVisible, renameCommit, tooltipText, tooltipVisible, tooltipX, tooltipY, updateCommit } from '@/client/state';
import { esc, formatFullDate, relTime, toLocalDateTimeValue, toLocalISOString } from '@/client/utils';

function showBtnTooltip(e: MouseEvent, text: string) {
  tooltipText.value = text;
  tooltipVisible.value = true;
  const el = document.getElementById('tooltip');
  if (el) {
    tooltipX.value = Math.max(8, e.clientX - el.offsetWidth - 12);
    tooltipY.value = e.clientY - 36;
  }
}

function hideBtnTooltip() {
  tooltipVisible.value = false;
}

function colorizeStatLine(line: string): string {
  const escaped = esc(line);
  const match = escaped.match(/^(.+?)(\|)(\s*\d+\s*)(.*?)$/);
  if (!match) return `<span class="stat-summary">${escaped}</span>`;
  const [, file, pipe, count, bar] = match;
  const coloredBar = bar.replace(/(\++|-+)/g, (m) =>
    m[0] === '+' ? `<span class="stat-add">${m}</span>` : `<span class="stat-del">${m}</span>`,
  );
  return (
    '<span class="stat-filename">' +
    file +
    '</span>' +
    pipe +
    '<span class="stat-count">' +
    count +
    '</span>' +
    coloredBar
  );
}

function colorizeSummary(line: string): string {
  return esc(line)
    .replace(/(\d+ files? changed)/, '<span class="stat-summary">$1</span>')
    .replace(/(\d+ insertions?\(\+\))/, '<span class="stat-add">$1</span>')
    .replace(/(\d+ deletions?\(-\))/, '<span class="stat-del">$1</span>');
}

function RenameForm({ data }: { data: CommitDetailData }) {
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const fullMessage = data.body ? `${data.subject}\n\n${data.body}` : data.subject;

  useEffect(() => {
    if (renaming && ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
      ref.current.focus();
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length);
    }
  }, [renaming]);

  const handleSave = async () => {
    const msg = ref.current?.value.trim();
    if (!msg) return;
    setSaving(true);
    setError('');
    try {
      await renameCommit(data.fullHash, msg);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <>
      <div class="modal-subject-row">
        {!renaming && <div class="modal-subject">{data.subject}</div>}
        {data.editable && !renaming && (
          <button
            class="modal-edit-btn"
            onClick={() => { hideBtnTooltip(); setRenaming(true); }}
            onMouseEnter={(e: MouseEvent) => showBtnTooltip(e, 'Rename commit message')}
            onMouseMove={(e: MouseEvent) => showBtnTooltip(e, 'Rename commit message')}
            onMouseLeave={hideBtnTooltip}
          >
            <span dangerouslySetInnerHTML={{ __html: EDIT_SVG }} />
          </button>
        )}
      </div>

      {renaming && (
        <div class="rename-form">
          <textarea class="rename-input" ref={ref} rows={3}>
            {fullMessage}
          </textarea>
          <div class="rename-actions">
            <button
              class="rename-cancel"
              onClick={() => {
                setRenaming(false);
                setError('');
              }}
            >
              Cancel
            </button>
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
  );
}

function CommitEditForm({ data, onClose }: { data: CommitDetailData; onClose: () => void }) {
  const alreadyDiffers =
    data.author !== data.committer ||
    data.authorEmail !== data.committerEmail ||
    data.authorDate !== data.committerDate;
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [linked, setLinked] = useState(!alreadyDiffers);
  const authorIdentityRef = useRef<HTMLInputElement>(null);
  const committerIdentityRef = useRef<HTMLInputElement>(null);
  const authorDateRef = useRef<HTMLInputElement>(null);
  const committerDateRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const newAuthorDate = authorDateRef.current?.value;
    const newAuthor = authorIdentityRef.current?.value.trim();
    if (!newAuthorDate || !newAuthor) return;
    setSaving(true);
    setError('');
    try {
      const opts: { authorDate: string; committerDate?: string; author?: string; committer?: string } = {
        authorDate: toLocalISOString(new Date(newAuthorDate)),
        author: newAuthor,
      };
      if (!linked) {
        const newCommitterDate = committerDateRef.current?.value;
        const newCommitter = committerIdentityRef.current?.value.trim();
        if (!newCommitterDate || !newCommitter) return;
        opts.committerDate = toLocalISOString(new Date(newCommitterDate));
        opts.committer = newCommitter;
      } else {
        // Linked mode: committer should match author
        opts.committer = newAuthor;
      }
      await updateCommit(data.fullHash, opts);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div class="date-edit-form">
      <label class="date-link-toggle">
        <input
          type="checkbox"
          checked={!linked}
          onChange={(e) => setLinked(!(e.target as HTMLInputElement).checked)}
        />
        Edit author &amp; committer individually
      </label>

      {/* Author fields */}
      <div class="edit-field-group">
        {!linked && <span class="date-edit-label">Author</span>}
        <input
          type="text"
          class="date-edit-input author-edit-input"
          ref={authorIdentityRef}
          value={`${data.author} <${data.authorEmail}>`}
          placeholder="Name <email>"
        />
        <input
          type="datetime-local"
          class="date-edit-input"
          ref={authorDateRef}
          step="1"
          value={toLocalDateTimeValue(data.authorDate)}
        />
      </div>

      {/* Committer fields (when unlinked) */}
      {!linked && (
        <div class="edit-field-group">
          <span class="date-edit-label">Committer</span>
          <input
            type="text"
            class="date-edit-input author-edit-input"
            ref={committerIdentityRef}
            value={`${data.committer} <${data.committerEmail}>`}
            placeholder="Name <email>"
          />
          <input
            type="datetime-local"
            class="date-edit-input"
            ref={committerDateRef}
            step="1"
            value={toLocalDateTimeValue(data.committerDate)}
          />
        </div>
      )}

      <div class="date-edit-row">
        <button
          class="rename-cancel"
          onClick={() => {
            onClose();
            setError('');
          }}
        >
          Cancel
        </button>
        <button class="rename-save" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {error && <div class="rename-error">{error}</div>}
    </div>
  );
}

function ModalBody({ data }: { data: CommitDetailData }) {
  const [editingDate, setEditingDate] = useState(false);
  const showCommitterRow = data.committer !== data.author ||
    data.committerEmail !== data.authorEmail ||
    data.committerDate !== data.authorDate;

  const statsLines = data.stats.split('\n');
  const summary = statsLines[statsLines.length - 1] || '';
  const files = statsLines.slice(0, -1);

  return (
    <>
      {!data.editable && data.reason && (
        <div class="modal-edit-notice">
          <span class="dirty-icon">&#9888;</span>
          {data.reason}
        </div>
      )}
      {(data.committerDate !== data.authorDate ||
        data.committer !== data.author ||
        data.committerEmail !== data.authorEmail) && (
        <div class="modal-edit-notice">
          <span class="dirty-icon">&#9888;</span>Author and committer differ. This commit may have been amended or
          rebased.
        </div>
      )}

      <RenameForm data={data} />

      {/* Meta */}
      <div class="modal-meta">
        {!editingDate && (
          <>
            {data.editable && (
              <button
                class="modal-edit-btn"
                onClick={() => { hideBtnTooltip(); setEditingDate(true); }}
                onMouseEnter={(e: MouseEvent) => showBtnTooltip(e, 'Edit author & committer details')}
                onMouseMove={(e: MouseEvent) => showBtnTooltip(e, 'Edit author & committer details')}
                onMouseLeave={hideBtnTooltip}
              >
                <span dangerouslySetInnerHTML={{ __html: EDIT_SVG }} />
              </button>
            )}
            <div class="modal-meta-row">
              <span class="modal-meta-label">Author</span> {data.author}{' '}
              <span class="modal-meta-email">&lt;{data.authorEmail}&gt;</span>
              <span class="modal-meta-time">{relTime(data.authorDate)}{' '}<span class="modal-meta-date">({formatFullDate(data.authorDate)})</span></span>
            </div>

            {showCommitterRow && (
              <div class="modal-meta-row">
                <span class="modal-meta-label">Committer</span> {data.committer}{' '}
                <span class="modal-meta-email">&lt;{data.committerEmail}&gt;</span>
                <span class="modal-meta-time">{relTime(data.committerDate)}{' '}<span class="modal-meta-date">({formatFullDate(data.committerDate)})</span></span>
              </div>
            )}
          </>
        )}

        {editingDate && (
          <CommitEditForm data={data} onClose={() => setEditingDate(false)} />
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
  );
}

function ModalRefBadges({ refs }: { refs: RefDecoration[] }) {
  if (!refs || refs.length === 0) return null;
  return (
    <span class="modal-refs">
      {refs.map((ref) => (
        <span key={`${ref.type}-${ref.name}`} class={`ref-badge ref-${ref.type}`}>
          {ref.type === 'tag' && <span class="ref-icon" dangerouslySetInnerHTML={{ __html: TAG_ICON }} />}
          {ref.name}
        </span>
      ))}
    </span>
  );
}

export function CommitModal() {
  const visible = modalVisible.value;
  const data = modalData.value;
  const loading = modalLoading.value;
  const error = modalError.value;

  let mouseDownOnOverlay = false;

  return (
    <div
      class={`modal-overlay${visible ? ' visible' : ''}`}
      onMouseDown={(e: MouseEvent) => {
        mouseDownOnOverlay = e.target === e.currentTarget;
      }}
      onClick={(e: MouseEvent) => {
        if (e.target === e.currentTarget && mouseDownOnOverlay) closeModal();
        mouseDownOnOverlay = false;
      }}
    >
      <div class={`modal${error ? ' modal-has-error' : ''}`}>
        <div class="modal-top-bar">
          {data && (
            <div class="modal-top-left">
              <CopyHash hash={data.fullHash} full={data.fullHash} class="modal-hash" />
              {data.refs.length > 0 && <ModalRefBadges refs={data.refs} />}
            </div>
          )}
          <button class="modal-close" onClick={() => closeModal()}>
            &times;
          </button>
        </div>
        <div>
          {loading && <div class="modal-loading">Loading...</div>}
          {!loading && error && (
            <div class="modal-error">
              <span class="modal-error-icon" dangerouslySetInnerHTML={{ __html: ERROR_SVG }} />
              {error}
            </div>
          )}
          {!loading && !error && data && <ModalBody data={data} />}
        </div>
      </div>
    </div>
  );
}
