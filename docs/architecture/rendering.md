# Rendering Architecture

## Engine Overview

Bok uses a **custom Three.js engine** (no Jolly Pixel). The engine is organized around three collaborating modules:

| Module | File | Purpose |
|--------|------|---------|
| `GameLoop` | `src/engine/game-loop.ts` | RAF loop, scene, renderer, behavior list |
| `GameBridge` | `src/engine/game-bridge.ts` | Behavior that drives ECS + syncs to renderers each frame |
| `RendererManager` | `src/engine/renderer-manager.ts` | Lifecycle for all standalone visual renderers |

```text
┌──────────────┐     ┌────────────────┐     ┌─────────────────────┐
│  Koota ECS   │────>│  GameBridge    │────>│  Standalone         │
│  (state)     │     │  (Behavior)    │     │  Renderers          │
│              │     │                │     │  (Three.js objects) │
└──────────────┘     └────────────────┘     └─────────────────────┘
                             │
                             ▼
                      GameLoop.renderer.render(scene, camera)
```

---

## Stack

```text
┌────────────────────────┐
│  React (UI Layer)      │  HUD, menus, overlays
├────────────────────────┤
│  GameBridge (Behavior) │  ECS orchestration, sync layer
├────────────────────────┤
│  Three.js (3D)         │  Scene graph, materials, camera
├────────────────────────┤
│  WebGL                 │  GPU interface
└────────────────────────┘
```

---

## Rendering Loop

`GameLoop` runs a `requestAnimationFrame` loop. Each tick it calls `update(dt)` on all registered `Behavior` instances, then calls `renderer.render(scene, camera)`.

`GameBridge` is the only Behavior that matters for gameplay. Its `update(dt)` runs in this order:

```text
GameBridge.update(dt)
├── updateAutopilot()           — dev-only: sets MoveInput before movement reads it
├── [All ECS systems]           — movement, physics, survival, runes, creatures, …
├── syncPlayerToCamera()        — Position + Rotation → Three.js camera
├── syncViewModelState()        — active hotbar slot → ViewModelRenderer
├── syncEnvironmentState()      — WorldTime → CelestialRenderer + AmbientParticlesRenderer
├── syncCreatureRendererPositions() — CreatureTag + Position → CreatureRenderer
├── runRuneInscriptionSystem()  — face-hit data → rune inscription ECS
├── runMiningSystem()           — block-hit data → mining ECS + side effects
├── streamChunks()              — load/unload VoxelWorld chunks around player
└── updateRenderers(dt)         — tick each standalone renderer
```

---

## Standalone Renderers

Each renderer is a plain class (no Behavior base) that owns Three.js objects. All are created by `createRenderers()` in `renderer-manager.ts` and ticked by `updateRenderers(dt)`.

| Renderer | File | Purpose |
|----------|------|---------|
| `VoxelWorld` | `src/engine/voxel-world.ts` | Chunk-based voxel world with greedy meshing |
| `CreatureRenderer` | `src/engine/creature-renderer.ts` | Building-block creature meshes + procedural animation |
| `ParticlesRenderer` | `src/engine/particles-renderer.ts` | Mining hits, block break, combat, sprint dust |
| `BlockHighlightRenderer` | `src/engine/block-highlight-renderer.ts` | Block selection wireframe + raycaster |
| `AmbientParticlesRenderer` | `src/engine/ambient-particles-renderer.ts` | Environmental floating particles |
| `CelestialRenderer` | `src/engine/celestial-renderer.ts` | Sun, moon, stars, sky color, ambient/sun intensity |
| `ViewModelRenderer` | `src/engine/viewmodel-renderer.ts` | First-person held item with bob + swing animation |
| `RuneFaceRenderer` | `src/engine/rune-face-renderer.ts` | Rune glyph decals on block faces |
| `SignalGlowRenderer` | `src/engine/signal-glow-renderer.ts` | Rune signal strength visualization |
| `MiningCrackRenderer` | `src/engine/mining-crack-renderer.ts` | Mining progress overlay on targeted block |

---

## Voxel World

### VoxelWorld Class

