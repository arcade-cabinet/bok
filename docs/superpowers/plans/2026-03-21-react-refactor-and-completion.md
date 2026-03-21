# Bok React Refactor & Game Completion Plan

> **Production status:** For **what remains to ship a production game**, use the living checklist: [`docs/PRODUCTION_ROADMAP.md`](../../PRODUCTION_ROADMAP.md). This file is a **phase-oriented task list**; it may lag the repo.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Bok from a 989-line monolithic main.ts into a React-anchored architecture with proper packages, decomposed engine modules, browser component tests, and all remaining game features implemented.

**Architecture:** React 19 owns all UI (menu, HUD, overlays, modals). JollyPixel owns the 3D canvas via a React ref. Koota owns game state (traits/relations). Yuka owns AI. The engine is decomposed into focused modules (terrain, combat, enemies, camera, loop) orchestrated by a single `initGame()` entry point. Vitest browser tests validate every React component and engine integration.

**Tech Stack:** React 19, Framer Motion, Tailwind CSS 4, @vitejs/plugin-react, JollyPixel (engine/runtime/voxel.renderer), Koota, Yuka, Rapier3D, @capacitor-community/sqlite, Vitest + @vitest/browser, Biome 2.4, pnpm

**Spec:** `docs/superpowers/specs/2026-03-20-bok-game-design.md`

**Current state (as of 2026-03):** React is the entry point; `GameEngine.ts` and hub/game views are implemented; unit + browser tests exist. See `docs/PRODUCTION_ROADMAP.md` for gaps to production.

---

## Phase 1: React Migration & Engine Decomposition (sequential — foundation)

### Task 1: Decompose main.ts into engine modules

**Files:**
- Create: `src/engine/terrain.ts` — terrain generation + voxel placement
- Create: `src/engine/enemies.ts` — enemy spawning + AI wiring
- Create: `src/engine/combat.ts` — combat loop, damage, loot drops
- Create: `src/engine/camera.ts` — FPS camera setup + movement
- Create: `src/engine/hud-dom.ts` — DOM HUD creation (temporary until React HUD)
- Create: `src/engine/GameEngine.ts` — orchestrator: initGame(canvas, config)
- Create: `src/engine/types.ts` — shared engine types
- Modify: `src/main.ts` — reduce to React mount point only
- Delete: old monolithic code from main.ts

Each engine module exports a pure function:
- `createTerrain(jpWorld, scene, rapierWorld, config) → { voxelMap, surfaceHeight }`
- `spawnEnemies(scene, yukaManager, surfaceHeight, seed) → EnemyState[]`
- `createCombat(scene, enemies, camera, yukaManager) → { update(dt), cleanup() }`
- `createCamera(jpWorld, surfaceHeight, isMobile) → { camera, euler, update(dt) }`
- `initGame(canvas, config, onReturn) → { cleanup() }`

All imports use barrel exports from domain packages. No cross-module reaching.

- [ ] Step 1: Create `src/engine/types.ts` with shared interfaces
- [ ] Step 2: Extract terrain code from main.ts → `src/engine/terrain.ts`
- [ ] Step 3: Extract enemy code → `src/engine/enemies.ts`
- [ ] Step 4: Extract combat code → `src/engine/combat.ts`
- [ ] Step 5: Extract camera code → `src/engine/camera.ts`
- [ ] Step 6: Extract HUD DOM code → `src/engine/hud-dom.ts`
- [ ] Step 7: Create `src/engine/GameEngine.ts` orchestrating all modules
- [ ] Step 8: Replace `src/main.ts` with React mount point: imports `src/app/index.tsx`
- [ ] Step 9: Update `index.html` to mount `#app` div, point script to `src/app/index.tsx`
- [ ] Step 10: Verify game loads: `pnpm dev`, click "Pen New Tale", terrain renders
- [ ] Step 11: Run `pnpm test` — all 128 tests pass
- [ ] Step 12: Commit

### Task 2: Wire React main menu to engine

**Files:**
- Modify: `src/views/menu/MainMenuView.tsx` — already created, wire onStartGame
- Modify: `src/views/game/GameView.tsx` — wire initGame from engine
- Modify: `src/app/App.tsx` — route between views

