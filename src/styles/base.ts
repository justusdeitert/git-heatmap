export const baseCSS = `
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

footer { text-align: center; padding: 24px 0; font-size: 11px; color: var(--text-muted); }
footer a { color: var(--accent); text-decoration: none; }
`;
