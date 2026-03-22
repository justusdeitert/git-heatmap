import { computed, signal } from '@preact/signals';
import type { CommitEntry } from '@/types';

// --- Types ---

export type { CommitEntry };

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

// Confirm dialog
export const confirmVisible = signal(false);

// Network error
export const networkError = signal<string | null>(null);

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
  modalVisible.value = true;
  try {
    const res = await fetch(`/api/commit/${encodeURIComponent(fullHash)}`);
    if (!res.ok) throw new Error('Not found');
    const data: CommitDetailData = await res.json();
    modalData.value = data;
  } catch {
    modalData.value = null;
  } finally {
    modalLoading.value = false;
  }
}

export function closeModal(): void {
  modalVisible.value = false;
  modalData.value = null;
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
  },
): Promise<void> {
  reloadSuppressed.value = true;
  try {
    const payload: Record<string, string> = opts.committerDate
      ? { authorDate: opts.authorDate, committerDate: opts.committerDate }
      : { date: opts.authorDate };
    if (opts.author) payload.author = opts.author;
    if (opts.committer) payload.committer = opts.committer;
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

// --- SSE ---

export function initSSE(): void {
  const events = new EventSource('/events');
  events.addEventListener('message', async () => {
    if (reloadSuppressed.value) return;
    // Refresh all data
    await Promise.all([
      fetchCommits(currentPage.value),
      fetchCalendar(activeYear.value ?? new Date().getFullYear()),
      fetchStats(),
    ]);
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
}
