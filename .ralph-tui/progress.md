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

### daisyUI Modal Pattern
- daisyUI v5 `modal modal-open` is the stateless open-state pattern — parent controls visibility by conditionally rendering the component (React-idiomatic) rather than toggling a `modal-open` class imperatively
- `modal-backdrop` provides the semi-transparent overlay; add Tailwind utilities (`bg-black/70 backdrop-blur-sm`) for custom opacity and blur effects
- `modal-box` + `card` can be combined for themed content panels — `card` brings the parchment theme border/bg, `modal-box` handles centering and max-width

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

## 2026-03-21 - US-006
- **What was implemented**: Extracted PauseMenu as React component from GameView inline JSX, using daisyUI modal/btn/card components with Resume, Settings (disabled), Abandon Run, and Quit to Menu buttons
- **Files changed**:
  - `src/components/modals/PauseMenu.tsx` — NEW: daisyUI modal with 4 action buttons (Resume, Settings disabled, Abandon Run, Quit to Menu), parchment card styling, backdrop blur overlay
  - `src/views/game/GameView.tsx` — replaced 28-line inline pause overlay with `<PauseMenu>` component; added `onQuitToMenu` prop and `handleAbandonRun` callback (records run as 'abandoned' then navigates to hub)
  - `src/app/App.tsx` — added `onQuitToMenu={() => setView('menu')}` prop to GameView for direct menu navigation
  - `src/views/game/GameView.browser.test.tsx` — added `onQuitToMenu` prop to mock render call
- **Results**: 152 tests passing (unchanged), typecheck clean, lint clean on changed files (only pre-existing warnings)
- **Learnings:**
  - daisyUI `modal modal-open` is a stateless pattern — React controls visibility by conditionally rendering the component, not toggling a CSS class; this aligns with the existing `engineState?.phase === 'paused'` conditional in GameView
  - `modal-backdrop` + `bg-black/70 backdrop-blur-sm` provides the semi-transparent overlay with frosted glass effect; `modal-box` handles centering
  - `btn-disabled` is daisyUI's visual-only disabled state — add `tabIndex={-1}` to also exclude from keyboard navigation for the placeholder Settings button
  - The existing `onReturnToMenu` prop navigates to hub (not menu) despite its name — added separate `onQuitToMenu` for the true menu transition, keeping existing prop semantics stable
  - `handleAbandonRun` calls `onRunEnd` with 'abandoned' result before navigating — this ensures the progression system tracks the abandoned run for history/stats
---

## 2026-03-21 - US-007
- **What was implemented**: Extracted DeathScreen React component from GameView inline JSX, with run stats display (enemies defeated, time survived, biome) using daisyUI modal/stat/btn components, plus kill tracking via engine events
- **Files changed**:
  - `src/components/modals/DeathScreen.tsx` — NEW: daisyUI modal with `stats stats-vertical` displaying enemies defeated, formatted time survived (M:SS), and biome; parchment-themed card with 'TURN THE PAGE' button
  - `src/views/game/GameView.tsx` — imported DeathScreen; added `killCountRef` (ref, not state, to avoid re-renders on each kill) and `deathStats` state; wired `enemyKilled` event to increment kill counter; on `playerDied`, snapshots stats into `deathStats`; replaced 28-line inline death screen with `<DeathScreen>`
- **Results**: typecheck clean, lint clean on changed files (only pre-existing warnings)
- **Learnings:**
  - `useRef` is correct for accumulating event counts (kills) that don't need to trigger re-renders — the value is only read once at death time, snapshotted into state for the DeathScreen display
  - daisyUI `stats stats-vertical` with `stat-title` + `stat-value` provides structured stat display that automatically respects theme tokens — no hardcoded colors needed
  - The inline death screen had zero stats — it was just title + flavor text + button. The component adds real gameplay feedback (enemies defeated, time survived, biome)
  - Biome formatter requires single-line JSX attributes when they fit within line width — multi-line `<h2 className="..." style={{...}}>` was reformatted to single line
---

## 2026-03-21 - US-008
- **What was implemented**: Extracted VictoryScreen React component from dead `src/ui/screens/VictoryScreen.ts` and replaced inline GameView victory overlay, with daisyUI modal/stat/card/btn components, dynamic tome unlock card, real run stats, and two action buttons
- **Files changed**:
  - `src/components/modals/VictoryScreen.tsx` — NEW: daisyUI modal with gold-styled 'A NEW PAGE IS WRITTEN' title, conditional tome page unlock card (rendered only when `tomePageUnlocked` and `abilityName` are present), `stats stats-vertical` for biome/enemies/time, and two buttons (CONTINUE VOYAGE primary, RETURN TO HUB ghost)
  - `src/views/game/GameView.tsx` — imported VictoryScreen; added `victoryStats` state; captures biome, kill count, duration, bossId, and tomeAbility from `bossDefeated` event into `victoryStats`; replaced 28-line inline victory overlay with `<VictoryScreen>`
