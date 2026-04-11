---
description: "Use before every commit. Review staged/unstaged changes for code quality, readability, and correctness before committing."
---

# Commit Format

- Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes: `feat:`, `fix:`, `refactor:`, `style:`, `perf:`, `test:`, `docs:`, `chore:`
- Title: short imperative summary, lowercase after prefix (e.g. `feat: add year selector`)
- Do not repeat the prefix as a verb (e.g. `fix: broken scroll`, not `fix: fix broken scroll`)
- Body only when needed; for small changes a title alone is fine
- Body: flat bullet list of changes, no category headers
- Maximum 10 list items per commit
- Use `->` for version transitions (e.g. `eslint 9->10`)

# Pre-Commit Review Checklist

Before committing, review **every changed file** against this checklist:

## 1. Correctness

- No leftover debug code (`console.log`, commented-out blocks, `TODO` hacks).
- No dead code (unused imports, variables, functions, CSS rules).
- No duplicate declarations (e.g. same CSS rule defined twice).
- Logic is correct: no off-by-one errors, missing null checks at boundaries, or broken conditions.

## 2. Simplicity & Readability

- Code is concise: no unnecessary wrappers, abstractions, or indirection.
- Names are clear and consistent with the rest of the codebase.
- No overly complex expressions; break them up if hard to read.

## 3. Consistency

- Follows existing project patterns (file structure, naming, formatting).
- Indentation and whitespace match surrounding code.

## 4. No Regressions

- Changes don't break existing functionality.
- Removed code is truly unused: grep for references before deleting.

## 5. Commit Hygiene

- Only related changes are included: no unrelated drive-by edits.
- Follow Conventional Commits format (see above).
