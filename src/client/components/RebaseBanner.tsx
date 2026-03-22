import ERROR_SVG from '@/client/icons/error-circle.svg';
import {
  rebaseAbort,
  rebaseDismissBackup,
  rebaseError,
  rebaseHasBackup,
  rebaseInProgress,
  rebaseLoading,
  rebaseRestore,
} from '@/client/state';

export function RebaseBanner() {
  if (!rebaseInProgress.value && !rebaseHasBackup.value) return null;

  const loading = rebaseLoading.value;
  const error = rebaseError.value;

  return (
    <div class="rebase-banner">
      <div class="rebase-banner-header">
        <span class="rebase-banner-icon" dangerouslySetInnerHTML={{ __html: ERROR_SVG }} />
        <span class="rebase-banner-text">
          {rebaseInProgress.value
            ? 'A git rebase is in progress. Your repository is in an incomplete state.'
            : 'A backup of your previous state exists from a failed operation.'}
        </span>
      </div>

      <div class="rebase-banner-actions">
        {rebaseInProgress.value && (
          <button
            class="rebase-btn rebase-btn-abort"
            type="button"
            disabled={loading}
            onClick={() => rebaseAbort()}
          >
            {loading ? 'Aborting…' : 'Abort Rebase'}
          </button>
        )}
        {rebaseHasBackup.value && (
          <button
            class="rebase-btn rebase-btn-restore"
            type="button"
            disabled={loading}
            onClick={() => rebaseRestore()}
          >
            {loading ? 'Restoring…' : 'Restore Backup'}
          </button>
        )}
        {rebaseHasBackup.value && !rebaseInProgress.value && (
          <button
            class="rebase-btn rebase-btn-dismiss"
            type="button"
            disabled={loading}
            onClick={() => rebaseDismissBackup()}
          >
            Dismiss
          </button>
        )}
      </div>

      {error && <div class="rebase-banner-error">{error}</div>}
    </div>
  );
}
