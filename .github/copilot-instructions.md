# Copilot Instructions for git-heatmap

## Release Flow

When creating a new release, follow these steps exactly:

### 1. Determine version

- Use **patch** bump (e.g. 0.8.2 → 0.8.3) for bug fixes, small enhancements, dependency updates, and UI refinements to existing features.
- Use **minor** bump (e.g. 0.8.3 → 0.9.0) for significant new features or capabilities.

### 2. Bump version

- Update `version` in `package.json`.
- Run `npm install` to update `package-lock.json`.

### 3. Create release commit

- Stage only `package.json` and `package-lock.json`.
- Commit message: `chore: release v<version>`

### 4. Tag

- Create a **lightweight** tag (not annotated): `git tag v<version>`
- The tag message shown by `git tag -l -n1` will be the commit subject.

### 5. Push

- Push commit and tag: `git push origin main --tags`

### 6. Create GitHub release

- Use `gh release create v<version> --title "v<version>" --notes "<notes>"`
- Release notes format — use these sections as applicable (omit empty sections):

```markdown
### Added
- Feature description

### Fixed
- Fix description

### Changed
- Change description
```

- Summarize commits since the last release tag. Group by category. Keep descriptions concise (one line each).
