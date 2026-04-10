---
title: Architecture
updated: 2026-04-09
status: current
domain: technical
---

# Architecture — Bok: The Builder's Tome

## Entry Point

`index.html` → `src/app/index.tsx` → `App.tsx` state machine.

`App.tsx` manages view routing: `menu → hub → island-select → sailing → game → death/victory`. The legacy `SceneDirector` / `IslandScene` stack and imperative DOM UI (`src/scenes/`, `src/ui/`) have been removed. All UI is React.

## Three-Layer Integration

### Layer 1 — Koota (State)

All game entity data lives in Koota traits. Koota is the single source of truth.

- **Traits** (`src/traits/`): Position, Velocity, Health, AIState, WeaponStats, etc.
- **Relations** (`src/relations/`): ChildOf, Contains, FiredBy, Targeting
- **World traits** (singletons): Time, GamePhase, IslandState

### Layer 2 — Yuka (AI)

Yuka owns all AI decisions for enemies and bosses.

- Steering behaviors drive enemy movement
- StateMachine drives behavior states
- CompositeGoal trees drive boss phase logic
- Perception (Vision + Memory) drives awareness
- AIBridge syncs Yuka ↔ Koota bidirectionally

### Layer 3 — JollyPixel (Render)

JollyPixel owns the game loop, voxel rendering, and scene graph.

- Runtime drives the frame loop
- VoxelRenderer renders chunked terrain with Rapier colliders
- Actors exist for visual entities (player model, enemy meshes)
- Enemy mesh transforms synced via Yuka vehicle positions in `gameLoop.ts`

## Frame Loop

Managed by `src/engine/gameLoop.ts` via `GameLoopContext` dependency injection:

1. `beforeFixedUpdate` → Rapier physics step
2. `beforeUpdate(dt)` → game logic:
   - Yuka AI entity manager update
   - Enemy AI update (chase/wander via steering)
   - Camera movement + terrain following
   - Combat contact detection + damage
   - Engine state polling → React HUD (10fps bridge via `useGameHUD`)

## React → Engine Bridge

```typescript
// GameView.tsx mounts canvas via ref, lazy-loads engine:
const canvasRef = useRef<HTMLCanvasElement>(null);
useEffect(() => {
  import('../engine/GameEngine').then(({ initGame }) => {
    initGame(canvasRef.current!, config);
  });
}, []);
```

Engine never touches the DOM. React controls layout. Engine controls the canvas.

## Engine Module Decomposition

`src/engine/GameEngine.ts` is a thin orchestrator (~155 lines). It calls focused setup functions and wires their outputs together:

| Module | Function | Role |
|--------|----------|------|
| `engineSetup.ts` | `createEngineCore()` | JollyPixel Runtime + Rapier + Koota + scene/lighting |
| `terrainSetup.ts` | `createTerrain()` | Procedural terrain generation + voxel placement |
| `playerSetup.ts` | `createPlayer()` | FPS camera + input + weapon model + pointer lock |
| `enemySetup.ts` | `spawnEnemies()` | Enemy spawning + Yuka AI wiring |
| `combat.ts` | `createCombat()` | Combat loop, damage, loot drops |
| `gameLoop.ts` | `createGameLoop()` | Frame loop orchestration |
| `hub.ts` | Hub terrain + buildings + NPCs |

Each module takes explicit dependencies (no module-scoped singletons) and returns a typed result object.

## Data Flow

```
Content JSON (Zod validated)
  → ContentRegistry
  → Generation (pure functions, src/generation/)
  → Koota entities (src/traits/, src/relations/)
  → Systems process (src/systems/)
  → Yuka AI decides (src/ai/)
  → JollyPixel renders
  → React HUD polls engine state at 10fps
```

## Persistence

`@capacitor-community/sqlite` with jeep-sqlite for web (WASM). SQLite tables:

- `unlocks` — permanent progression
- `tome_pages` — ability unlocks
- `hub_state` — building levels
- `runs` — run history
- `settings` — user settings
- `save_state` — mid-run save (Koota snapshot + Yuka snapshot as JSON blobs)

## JollyPixel Patterns

```typescript
// Correct: use jpWorld API
const terrainActor = jpWorld.createActor('terrain');
const voxelMap = terrainActor.addComponentAndGet(VoxelRenderer, { ... });
const scene = jpWorld.sceneManager.getSource() as THREE.Scene;

// Wrong: never bypass JollyPixel with raw Three.js
// scene.add(new THREE.Mesh(...));  <-- BLOCKED
```

`jpWorld` is typed `any` everywhere — accepted codebase pattern because JollyPixel's runtime API is untyped.

## Input System

Platform-agnostic `ActionMap` in `src/input/` maps raw device events to named game actions (`moveForward`, `attack`, `dodge`, etc.). Devices: `KeyboardMouseDevice`, `TouchDevice`, `GamepadDevice`.

## Audio

Tone.js procedural SFX and music in `src/audio/`. Spatial positioning tied to enemy locations. 8 biome music tracks + hub ambient. Compressor normalizes output. Mobile autoplay resumed on first gesture.