`VoxelWorld` (`src/engine/voxel-world.ts`) implements the `VoxelRenderer` interface and replaces the former Jolly Pixel VoxelRenderer. It combines:

- **VoxelStore** — flat `Uint8Array` chunk storage, one array per chunk key `"cx,cz"`
- **Greedy mesher** — combines adjacent same-type faces into larger quads
- **Chunk mesh builder** — converts quads into `THREE.BufferGeometry`

```typescript
// The public API matches what terrain-generator and chunk-streaming expect:
voxelWorld.setVoxel("Ground", { position: { x, y, z }, blockId });
voxelWorld.removeVoxel("Ground", { position: { x, y, z } });
voxelWorld.setVoxelBulk("Ground", entries);
voxelWorld.getVoxel({ x, y, z });  // returns { blockId } | null
```

### Greedy Mesher Pipeline

Located at `src/world/greedy-mesher.ts` (tested in `src/world/greedy-mesher.test.ts`).

1. For each axis and direction, scan the chunk slice by slice.
2. Skip faces that are occluded by an adjacent solid block (face culling).
3. Expand each exposed face greedily along the two remaining axes as long as block type and face visibility match.
4. Emit one `MeshQuad` per merged region (positions, normals, UVs, blockType).

Greedy merging converts a dense voxel scene into far fewer draw quads, dramatically reducing geometry. A 2×2 flat floor of the same block type produces a single top-face quad rather than four.

### Chunk Lifecycle

```text
setVoxel / setVoxelBulk
  └── markDirty(cx, cz)           — adds chunk key to dirtyChunks set

flushDirtyChunks()                — called after bulk terrain generation
  └── rebuildChunkMesh(cx, cz)    — greedyMesh → buildChunkGeometry → THREE.Mesh

streamChunks() (each frame)       — loads/unloads chunks around player
  └── rebuildChunkMesh / removeChunkMesh
```

### Voxel Accessor Bridge

`src/world/voxel-helpers.ts` provides global `getVoxelAt()` / `setVoxelAt()` functions that ECS systems use without importing Three.js. The bridge is registered in `initGame()` and wires a delta listener to SQLite for persistence:

```text
ECS Systems → voxel-helpers.setVoxelAt() → VoxelWorld.setVoxel()
                         │
                         └── deltaListener → SQLite (voxel_deltas table)
```

---

## Tileset Generation

Block textures are generated at runtime on a canvas (`src/world/tileset-generator.ts`):

- Grid of 32×32 px tiles; each block type has a drawing function (noise, gradients, shapes)
- Output is a data URL loaded as the `VoxelWorld` tileset texture
- Loaded via `VoxelWorld.loadTileset()` which creates a `THREE.MeshLambertMaterial` with `NearestFilter`
- No external texture files required

---

## Input System

`InputSystem` (`src/engine/input-system.ts`) handles keyboard and mouse. `MobileControls` (`src/ui/hud/MobileControls.tsx`) handles touch. Both write their state into the `MoveInput` and `Rotation` traits on the player entity each frame. The rendering layer never reads raw input events.

---

## Scene Setup

| Element | Type | Details |
|---------|------|---------|
| Camera | `PerspectiveCamera` | 75° FOV, 0.1 near, 100 far |
| Ambient Light | `AmbientLight` | 0.35 base intensity, modulated by `CelestialRenderer` |
| Sun | `DirectionalLight` | 1.2 intensity, shadow-casting, shadow map size from quality preset |
| Fog | `THREE.Fog` | Matches sky color, distance from quality preset |
| Background | `scene.background` | Sky color, modulated by `CelestialRenderer` |

---

## Quality / LOD

`quality-presets.ts` detects device tier (GPU, CPU, memory) and returns a `QualityPreset` with:

- `renderDistance` — chunk load radius
- `shadowMapSize` — shadow map resolution
- `particleBudget` — max live particles
- `ambientParticles` — ambient particle count
- `fogNear`, `fogFar` — fog range multipliers

`chunk-lod.ts` classifies loaded chunks as near/mid/far and controls unload priority.
