export const CSS = `
:root {
  --bg: #0d1117;
  --bg-card: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --text-muted: #7d8590;
  --accent: #58a6ff;
  --level-0: #1b2028;
  --cell-outline: rgba(255,255,255,0.05);
  --level-1: #0e4429;
  --level-2: #006d32;
  --level-3: #26a641;
  --level-4: #39d353;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #f6f8fa;
    --bg-card: #ffffff;
    --border: #d0d7de;
    --text: #1f2328;
    --text-muted: #656d76;
    --accent: #0969da;
    --level-0: #ebedf0;
    --cell-outline: rgba(0,0,0,0.08);
    --level-1: #9be9a8;
    --level-2: #40c463;
    --level-3: #30a14e;
    --level-4: #216e39;
  }
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Noto Sans, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding: 24px;
}

.container { max-width: 960px; margin: 0 auto; }

header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

header svg { color: var(--text-muted); flex-shrink: 0; }
h1 { font-size: 20px; font-weight: 600; }
h1 span { color: var(--text-muted); font-weight: 400; }

.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid var(--border);
  color: var(--text-muted);
  margin-left: auto;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
}

.stat-value { font-size: 24px; font-weight: 600; }
.stat-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.card-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.card-title svg { width: 16px; height: 16px; flex-shrink: 0; color: var(--text-muted); }
.heatmap-scroll { overflow-x: auto; }
.heatmap-scroll svg { display: block; }
.month-label { font-size: 10px; fill: var(--text-muted); }
.day-label { font-size: 10px; fill: var(--text-muted); }

.day {
  stroke: var(--cell-outline);
  stroke-width: 1;
  cursor: pointer;
  transition: stroke 0.1s;
}

.day:hover { stroke: var(--text-muted); stroke-width: 2; }
.day-selected { stroke: var(--accent); stroke-width: 2; }

.level-0 { fill: var(--level-0); }
.level-1 { fill: var(--level-1); }
.level-2 { fill: var(--level-2); }
.level-3 { fill: var(--level-3); }
.level-4 { fill: var(--level-4); }

.legend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  justify-content: flex-end;
}

.legend-text { font-size: 11px; color: var(--text-muted); margin: 0 4px; }
.legend rect { stroke: var(--cell-outline); stroke-width: 1; }

.tooltip {
  position: fixed;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 100;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.tooltip.visible { opacity: 1; }

.meta { display: flex; gap: 16px; font-size: 12px; color: var(--text-muted); margin-top: 12px; }
.meta-item { display: flex; align-items: center; gap: 4px; }
.meta-item svg { width: 14px; height: 14px; }

.commit-list { }

.commit-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.commit-row:last-child { border-bottom: none; }

.commit-hash {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 4px;
  padding: 1px 4px;
  transition: background 0.15s;
}

.commit-hash:hover { background: rgba(88,166,255,0.1); }
.commit-hash.hash-copied { color: var(--level-3); }

.copy-icon { width: 12px; height: 12px; flex-shrink: 0; opacity: 0.4; transition: opacity 0.15s; }
.commit-hash:hover .copy-icon { opacity: 1; }
.copy-icon.copied { color: var(--level-3); opacity: 1; }

.commit-msg {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  border-radius: 4px;
  padding: 1px 4px;
  transition: color 0.15s;
}

.commit-msg:hover { color: var(--accent); }

.commit-meta {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  cursor: pointer;
}

.filter-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 400;
  color: var(--accent);
  background: rgba(88,166,255,0.1);
  border: 1px solid rgba(88,166,255,0.3);
  border-radius: 12px;
  padding: 2px 8px 2px 10px;
  margin-left: 8px;
}

.filter-clear {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  transition: color 0.15s;
}

.filter-clear:hover { color: var(--text); }

.commit-empty { padding: 16px 0; color: var(--text-muted); font-size: 13px; }

.commit-count { color: var(--text-muted); font-weight: 400; font-size: 12px; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.pagination:empty { display: none; }

.pag-btn {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 6px 14px;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.pag-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.pag-btn:disabled { opacity: 0.4; cursor: default; }

.pag-info { font-size: 12px; color: var(--text-muted); }

footer { text-align: center; padding: 24px 0; font-size: 11px; color: var(--text-muted); }
footer a { color: var(--accent); text-decoration: none; }

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

.commit-warn {
  color: #d29922;
  margin-left: 6px;
  cursor: help;
  font-size: 13px;
}

.commit-local {
  color: var(--text-muted);
  margin-left: 6px;
  cursor: help;
  font-size: 13px;
}

.dirty-banner {
  background: rgba(210, 153, 34, 0.08);
  border: 1px solid rgba(210, 153, 34, 0.3);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  color: #d29922;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.dirty-icon {
  font-size: 16px;
}

.trace-card .card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.trace-count {
  color: var(--text-muted);
  font-weight: 400;
}
.trace-clear-btn {
  margin-left: auto;
  background: none;
  border: 1px solid rgba(210, 153, 34, 0.4);
  border-radius: 6px;
  color: #d29922;
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.trace-clear-btn:hover {
  background: rgba(210, 153, 34, 0.12);
}
.trace-clear-btn[disabled] {
  opacity: .5;
  cursor: not-allowed;
}
.trace-list {
  display: flex;
  flex-direction: column;
  max-height: 200px;
  overflow-y: auto;
}
.trace-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.trace-row:last-child {
  border-bottom: none;
}
.trace-hash {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent);
  flex-shrink: 0;
}
.trace-action {
  background: rgba(210, 153, 34, 0.1);
  color: #d29922;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
}
.trace-detail {
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}
.trace-date {
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.confirm-modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px;
  max-width: 420px;
  width: 90vw;
.commit-time-tip {
  cursor: help;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
}
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
`