- [ ] Step 1: Update `index.html` entry to `src/app/index.tsx`
- [ ] Step 2: Verify MainMenuView renders with animated background
- [ ] Step 3: Click "Begin Writing" → GameView mounts → canvas renders terrain
- [ ] Step 4: Verify enemy spawning, combat, audio all work through React
- [ ] Step 5: Commit

### Task 3: Migrate HUD to React components

**Files:**
- Create: `src/components/hud/HealthBar.tsx` — reads game state, renders bar
- Create: `src/components/hud/EnemyCounter.tsx` — shows enemy count + biome
- Create: `src/components/hud/Crosshair.tsx` — center dot
- Create: `src/components/hud/Hotbar.tsx` — 5 weapon slots
- Create: `src/components/hud/BossHealthBar.tsx` — shown during boss fight
- Create: `src/components/hud/HUD.tsx` — composes all HUD components
- Modify: `src/views/game/GameView.tsx` — render HUD overlay
- Create: `src/hooks/useGameState.ts` — React hook exposing engine state
- Delete: `src/engine/hud-dom.ts` after migration

- [ ] Step 1: Create useGameState hook that polls engine state each frame
- [ ] Step 2: Create HealthBar component with parchment theme
- [ ] Step 3: Create EnemyCounter, Crosshair, Hotbar, BossHealthBar
- [ ] Step 4: Create HUD compositor
- [ ] Step 5: Wire into GameView
- [ ] Step 6: Remove DOM HUD code from engine
- [ ] Step 7: Verify HUD renders and updates in real-time
- [ ] Step 8: Commit

### Task 4: Migrate overlays to React (pause, death, victory)

**Files:**
- Create: `src/components/modals/PauseMenu.tsx`
- Create: `src/components/modals/DeathScreen.tsx`
- Create: `src/components/modals/VictoryScreen.tsx`
- Modify: `src/views/game/GameView.tsx` — manage overlay state
- Create: `src/hooks/useGameEvents.ts` — subscribe to engine events

- [ ] Step 1: Create PauseMenu (Escape key toggle, Resume/Quit)
- [ ] Step 2: Create DeathScreen ("THE CHAPTER ENDS")
- [ ] Step 3: Create VictoryScreen ("A NEW PAGE IS WRITTEN")
- [ ] Step 4: Wire engine events → React state (death, victory, pause)
- [ ] Step 5: Remove DOM overlay code from engine
- [ ] Step 6: Verify all overlays work
- [ ] Step 7: Commit

## Phase 2: Browser Component Tests (parallel with Phase 3)

### Task 5: Setup Vitest browser testing

**Files:**
- Modify: `vitest.config.ts` — add browser project with Playwright
- Create: `src/test/setup.ts` — browser test setup
- Modify: `package.json` — add test:browser script

- [ ] Step 1: Install `@vitest/browser` and configure browser project
- [ ] Step 2: Create setup file
- [ ] Step 3: Verify `pnpm test:browser` runs (even with 0 tests)
- [ ] Step 4: Commit

### Task 6: Write browser tests for React views

**Files:**
- Create: `src/views/menu/MainMenuView.browser.test.tsx`
- Create: `src/views/game/GameView.browser.test.tsx`
- Create: `src/components/hud/HealthBar.browser.test.tsx`
- Create: `src/components/modals/PauseMenu.browser.test.tsx`

Tests:
- MainMenuView: renders title, biome grid, seed input, start button works
- GameView: mounts canvas, initializes engine, renders terrain
- HealthBar: renders bar, updates on state change, pulses at low health
- PauseMenu: renders on Escape, Resume dismisses, Quit returns to menu

- [ ] Step 1: Write MainMenuView test
- [ ] Step 2: Write GameView test
- [ ] Step 3: Write HealthBar test
- [ ] Step 4: Write PauseMenu test
- [ ] Step 5: Run all browser tests, verify pass
- [ ] Step 6: Commit

## Phase 3: Remaining Game Features (parallel — independent tasks)

### Task 7: Hub Island with buildings and NPCs

**Files:**
- Create: `src/engine/hub.ts` — hub terrain, buildings, NPC placement
- Create: `src/views/hub/HubView.tsx` — hub scene React wrapper
- Create: `src/components/hud/BuildingInteraction.tsx` — building upgrade UI
- Modify: `src/app/App.tsx` — add 'hub' view route

Hub generates fixed 32x32 island, places 5 buildings as voxel structures, 4 NPCs. Building interaction shows upgrade UI. Dock departure → island select.

