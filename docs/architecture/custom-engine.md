# Custom Engine Architecture

> Bok uses a custom engine built directly on Three.js. All Jolly Pixel dependencies have been removed.

## Why Custom

Jolly Pixel (JP) was used to bootstrap the game but constrained the rendering pipeline:

- JP's VoxelRenderer used flat-face meshing with no path to smooth terrain
- JP's Actor/Behavior model added indirection between ECS and Three.js
- JP's runtime owned the game loop — full control is required for tick-based rune simulation
- SDF rune rendering and future terrain techniques require custom shaders JP cannot provide

## What Stays

| Library | Role |
|---------|------|
| **Koota ECS** | All gameplay state, systems — JP-independent |
| **React 19** | UI layer (HUD, menus, screens) |
| **Three.js** | 3D math, scene graph, rendering — used directly |
| **SQLite** | Persistence (save/load, voxel deltas) |
| **Tailwind/DaisyUI** | CSS styling |
| **Vitest + Vitest Browser Mode** | Unit + component testing |

---

## Implemented

### Game Loop

`src/engine/game-loop.ts` — custom `requestAnimationFrame` loop replacing JP's runtime.

```
gameLoop(timestamp):
  1. Run ECS systems (movement, physics, survival, combat)
  2. Run rune signal tick at 4Hz (not per-frame)
  3. Sync ECS state → Three.js (positions, animations)
  4. renderer.render(scene, camera)
```

### GameBridge

`src/engine/game-bridge.ts` — game controller that owns the loop, scene, and renderer.
Wires ECS systems to the custom loop. Replaces JP's `GameBridge` Behavior.

### Voxel Renderer — Greedy Mesher

`src/world/greedy-mesher.ts`, `src/engine/greedy-mesher.ts` — greedy mesh algorithm
that merges coplanar faces into quads. Replaces JP's flat-face per-block mesher.

`src/engine/voxel-world.ts` — manages chunk streaming and mesh lifecycle.
`src/engine/voxel-store.ts` — voxel data storage.
`src/engine/chunk-mesh-builder.ts` — builds `BufferGeometry` from greedy mesh quads.
`src/engine/block-face-atlas.ts` — texture atlas for block face materials.

### Standalone Renderers

Each renderer is a standalone module with no JP dependency:

| Renderer | File |
|----------|------|
| Block highlight | `src/engine/block-highlight-renderer.ts` |
| Celestial bodies (sun/moon) | `src/engine/celestial-renderer.ts` |
| View model (held item) | `src/engine/viewmodel-renderer.ts` |
| Particles | `src/engine/particles-renderer.ts` |
| Ambient particles | `src/engine/ambient-particles-renderer.ts` |
| Creature rendering | `src/engine/creature-renderer.ts` |
| Rune face glyphs (THREE.Line strokes) | `src/engine/rune-face-renderer.ts` |
| Mining crack overlay | `src/engine/mining-crack-renderer.ts` |
| Signal glow (rune strength → brightness) | `src/engine/signal-glow-renderer.ts` |

All renderers are registered through `src/engine/renderer-manager.ts`.

### Creature Rendering and Animation

`src/engine/creature-renderer.ts` — builds building-block creatures (box geometry
primitives, capsule joints) directly in Three.js. No JP Actor/Behavior wrapper.

`src/engine/procedural-anim.ts` — procedural animation system.
`src/engine/spring-physics.ts` — spring-based physics for secondary motion.
`src/engine/ik-solver.ts` — inverse kinematics for limb placement.
`src/engine/creature-anim.ts` — animation state machine.

Part definitions: `src/engine/creature-parts.ts`, `creature-part-defs.ts`,
`creature-part-defs-hostile.ts`, `creature-part-defs-neutral.ts`.

### Rune Glyph Rendering (THREE.Line-based)

`src/engine/rune-face-renderer.ts` — renders Elder Futhark glyphs as `THREE.Line`
stroke sequences projected onto voxel faces. Glyph stroke data lives in
`src/engine/runes/glyph-strokes.ts`.

### Input System

`src/engine/input-system.ts` — unified keyboard/mouse/touch input system.
`src/engine/input-state.ts` — input state snapshot read by ECS systems each tick.

### Rune Computation Layer

`src/engine/runes/wavefront.ts` — flood-fill signal propagation (conductivity-attenuated, budget-limited).
`src/engine/runes/rune-effects.ts` — NOT/AND/DELAY gate logic (Turing complete).
`src/engine/runes/world-tick.ts` — 4Hz rune simulation tick.
`src/engine/rune-bridge.ts` — connects rune simulation to ECS world effects.

Validated by 32 unit tests + 17 browser component tests.

---

## Roadmap

These features have no code yet. They are planned for future sessions.

### SDF Rune Rendering

Replace `THREE.Line` stroke rendering with **Signed Distance Field** textures:

- Each glyph stored as an SDF texture in a 4x4 atlas (256x256 total)
- Resolution-independent: crisp at any camera distance
- SDF math enables glow halos by expanding the distance field
- Glyphs projected as decals onto voxel surfaces
- Custom `ShaderMaterial` + `InstancedMesh` for one draw call

### Marching Cubes Terrain

Replace greedy-meshed blocky terrain with smooth organic surfaces:

- Voxel data stays as a 3D grid (same format)
- Meshing produces smooth hills, eroded coastlines, organic caves
- Enables natural Scandinavian landscapes

### Material Blending at Biome Boundaries

Smooth material transitions between biome zones (stone → dirt gradients,
water → land shorelines). Depends on marching cubes terrain.

### Material Vein Visualization

Faint glowing lines through voxel material between connected rune inscriptions.
Stone shows warm orange veins, crystal shows purple, iron shows white-blue.

### Wavefront Particle Trails

Traveling glow along voxel surfaces during signal propagation. Players watch
their rune programs execute tick by tick. Depends on signal glow renderer
(already implemented) as a foundation.
