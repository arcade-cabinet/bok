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

## 2026-03-21 - US-015
- **What was implemented**: Evaluated dead `src/behaviors/` ActorComponent files against current engine approach. Decision: delete dead files, keep current functional approach.
- **Decision rationale**: The dead `PlayerCameraBehavior` was a thin `applyLook()` wrapper — a strict subset of `src/engine/camera.ts` which handles movement, auto-platforming, terrain-following, head bob, sprint, and mobile input. The dead `RenderSyncBehavior` syncs Koota Position/Rotation traits → Actor transforms, but no current game entity uses this path (enemies use Yuka vehicles + direct Three.js mesh sync). The ActorComponent approach would fragment frame-loop logic across scattered `update()` methods, making the game loop harder to reason about vs. the explicit `GameLoopContext` dependency injection pattern.
- **Files changed**:
  - `src/behaviors/PlayerCameraBehavior.ts` — DELETED (dead code, never imported)
  - `src/behaviors/RenderSyncBehavior.ts` — DELETED (dead code, never imported)
  - `src/behaviors/index.ts` — DELETED (barrel for deleted files)
  - `src/scenes/IslandScene.ts` — removed stale comment referencing deleted behaviors
  - `AGENTS.md` — removed `src/behaviors/` from domain map
- **Results**: 152 tests passing (unchanged), typecheck clean, lint clean (only pre-existing warnings)
- **Learnings:**
  - JollyPixel ActorComponent lifecycle: `initialize → awake → start → update/fixedUpdate → destroy`. Components with `update()` or `fixedUpdate()` are auto-registered for per-frame callbacks via `needUpdate` mechanism.
  - The PRD referenced `src/engine/behaviors/` but files were actually at `src/behaviors/` — always verify actual paths before acting on spec descriptions
  - Zero imports of `src/behaviors/` anywhere in `src/` confirmed they were dead code since creation
  - The functional camera + game-loop approach is architecturally superior for this game: all frame logic is centralized in `gameLoop.ts` with explicit `GameLoopContext` dependency injection, making it easy to reason about update order and debug frame-by-frame behavior
  - `RenderSyncBehavior` concept (Koota ECS → Actor transforms) would become relevant if enemies/NPCs move to full Koota ECS, but that's a future concern — don't keep dead code for hypothetical use
---

## 2026-03-21 - US-016
- **What was implemented**: Audited dead `src/systems/audio/` (4 files, 314 lines) against live `src/audio/` (3 files, 389 lines). Decision: delete all dead files, nothing to port.
- **Dead system analyzed**:
  - `AudioManager.ts` — Web Audio API context singleton with mute/volume
  - `SFXPlayer.ts` — File-based SFX with buffer preloading + 3D spatial audio (HRTF PannerNode)
  - `MusicSystem.ts` — Buffer-based music with crossfade, pause/resume
  - `index.ts` — barrel export
