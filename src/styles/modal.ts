export const modalCSS = `
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
  backdrop-filter: blur(2px);
}

.modal-overlay.visible { opacity: 1; pointer-events: auto; }

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 50px 24px 24px;
  max-width: 640px;
  width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
  transition: color 0.15s;
}

.modal-close:hover { color: var(--text); }

.modal-header {
  margin-bottom: 12px;
}

.modal-hash {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 4px;
  padding: 2px 6px;
  background: rgba(88,166,255,0.1);
  transition: background 0.15s;
}

.modal-hash:hover { background: rgba(88,166,255,0.2); }
.modal-hash.hash-copied { color: var(--level-3); }

.modal-subject {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 12px;
  word-break: break-word;
}

.modal-body {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg);
  border-radius: 6px;
  border: 1px solid var(--border);
  word-break: break-word;
}

.modal-meta {
  font-size: 13px;
  margin-bottom: 16px;
}

.modal-meta-row {
  padding: 4px 0;
  line-height: 1.5;
}

.modal-meta-label {
  color: var(--text-muted);
  min-width: 80px;
  display: inline-block;
}

.modal-meta-date {
  color: var(--text-muted);
  font-size: 12px;
}

.modal-stats {
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.modal-stats-summary {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-weight: 600;
}

.modal-files {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  color: var(--text-muted);
  max-height: 200px;
  overflow-y: auto;
}

.modal-file {
  padding: 2px 0;
  white-space: pre;
}

.stat-filename { color: var(--text); }
.stat-count { color: var(--text-muted); }
.stat-add { color: #56d364; }
.stat-del { color: #f47067; }
.stat-summary { color: var(--text-muted); }

.modal-loading {
  text-align: center;
  padding: 32px 0;
  color: var(--text-muted);
  font-size: 13px;
}

.modal-subject-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.modal-subject-row .modal-subject {
  flex: 1;
  min-width: 0;
}
.rename-btn {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  transition: color .15s, border-color .15s;
}
.rename-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.edit-icon {
  width: 14px;
  height: 14px;
}
.rename-form {
  margin: 8px 0 4px;
}
.date-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rename-input {
  width: 100%;
  min-height: 56px;
  padding: 8px 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  font-size: 12px;
  resize: vertical;
  box-sizing: border-box;
}
.rename-input:focus {
  outline: none;
  border-color: var(--accent);
}
.rename-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}
.rename-cancel, .rename-save {
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  transition: opacity .15s;
}
.rename-cancel {
  background: transparent;
  color: var(--text-muted);
}
.rename-cancel:hover {
  color: var(--text);
}
.rename-save {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.rename-save:hover {
  opacity: .85;
}
.rename-save[disabled] {
  opacity: .5;
  cursor: not-allowed;
}
.rename-error {
  color: #f47067;
  font-size: 12px;
  margin-top: 6px;
}

.date-edit-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 5px;
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-left: 6px;
  transition: color .15s, border-color .15s;
}
.date-edit-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.date-edit-btn .edit-icon {
  width: 12px;
  height: 12px;
}
.date-edit-form {
  margin: 6px 0 4px;
}
.date-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.date-edit-input {
  padding: 6px 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  color-scheme: dark;
}
.date-edit-input:focus {
  outline: none;
  border-color: var(--accent);
}

.modal-edit-notice {
  font-size: 12px;
  color: #d29922;
  background: rgba(210, 153, 34, 0.08);
  border: 1px solid rgba(210, 153, 34, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.confirm-modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px;
  max-width: 420px;
  width: 90vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.confirm-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}
.confirm-body {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
  line-height: 1.5;
}
.confirm-error {
  color: #f47067;
  font-size: 12px;
  min-height: 18px;
  margin-bottom: 10px;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.confirm-delete {
  background: #da3633;
  color: #fff;
  border: 1px solid #da3633;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity .15s;
}
.confirm-delete:hover {
  opacity: .85;
}
.confirm-delete[disabled] {
  opacity: .5;
  cursor: not-allowed;
}
`;
