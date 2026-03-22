export interface CommitMap {
  [date: string]: number;
}

export interface DayCell {
  date: string;
  count: number;
  level: number;
  future: boolean;
}

export type Week = DayCell[];

export interface MonthLabel {
  index: number;
  name: string;
}

export interface Stats {
  total: number;
  activeDays: number;
  streak: number;
  longest: number;
  busiestDay: string;
  busiestCount: number;
}

export interface CommitEntry {
  hash: string;
  fullHash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: string;
  committer: string;
  committerEmail: string;
  committerDate: string;
  onRemote: boolean;
}

export interface ReflogTrace {
  hash: string;
  action: string;
  detail: string;
  date: string;
}

export interface UncommittedFile {
  status: string;
  file: string;
}

export interface DashboardData {
  repoName: string;
  remoteUrl: string | null;
  weeks: Week[];
  monthLabels: MonthLabel[];
  stats: Stats;
  authors: number;
  branch: string;
  firstCommit: string | null;
  recentCommits: CommitEntry[];
  dirtyFiles: UncommittedFile[];
  traces: ReflogTrace[];
  availableYears: number[];
}
