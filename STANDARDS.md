---
title: Standards
updated: 2026-04-09
status: current
domain: technical
---

# Standards — Bok: The Builder's Tome

## Code Quality

- **Max 300 LOC per file** — any file in any language
- **TypeScript strict mode** — no `any` except the accepted `jpWorld: any` pattern (JollyPixel runtime is untyped)
- **No stubs, TODOs, or placeholder bodies** — implement fully or remove
- **No `innerHTML`** — use React components or safe DOM APIs

## Import Rules

- **Barrel exports only** across domain boundaries
- Internal files within a domain may use relative imports
- The pre-edit hook in `.claude/settings.local.json` enforces this at agent-edit time
- Biome 2.4 lint enforces import ordering and formatting

## Testing Requirements

- Every barrel-exported public API requires a test
- Rendering/DOM logic goes in browser tests (`*.browser.test.tsx`)
- Pure logic goes in unit tests (`*.test.ts`)
- Content JSON validation is covered by schema tests — all content must pass Zod at import
- See `docs/TESTING.md` for the full strategy

## Content Data Standards

- All biomes, enemies, weapons, and bosses are JSON files in `src/content/<type>/`
- New content copies an existing JSON as a template
- Zod schemas in `src/content/types.ts` are authoritative — no divergence allowed
- Registration in `src/content/registry.ts` is required

## Architecture Constraints

- React owns all UI — no imperative DOM manipulation for game UI
- JollyPixel APIs only — no raw Three.js scene manipulation
- Koota is the single source of truth for game entity state
- Yuka drives all AI decisions — no ad-hoc enemy logic in systems
- All generators (`src/generation/`) are pure functions — same seed always produces same output

## Commit Standards

Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`, `ci:`, `build:`

## Lint / Format

Biome 2.4 handles formatting, import ordering, TypeScript lint, and a11y rules. Run `pnpm run lint` before opening a PR. Zero errors and zero warnings required.
