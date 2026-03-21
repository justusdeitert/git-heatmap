import { authors, stats } from '@/client/state';

export function StatsCards() {
  const s = stats.value;
  if (!s) return null;

  const items: [string | number, string][] = [
    [s.total.toLocaleString(), 'Total Commits'],
    [s.activeDays, 'Active Days (1y)'],
    [s.streak, 'Current Streak'],
    [s.longest, 'Longest Streak'],
    [authors.value, 'Contributors'],
    [s.busiestCount, 'Busiest Day'],
  ];

  return (
    <div class="stats">
      {items.map(([value, label]) => (
        <div class="stat-card" key={label}>
          <div class="stat-value">{value}</div>
          <div class="stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
