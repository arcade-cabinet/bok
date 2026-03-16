# Rendering Architecture

## Stack

```
┌────────────────────────┐
│  React (UI Layer)      │  ← HUD, menus, overlays
├────────────────────────┤
│  Jolly Pixel (Engine)  │  ← Actor/Behavior system, runtime loop
├────────────────────────┤
│  Three.js (3D)         │  ← Scene graph, rendering, materials
├────────────────────────┤
│  WebGL / WebGPU        │  ← GPU interface
└────────────────────────┘
```

## Jolly Pixel Integration

Bok uses Jolly Pixel for:
- **Runtime** (`@jolly-pixel/runtime`) — game loop, canvas management, loading
- **Engine** (`@jolly-pixel/engine`) — Actor/Behavior pattern
- **VoxelRenderer** (`@jolly-pixel/voxel.renderer`) — chunked voxel world

### Actor/Behavior Pattern
Jolly Pixel uses an Actor model where Actors own Behaviors (components with lifecycle). Bok creates these Actors in `initGame()`:

| Actor | Behavior | Purpose |
|-------|----------|---------|
| GameBridge | `GameBridge` | Runs ECS systems, syncs state to visuals |
| Celestial | `CelestialBehavior` | Sun, moon, stars, sky color, lighting |
| AmbientParticles | `AmbientParticlesBehavior` | Floating atmospheric particles |
| Particles | `ParticlesBehavior` | Mining/combat/sprint dynamic particles |
| BlockHighlight | `BlockHighlightBehavior` | Block targeting wireframe + raycaster |
| ViewModel | `ViewModelBehavior` | First-person held item with animations |
| EnemyRenderer | `EnemyRendererBehavior` | Enemy mesh pool and interpolation |
| VoxelMap | `VoxelRenderer` | Chunked voxel world rendering |

### Behavior Lifecycle
```typescript
class MyBehavior extends Behavior {
  awake() {
    this.needUpdate = true;  // Required to enable update()
  }
  update(dt: number) {
    // Called every frame by Jolly Pixel runtime
  }
}
```

## GameBridge — The Core Loop

`GameBridge` is the central Behavior that orchestrates everything each frame:

```
GameBridge.update(dt)
├── Run ECS systems (movement, physics, survival, quest, time, enemy, mining)
├── syncPlayerToCamera() — Position/Rotation → Three.js camera
├── syncViewModelState() — Hotbar slot → ViewModel mesh
├── syncEnvironmentState() — Time → Celestial, Ambient particles
├── runEnemySystem() — Enemy AI + sync positions to EnemyRenderer
├── runMiningSystem() — Mining + block highlight hit data
└── streamChunks() — Load/unload voxel chunks around player
```

## Voxel World

### VoxelRenderer
Jolly Pixel's VoxelRenderer handles:
- Chunk-based voxel storage
- Face culling (only render exposed faces)
- Tileset-based texturing
- Layer system ("Ground" layer for all terrain)

### Chunk Streaming
```typescript
const RENDER_DISTANCE = 3;  // chunks in each direction
const CHUNKS_PER_FRAME = 2; // max chunks generated per frame
```

Chunks are loaded into a queue sorted by distance to player. The closest unloaded chunks are generated first, capped at 2 per frame to maintain framerate. Chunks beyond `RENDER_DISTANCE + 2` are unloaded.

### Voxel Accessor Bridge
`src/world/voxel-helpers.ts` provides global `getVoxelAt()` / `setVoxelAt()` functions that ECS systems use without importing Three.js. The bridge is registered in `initGame()`:

```
ECS Systems → voxel-helpers → VoxelRenderer
                    ↓
              Delta Listener → SQLite (persistence)
```

## Particle System

`ParticlesBehavior` uses Three.js `InstancedMesh` (500 particles max) with per-instance color and transform. Particles have:
- Position, velocity, gravity
- Life (decays at 1.5x/sec)
- Color (per-spawn)

Used for: mining hits (block color), block break (block color, 15 count), combat (red), sprint (brown dust).

## Scene Setup

| Element | Type | Details |
|---------|------|---------|
| Camera | PerspectiveCamera | 75 FOV, 0.1 near, 100 far |
| Ambient Light | AmbientLight | 0.35 intensity, modulated by time |
| Sun | DirectionalLight | 1.2 intensity, shadow-casting, 1024 shadow map |
| Fog | Fog | Matches sky color, 15 near, render distance far |
| Background | Scene.background | Sky color, modulated by CelestialBehavior |

## Tileset Generation

Block textures are generated at runtime on a canvas (`src/world/tileset-generator.ts`):
- 8x2 grid, 32x32 pixels per tile
- Each block type has a drawing function (noise patterns, gradients, shapes)
- Output is a data URL loaded as the VoxelRenderer tileset
- No external texture files needed
