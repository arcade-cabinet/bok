# Architecture — Bok: The Builder's Tome

## Shipping path

**React** (`src/app/index.tsx`) is the sole entry point. `App.tsx` manages view routing (menu → hub → sailing → game → death/victory). The `GameEngine.initGame()` creates the JollyPixel Runtime on a React-owned canvas ref. The legacy `SceneDirector` / `IslandScene` stack and imperative DOM UI (`src/scenes/`, `src/ui/`) have been deleted (US-017).

## UI Layer

React 19 + daisyUI v5 (custom `parchment` theme) + Tailwind CSS 4 + Framer Motion. All HUD components (`src/components/hud/`), modals (`src/components/modals/`), and transitions (`src/components/transitions/`) are React. Views are decomposed into hooks (`useGameLifecycle`, `useGameEvents`, `useGameHUD`, `useHubEngine`, `useHubCamera`, `useHubBuildings`).

## Three-Layer Integration

### Layer 1: Koota (State)
All game entity data lives in Koota traits. Koota is the single source of truth.
- Traits: Position, Velocity, Health, AIState, WeaponStats, etc.
- Relations: ChildOf, Contains, FiredBy, Targeting
- World traits (singletons): Time, GamePhase, IslandState

### Layer 2: Yuka (AI)
Yuka owns all AI decisions for enemies and bosses.
- Steering behaviors drive enemy movement
- StateMachine drives enemy behavior states
- CompositeGoal trees drive boss phase logic
- Perception (Vision + Memory) drives awareness
- AIBridge syncs Yuka ↔ Koota bidirectionally

### Layer 3: JollyPixel (Render)
JollyPixel owns the game loop, voxel rendering, and scene graph.
- Runtime drives the frame loop
- VoxelRenderer renders chunked terrain with Rapier colliders
- Actors exist for visual entities (player model, enemy meshes)
- Enemy mesh transforms are synced directly via Yuka vehicle positions (functional approach in `gameLoop.ts`)

## Frame Loop

Managed by `src/engine/gameLoop.ts` via `GameLoopContext` dependency injection:

1. `beforeFixedUpdate` → Rapier physics step
2. `beforeUpdate(dt)` → game logic:
   - Yuka AI entity manager update
   - Enemy AI update (chase/wander via steering)
   - Camera movement + terrain following
   - Combat contact detection + damage
   - Engine state polling → React HUD (via 10fps `useGameHUD` bridge)

## Data Flow
Content JSON → ContentRegistry (Zod validated) → Generation (pure functions) → Koota entities → Systems process → Yuka AI decides → Render displays

## Persistence
@capacitor-community/sqlite with jeep-sqlite for web. SQLite tables for permanent progression, run history, settings, and mid-run save state.
