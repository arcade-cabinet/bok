---
title: System Patterns
domain: memory-bank
status: current
last-verified: 2026-03-16
depends-on:
  - architecture
summary: "Architecture patterns -- ECS state ownership, side-effect bridging, file organization, testing"
---

# System Patterns -- Bok

This is a summary of key architecture patterns. For detailed conventions, see domain docs (e.g., `docs/architecture/ecs.md`, `docs/architecture/rendering.md`).

## ECS State Ownership

```
Koota ECS (traits + systems)    <- ALL gameplay state lives here
    |
    | side-effect callbacks
    v
GameBridge (src/engine/game.ts) <- Wires ECS to rendering, owns update loop
    |
    v
Jolly Pixel (Actors/Behaviors)  <- ALL rendering lives here (Three.js only inside Behaviors)
    |
    v
React (UI components)           <- UI overlays only, reads from ECS via hooks
```

- **All gameplay state** lives in Koota ECS traits. React never owns game state.
- **Systems are pure functions**: `(world, dt, ...sideEffects)` -- mutate ECS state, never import Three.js.
- **Side effects bridge ECS to rendering**: When a system needs visual feedback (spawn particles, remove a block), it calls a callback injected by GameBridge.
- **React state is UI-only**: Which menu is open, which tab is active, animation states.

Details: `docs/architecture/ecs.md`

## Library Spheres of Influence

| Library | Owns | Does NOT Touch |
|---------|------|----------------|
| **Koota** | All gameplay state (traits, systems) | Three.js, DOM, React |
| **Jolly Pixel** | Scene graph, actors, behaviors, rendering | ECS mutations, persistence |
| **React** | UI overlays, HUD, menus, screens | Three.js objects, ECS systems |
| **Three.js** | 3D math, meshes, materials, cameras | Used only inside Behaviors |
| **SQLite** | Save/load, voxel deltas, player state | Runtime game state |
| **Tailwind/DaisyUI** | CSS utility classes, component styles | Inline styles |

## Side-Effect Pattern

ECS systems receive callbacks for rendering interactions:

```typescript
// System signature -- pure logic, no Three.js imports
export function miningSystem(
  world: World,
  dt: number,
  effects: MiningSideEffects,  // { removeBlock, spawnParticles, playSound }
) { ... }

// GameBridge wires the callbacks
miningSystem(world, dt, {
  removeBlock: (x, y, z) => this.voxelEngine.removeBlock(x, y, z),
  spawnParticles: (pos, color) => this.particleSystem.emit(pos, color),
});
```

## File Organization

```
src/
  ecs/
    traits/index.ts          -- All trait definitions (single file)
    systems/*.ts             -- One file per system (~90+ system files)
  engine/
    game.ts                  -- GameBridge, initGame, destroyGame (906 LOC -- needs decomposition)
    input-handler.ts         -- Keyboard/mouse/touch input
    behaviors/*.ts           -- Jolly Pixel Behaviors (visual only)
  world/
    blocks.ts                -- Block/item/recipe definitions
    noise.ts                 -- Simplex noise, worldRng(), cosmeticRng()
    terrain-generator.ts     -- Chunk terrain generation
    tileset-generator.ts     -- Procedural block textures
    voxel-helpers.ts         -- Global voxel accessor bridge
  persistence/
    db.ts                    -- SQLite persistence layer
  ui/
    screens/*.tsx            -- Full-screen states (title, death)
    hud/*.tsx                -- In-game overlays (vitals, damage vignette)
    components/*.tsx         -- Reusable UI components (RuneWheel, Bok pages)
  App.tsx                    -- Root component, phase management (600 LOC -- needs decomposition)
  main.tsx                   -- React entry point
```

## Key Conventions

- **~200 LOC limit per file** -- decompose when exceeded. Extract utilities, sub-components, split responsibilities.
- **`.tsx` = UI rendering only** -- No game logic, no ECS queries, no physics in `.tsx` files.
- **`.ts` = logic and state** -- ECS systems, game bridge, persistence, world generation.
- **One system per file** in `src/ecs/systems/`.
- **Traits in single file** at `src/ecs/traits/index.ts`.

## PRNG Rules

- **Never use `Math.random()`** anywhere.
- `worldRng()` for deterministic game logic (terrain, spawns, drops). Seeded per world.
- `cosmeticRng()` for non-deterministic visual-only effects (particles, screen shake).
- Both defined in `src/world/noise.ts`.

## Pure-Data / ECS Bridge Separation

A recurring pattern throughout the codebase -- pure-data modules paired with ECS system modules:

| Pure Data (no ECS/Three.js) | ECS System | React UI |
|----------------------------|-----------|----------|
| `rune-data.ts` | `rune-inscription.ts` | `RuneWheel.tsx` |
| `saga-data.ts` | `saga.ts` | `BokSaga.tsx` |
| `codex-data.ts` | `codex.ts` | `BokCodex.tsx` |
| `map-data.ts` | `exploration.ts` | `BokMap.tsx` |
| `diegetic-effects.ts` | (direct UI use) | `DamageVignette.tsx`, `HungerOverlay.tsx` |
| `face-selection.ts` | `rune-inscription.ts` | -- |
| `signal-data.ts` | `signal-propagation.ts` | -- |

The pure-data module handles math, definitions, and constants. The ECS system handles trait reads/writes and side-effect callbacks. The React component renders read-only UI.

## Creature System Architecture

Multi-part creatures follow the building-block aesthetic:

- `creature-parts.ts` -- Part definitions, assembly functions, LOD switching (pure data + Three.js construction)
- `CreatureRendererBehavior.ts` -- Pool management, position interpolation, joint animation
- `procedural-anim.ts` -- Sine oscillators, per-species config, state blending (pure math)
- `ik-solver.ts` -- Two-bone analytical IK (pure math)
- `spring-physics.ts` -- Damped harmonic oscillator, follow-the-leader chains (pure math)

Each creature species has a dedicated AI file (`creature-ai-hostile.ts`, `creature-ai-vittra.ts`, etc.) plus optional special behavior files (`morker-pack.ts`, `draugar-gaze.ts`, etc.).

## Persistence Pattern

- SQLite via sql.js (web) / Capacitor SQLite (native)
- Delta tracking: only modified voxels stored (original terrain is regenerated from seed)
- Tables: `player_state`, `voxel_deltas`, `explored_chunks`, `rune_faces`, plus per-system tables
- Save triggers: app background, chunk boundary, periodic timer
- Load: regenerate terrain from seed, apply deltas, restore player/creature/structure state

Details: `docs/architecture/persistence.md`

## Testing Patterns

- **Vitest** for unit tests -- system logic, pure functions, data modules
- **Playwright CT** for component tests -- `.ct.tsx` beside `.tsx` (currently broken, see techContext)
- **Test files beside source** -- `system.test.ts` next to `system.ts`
- **Mock world helper** in `src/test-utils.ts` for creating Koota worlds with specific traits
- **No `Math.random()` in tests** -- use seeded RNG or deterministic inputs
