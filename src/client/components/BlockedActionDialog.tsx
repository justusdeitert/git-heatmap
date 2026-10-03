import { useEffect, useRef } from 'preact/hooks';
import CLOCK_ALERT_SVG from '@/client/icons/clock-alert.svg';
import { blockedAction, type ConflictCommit, dismissBlockedAction } from '@/client/state';
import { fullDateTime } from '@/client/utils';

function ConflictRow({ label, commit, warn }: { label: string; commit: ConflictCommit; warn?: boolean }) {
  return (
    <div class="blocked-row">
      <span class="blocked-row-label">{label}</span>
      <div class="blocked-row-commit">
        <code class="blocked-row-hash">{commit.hash}</code>
        <span class="blocked-row-subject">{commit.subject}</span>
        <span class={`blocked-row-date${warn ? ' blocked-row-date--warn' : ''}`}>
          {fullDateTime(commit.date, true)}
        </span>
      </div>
    </div>
  );
}

export function BlockedActionDialog() {
  const action = blockedAction.value;
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (action) okRef.current?.focus();
  }, [action]);

  return (
    <div
      class={`modal-overlay${action ? ' visible' : ''}`}
      onClick={(e: MouseEvent) => {
        if (e.target === e.currentTarget) dismissBlockedAction();
      }}>
      <div
        class="confirm-modal blocked-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="blocked-title"
        aria-describedby="blocked-message">
        <div class="blocked-header">
          <span class="blocked-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: CLOCK_ALERT_SVG }} />
          <div class="confirm-title" id="blocked-title">
            {action?.title}
          </div>
        </div>
        <p class="blocked-message" id="blocked-message">
          {action?.message}
        </p>
        {action?.conflict && (
          <div class="blocked-conflict">
            <ConflictRow label="Would be dated" commit={action.conflict.commit} warn />
            <ConflictRow label="Before its predecessor" commit={action.conflict.predecessor} />
          </div>
        )}
        {action?.hint && <p class="blocked-hint">{action.hint}</p>}
        <div class="confirm-actions">
          <button class="rename-save" ref={okRef} onClick={() => dismissBlockedAction()}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
