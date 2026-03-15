export interface CommitMap {
  [date: string]: number
}

export interface DayCell {
  date: string
  count: number
  level: number
  future: boolean
}

export type Week = DayCell[]

export interface MonthLabel {
  index: number
  name: string
}

export interface Stats {
  total: number
  activeDays: number
  streak: number
  longest: number
  busiestDay: string
  busiestCount: number
}

export interface RecentCommit {
  hash: string
  message: string
  author: string
  date: string
}

export interface DashboardData {
  repoName: string
  remoteUrl: string | null
  weeks: Week[]
  monthLabels: MonthLabel[]
  stats: Stats
  authors: number
  branch: string
  firstCommit: string | null
  recentCommits: RecentCommit[]
}
