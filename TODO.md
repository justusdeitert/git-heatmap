# git-heatmap — Feature Ideas

## Low effort, high value

- [x] **Commit activity heatmap** — GitHub-style heatmap with year switching and click-to-filter
- [ ] **Top authors table** — contributor names with commit counts, mini leaderboard
- [ ] **Branch list** — active branches with last commit date
- [x] **Favicon** — inline SVG favicon for a polished browser tab

## Medium effort

- [ ] **File change heatmap** — most-changed files/directories (tree map or ranked list via `git log --name-only`)
- [ ] **Time-of-day chart** — when commits happen (morning/afternoon/night distribution)
- [ ] **Day-of-week chart** — which weekdays are most active
- [x] **Commit messages panel** — recent commits list with relative timestamps

## Bigger features

- [ ] **Multi-branch comparison** — toggle between branches to see different heatmaps
- [x] **Year selector** — switch between years instead of fixed last 12 months
- [x] **CLI flags** — `--port`, `--no-open` to customize without env vars
- [ ] **Repo comparison mode** — run from parent directory, see multiple repos side-by-side

## Developer experience

- [ ] **Bundler setup** — use esbuild or similar to bundle server + client, enable minification and tree-shaking
- [ ] **SCSS** — replace TS template string styles with proper `.scss` files (enabled by bundler)
- [ ] **Split client.ts** — break ~800 LOC client into smaller modules (tooltip, modal, filters, etc.)
- [ ] **HTML templating** — replace template string HTML in `html.ts` with a proper templating engine (e.g. EJS, Handlebars) or `.html` files
- [ ] **Split html.ts** — extract SVG builders and HTML helpers into separate modules
- [ ] **Live reload** — watch mode with auto-refresh during development
