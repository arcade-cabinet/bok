---
title: Active Context
domain: memory-bank
status: current
last-verified: 2026-03-16
summary: "Current state -- Phase 5 in progress, 32/53 user stories done, rune systems active"
---

# Active Context -- Bok

Last updated: 2026-03-16

## Current Branch

`claude/refactor-voxel-jolly-pixel-5378Y`

## Current Phase

**Phase 5: Runes & Advanced Systems** (in progress)

Ralph (automated agent) has completed 32 of 53 user stories across Phases 0-4 plus the start of Phase 5. The remaining 21 user stories span Phase 5 (US-033 through US-044) and Phase 6 (US-045 through US-053).

## What Was Just Completed

### Phase 4 -- The Bok / Diegetic UI (US-025 through US-032)
- Kartan (Map) page with canvas-rendered mini-map, biome colors, landmark runes
- Listan (Ledger/Inventory) page
- Kunskapen (Knowledge/Codex) page with progressive creature reveal
- Sagan (Saga/Journal) page with milestone-driven narrative entries
- HUD diegetification -- damage vignette, hunger desaturation, Berkanan rune indicator
- Rune inscription system with chisel tool, face selection, RuneWheel UI
- Rune spatial index with chunk-organized storage and persistence

### Phase 5 Start -- Rune Data and Inscription (US-031, US-032)
- Elder Futhark rune definitions (8 runes with glyphs, colors, descriptions)
- Face selection from ray march (no float-precision ray-plane intersection)
- RuneWheel radial selection UI
- Rune spatial index (`RuneIndex` class) with chunk-level queries
- Per-block face storage in `RuneFaces` trait
- Chisel tool with durability integration
- Signal data and signal propagation system files exist (US-033 in progress)

## What's Being Worked On

US-033 (Signal Propagation Engine) -- BFS-based signal propagation through conducting blocks. Files `signal-data.ts` and `signal-propagation.ts` exist but user story not yet passing.

## Known Blockers

### Critical
- **Playwright CT tests all timeout** -- Vite 8 + Rolldown incompatibility with `@playwright/experimental-ct-react` 1.58.2. All 96 defined CT tests fail. No workaround found.

### Important
- **30+ files exceed 200 LOC limit** -- `game.ts` (906), `App.tsx` (600), `tileset-tiles.ts` (501) are the worst offenders. Decomposition needed but not blocking features.
- **Saga system incomplete** -- Missing creature kill wiring (kills not recorded to SagaLog) and save/load persistence for saga entries.

## Recent Decisions

- **Rune spatial index uses chunk-organized Maps** instead of flat arrays for efficient signal propagation scanning
- **Dual write pattern** for rune data -- both `RuneFaces` ECS trait and `RuneIndex` singleton for backward compatibility
- **Module-level singletons** (like `getRuneIndex()`) need `reset*()` functions for test isolation
- **Diegetic effects use CSS** (vignette, desaturation, backdrop-filter) not shader post-processing, for mobile performance

## Test Status

- **939 Vitest unit tests passing** (Node 24 required)
- **96 Playwright CT tests defined** but all timeout (blocked by Vite 8 incompatibility)
- **0 E2E tests** (Playwright E2E config not yet created)
- **Biome lint clean** (only CSS false positives from Tailwind v4 `@theme`/`@utility` syntax)
- **TypeScript compiles cleanly** (`pnpm tsc -b` passes)

## Next Steps

1. Complete US-033 (Signal Propagation Engine)
2. US-034 through US-044 (remaining Phase 5 rune and advanced systems)
3. Address file size debt (game.ts, App.tsx decomposition)
4. Investigate Playwright CT fix or alternative CT approach
5. Wire saga system creature kill recording and persistence
