export const heatmapCSS = `
.heatmap-scroll { overflow-x: auto; }
.heatmap-scroll svg { display: block; }
.month-label { font-size: 10px; fill: var(--text-muted); }
.day-label { font-size: 10px; fill: var(--text-muted); }

.day {
  stroke: var(--cell-outline);
  stroke-width: 1;
  cursor: pointer;
  transition: stroke 0.1s;
}

.day:hover { stroke: var(--text-muted); stroke-width: 2; }
.day-selected { stroke: var(--accent); stroke-width: 2; }

.level-0 { fill: var(--level-0); }
.level-1 { fill: var(--level-1); }
.level-2 { fill: var(--level-2); }
.level-3 { fill: var(--level-3); }
.level-4 { fill: var(--level-4); }

.card-subtitle {
  color: var(--text-muted);
  font-weight: 400;
}

.year-single {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: auto;
  padding: 2px 8px;
}

.year-selector {
  display: flex;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}

.year-link {
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  user-select: none;
}

.year-link:hover {
  color: var(--accent);
  background: rgba(88,166,255,0.1);
}

.year-link.year-active {
  color: var(--text);
  font-weight: 600;
  background: rgba(88,166,255,0.15);
}

.legend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  justify-content: flex-end;
}

.legend-text { font-size: 11px; color: var(--text-muted); margin: 0 4px; }
.legend rect { stroke: var(--cell-outline); stroke-width: 1; }
`;
