# Copilot Instructions for git-heatmap

## Style

- Do not use em dashes (`—`, `U+2014`). Rephrase instead of substituting with hyphens.

## Overview

- CLI tool that generates an interactive commit heatmap dashboard for any git repository.
- Published to npm as `git-heatmap`. Entry point: `dist/index.js` (set via `bin` in `package.json`).

## Tech Stack

- **Runtime:** Node.js >= 18 (ESM)
- **Language:** TypeScript (strict mode), Biome for linting/formatting
- **Client:** Preact + Preact Signals, SCSS, SVG icons (loaded as text)
- **Build:** Custom esbuild pipeline (`build.ts`). Bundles client into an IIFE, then bundles the server. Client JS/CSS are embedded inline in the HTML served by the Node server.
- **Path alias:** `@/*` maps to `src/*`

## Project Structure

- `src/index.ts` - HTTP server entry point, CLI arg parsing, API routes
- `src/git.ts` - All git operations via `child_process`
- `src/calendar.ts` - Heatmap data computation (weeks, levels, stats)
- `src/html.ts` - Generates the full HTML page with embedded client bundle
- `src/args.ts` - CLI argument parsing
- `src/types.ts` - Shared type definitions
- `src/client/` - Preact SPA (app, state, components, styles, icons)

## Development

- `npm run dev` starts a watch build
- `npm run build` for production build
- `npm run check` runs Biome fix + TypeScript type checking
