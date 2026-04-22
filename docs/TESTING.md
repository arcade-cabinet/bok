---
title: Testing
updated: 2026-04-09
status: current
domain: quality
---

# Testing — Bok: The Builder's Tome

## Summary

- **1069 unit tests** across 88 files (Vitest, Node environment)
- **Browser tests** for all React components and engine integration (Vitest browser, Playwright)
- **Content validation** via Zod — all JSON content validated at import time
- CI runs typecheck, lint, unit tests, browser tests, and build on every PR

## Test Projects

Vitest is configured with two projects in `vitest.config.ts`:

| Project | Command | Environment | Scope |
|---------|---------|-------------|-------|
| `unit` | `pnpm test` | Node | Pure logic, ECS systems, generation, combat math, content validation |
| `browser` | `pnpm test:browser` | Playwright/Chromium | React components, DOM, canvas, WebGL integration |

## What Goes Where

**Unit tests** (`*.test.ts`, Node project):

- Procedural generation: deterministic seed → island output
- Combat: damage calculation, combo timing, hit detection
- Content validation: Zod schema conformance for all JSON
- AI: Yuka FSM transitions, steering output
- Koota: trait CRUD, query results, relation integrity
- Game loop: pause state, physics step sequencing
- Progression: tome page tracking, unlock rules

**Browser tests** (`*.browser.test.tsx`, Playwright project):

- All React views: MainMenuView, GameView, HubView, IslandSelectView
- All React components: HealthBar, Hotbar, Minimap, DamageIndicator, BossCompass, etc.
- All modals: PauseMenu, DeathScreen, VictoryScreen, CraftingModal, InventoryModal
- Engine integration: canvas mount, initGame lifecycle

**No node mocks for Three.js, DOM, WebGL, or WASM (Rapier)** — use browser tests instead. Modules that import `@dimforge/rapier3d` cannot be tested in Node.

## Running Tests

```bash
# Unit tests
pnpm test

# Browser tests (headless Playwright)
pnpm run test:browser

# Both
pnpm test && pnpm run test:browser

# With coverage
pnpm test --coverage
```

## Content Validation

All game content (biomes, enemies, weapons, bosses, items) is validated by Zod schemas in `src/content/types.ts` at import time. Running `pnpm test` catches schema violations because content is imported by tests.

171 balance tests cover all biomes, enemies, bosses, and weapons.

## Device and E2E Testing

Maestro E2E flows in `.maestro/flows/`:

- `web-smoke.yaml` — web smoke test (Chromium)
- `ios-full-journey.yaml` — full iOS journey (iOS simulator)
- `ios-touch-controls.yaml` — touch input verification
- `creative-mode.yaml` — Creative mode verification

See `.maestro/README.md` for prerequisites and run instructions.

Manual device QA required before release: phones/tablets — touch controls, safe areas, thermal throttling.

## Coverage Goals

| Area | Target |
|------|--------|
| Public barrel APIs | 100% |
| React components | 100% (browser tests) |
| Content JSON schema | 100% (Zod at import) |
| Pure generation logic | 100% |
| Integration (save/load, scene lifecycle) | Key paths covered |

## Verification Gate

All of these must pass before opening a PR:

```bash
pnpm run typecheck     # 0 errors
pnpm run lint          # 0 errors, 0 warnings
pnpm test              # all unit tests pass
pnpm run test:browser  # all browser tests pass
pnpm run build         # no build errors or warnings
```