- **Features unique to dead system (not ported)**:
  - 3D spatial audio (HRTF PannerNode) — scaffolding only, requires pre-recorded buffers incompatible with live system's procedural Tone.js approach. If needed, should be reimplemented with `Tone.Panner3D`.
  - Music pause/resume — not needed; current architecture uses Tone.js Player which continues playing (game pause doesn't need explicit music pause).
  - SFX IDs listed in comments (dodge-swoosh, parry-clang, footstep-grass, etc.) — aspirational only, no implementations or audio files existed.
- **Live system already has**: All 6 combat SFX (procedural), biome music (8 tracks + hub), atmospheric SFX (7 spooky sounds), underwater ambient, ambient wind noise.
- **Files deleted**:
  - `src/systems/audio/AudioManager.ts`
  - `src/systems/audio/SFXPlayer.ts`
  - `src/systems/audio/MusicSystem.ts`
  - `src/systems/audio/index.ts`
- **No files changed** — `src/systems/index.ts` never re-exported `audio/`, so no barrel update needed.
- **Results**: 152 tests passing (unchanged), typecheck clean, lint clean (only pre-existing warnings)
- **Learnings:**
  - The dead audio system was a raw Web Audio API implementation written before Tone.js adoption — a parallel stack that was never wired in
  - `src/systems/index.ts` barrel didn't re-export `systems/audio/`, confirming it was dead from inception (created but never integrated)
  - Live audio uses two paradigms: procedural Tone.js synthesis for SFX (no audio files needed) and Tone.Player for music/atmosphere (streams .ogg files from `public/audio/`)
  - The `playHubMusic()` and `playUnderwaterAmbient()` functions exist in live code but are currently uncalled — future integration points, not dead code (they have clear purpose)
  - Pattern: when evaluating dead vs live code, check not just "does the feature exist" but "is the implementation approach compatible" — the dead system's file-based SFX approach is fundamentally different from the live system's procedural synthesis
---

## 2026-03-21 - US-002
- **What was implemented**: Extracted HealthBar React component from GameView inline JSX with daisyUI `progress` component and low-health pulse animation
- **Files changed**:
  - `src/components/hud/HealthBar.tsx` — NEW: standalone component with `current`/`max` props, daisyUI `progress-error` bar, CSS keyframe pulse at <20% health
  - `src/main.css` — added `@keyframes health-pulse` (opacity 1→0.5→1, 600ms) matching dead `src/ui/hud/HealthBar.ts` behavior
  - `src/views/game/GameView.tsx` — replaced 11-line inline health bar with `<HealthBar current={...} max={...} />`
- **Results**: 152 tests passing (unchanged), typecheck clean, lint clean on changed files
- **Learnings:**
  - daisyUI's `<progress>` component uses native HTML `<progress value={n} max={m}>` with class `progress progress-error` — the fill color comes from the theme's `--color-error` token, no manual width calculation needed
  - Tailwind's arbitrary animation syntax `animate-[name_duration_timing_iteration]` works for custom keyframes defined in CSS — avoids needing a tailwind.config.js extension
  - Used `sm:` responsive prefix instead of ternary `isMobile ? ... : ...` — the component no longer needs the `isMobile` prop since Tailwind handles breakpoints declaratively
  - The dead `src/ui/hud/HealthBar.ts` used the Web Animations API (`element.animate()`) for pulse; the React version uses CSS `@keyframes` which is more appropriate since React owns the DOM lifecycle
  - daisyUI theme tokens (`bg-base-100/85`, `border-secondary`, `text-base-content`) replace hardcoded hex colors, making the component respect theme changes automatically
---

## 2026-03-21 - US-003
- **What was implemented**: Extracted Hotbar React component from dead `src/ui/hud/Hotbar.ts`, replacing inline GameView JSX with a controlled component using daisyUI `btn` and `kbd` components
- **Files changed**:
  - `src/components/hud/Hotbar.tsx` — NEW: 5-slot weapon hotbar with keyboard (1-5), mouse wheel cycling, click-to-select, daisyUI styling, responsive sizing
  - `src/views/game/GameView.tsx` — replaced 11-line inline hotbar with `<Hotbar>` component, added `activeSlot` state and `hotbarSlots` data, imported `SlotData` type
- **Results**: typecheck clean, lint clean
- **Learnings:**
  - The dead `Hotbar.ts` owned its state internally (`#activeIndex`) — React port inverts this to controlled component pattern (`activeIndex` prop + `onSelect` callback), letting GameView own weapon selection state for future engine integration
  - `pointer-events-auto` on the hotbar container is required because GameView's HUD overlay uses `pointer-events-none` to let clicks pass through to the canvas — without it, button clicks are swallowed
  - daisyUI's `btn-primary` vs `btn-ghost` provides clear active/inactive slot distinction using theme tokens instead of hardcoded hex colors (`#e8d5b7` → `btn-primary`, `#fdf6e3/60` → `btn-ghost bg-base-100/60`)
  - `kbd` component works well for key hints even at tiny sizes (`kbd-xs`) — the daisyUI styling gives it a subtle keyboard-cap appearance that communicates "press this key" better than plain text
  - `EngineState` has no weapon/slot data yet — the hotbar currently manages its own `activeSlot` state in GameView; wiring to actual weapon selection is a future engine task
---

## 2026-03-21 - US-004
- **What was implemented**: Extracted DamageIndicator React component from dead `src/ui/hud/DamageIndicator.ts` with red radial vignette overlay + canvas screen shake, integrated into GameView on `playerDamaged` engine events
- **Files changed**:
  - `src/components/hud/DamageIndicator.tsx` — NEW: `forwardRef` component exposing `flash()` via `useImperativeHandle`; red radial-gradient vignette (fades over 300ms), canvas screen shake (random dx/dy with linear decay over 150ms)
  - `src/views/game/GameView.tsx` — imports DamageIndicator, adds `damageRef`, renders `<DamageIndicator>` after canvas, calls `damageRef.current?.flash()` on `playerDamaged` engine events; also fixed Biome import ordering and formatting
- **Results**: typecheck clean, lint clean on changed files (pre-existing warnings unchanged)
- **Learnings:**
  - `forwardRef` + `useImperativeHandle` is the correct React pattern for parent-triggered imperative animations — a `trigger` counter prop would cause unnecessary re-renders and timing issues
  - The CSS `transition: visible ? 'none' : ...` trick replicates the dead code's "snap on, fade off" behavior: when state flips to `true`, `transition: none` makes opacity change instant; when it flips to `false` 50ms later, the CSS transition animates the fade-out
  - Screen shake must stay imperative (`requestAnimationFrame` + `canvas.style.transform`) — React state batching adds ~16ms latency per frame, making shake feel laggy
  - Biome enforces value-before-type import ordering (`{ DamageIndicator, type DamageIndicatorHandle }` not `{ type DamageIndicatorHandle, DamageIndicator }`)
  - The `playerDamaged` event type already existed in `EngineEvent` union — no engine changes needed
---

## 2026-03-21 - US-005
- **What was implemented**: Ported Minimap as React canvas component from dead `src/ui/hud/Minimap.ts`, with engine state integration for real-time enemy/loot marker data
- **Files changed**:
  - `src/engine/types.ts` — added `MinimapMarker` interface and `playerX`, `playerZ`, `minimapMarkers` fields to `EngineState`
  - `src/engine/GameEngine.ts` — populated new `EngineState` fields from `cam.camera.position`, `enemies[]`, and `combat.state.lootDrops[]`
  - `src/components/hud/Minimap.tsx` — NEW: canvas-rendered minimap (140x140) with player dot centered, red enemy dots, gold chest squares, daisyUI card wrapper
  - `src/views/game/GameView.tsx` — replaced inline enemy counter div with `<Minimap>` component at top-right
  - `src/views/game/GameView.browser.test.tsx` — updated mock `EngineState` with new fields, updated assertion from enemy text to minimap canvas presence
- **Results**: 152 tests passing (unchanged), typecheck clean, lint clean on changed files (only pre-existing warnings)
- **Learnings:**
  - Canvas rendering stays imperative in React — `useEffect` redraws on prop changes, but the 2D context API itself (`fillRect`, `arc`, `stroke`) has no React equivalent; this is the correct pattern for pixel-level rendering
  - `as const` is needed when building `MinimapMarker[]` from `enemies.map()` because TS infers `type: string` from object spread, not the literal union `'enemy' | 'chest'`
  - The dead minimap's `#scale = 2` means 1 pixel = 2 world units — at 140px, the visible radius is 140 world units, which covers roughly half an island (~256 world units across)
  - Loot drops (`combat.state.lootDrops`) map to 'chest' type markers on the minimap — they're the gold squares showing dropped health potions and tome pages
  - Replacing the enemy counter with the minimap is a net improvement: enemy positions on the minimap convey more information than a raw count number
---

