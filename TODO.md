# git-heatmap: Feature Ideas

## Low effort, high value

- [x] **Commit activity heatmap**: GitHub-style heatmap with year switching and click-to-filter
- [ ] **Top authors table**: contributor names with commit counts, mini leaderboard
- [ ] **Branch list**: active branches with last commit date
- [x] **Favicon**: inline SVG favicon for a polished browser tab

## Medium effort

- [ ] **File change heatmap**: most-changed files/directories (tree map or ranked list via `git log --name-only`)
- [ ] **Time-of-day chart**: when commits happen (morning/afternoon/night distribution)
- [ ] **Day-of-week chart**: which weekdays are most active
- [x] **Commit messages panel**: recent commits list with relative timestamps

## Bigger features

- [ ] **Multi-branch comparison**: toggle between branches to see different heatmaps
- [x] **Year selector**: switch between years instead of fixed last 12 months
- [x] **CLI flags**: `--port`, `--no-open` to customize without env vars
- [ ] **Repo comparison mode**: run from parent directory, see multiple repos side-by-side

## Developer experience

- [x] **Bundler setup**: esbuild for server + client bundling with minification
- [x] **SCSS**: proper `.scss` files with nesting, `&`, `@for` loops
- [x] **Split client.ts**: Preact components with @preact/signals for reactive state
- [x] **SVG assets**: real `.svg` files instead of inline template strings
- [x] **Path aliases**: `@/` imports via tsconfig paths
- [x] **Watch mode**: `npm run build -- --watch` for development
- [x] **HTML templating**: client UI uses Preact/JSX components
- [x] **Biome**: fast linting and formatting for TS/TSX/JSON
- [ ] **Vitest tests**: unit tests for calendar, git, and state logic
