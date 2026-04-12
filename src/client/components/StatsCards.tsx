import CHEVRON_ICON from '@/client/icons/chevron.svg';
import { authors, showAuthorLeaderboard, stats } from '@/client/state';

export function StatsCards() {
  const s = stats.value;
  if (!s) return null;

  const items: [string | number, string, (() => void) | null][] = [
    [s.total.toLocaleString(), 'Total Commits', null],
    [s.activeDays, 'Active Days (1y)', null],
    [s.streak, 'Current Streak', null],
    [s.longest, 'Longest Streak', null],
    [authors.value, 'Contributors', showAuthorLeaderboard],
    [s.busiestCount, 'Busiest Day', null],
  ];

  return (
    <div class="stats">
      {items.map(([value, label, onClick]) => (
        <div class={`stat-card${onClick ? ' stat-card-clickable' : ''}`} key={label} onClick={onClick ?? undefined}>
          <div class="stat-value">{value}</div>
          <div class="stat-label">{label}</div>
          {onClick && <span class="stat-card-indicator" dangerouslySetInnerHTML={{ __html: CHEVRON_ICON }} />}
        </div>
      ))}
    </div>
  );
}