- [ ] Steps: Create hub engine module, React view, building interaction component, wire routing

### Task 8: Progression system (SQLite persistence)

**Files:**
- Modify: `src/persistence/SaveManager.ts` — wire to actual @capacitor-community/sqlite
- Create: `src/hooks/useProgression.ts` — React hook for unlock state
- Create: `src/engine/progression.ts` — tome page tracking, run history

Boss kills → tome page unlock → persisted to SQLite. Hub building upgrades persisted. Run history tracked. Gear lost on death, unlocks kept.

- [ ] Steps: Wire SQLite, create progression engine module, React hook, verify save/load round-trip

### Task 9: GLB model loading from asset library

**Files:**
- Create: `public/models/enemies/` — curated GLBs from /Volumes/home/assets
- Create: `public/models/weapons/` — tool/weapon GLBs
- Create: `public/models/props/` — chests, torches
- Modify: `src/engine/enemies.ts` — load GLB instead of box mesh
- Create: `src/engine/models.ts` — GLB loader using JollyPixel AssetManager

Copy game-appropriate GLBs from /Volumes/home/assets/3DLowPoly/ and /Volumes/home/assets/3DPSX/ into public/models/ organized by type. Use JollyPixel's ModelRenderer ActorComponent.

REQUIRES: /Volumes/home mounted

- [ ] Steps: Mount assets, search+copy GLBs, create model loader, replace box meshes

### Task 10: Yuka GOAP governor for player

**Files:**
- Create: `src/ai/PlayerGovernor.ts` — Yuka goal-driven AI for player assists
- Modify: `src/engine/combat.ts` — wire governor for auto-targeting

Player GOAP: auto-target nearest enemy, stamina management, threat assessment. Player still controls movement/camera, AI assists combat decisions.

- [ ] Steps: Create goal evaluators, wire to combat, test with browser test

### Task 11: Tone.js spatial audio upgrade

**Files:**
- Modify: `src/audio/GameAudio.ts` — replace Web Audio with Tone.js
- Add dep: `tone` npm package

Richer procedural audio: proper ambient loops, spatial audio positioned at enemy locations, reverb, filtering.

- [ ] Steps: Install Tone.js, rewrite GameAudio, wire spatial to enemy positions

### Task 12: Diegetic controls refinement

**Files:**
- Create: `src/engine/diegetic.ts` — contextual action detection
- Modify: `src/engine/combat.ts` — contact combat improvements
- Create: `src/components/hud/ContextIndicator.tsx` — subtle context hints

Auto-jump with head bob, contact combat polish, center-mounted 3D tool model. No forced buttons — everything contextual and responsive.

- [ ] Steps: Create diegetic module, refine contact combat, add context indicator

## Phase 4: Polish & Final Integration

### Task 13: Mobile responsive refinement

**Files:**
- Modify: `src/views/game/GameView.tsx` — responsive canvas
- Modify: `src/input/MobileControls.ts` — refine split-half touch
- Create: `src/hooks/useDeviceType.ts` — React hook for device detection

- [ ] Steps: Responsive canvas sizing, refined touch controls, device-aware HUD scaling

### Task 14: Full integration test + CI readiness

**Files:**
- Create: `src/test/integration.browser.test.tsx` — full game flow test
- Modify: `package.json` — add CI scripts
- Run: `pnpm build` — verify production build

Full flow: menu → select biome → start game → walk → fight enemy → kill boss → victory → return to menu. All in one browser test.

- [ ] Steps: Write integration test, verify build, run all tests

---

## Dependency Graph

```
Phase 1 (sequential):
  Task 1 → Task 2 → Task 3 → Task 4

Phase 2 (after Task 2):
  Task 5 → Task 6

Phase 3 (after Task 2, all parallel):
  Task 7, Task 8, Task 9, Task 10, Task 11, Task 12

Phase 4 (after all):
  Task 13 → Task 14
```

## Execution Notes

- Phase 1 is sequential — each task depends on the previous
- Phase 2 and Phase 3 can run in parallel after Task 2 completes
- Task 9 (GLB models) requires /Volumes/home mounted
- All browser tests use Vitest browser mode with Playwright — NOT node mocks
- Every task commits at the end
- The agent team should have 1 lead + 5-6 teammates for Phase 3 parallelism
