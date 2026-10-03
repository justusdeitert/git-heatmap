# git-heatmap: Feature Ideas

## Low effort, high value

- [ ] **Branch list**: active branches with last commit date

## Medium effort

- [ ] **File change heatmap**: most-changed files/directories (tree map or ranked list via `git log --name-only`)
- [ ] **Time-of-day chart**: when commits happen (morning/afternoon/night distribution)
- [ ] **Day-of-week chart**: which weekdays are most active
- [ ] **Multi-day selection and move**: ⌘/Ctrl-click (Shift-click for ranges) to select local-only days in the heatmap, then drag one to move all selected days by the same offset (live preview, no moves into the future)
- [ ] **Chronology guard**: block any edit (commit edit, bulk shift, day move) that would put commits out of chronological order and show an "Action not possible" dialog explaining which commits conflict

## Bigger features

- [ ] **Multi-branch comparison**: toggle between branches to see different heatmaps
- [ ] **Repo comparison mode**: run from parent directory, see multiple repos side-by-side

## Developer experience

- [ ] **Vitest tests**: unit tests for calendar, git, and state logic

## Known bugs

- [ ] **Shifts convert dates to UTC**: bulk/day shifts drop the commit's timezone offset, so early-morning commits can land on the previous day
- [ ] **Short-hash lookup in bulk shift**: rebase todo lines are matched by 7-char hashes, which silently fails when git abbreviates hashes longer
- [ ] **Swallowed click after drag**: a heatmap drag that ends outside the grid leaves the next day click ignored
