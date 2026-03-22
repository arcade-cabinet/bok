# PRD: Dead Code Convergence & Monolith Decomposition

## Overview

The Bok codebase has a dual-stack problem: the live React+GameEngine path (~161 files) runs the game, while ~18 dead files (~3,375 LOC) in `src/scenes/` and `src/ui/` contain unreachable code from the old SceneDirector architecture. Some of this dead code represents real features never ported forward (building progression, minimap, hotbar, pause menu, tome browser, screen shake, sailing transition). Meanwhile, three monolith files (GameEngine.ts 306 LOC, GameView.tsx 311 LOC, HubView.tsx 329 LOC) need decomposition into proper components and hooks.

This PRD covers: (1) installing daisyUI, (2) porting valuable dead code to React, (3) decomposing monoliths, (4) evaluating JollyPixel behaviors for revival, (5) deleting truly dead code, and (6) updating stale documentation.

## Goals

- Single runtime path: React+JollyPixel only, zero dead code
- Every HUD element, overlay, and screen is a proper React component (not inline JSX)
- Monoliths decomposed into focused hooks, components, and engine modules
- daisyUI component library integrated for consistent, themeable UI
- Pixel-perfect recreation of the old parchment aesthetic via daisyUI themes
- JollyPixel ActorComponent behaviors evaluated and revived where architecturally cleaner
- All documentation reflects actual codebase state
- Vertical slice moves closer to full production game

## Quality Gates

These commands must pass for every user story:
- `pnpm typecheck` — Type checking
- `pnpm run lint` — Biome 2.4 linting

For UI stories, also verify visually using Chrome DevTools MCP:
- Take page snapshot and/or screenshot to confirm layout and styling
- Check console for errors

For stories touching game logic:
- `pnpm test` — Vitest unit tests pass

For stories touching browser-rendered components:
- `pnpm test:browser` — Vitest browser tests pass

## User Stories

### US-001: Install and configure daisyUI with Tailwind CSS 4
As a developer, I want daisyUI integrated with Tailwind CSS 4 so that all ported components use a consistent, themeable component library.

**Acceptance Criteria:**
- [ ] `daisyui` added as a dependency via pnpm
- [ ] Tailwind CSS 4 config updated with daisyUI `@plugin` directive
- [ ] Custom "parchment" theme defined matching the game's aesthetic (warm browns, gold accents, parchment backgrounds, ink-dark text)
- [ ] A test component renders correctly with daisyUI classes
- [ ] Existing Tailwind styles in GameView, HubView, MainMenuView still work
- [ ] Verify in browser: daisyUI classes render correctly alongside existing Tailwind

### US-002: Extract HealthBar React component from GameView inline JSX
As a player, I want a polished health bar with low-health pulse animation so that I have clear feedback about my health state.

**Acceptance Criteria:**
- [ ] `src/components/hud/HealthBar.tsx` created as a standalone React component
- [ ] Props: `current: number`, `max: number`
- [ ] Animated fill bar (CSS transition on width)
- [ ] Pulse animation when health < 20% (opacity pulse, matching dead code behavior from `src/ui/hud/HealthBar.ts`)
- [ ] Uses daisyUI `progress` component with parchment theme colors
- [ ] Label shows "current / max"
- [ ] GameView imports and uses the new component instead of inline JSX
- [ ] Verify in browser: health bar renders at top-left, pulse triggers at low health

### US-003: Extract Hotbar React component (ported from dead code)
As a player, I want a weapon/item hotbar so that I can switch between equipped items using keyboard or touch.

**Acceptance Criteria:**
- [ ] `src/components/hud/Hotbar.tsx` created, porting logic from dead `src/ui/hud/Hotbar.ts`
- [ ] 5 item slots with key hints (1-5)
- [ ] Active slot highlight with daisyUI styling
- [ ] Keyboard input: 1-5 keys set active slot, mouse wheel to cycle
- [ ] Props: `slots: SlotData[]`, `activeIndex: number`, `onSelect: (index: number) => void`
- [ ] Uses daisyUI `btn` and `kbd` components for slot rendering
- [ ] GameView integrates the hotbar, wired to weapon selection
- [ ] Verify in browser: hotbar visible at bottom-center, keyboard switching works

### US-004: Extract DamageIndicator React component with screen shake
As a player, I want visual feedback (red vignette + screen shake) when I take damage so that hits feel impactful.

