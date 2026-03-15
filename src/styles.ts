export const CSS = `
:root {
  --bg: #0d1117;
  --bg-card: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --text-muted: #7d8590;
  --accent: #58a6ff;
  --level-0: #1b2028;
  --cell-outline: rgba(255,255,255,0.05);
  --level-1: #0e4429;
  --level-2: #006d32;
  --level-3: #26a641;
  --level-4: #39d353;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #f6f8fa;
    --bg-card: #ffffff;
    --border: #d0d7de;
    --text: #1f2328;
    --text-muted: #656d76;
    --accent: #0969da;
    --level-0: #ebedf0;
    --cell-outline: rgba(0,0,0,0.08);
    --level-1: #9be9a8;
    --level-2: #40c463;
    --level-3: #30a14e;
    --level-4: #216e39;
  }
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Noto Sans, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding: 24px;
}

.container { max-width: 960px; margin: 0 auto; }

header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

header svg { color: var(--text-muted); flex-shrink: 0; }
h1 { font-size: 20px; font-weight: 600; }
h1 span { color: var(--text-muted); font-weight: 400; }

.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid var(--border);
  color: var(--text-muted);
  margin-left: auto;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
}

.stat-value { font-size: 24px; font-weight: 600; }
.stat-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.card-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
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

.level-0 { fill: var(--level-0); }
.level-1 { fill: var(--level-1); }
.level-2 { fill: var(--level-2); }
.level-3 { fill: var(--level-3); }
.level-4 { fill: var(--level-4); }

.legend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  justify-content: flex-end;
}

.legend-text { font-size: 11px; color: var(--text-muted); margin: 0 4px; }
.legend rect { stroke: var(--cell-outline); stroke-width: 1; }

.tooltip {
  position: fixed;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 100;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.tooltip.visible { opacity: 1; }

.meta { display: flex; gap: 16px; font-size: 12px; color: var(--text-muted); margin-top: 12px; }
.meta-item { display: flex; align-items: center; gap: 4px; }
.meta-item svg { width: 14px; height: 14px; }

footer { text-align: center; padding: 24px 0; font-size: 11px; color: var(--text-muted); }
footer a { color: var(--accent); text-decoration: none; }
`
