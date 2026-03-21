# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### daisyUI v5 + Tailwind CSS 4 Integration
- daisyUI is configured via `@plugin "daisyui"` in `src/main.css` (CSS-first, no tailwind.config.js)
- Custom themes use `@plugin "daisyui/theme" { ... }` blocks with OKLCH color values
- The `parchment` theme is set as default via `data-theme="parchment"` on `<html>` in `index.html`
- Biome requires `"css": { "parser": { "tailwindDirectives": true } }` in `biome.json` to parse `@plugin` directives

### Existing UI Pattern
- Views use a mix of Tailwind utility classes and inline `style` props for the game's parchment aesthetic
- Common inline colors: `#fdf6e3` (parchment bg), `#2c1e16` (ink dark), `#c4a572` (gold), `#8b5a2b` (medium brown)
- Font families set via inline styles: Cinzel (headings), Crimson Text (body), Georgia (fallback), JetBrains Mono (code)

### Engine Module Decomposition Pattern
- Engine setup functions return typed context objects (`EngineCore`, `TerrainResult`, `PlayerResult`, etc.) — explicit dependency injection at module boundaries
- `GameEngine.ts` is a thin orchestrator: calls setup functions in sequence, wires their outputs together, returns `GameInstance` API
- The `jpWorld` type is `any` everywhere — JollyPixel's runtime API is untyped; this is an accepted codebase pattern
- `MobileInput` lives in `types.ts` (shared type hub) to avoid circular imports between `GameEngine.ts` and `gameLoop.ts`
- Game loop module uses `GameLoopContext` interface as a "context bag" — all frame-loop dependencies are explicit parameters, not closures over module-scoped state
- For Node tests of browser-heavy modules: test pure state/logic (pause, accessors), mock only jpWorld's event emitter pattern; skip tests that need WebGL/WASM (Rapier, VoxelRenderer)

---

## 2026-03-21 - US-001
- **What was implemented**: daisyUI v5.5.19 integrated with Tailwind CSS 4
- **Files changed**:
  - `package.json` — added `daisyui` dependency
  - `src/main.css` — added `@plugin "daisyui"` + custom `parchment` theme definition
  - `index.html` — added `data-theme="parchment"` attribute to `<html>`
  - `biome.json` — added `css.parser.tailwindDirectives: true` for `@plugin` syntax support
- **Learnings:**
  - daisyUI v5 uses `@plugin "daisyui/theme"` CSS blocks (not JS config) for custom themes in Tailwind CSS 4
  - `default: true` in the theme config sets it as the default light theme, but `prefers-color-scheme: dark` can override it — use `data-theme` on `<html>` for explicit control
  - Theme colors use OKLCH format; low chroma (0.02-0.10) with hues around 45-75° produces the warm parchment palette
  - Biome 2.x needs `tailwindDirectives: true` in CSS parser config to avoid parse errors on `@plugin`
  - All 139 unit tests pass, typecheck passes, build succeeds — daisyUI adds no regressions
  - Existing views (MainMenuView, GameView, HubView) use inline `style` props that are unaffected by daisyUI
---

## 2026-03-21 - US-012
- **What was implemented**: Decomposed `GameEngine.ts` (~306 lines) into focused engine modules
- **Files changed**:
  - `src/engine/types.ts` — added `MobileInput` interface (moved from GameEngine.ts)
  - `src/engine/terrain.ts` → `src/engine/terrainSetup.ts` — renamed for consistency
  - `src/engine/enemies.ts` → `src/engine/enemySetup.ts` — renamed for consistency
  - `src/engine/engineSetup.ts` — NEW: JollyPixel Runtime + Rapier + Koota + scene/lighting init (`createEngineCore`)
  - `src/engine/playerSetup.ts` — NEW: camera + input system + weapon model + pointer lock (`createPlayer`)
  - `src/engine/gameLoop.ts` — NEW: beforeFixedUpdate/beforeUpdate frame loop orchestration (`createGameLoop`)
  - `src/engine/GameEngine.ts` — rewritten as thin orchestrator (~155 lines, down from ~306)
  - `src/engine/gameLoop.test.ts` — NEW: 8 tests for game loop (pause, state, physics step, frame skip)
  - `src/engine/enemySetup.test.ts` — NEW: 4 tests for `updateEnemyAI` (chase, stop, wander, empty list)
  - `src/engine/playerSetup.test.ts` — NEW: 1 structural export test
- **Results**: 152 tests passing (was 139), typecheck clean, lint clean (only pre-existing warnings)
- **Learnings:**
  - `MobileInput` had to move to `types.ts` before extraction to prevent circular imports (`GameEngine ↔ gameLoop`)
  - `terrain.ts` and `enemies.ts` were only imported by `GameEngine.ts`, making renames safe
  - The frame loop required the most care — its closure captures many references; the `GameLoopContext` interface makes all dependencies explicit and testable
  - `@dimforge/rapier3d` (WASM) can't be resolved in Vitest Node environment — modules importing it can't have structural tests without mocking
  - `document.pointerLockElement` access in `togglePause` needs a minimal `globalThis.document` stub in Node tests
  - Three.js imported as `import type * as THREE` breaks when using `instanceof THREE.FogExp2` — need value import for runtime checks
  - `initGame()` public API is completely unchanged — `GameView.tsx` import works without modification
---