**Acceptance Criteria:**
- [ ] `src/components/hud/DamageIndicator.tsx` created, porting shake algorithm from dead `src/ui/hud/DamageIndicator.ts`
- [ ] Red radial gradient vignette overlay (CSS, fades over 300ms)
- [ ] Screen shake via canvas transform (random dx/dy, Gaussian decay over 150ms)
- [ ] `flash()` method or `trigger` prop to activate
- [ ] GameView integrates, triggered on `playerDamaged` events
- [ ] Verify in browser: vignette + shake visible on damage event

### US-005: Port Minimap as React Canvas component
As a player, I want a minimap showing my position relative to enemies and items so that I have spatial awareness during combat.

**Acceptance Criteria:**
- [ ] `src/components/hud/Minimap.tsx` created, porting rendering from dead `src/ui/hud/Minimap.ts`
- [ ] Uses `<canvas>` element (140x140) with React ref
- [ ] Player dot always centered (white with stroke)
- [ ] Enemy markers: red dots (radius 3), relative to player position
- [ ] Chest/item markers: gold squares
- [ ] Markers outside canvas bounds are clipped
- [ ] Props: `playerX: number`, `playerZ: number`, `markers: MarkerData[]`
- [ ] daisyUI `card` wrapper with parchment border
- [ ] GameView integrates minimap at top-right corner
- [ ] Verify in browser: minimap renders with player dot and enemy markers

### US-006: Extract PauseMenu React component
As a player, I want a pause menu with Resume, Settings, Abandon Run, and Quit options so that I can control my session.

**Acceptance Criteria:**
- [ ] `src/components/modals/PauseMenu.tsx` created
- [ ] Semi-transparent dark overlay with backdrop blur
- [ ] "PAUSED" title with parchment panel
- [ ] Buttons: Resume, Settings (disabled/placeholder), Abandon Run, Quit to Menu
- [ ] Uses daisyUI `modal`, `btn`, and `card` components
- [ ] Resume closes overlay, Abandon triggers hub transition, Quit triggers menu transition
- [ ] GameView wires Escape key to toggle PauseMenu visibility
- [ ] Verify in browser: Escape toggles pause menu, buttons trigger correct actions

### US-007: Extract DeathScreen React component
As a player, I want a death screen showing my run stats so that I can see what I accomplished before returning to hub.

**Acceptance Criteria:**
- [ ] `src/components/modals/DeathScreen.tsx` created
- [ ] Props: `stats: { enemiesDefeated: number, timeSurvived: number, biome: string }`
- [ ] Title: "THE CHAPTER ENDS" with parchment styling
- [ ] Stats display: Enemies defeated, Time survived, Biome
- [ ] "TURN THE PAGE" button returns to hub
- [ ] Uses daisyUI `modal`, `stat`, `btn` components
- [ ] GameView shows DeathScreen on player death event instead of inline handling
- [ ] Verify in browser: death screen displays correct stats, button navigates to hub

### US-008: Extract VictoryScreen React component with tome unlock display
As a player, I want a victory screen showing my run stats and any tome page unlocked so that progression feels rewarding.

**Acceptance Criteria:**
- [ ] `src/components/modals/VictoryScreen.tsx` created, porting tome unlock card from dead `src/ui/screens/VictoryScreen.ts`
- [ ] Props: `stats: VictoryStats` (biome, enemies, time, tomePageUnlocked?, abilityName?)
- [ ] Title: "A NEW PAGE IS WRITTEN" with gold styling
- [ ] Tome page unlock card (if applicable): icon, name, description
- [ ] Stats display: Biome, Enemies, Time
- [ ] Buttons: "CONTINUE VOYAGE" and "RETURN TO HUB"
- [ ] Uses daisyUI `modal`, `card`, `stat`, `btn` components
- [ ] GameView shows VictoryScreen on boss defeated instead of inline handling
- [ ] Verify in browser: victory screen displays stats, tome unlock card renders, buttons work

### US-009: Create SailingTransition React component
As a player, I want a brief sailing animation between hub and island so that transitions feel immersive rather than instant.

**Acceptance Criteria:**
- [ ] `src/components/transitions/SailingTransition.tsx` created, porting concept from dead `src/scenes/SailingScene.ts`
- [ ] Gradient background (sky → water)
- [ ] Animated sailboat element (CSS transform, left → right, 4 second duration)
- [ ] Text: "Sailing to {biomeName}..."
- [ ] Auto-completes after duration, triggers `onComplete` callback
- [ ] Uses Framer Motion for animation (consistent with existing codebase)
- [ ] App.tsx integrates between hub/menu and game view transitions
- [ ] Verify in browser: sailing animation plays smoothly between views

