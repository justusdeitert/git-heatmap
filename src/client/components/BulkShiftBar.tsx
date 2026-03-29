import { signal } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import {
  bulkShift,
  bulkShiftError,
  bulkShiftLoading,
  dirtyFiles,
  selectedHashes,
  selectionMode,
  toggleSelectionMode,
} from '@/client/state';

const shiftAmount = signal(1);
const shiftUnit = signal<'minutes' | 'hours' | 'days'>('hours');
const shiftDirection = signal<'later' | 'earlier'>('later');

function getShiftMs(): number {
  const multipliers = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };
  const ms = shiftAmount.value * multipliers[shiftUnit.value];
  return shiftDirection.value === 'earlier' ? -ms : ms;
}

export function BulkShiftBar() {
  if (!selectionMode.value) return null;
  const count = selectedHashes.value.size;
  const loading = bulkShiftLoading.value;
  const error = bulkShiftError.value;
  const isDirty = dirtyFiles.value.length > 0;
  const barRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barRef.current && spacerRef.current) {
      spacerRef.current.style.height = `${barRef.current.offsetHeight}px`;
    }
  });

  return (
    <>
      <div class="bulk-shift-spacer" ref={spacerRef} />
      <div class="bulk-shift-bar" ref={barRef}>
      <div class="bulk-shift-inner">
        <span class="bulk-shift-count">
          {count} commit{count !== 1 ? 's' : ''} selected
        </span>

        <div class="bulk-shift-controls">
          <select
            class="bulk-shift-select"
            value={shiftDirection.value}
            onChange={(e) => { shiftDirection.value = (e.target as HTMLSelectElement).value as 'later' | 'earlier'; }}
            disabled={loading}
          >
            <option value="later">Later</option>
            <option value="earlier">Earlier</option>
          </select>

          <input
            class="bulk-shift-input"
            type="number"
            min={1}
            value={shiftAmount.value}
            onInput={(e) => { shiftAmount.value = Math.max(1, Number.parseInt((e.target as HTMLInputElement).value, 10) || 1); }}
            disabled={loading}
          />

          <select
            class="bulk-shift-select"
            value={shiftUnit.value}
            onChange={(e) => { shiftUnit.value = (e.target as HTMLSelectElement).value as 'minutes' | 'hours' | 'days'; }}
            disabled={loading}
          >
            <option value="minutes">min</option>
            <option value="hours">hrs</option>
            <option value="days">days</option>
          </select>

          <button
            class="bulk-shift-apply"
            disabled={count === 0 || loading || isDirty}
            onClick={() => bulkShift(getShiftMs())}
          >
            {loading ? 'Shifting…' : 'Apply'}
          </button>

          <button
            class="bulk-shift-cancel"
            onClick={() => toggleSelectionMode()}
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        {isDirty && (
          <div class="bulk-shift-notice bulk-shift-notice--warn">
            <span class="bulk-shift-notice-icon">&#9888;</span>
            <span class="bulk-shift-notice-text">Uncommitted changes — commit or stash before shifting</span>
          </div>
        )}
        {error && !isDirty && (
          <div class="bulk-shift-notice bulk-shift-notice--error">
            <span class="bulk-shift-notice-icon">&#9888;</span>
            <span class="bulk-shift-notice-text">{error}</span>
            <button class="bulk-shift-notice-close" type="button" onClick={() => { bulkShiftError.value = null; }}>&times;</button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
