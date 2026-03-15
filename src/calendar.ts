import type { CommitMap, Week, MonthLabel, Stats } from './types.js'

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
 * Builds an array of weeks, each containing 7 day objects with
 * { date, count, level, future } for the last ~52 weeks.
 */
export function buildCalendarWeeks(commitMap: CommitMap): Week[] {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 364 - start.getDay())

  const max = Math.max(...Object.values(commitMap), 1)
  const weeks: Week[] = []
  const current = new Date(start)

  while (current <= today) {
    const week: Week = []
    for (let d = 0; d < 7; d++) {
      const date = current.toISOString().slice(0, 10)
      const count = commitMap[date] || 0
      week.push({ date, count, level: getLevel(count, max), future: current > today })
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
  while (commitMap[d.toISOString().slice(0, 10)]) {
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
