---
title: Progress
domain: memory-bank
status: current
last-verified: 2026-03-16
summary: "32/53 user stories done, Phases 0-4 complete, Phase 5 in progress"
---

# Progress -- Bok

## Summary

- **32 of 53 user stories passing** (60%)
- **Phases 0-4 complete**, Phase 5 in progress, Phase 6 not started
- **939 Vitest unit tests passing**

## Phase 0: Foundation Hardening -- COMPLETE

| US | Title | Status |
|----|-------|--------|
| US-001 | Vitest Testing Infrastructure | DONE |
| US-002 | Creature Entity Framework | DONE |
| US-003 | Biome Noise Infrastructure | DONE |
| US-004 | New Block Types for Biomes | DONE |
| US-005 | Persistence Layer (SQLite) | DONE |

## Phase 1: Swedish Landscape -- COMPLETE

| US | Title | Status |
|----|-------|--------|
| US-006 | Angen Biome (Meadow) | DONE |
| US-007 | Bokskogen Biome (Beech Forest) | DONE |
| US-008 | Fjallen Biome (Mountains) | DONE |
| US-009 | Skargarden Biome (Archipelago) | DONE |
| US-010 | Myren + Blothogen Biomes (Bog + Corruption) | DONE |

## Phase 2: Building-Block Creatures -- COMPLETE

| US | Title | Status |
|----|-------|--------|
| US-011 | Morker Redesign (Multi-part) | DONE |
| US-012 | Passive Creatures (Trana, Lyktgubbe, Skogssnigle) | DONE |
| US-013 | Neutral Creatures (Vittra, Nacken) | DONE |
| US-014 | Procedural Animation Runtime | DONE |
| US-015 | Hostile Creature AI (Draugar) | DONE |
| US-016 | Boss: Lindorm | DONE |
| US-017 | Boss: Runvaktare | DONE |
| US-018 | Boss: Jatten | DONE |

## Phase 3: Survival Depth -- COMPLETE

| US | Title | Status |
|----|-------|--------|
| US-019 | Food Chain and Cooking | DONE |
| US-020 | Tool Durability | DONE |
| US-021 | Workstation System | DONE |
| US-022 | Light Sources and Light Zone | DONE |
| US-023 | Structure Detection | DONE |
| US-024 | Inscription Level and World Pushback | DONE |

## Phase 4: The Bok / Diegetic UI -- COMPLETE

| US | Title | Status |
|----|-------|--------|
| US-025 | Bok Journal Shell (Tab System) | DONE |
| US-026 | Kartan (Atlas/Map Page) | DONE |
| US-027 | Kunskapen (Knowledge/Codex Page) | DONE |
| US-028 | Listan (Ledger/Inventory Page) | DONE |
| US-029 | Sagan (Saga/Journal Page) | DONE |
| US-030 | HUD Diegetification | DONE |
| US-031 | Rune Inscription System | DONE |
| US-032 | Rune Spatial Index | DONE |

## Phase 5: Runes & Advanced Systems -- IN PROGRESS

| US | Title | Status |
|----|-------|--------|
| US-033 | Signal Propagation Engine | IN PROGRESS |
| US-034 | Emitter Runes (Kenaz, Sowilo) | NOT STARTED |
| US-035 | Interaction Runes (Jera, Fehu, Ansuz, Thurisaz) | NOT STARTED |
| US-036 | Protection Runes (Algiz, Mannaz, Berkanan) | NOT STARTED |
| US-037 | Archetype Recognition + Settlement Founding | NOT STARTED |
| US-038 | Computational Runes (Naudiz, Isa, Hagalaz) | NOT STARTED |
| US-039 | Self-Modifying Circuits + Feedback Loops | NOT STARTED |
| US-040 | Rune Discovery + Kunskapen Integration | NOT STARTED |
| US-041 | Fast Travel System | NOT STARTED |
| US-042 | Network Runes (Uruz, Tiwaz, Crystal Amplification) | NOT STARTED |
| US-043 | Territory and Decay | NOT STARTED |
| US-044 | Seasons (Visual) | NOT STARTED |

## Phase 6: Polish & Mobile Excellence -- NOT STARTED

| US | Title | Status |
|----|-------|--------|
| US-045 | Mobile Controls Refinement | NOT STARTED |
| US-046 | Performance Budget (60fps) | NOT STARTED |
| US-047 | Session Design | NOT STARTED |
| US-048 | Audio Foundation | NOT STARTED |
| US-049 | Tomte Entity + Teaching AI | NOT STARTED |
| US-050 | Tomte Settlement Integration | NOT STARTED |
| US-051 | Drag-to-Etch Expert Mode | NOT STARTED |
| US-052 | Emergent Machine Discovery | NOT STARTED |
| US-053 | Playwright E2E Test Suite | NOT STARTED |

## Known Technical Debt

### File Size Violations (200 LOC limit)

| File | LOC | Priority |
|------|-----|----------|
| `src/engine/game.ts` | 906 | High -- GameBridge monolith |
| `src/App.tsx` | 600 | High -- root orchestrator |
| `src/world/tileset-tiles.ts` | 501 | Medium -- could split by biome |
| ~27 other files | 200-400 | Low -- minor overages |

### Testing Gaps

- **Playwright CT completely broken** -- 96 tests defined, all timeout (Vite 8 + Rolldown incompatibility)
- **No E2E tests** -- Playwright E2E config not yet created (US-053)
- **Saga system** missing creature kill wiring and save/load persistence tests

### Missing Wiring

- Saga system `creaturesKilled` counter not wired to creature death events
- Saga system `bossDefeated` counter not wired to boss death events
- Saga entries not persisted to SQLite (lost on reload)

## Test Infrastructure

| Category | Count | Status |
|----------|-------|--------|
| Vitest unit tests | 939 | All passing (Node 24) |
| Playwright CT tests | 96 | All timeout (Vite 8 blocked) |
| Playwright E2E tests | 0 | Not created yet |
| Biome lint | Clean | CSS false positives only |
| TypeScript | Clean | `pnpm tsc -b` passes |
