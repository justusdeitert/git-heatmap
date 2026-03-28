import ERROR_SVG from '@/client/icons/error-circle.svg';
import CLOCK_SVG from '@/client/icons/clock.svg';
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
  const isError = rebaseInProgress.value;

  return (
    <div class={`rebase-banner${isError ? '' : ' rebase-banner--info'}`}>
      <div class="rebase-banner-header">
        <span class="rebase-banner-icon" dangerouslySetInnerHTML={{ __html: isError ? ERROR_SVG : CLOCK_SVG }} />
        <span class="rebase-banner-text">
          {isError
            ? 'A git rebase is in progress. Your repository is in an incomplete state.'
            : 'A backup of the previous state exists.'}
        </span>
        <div class="rebase-banner-actions">
          {isError && (
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
              {loading ? 'Restoring…' : 'Restore'}
            </button>
          )}
          {rebaseHasBackup.value && !isError && (
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
      </div>

      {error && <div class="rebase-banner-error">{error}</div>}
    </div>
  );
}
