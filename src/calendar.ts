import type { CommitMap, Week, MonthLabel, Stats } from './types.js'

/** Formats a Date as 'YYYY-MM-DD' using local time. */
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Groups ISO date strings into a { 'YYYY-MM-DD': count } map.
 */
export function buildCommitMap(dates: string[]): CommitMap {
  const map: CommitMap = {}
  for (const iso of dates) {
    const day = iso.slice(0, 10)
    map[day] = (map[day] || 0) + 1
  }
  return map
}

/**
 * Filters a commit map to only include entries for a given year.
 */
export function filterCommitMapByYear(commitMap: CommitMap, year: number): CommitMap {
  const filtered: CommitMap = {}
  const prefix = String(year) + '-'
  for (const [date, count] of Object.entries(commitMap)) {
    if (date.startsWith(prefix)) {
      filtered[date] = count
    }
  }
  return filtered
}

/**
 * Maps a commit count to an intensity level 0–4 (GitHub-style quartiles).
 */
function getLevel(count: number, max: number): number {
  if (count === 0) return 0
  if (count <= max * 0.25) return 1
  if (count <= max * 0.5) return 2
  if (count <= max * 0.75) return 3
  return 4
}

/**
 * Builds an array of weeks for a specific calendar year.
 */
export function buildCalendarWeeks(commitMap: CommitMap, year: number): Week[] {
  const todayStr = localDateStr(new Date())
  const jan1 = new Date(year, 0, 1)
  const start = new Date(jan1)
  start.setDate(start.getDate() - start.getDay())

  const dec31 = new Date(year, 11, 31)

  const max = Math.max(...Object.values(commitMap), 1)
  const weeks: Week[] = []
  const current = new Date(start)

  while (current <= dec31) {
    const week: Week = []
    for (let d = 0; d < 7; d++) {
      const date = localDateStr(current)
      const inYear = current.getFullYear() === year
      const isPastOrToday = date <= todayStr
      const count = commitMap[date] || 0
      week.push({
        date,
        count: (inYear && isPastOrToday) ? count : 0,
        level: (inYear && isPastOrToday) ? getLevel(count, max) : 0,
        future: !inYear,
      })
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
  }

  return weeks
}

/**
 * Returns month labels with their corresponding week index
 * for positioning above the heatmap.
 */
export function getMonthLabels(weeks: Week[]): MonthLabel[] {
  const labels: MonthLabel[] = []
  let lastMonth = -1

  for (let i = 0; i < weeks.length; i++) {
    const month = new Date(weeks[i][0].date).getMonth()
    if (month !== lastMonth) {
      labels.push({
        index: i,
        name: new Date(weeks[i][0].date).toLocaleString('en', { month: 'short' }),
      })
      lastMonth = month
    }
  }

  return labels
}

/**
 * Computes summary stats: total commits, active days,
 * current/longest streaks, and busiest day.
 */
export function computeStats(commitMap: CommitMap, totalCommits: number): Stats {
  const sortedDays = Object.keys(commitMap).sort()
  const activeDays = sortedDays.length

  // Current streak (counting back from today)
  let streak = 0
  const d = new Date()
  while (commitMap[localDateStr(d)]) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  // Longest streak
  let longest = 0
  let run = 0
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      run = 1
    } else {
      const diff = (new Date(sortedDays[i]).getTime() - new Date(sortedDays[i - 1]).getTime()) / 86_400_000
      run = diff === 1 ? run + 1 : 1
    }
    longest = Math.max(longest, run)
  }

  // Busiest day
  let busiestDay = ''
  let busiestCount = 0
  for (const [day, count] of Object.entries(commitMap)) {
    if (count > busiestCount) {
      busiestCount = count
      busiestDay = day
    }
  }

  return { total: totalCommits, activeDays, streak, longest, busiestDay, busiestCount }
}