- **Results**: typecheck clean, lint clean on changed files (only pre-existing warnings)
- **Learnings:**
  - The dead VictoryScreen.ts had `islandsVisited` in its stats — the React port uses `biome` instead (matching DeathScreen and the current single-island-per-run design)
  - `bossDefeated` event carries `bossId` and `tomeAbility` — these map naturally to `tomePageUnlocked` and `abilityName` props, making the tome unlock card data-driven rather than hardcoded (the inline version hardcoded "Dash")
  - daisyUI `border-warning/50` provides a gold-toned border that matches the tome unlock card's thematic "gold inscription" aesthetic via the theme's warning color token
  - The `victoryStats` state follows the same snapshot pattern as `deathStats` — capture mutable data (kill count, elapsed time) at event time into state, then pass the frozen snapshot to the component
  - Both buttons currently route to `onReturnToMenu` — CONTINUE VOYAGE will diverge when island selection is implemented (currently there's only one island per run)
---

## 2026-03-21 - US-009
- **What was implemented**: Created SailingTransition React component porting the dead `src/scenes/SailingScene.ts` concept, with Framer Motion boat animation, ocean gradient background, biome-specific text, and 4-second auto-complete. Integrated into App.tsx as an intermediate view state between hub and game.
- **Files changed**:
  - `src/components/transitions/SailingTransition.tsx` — NEW: full-screen sailing transition with sky-to-ocean gradient, Framer Motion sailboat animation (left→right, 4s linear), "Sailing to {biomeName}..." text in Cinzel font, auto-completes via `useEffect` + `setTimeout`
  - `src/app/App.tsx` — added `'sailing'` to `AppView` union type; `handleHubNavigate` routes 'game' target through 'sailing' first; renders `<SailingTransition>` between hub and game views with `onComplete={() => setView('game')}`
- **Results**: typecheck clean, lint clean on changed files (only pre-existing warnings)
- **Learnings:**
  - The dead `SailingScene.ts` used imperative DOM + CSS `transition` for the boat movement and a game-loop `update(dt)` for timing — the React port replaces both with Framer Motion's declarative `animate` prop and `useEffect`+`setTimeout`, eliminating manual DOM management
  - Biome formatter prefers `{cond && <Component />}` over `{cond && (\n<Component />\n)}` when the JSX fits on one line — the wrapping parens are unnecessary and get flagged as a format error
  - Adding an intermediate view state (`'sailing'`) to `AppView` is cleaner than a boolean flag — it composes naturally with the existing `{view === 'x' && ...}` conditional rendering pattern in App.tsx
  - The `onComplete` callback pattern (vs. the dead scene's `director.transition('island')`) decouples the transition component from knowing what view comes next — App.tsx controls the state machine
---

### Frame-Loop → React State Bridge Pattern
- When a game loop (60fps) needs to feed data into React state, use a **ref for mutable accumulation** and only trigger `setState` when the _identity_ of the data changes (e.g., which building is nearby), not on every frame
- `updateBuildingProximityRef.current = hook.callback` pattern: store the hook's callback in a ref that's updated each render, then call from the frame loop closure — avoids stale closure issues without adding the callback to the effect dependency array

---

## 2026-03-21 - US-010
- **What was implemented**: Ported building upgrade system from dead HubScene.ts to React hook (`useHubBuildings`) + daisyUI overlay component (`BuildingInteraction`), integrated into HubView with frame-loop proximity detection
- **Files changed**:
  - `src/hooks/useHubBuildings.ts` — NEW: hook managing building levels, resources, proximity detection (INTERACTION_RANGE=3), upgrade logic with resource deduction, optional SaveManager persistence
  - `src/components/hud/BuildingInteraction.tsx` — NEW: daisyUI card overlay showing building name/level badge, description, current/next effect, resource cost badges (green=enough, red=insufficient), upgrade button
  - `src/views/hub/HubView.tsx` — imported hook + component; added `updateBuildingProximityRef` pattern for frame-loop → hook bridge; feeds `cam.getPosition()` into proximity each frame; renders `<BuildingInteraction>` when nearby; added resource display to hub indicator
- **Results**: 152 tests passing (unchanged), typecheck clean, lint clean on changed files (only pre-existing warnings)
- **Learnings:**
  - The dead HubScene.ts used content JSON building positions offset by `HUB_SIZE/2` (16) to convert from relative to world coordinates — the hook replicates this: `bx = position.x + 16`
  - `useCallback` with `[]` deps is correct for `updatePlayerPosition` because it only reads `stateRef.current` (mutable ref, not state) — no stale closure risk
  - `const [, setBuildingLevels]` (destructured without the value) is the Biome-clean pattern for "I need the setter but the value is only read from `stateRef.current`"
  - The hook takes `saveManager?: SaveManager | null` as optional — when omitted (default in HubView), it uses in-memory defaults with starter resources (wood: 500, stone: 500) so the upgrade system is immediately interactive
  - daisyUI `badge-success`/`badge-error` on resource costs gives instant visual feedback — green means affordable, red means short — replacing what would have been manual hex color logic
  - The `prevNearbyIdRef` pattern prevents 60 React re-renders per second: only triggers `setNearbyBuilding()` when the _identity_ of the closest building changes, not when the distance changes
---

### Hook Decomposition Pattern for View Components
- When decomposing a large view component, split into hooks by *lifecycle concern* (init/cleanup, events, polling) rather than by *data shape*
- Hooks that share a `gameRef` (or similar instance ref) use the "returned context object" pattern: the lifecycle hook creates and returns the ref, other hooks accept it as a parameter
- Use a `onEventRef.current = callback` pattern to break circular dependencies between hooks — the lifecycle hook stores event callbacks in a ref that's updated each render, so hooks declared later in the component body are never stale
- `useGameHUD` returns `[state, setState]` tuple (like `useState`) so both polling and event-driven immediate updates can set the same state

### daisyUI Modal Backdrop as Button
- Biome's a11y linter flags `onClick` on a `<div>` — use `<button type="button">` for clickable `modal-backdrop` overlays instead of `<div role="button">`; the latter triggers `useSemanticElements` lint error

---

## 2026-03-21 - US-011
- **What was implemented**: Ported TomePageBrowser React component from dead `src/ui/tome/PageBrowser.ts` with daisyUI modal/card/badge/grid, Tab key toggle in GameView, and ability ID→display metadata mapping
- **Files changed**:
  - `src/components/modals/TomePageBrowser.tsx` — NEW: daisyUI modal with CSS Grid (`auto-fill, minmax 180px`), page cards (emoji icon + Cinzel name + level badge + Crimson Text description), empty state message, `<button>` backdrop for a11y-compliant click-to-close
  - `src/views/game/GameView.tsx` — imported TomePageBrowser; added `TOME_PAGE_CATALOG` mapping (8 boss abilities → display metadata); added `showTome` state and `unlockedAbilitiesRef`; Tab key toggles tome browser, Escape closes it if open; tracks `bossDefeated` events to accumulate unlocked abilities; renders `<TomePageBrowser>` between HUD and pause menu layers
- **Results**: 152 tests passing (unchanged), typecheck clean, lint clean on changed files (only pre-existing warnings)
- **Learnings:**
  - `unlockedPages` from `useProgression` are just `string[]` (ability IDs like `"dash"`, `"ice-path"`) — there's no content JSON for tome page display metadata, so a `TOME_PAGE_CATALOG` record in GameView maps IDs to `{name, icon, description}` with a fallback for unknown IDs
  - Biome's `useSemanticElements` rule rejects `role="button"` on `<div>` — use a native `<button>` element instead; daisyUI's `modal-backdrop` class works on any element type
  - Tab key needs `e.preventDefault()` to stop browser focus cycling (especially important when pointer lock is active and the HUD has focusable elements like hotbar buttons)
  - The `showTome` state is separate from `engineState.phase` — the tome browser overlays on top of any phase (playing, paused) but the Escape key handler checks `showTome` first to close the tome before toggling pause
  - `unlockedAbilitiesRef` (not state) accumulates boss kills during a run without triggering re-renders — the tome browser reads it on open via the `pages` prop derivation
---

## 2026-03-21 - US-013
- **What was implemented**: Decomposed GameView.tsx (308 → 149 LOC) into three hooks and extracted TOME_PAGE_CATALOG to content module
- **Files changed**:
  - `src/hooks/useGameLifecycle.ts` — NEW: canvas ref management, engine init/cleanup via `initGame()`, keyboard shortcuts (Escape/Tab), canvas resize, touch control handler, pause toggle (96 LOC)
  - `src/hooks/useGameEvents.ts` — NEW: engine event side-effects — damage flash (`damageRef`), kill count accumulation (`killCountRef`), death/victory stats snapshots, boss ability unlocks, progression callbacks (97 LOC)
  - `src/hooks/useGameHUD.ts` — NEW: 10fps polling bridge from imperative game loop to React state, returns `[engineState, setEngineState]` tuple (28 LOC)
  - `src/content/tomePages.ts` — NEW: `TOME_PAGE_CATALOG` extracted from GameView — ability ID → display metadata (45 LOC)
  - `src/views/game/GameView.tsx` — rewritten to compose three hooks + render JSX (149 LOC, down from 308)
- **Results**: 152 tests passing (unchanged), typecheck clean, lint clean on changed files (only pre-existing warnings)
- **Learnings:**
  - The `onEngineEventRef` pattern breaks the circular dependency between hooks: `useGameLifecycle` needs the event handler at init time, but `useGameEvents` needs the `gameRef` from `useGameLifecycle`. Storing the callback in a ref that's updated each render lets you declare hooks in any order without stale closures.
  - `useGameHUD` returns a `[state, setter]` tuple (like `useState`) rather than just `state` because `useGameEvents` needs the setter for immediate state updates on death/victory events — the polling interval alone would have up to 100ms latency for phase transitions.
  - `TOME_PAGE_CATALOG` (37 lines of static data) belonged in `src/content/` not `GameView.tsx` — moving it to `content/tomePages.ts` saved enough lines to hit the <150 LOC target and puts the data where game content schemas live.
  - Biome enforces import ordering by path depth/alphabetical — `../components/` must come before `../engine/` imports. Also caught unused type import (`GameEventCallbacks` was inlined at the call site).
  - The `useState` import became unnecessary to remove from `useGameLifecycle` when polling moved to `useGameHUD`, but `useState` was still needed for `showTome` — watch for accidental removal of still-needed imports during decomposition.
---

### Cross-Hook Frame-Loop Callback Ref Pattern
- When two hooks need to collaborate on a per-frame callback (one creates the engine loop, the other processes frame data), create a shared `MutableRefObject` in the parent component and pass it to both hooks
- The "consumer" hook writes its callback into `ref.current` each render; the "producer" hook calls `ref.current?.()` each frame
- This avoids circular dependencies between hooks that each need something the other creates

---

## 2026-03-21 - US-014
- **What was implemented**: Decomposed HubView.tsx (353 → 148 LOC) into two hooks: `useHubEngine` (engine lifecycle) and `useHubCamera` (label projection + dock proximity)
- **Files changed**:
  - `src/hooks/useHubEngine.ts` — NEW: canvas ref, JollyPixel Runtime init/cleanup, Rapier physics, terrain generation, camera + input setup, frame loop with callback injection (162 LOC)
  - `src/hooks/useHubCamera.ts` — NEW: building label screen projection, dock proximity detection, lazy precomputation of building centers (102 LOC)
  - `src/views/hub/HubView.tsx` — rewritten to compose hooks and render components (148 LOC, down from 353)
- **Results**: 152 tests passing (unchanged), typecheck clean, lint clean on changed files
- **Learnings:**
  - Cross-hook collaboration via shared ref: `onFrameRef` is created in HubView, passed to `useHubEngine` (which calls it each frame) and `useHubCamera` (which writes its callback into it) — resolves the circular dependency where the engine hook creates the camera but the camera hook needs to process frame data
  - Lazy precomputation in `useHubCamera`: building center positions are cached in a ref on first frame invocation (when `hubRef.current` becomes available), avoiding the need for the hook to participate in the async init lifecycle
  - The `BuildingDef` type import was unused in `useHubEngine` after extracting label projection to `useHubCamera` — Biome caught this immediately as an error
  - Non-null assertions (`!`) are lint errors, not warnings — replaced `hub.buildings.find(...)!` with safe conditional checks in `useHubCamera`
  - Unlike GameView decomposition (which split by lifecycle concern: init, events, polling), HubView split by *frame-loop concern*: engine setup vs. per-frame visual processing — the right axis depends on where the complexity lives
---

## 2026-03-21 - US-017
- **What was implemented**: Deleted all confirmed dead code — the legacy scene-based architecture (`src/scenes/`) and imperative DOM UI (`src/ui/`), both fully superseded by React components and engine modules
- **Files deleted (25 files)**:
  - `src/scenes/SceneDirector.ts`, `Scene.ts`, `IslandScene.ts`, `HubScene.ts`, `IslandSelectScene.ts`, `SailingScene.ts`, `ResultsScene.ts`, `BossArenaScene.ts`, `MainMenuScene.ts`, `index.ts`, `SceneDirector.test.ts` (11 files)
  - `src/ui/hud/HealthBar.ts`, `Hotbar.ts`, `DamageIndicator.ts`, `Minimap.ts`, `index.ts` (5 files)
  - `src/ui/screens/PauseMenu.ts`, `DeathScreen.ts`, `VictoryScreen.ts`, `MainMenu.ts`, `index.ts` (5 files)
  - `src/ui/tome/TomeOverlay.ts`, `PageBrowser.ts`, `index.ts` (3 files)
  - `src/ui/index.ts` (1 file)
- **Files modified**:
  - `src/integration.test.ts` — removed `Scene`/`SceneDirector` imports, `MockScene` helper, and `Integration: Scene Lifecycle` test block (the only live import of dead code outside the dead directories)
- **Directories removed**: `src/scenes/`, `src/ui/`, `src/ui/hud/`, `src/ui/screens/`, `src/ui/tome/`
- **Results**: 145 tests passing (was 152; removed 7 dead scene tests), typecheck clean, lint clean (only pre-existing warnings)
- **Learnings:**
  - The only non-circular import of `src/scenes/` was in `integration.test.ts` — the Scene Lifecycle test block tested the dead SceneDirector pattern. All other scene imports came from `src/ui/screens/` (also dead), forming circular dead code
  - All `src/ui/` imports from live code were actually `src/components/ui/TouchControls` (different directory) — the grep pattern `src/ui/` matches both, so careful path analysis was needed to distinguish
  - The acceptance criteria listed `MainMenuScreen.ts` but the actual file was `MainMenu.ts`, and listed `config.ts`/`types.ts` in scenes which didn't exist — always verify actual file names before acting on spec descriptions
  - 7 tests removed: 1 from `integration.test.ts` (Scene Lifecycle) + 6 from `SceneDirector.test.ts` — all tested dead code exclusively
  - Comments referencing dead files ("Ported from dead src/ui/hud/...") remain in React components as historical context — these are documentation, not imports
---

## 2026-03-21 - US-018
- **What was implemented**: Updated all documentation to reflect the converged codebase after dead code removal (US-017). All references to deleted directories (`src/scenes/`, `src/ui/`, `src/behaviors/`), ESLint (replaced by Biome 2.4), and `RenderSyncBehavior` (deleted in US-015) were corrected or annotated.
- **Files changed**:
  - `docs/PRODUCTION_ROADMAP.md` — §3: marked dual-stack convergence complete, updated HUD status; §8: updated browser test status (145 unit tests, browser infra configured)
  - `docs/superpowers/plans/2026-03-21-react-refactor-and-completion.md` — checked off all Phase 1 tasks (Tasks 1-4), Task 5 (browser setup), Task 7 (hub), Task 8 (progression); updated current state description; partial Task 6 (2 of 4 browser tests written)
  - `docs/superpowers/plans/2026-03-20-bok-implementation.md` — marked Phases 0-3 as ✅ COMPLETE, Phase 4 as 🔄 ACTIVE; annotated Task 12 (SceneDirector) as SUPERSEDED; updated Tasks 18-23 status; fixed ESLint→Biome in domain map, CLAUDE.md template, and Step 9; updated Domain Map with new React directories
  - `docs/superpowers/specs/2026-03-20-bok-game-design.md` — §5.2: ESLint→Biome in tech stack table; §5.5: ESLint→Biome in enforcement list; §5.7: annotated deleted directories in domain structure tree, added new React directories; §12.4: renamed to "Biome 2.4 Lint Rules" with updated content; annotated `RenderSyncBehavior` code sample as deleted
  - `CLAUDE.md` — updated CURRENT STATE (sole entry point, no scenes/ui), updated Production checklist (convergence done), added daisyUI to Layer Model, rewrote Package Structure (removed scenes, added components/hooks/engine detail), updated Testing section (145 tests, browser infra exists)
  - `ARCHITECTURE.md` — rewrote: removed SceneDirector/dual-stack language, removed `RenderSyncBehavior`, added UI Layer section (React+daisyUI), updated Frame Loop to match `gameLoop.ts` reality, added hook decomposition detail
- **Results**: typecheck clean, lint has only pre-existing warnings (no regressions — only .md files changed)
- **Learnings:**
  - The game design spec's domain structure tree (§5.7) is the most impactful doc section to update — it's the first thing developers see when understanding the codebase layout
  - Historical references in completed plan phases (Phase 0-3) are OK to leave with annotations rather than rewriting — they serve as an audit trail of what was originally planned vs what was actually built
  - The `tasks/prd-*.md` files describe work to be done and reference dead paths in that context — these are task descriptions, not codebase claims, so they don't need correction
  - Progress.md entries that reference dead files ("Ported from dead src/ui/hud/...") are historical log entries and should be preserved as-is
---