### US-010: Port building upgrade system from HubScene to React hooks
As a player, I want to interact with hub buildings and upgrade them using resources so that there is meaningful meta-progression.

**Acceptance Criteria:**
- [ ] `src/hooks/useHubBuildings.ts` created, porting building progression logic from dead `src/scenes/HubScene.ts`
- [ ] Building types: Armory, Docks, Library, Market, Forge
- [ ] Each building has levels with resource costs (from HubScene's upgrade mechanics)
- [ ] Proximity detection: player within INTERACTION_RANGE (3 units) triggers interaction
- [ ] `upgadeBuilding(buildingId)` checks resources and increments level
- [ ] State persisted via SaveManager
- [ ] `src/components/hud/BuildingInteraction.tsx` overlay shows building info + upgrade button
- [ ] Uses daisyUI `card`, `btn`, `badge` components
- [ ] HubView integrates hook and overlay
- [ ] Verify in browser: approaching building shows interaction UI, upgrade button works

### US-011: Port TomePageBrowser as React component
As a player, I want to browse my unlocked tome pages (abilities/upgrades) so that I can review my progression.

**Acceptance Criteria:**
- [ ] `src/components/modals/TomePageBrowser.tsx` created, porting grid layout from dead `src/ui/tome/PageBrowser.ts`
- [ ] Props: `pages: TomePage[]` (id, name, description, icon, level)
- [ ] Dark overlay backdrop
- [ ] Parchment panel with CSS Grid (auto-fill, minmax 180px)
- [ ] Page cards: emoji icon + name + level indicator + description
- [ ] Uses daisyUI `modal`, `card`, `badge`, `grid` patterns
- [ ] Tab key toggles visibility (consistent with dead code behavior)
- [ ] GameView or App integrates tome browser
- [ ] Verify in browser: Tab opens browser, grid displays pages correctly

### US-012: Decompose GameEngine.ts into focused modules
As a developer, I want GameEngine.ts split into focused engine modules so that each concern is independently testable and maintainable.

**Acceptance Criteria:**
- [ ] `src/engine/engineSetup.ts` — JollyPixel Runtime + Rapier world initialization
- [ ] `src/engine/terrainSetup.ts` — VoxelRenderer creation, island generation, tileset loading
- [ ] `src/engine/playerSetup.ts` — Player entity creation (Koota traits, camera controls)
- [ ] `src/engine/enemySetup.ts` — Enemy spawning, Yuka AI bridge setup (refactored from `enemies.ts` if overlapping)
- [ ] `src/engine/gameLoop.ts` — beforeUpdate/beforeFixedUpdate frame loop orchestration
- [ ] `GameEngine.ts` becomes a thin orchestrator calling setup functions and wiring the loop
- [ ] `initGame()` public API unchanged — no breaking changes to GameView
- [ ] All existing unit tests pass
- [ ] New unit tests for each extracted module's public API

### US-013: Decompose GameView.tsx into React components and hooks
As a developer, I want GameView.tsx decomposed so that HUD, overlays, and game lifecycle are separate concerns.

**Acceptance Criteria:**
- [ ] `src/hooks/useGameLifecycle.ts` — canvas ref management, engine init/cleanup, game state
- [ ] `src/hooks/useGameEvents.ts` — event callbacks (playerDamaged, enemyKilled, bossDefeated, playerDied, victory)
- [ ] `src/hooks/useGameHUD.ts` — polling loop for health, stamina, enemies, boss state
- [ ] GameView.tsx imports hooks and renders extracted components (HealthBar, Hotbar, Minimap, DamageIndicator, PauseMenu, DeathScreen, VictoryScreen)
- [ ] GameView.tsx reduced to <150 LOC (from 311)
- [ ] All existing browser tests still pass
- [ ] Verify in browser: game plays identically to before decomposition

### US-014: Decompose HubView.tsx into React components and hooks
As a developer, I want HubView.tsx decomposed so that hub terrain, buildings, NPCs, and UI are separate concerns.

**Acceptance Criteria:**
- [ ] `src/hooks/useHubEngine.ts` — canvas ref, JollyPixel Runtime, terrain generation, player setup
- [ ] `src/hooks/useHubCamera.ts` — camera controls specific to hub (no combat)
- [ ] Building interaction UI uses extracted `BuildingInteraction.tsx` from US-010
- [ ] HubView.tsx imports hooks and renders components
- [ ] HubView.tsx reduced to <150 LOC (from 329)
- [ ] Verify in browser: hub renders and plays identically

### US-015: Evaluate and revive JollyPixel ActorComponent behaviors
As a developer, I want camera and render-sync logic implemented as proper JollyPixel ActorComponents so that the engine architecture is idiomatic.

**Acceptance Criteria:**
- [ ] Review dead `src/engine/behaviors/PlayerCameraBehavior.ts` and `RenderSyncBehavior.ts`
- [ ] Compare to current camera logic in `src/engine/camera.ts` and render sync in game loop
- [ ] If ActorComponent approach is cleaner: port as `src/engine/components/PlayerCameraComponent.ts` and `src/engine/components/RenderSyncComponent.ts`
- [ ] If current approach is sufficient: document decision and delete dead behavior files
- [ ] Whichever path: dead files in `src/engine/behaviors/` are removed
- [ ] Wire revived components into GameEngine setup if ported
- [ ] Verify in browser: camera behavior and render sync work identically

### US-016: Evaluate dead audio system for missing features
As a developer, I want to ensure the live audio system has all valuable features from the dead audio code so that no sound design work is lost.

**Acceptance Criteria:**
- [ ] Audit dead audio files (if any in `src/audio/` that are unreferenced)
- [ ] Compare feature set to live `src/audio/` code
- [ ] Port any missing sound effects, music systems, or audio utilities
- [ ] Delete confirmed-dead audio files with no unique value
- [ ] Document what was ported vs deleted

### US-017: Delete confirmed dead code
As a developer, I want all truly dead code removed so that the codebase has zero unreachable modules.

**Acceptance Criteria:**
- [ ] Delete `src/scenes/SceneDirector.ts` (59 LOC — 100% superseded)
- [ ] Delete `src/scenes/Scene.ts` (26 LOC — base class for dead scenes)
- [ ] Delete `src/scenes/IslandScene.ts` (784 LOC — logic lives in GameEngine+modules)
- [ ] Delete `src/scenes/HubScene.ts` (622 LOC — logic ported to hooks in US-010)
- [ ] Delete `src/scenes/IslandSelectScene.ts` (177 LOC — replaced by MainMenuView)
- [ ] Delete `src/scenes/SailingScene.ts` (97 LOC — ported in US-009)
- [ ] Delete `src/scenes/ResultsScene.ts` (131 LOC — replaced by React modals)
- [ ] Delete `src/scenes/BossArenaScene.ts` (21 LOC — never implemented)
- [ ] Delete `src/scenes/MainMenuScene.ts` (21 LOC — replaced by MainMenuView)
- [ ] Delete `src/scenes/config.ts` and `src/scenes/types.ts` if no live imports
- [ ] Delete `src/ui/hud/HealthBar.ts` (85 LOC — ported in US-002)
- [ ] Delete `src/ui/hud/Hotbar.ts` (112 LOC — ported in US-003)
- [ ] Delete `src/ui/hud/DamageIndicator.ts` (74 LOC — ported in US-004)
- [ ] Delete `src/ui/hud/Minimap.ts` (92 LOC — ported in US-005)
- [ ] Delete `src/ui/screens/PauseMenu.ts` (137 LOC — ported in US-006)
- [ ] Delete `src/ui/screens/DeathScreen.ts` (120 LOC — ported in US-007)
- [ ] Delete `src/ui/screens/VictoryScreen.ts` (197 LOC — ported in US-008)
- [ ] Delete `src/ui/screens/MainMenuScreen.ts` (229 LOC — fully superseded)
- [ ] Delete `src/ui/tome/TomeOverlay.ts` (105 LOC — ported in US-011)
- [ ] Delete `src/ui/tome/PageBrowser.ts` (151 LOC — ported in US-011)
- [ ] Verify: `grep -r "src/scenes/" src/ --include="*.ts" --include="*.tsx"` returns zero live imports
- [ ] Verify: `grep -r "src/ui/hud/" src/ --include="*.ts" --include="*.tsx"` returns zero live imports
- [ ] Verify: `grep -r "src/ui/screens/" src/ --include="*.ts" --include="*.tsx"` returns zero live imports
- [ ] Verify: `grep -r "src/ui/tome/" src/ --include="*.ts" --include="*.tsx"` returns zero live imports
- [ ] All tests pass after deletion

### US-018: Update stale documentation to reflect converged codebase
As a developer, I want all documentation accurate so that contributors and AI agents understand the real codebase.

**Acceptance Criteria:**
- [ ] `docs/PRODUCTION_ROADMAP.md` §3: Mark dual-stack convergence as complete
- [ ] `docs/PRODUCTION_ROADMAP.md` §8: Update browser test status (configured, not "NOT YET CONFIGURED")
- [ ] `docs/superpowers/plans/2026-03-21-react-refactor-and-completion.md`: Check off completed tasks (1-10+)
- [ ] `docs/superpowers/plans/2026-03-20-bok-implementation.md`: Mark Phase 0-3 as complete, note Phase 4 is active
- [ ] `docs/superpowers/specs/2026-03-20-bok-game-design.md` §12.4: Replace ESLint references with Biome 2.4
- [ ] `CLAUDE.md`: Update package structure to reflect new components/hooks, remove references to `src/scenes/`
- [ ] `CLAUDE.md`: Add daisyUI to architecture layer description
- [ ] `ARCHITECTURE.md`: Update if it references SceneDirector or old UI
- [ ] Verify: No doc references `src/scenes/`, `src/ui/hud/`, `src/ui/screens/`, `src/ui/tome/`, or ESLint

## Functional Requirements

- FR-1: All new React components must use daisyUI classes with the custom parchment theme
- FR-2: Components must accept props for data — no direct Koota world access from UI components
- FR-3: Game state polling (health, stamina, enemy count) must happen in hooks, not components
- FR-4: Canvas-based components (Minimap) must use React refs and `useEffect` for lifecycle
- FR-5: All screen overlays (Pause, Death, Victory) must use daisyUI `modal` pattern with backdrop
- FR-6: Extracted engine modules must export pure functions or classes — no side effects on import
- FR-7: Decomposed GameView must maintain identical gameplay behavior (no regressions)
- FR-8: Ported building upgrade system must persist state via SaveManager
- FR-9: Dead code deletion must happen AFTER corresponding port stories are complete
- FR-10: Every deleted file must have zero live imports verified by grep

## Non-Goals

- Rewriting the game engine from scratch (we decompose, not rewrite)
- Adding new game features beyond what the dead code already implemented
- Migrating away from JollyPixel or Koota
- Mobile-specific UI (Capacitor integration is a separate effort)
- Performance optimization (separate concern)
- New content (biomes, enemies, weapons) — content authoring is a separate PRD
- Storybook or component library documentation

## Technical Considerations

- **daisyUI v5 + Tailwind v4**: Uses `@plugin "daisyui"` in CSS, not PostCSS plugin. Theme defined via CSS variables.
- **Framer Motion**: Already used in MainMenuView — continue using for transition animations (SailingTransition)
- **Chrome DevTools MCP**: Available for visual verification. Use `take_snapshot` and `take_screenshot` after each UI story.
- **JollyPixel ActorComponents**: Behaviors in the dead code used a different API pattern than current direct-in-loop approach. Need to check JollyPixel reference codebase at `/Users/jbogaty/src/reference-codebases/editor` for current ActorComponent best practices.
- **Dependency order**: US-001 (daisyUI setup) blocks all UI porting stories. US-002 through US-011 (ports) block US-017 (deletion). US-012-014 (decomposition) are independent of porting.

## Success Metrics

- Zero files in `src/scenes/`, `src/ui/hud/`, `src/ui/screens/`, `src/ui/tome/`
- GameView.tsx < 150 LOC (from 311)
- HubView.tsx < 150 LOC (from 329)
- GameEngine.ts < 80 LOC (thin orchestrator)
- All 128+ existing unit tests pass
- All 11 browser tests pass
- No `grep` matches for dead module imports
- daisyUI parchment theme renders correctly across all ported components
- Visual verification via Chrome DevTools shows no layout regressions

## Open Questions

- Should the parchment daisyUI theme also apply to MainMenuView (currently uses its own Tailwind styling)?
- Should SaveManager persistence for building upgrades use SQLite (Capacitor path) or localStorage (web-only path) for now?
- Is there an existing island-select UI in MainMenuView that should be reconciled with the ported building-level gating from HubScene?
- Should the Hotbar (US-003) integrate with the existing weapon system immediately, or just render placeholder slots?