import { computed, signal } from '@preact/signals';
import type { CommitEntry, RefDecoration } from '@/types';

// --- Types ---

export type { CommitEntry, RefDecoration };

export interface CommitResponse {
  commits: CommitEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CommitDetailData {
  hash: string;
  fullHash: string;
  subject: string;
  body: string;
  author: string;
  authorEmail: string;
  authorDate: string;
  committer: string;
  committerEmail: string;
  committerDate: string;
  stats: string;
  editable: boolean;
  reason?: string;
  refs: RefDecoration[];
}

export interface ReflogEntry {
  hash: string;
  action: string;
  detail: string;
  date: string;
}

export interface StatsData {
  total: number;
  activeDays: number;
  streak: number;
  longest: number;
  busiestDay: string;
  busiestCount: number;
}

export interface DirtyFile {
  status: string;
  file: string;
}

export interface InitialData {
  repoName: string;
  remoteUrl: string | null;
  branch: string;
  stats: StatsData;
  authors: number;
  firstCommit: string | null;
  availableYears: number[];
  heatmapSvg: string;
  dirtyFiles: DirtyFile[];
  traces: ReflogEntry[];
  version: string;
}

// --- Application State (Signals) ---

export const initialData = signal<InitialData | null>(null);

// UI state
export const currentPage = signal(1);
export const activeDate = signal<string | null>(null);
export const activeYear = signal<number | null>(null);

// Data
export const commits = signal<CommitEntry[]>([]);
export const commitTotal = signal(0);
export const commitTotalPages = signal(0);
export const heatmapSvg = signal('');
export const traces = signal<ReflogEntry[]>([]);
export const dirtyFiles = signal<DirtyFile[]>([]);
export const stats = signal<StatsData | null>(null);

// Modal
export const modalVisible = signal(false);
export const modalData = signal<CommitDetailData | null>(null);
export const modalLoading = signal(false);
export const modalError = signal<string | null>(null);

// Author modal
export interface AuthorEntry {
  name: string;
  commits: number;
}
export const authorModalVisible = signal(false);
export const authorModalData = signal<AuthorEntry[]>([]);
export const authorModalLoading = signal(false);
export const authorModalError = signal<string | null>(null);

// Confirm dialog
export const confirmVisible = signal(false);

// Network error
export const networkError = signal<string | null>(null);

// Bulk selection
export const selectionMode = signal(false);
export const selectedHashes = signal<Set<string>>(new Set());
export const bulkShiftLoading = signal(false);
export const bulkShiftError = signal<string | null>(null);

// Rebase recovery
export const rebaseInProgress = signal(false);
export const rebaseHasBackup = signal(false);
export const rebaseLoading = signal(false);
export const rebaseError = signal<string | null>(null);

// Tooltip
export const tooltipText = signal('');
export const tooltipVisible = signal(false);
export const tooltipX = signal(0);
export const tooltipY = signal(0);

// SSE reload suppression
export const reloadSuppressed = signal(false);

// Derived
export const availableYears = computed(() => initialData.value?.availableYears ?? []);
export const repoName = computed(() => initialData.value?.repoName ?? '');
export const branch = computed(() => initialData.value?.branch ?? '');
export const remoteUrl = computed(() => initialData.value?.remoteUrl ?? null);
export const firstCommit = computed(() => initialData.value?.firstCommit ?? null);
export const authors = computed(() => initialData.value?.authors ?? 0);
export const version = computed(() => initialData.value?.version ?? '');

// --- Actions ---

export async function fetchCommits(page: number): Promise<void> {
  try {
    let url = `/api/commits?page=${page}`;
    if (activeDate.value) url += `&date=${activeDate.value}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load commits');
    const data: CommitResponse = await res.json();
    currentPage.value = data.page;
    commits.value = data.commits;
    commitTotal.value = data.total;
    commitTotalPages.value = data.totalPages;
    networkError.value = null;
  } catch (err) {
    networkError.value = (err as Error).message || 'Failed to load commits';
  }
}

export async function fetchCalendar(year: number): Promise<void> {
  try {
    const res = await fetch(`/api/calendar?year=${year}`);
    if (!res.ok) throw new Error('Failed to load calendar');
    const data = await res.json();
    heatmapSvg.value = data.svg;
    networkError.value = null;
  } catch (err) {
    networkError.value = (err as Error).message || 'Failed to load calendar';
  }
}

export async function fetchStats(): Promise<void> {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to load stats');
    const data = await res.json();
    stats.value = data.stats;
    dirtyFiles.value = data.dirtyFiles;
    traces.value = data.traces;
    networkError.value = null;
  } catch (err) {
    networkError.value = (err as Error).message || 'Failed to load stats';
  }
}

export function filterByDate(date: string): void {
  activeDate.value = date;
  fetchCommits(1);
}

export function clearDateFilter(): void {
  activeDate.value = null;
  fetchCommits(1);
}

export function selectYear(year: number): void {
  activeYear.value = year;
  fetchCalendar(year);
}

export async function showCommitDetail(fullHash: string): Promise<void> {
  modalLoading.value = true;
  modalData.value = null;
  modalError.value = null;
  modalVisible.value = true;
  try {
    const res = await fetch(`/api/commit/${encodeURIComponent(fullHash)}`);
    if (!res.ok) throw new Error(res.status === 404 ? 'Commit not found' : `Server error (${res.status})`);
    const data: CommitDetailData = await res.json();
    modalData.value = data;
  } catch (err) {
    modalData.value = null;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    modalError.value = `Could not load commit — ${msg}`;
  } finally {
    modalLoading.value = false;
  }
}

export function closeModal(): void {
  modalVisible.value = false;
  modalData.value = null;
  modalError.value = null;
}

export async function showAuthorLeaderboard(): Promise<void> {
  authorModalLoading.value = true;
  authorModalData.value = [];
  authorModalError.value = null;
  authorModalVisible.value = true;
  try {
    const res = await fetch('/api/authors');
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    const data: { authors: AuthorEntry[] } = await res.json();
    authorModalData.value = data.authors;
  } catch (err) {
    authorModalData.value = [];
    const msg = err instanceof Error ? err.message : 'Unknown error';
    authorModalError.value = `Could not load contributors — ${msg}`;
  } finally {
    authorModalLoading.value = false;
  }
}

export function closeAuthorModal(): void {
  authorModalVisible.value = false;
  authorModalData.value = [];
  authorModalError.value = null;
}

export async function renameCommit(hash: string, message: string): Promise<void> {
  reloadSuppressed.value = true;
  try {
    const res = await fetch(`/api/commit/${encodeURIComponent(hash)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to rename');
    }
    closeModal();
    await fetchCommits(currentPage.value);
  } finally {
    reloadSuppressed.value = false;
  }
}

export async function updateCommit(
  hash: string,
  opts: {
    authorDate: string;
    committerDate?: string;
    author?: string;
    committer?: string;
    preserveTimestamps?: boolean;
  },
): Promise<void> {
  reloadSuppressed.value = true;
  try {
    const payload: Record<string, string | boolean> = opts.committerDate
      ? { authorDate: opts.authorDate, committerDate: opts.committerDate }
      : { date: opts.authorDate };
    if (opts.author) payload.author = opts.author;
    if (opts.committer) payload.committer = opts.committer;
    if (opts.preserveTimestamps != null) payload.preserveTimestamps = opts.preserveTimestamps;
    const res = await fetch(`/api/commit/${encodeURIComponent(hash)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update date');
    }
    closeModal();
    await fetchCommits(currentPage.value);
  } finally {
    reloadSuppressed.value = false;
  }
}

export async function clearTraces(): Promise<void> {
  const res = await fetch('/api/reflog', { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to clear');
  }
  traces.value = [];
  confirmVisible.value = false;
}

// --- Rebase recovery ---

export async function checkRebaseStatus(): Promise<void> {
  try {
    const res = await fetch('/api/rebase');
    if (!res.ok) return;
    const data: { inProgress: boolean; hasBackup: boolean } = await res.json();
    rebaseInProgress.value = data.inProgress;
    rebaseHasBackup.value = data.hasBackup;
  } catch { /* ignore */ }
}

export async function rebaseAbort(): Promise<void> {
  rebaseLoading.value = true;
  rebaseError.value = null;
  try {
    const res = await fetch('/api/rebase/abort', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to abort rebase');
    }
    rebaseInProgress.value = false;
    rebaseHasBackup.value = false;
    await refreshAll();
  } catch (err) {
    rebaseError.value = err instanceof Error ? err.message : 'Failed to abort rebase';
  } finally {
    rebaseLoading.value = false;
  }
}

export async function rebaseRestore(): Promise<void> {
  rebaseLoading.value = true;
  rebaseError.value = null;
  try {
    const res = await fetch('/api/rebase/restore', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to restore');
    }
    rebaseInProgress.value = false;
    rebaseHasBackup.value = false;
    await refreshAll();
  } catch (err) {
    rebaseError.value = err instanceof Error ? err.message : 'Failed to restore';
  } finally {
    rebaseLoading.value = false;
  }
}

export async function rebaseDismissBackup(): Promise<void> {
  rebaseLoading.value = true;
  rebaseError.value = null;
  try {
    const res = await fetch('/api/rebase/dismiss', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to dismiss backup');
    }
    rebaseHasBackup.value = false;
    await checkRebaseStatus();
  } catch (err) {
    rebaseError.value = err instanceof Error ? err.message : 'Failed to dismiss backup';
  } finally {
    rebaseLoading.value = false;
  }
}

async function refreshAll(): Promise<void> {
  await Promise.all([
    fetchCommits(currentPage.value),
    fetchCalendar(activeYear.value ?? new Date().getFullYear()),
    fetchStats(),
    checkRebaseStatus(),
  ]);
}

// --- Bulk selection ---

export function toggleSelectionMode(): void {
  selectionMode.value = !selectionMode.value;
  if (!selectionMode.value) {
    selectedHashes.value = new Set();
    bulkShiftError.value = null;
  }
}

export function toggleCommitSelection(fullHash: string): void {
  const next = new Set(selectedHashes.value);
  if (next.has(fullHash)) next.delete(fullHash);
  else next.add(fullHash);
  selectedHashes.value = next;
}

export function selectAllEditable(): void {
  const editable = commits.value.filter((c) => !c.onRemote);
  selectedHashes.value = new Set(editable.map((c) => c.fullHash));
}

export function deselectAll(): void {
  selectedHashes.value = new Set();
}

export async function bulkShift(shiftMs: number): Promise<void> {
  const hashes = [...selectedHashes.value];
  if (hashes.length === 0 || shiftMs === 0) return;

  bulkShiftLoading.value = true;
  bulkShiftError.value = null;
  reloadSuppressed.value = true;
  try {
    const res = await fetch('/api/commits/bulk-shift', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes, shiftMs }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to shift commits');
    }
    selectionMode.value = false;
    selectedHashes.value = new Set();
    bulkShiftError.value = null;
    await fetchCommits(currentPage.value);
  } catch (err) {
    bulkShiftError.value = err instanceof Error ? err.message : 'Failed to shift commits';
  } finally {
    bulkShiftLoading.value = false;
    reloadSuppressed.value = false;
  }
}

// --- SSE ---

export function initSSE(): void {
  const events = new EventSource('/events');
  let errorCount = 0;
  events.addEventListener('message', async () => {
    errorCount = 0;
    if (reloadSuppressed.value) return;
    // Refresh all data
    await Promise.all([
      fetchCommits(currentPage.value),
      fetchCalendar(activeYear.value ?? new Date().getFullYear()),
      fetchStats(),
      checkRebaseStatus(),
    ]);
  });
  events.addEventListener('error', () => {
    if (++errorCount >= 3) {
      networkError.value = 'Connection to server lost — live updates stopped';
      events.close();
    }
  });
}

// --- Init ---

export function initFromServerData(data: InitialData): void {
  initialData.value = data;
  stats.value = data.stats;
  heatmapSvg.value = data.heatmapSvg;
  dirtyFiles.value = data.dirtyFiles;
  traces.value = data.traces;
  activeYear.value =
    data.availableYears.length > 0 ? data.availableYears[data.availableYears.length - 1] : new Date().getFullYear();
  fetchCommits(1);
  checkRebaseStatus();
}
