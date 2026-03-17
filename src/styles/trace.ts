export const traceCSS = `
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
`;
