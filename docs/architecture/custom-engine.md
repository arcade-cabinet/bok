# Custom Engine Architecture

> Bok is being rewritten with a custom engine. All Jolly Pixel dependencies are being removed. The rendering pipeline is built directly on Three.js.

## Why Custom

Jolly Pixel (JP) was used to bootstrap the game but constrains the rendering pipeline:
- JP's VoxelRenderer uses flat-face meshing — no smooth terrain
- JP's Actor/Behavior model adds indirection between ECS and Three.js
- JP's runtime owns the game loop — we need full control for tick-based rune simulation
- SDF rune rendering and marching cubes terrain require custom shaders JP can't provide

## What Stays

| Library | Role | Status |
|---------|------|--------|
| **Koota ECS** | All gameplay state, systems | Stays — JP-independent |
| **React 19** | UI layer (HUD, menus, screens) | Stays |
| **Three.js** | 3D math, scene graph, rendering | Stays — used directly, not through JP |
| **SQLite** | Persistence (save/load, voxel deltas) | Stays |
| **Tailwind/DaisyUI** | CSS styling | Stays |
| **Vitest + Vitest Browser Mode** | Unit + component testing | Stays |

## What Gets Replaced

| JP Component | Custom Replacement |
|-------------|-------------------|
| `@jolly-pixel/runtime` | Custom `requestAnimationFrame` game loop |
| `@jolly-pixel/engine` (Actor/Behavior) | Direct Three.js scene management |
| `@jolly-pixel/voxel.renderer` | Custom voxel mesher → marching cubes |
| `GameBridge` (JP Behavior) | Custom game controller calling ECS systems |
| All `src/engine/behaviors/*.ts` | Custom render systems |

## Rendering Pipeline

### Layer 1: Terrain — Marching Cubes

The current JP VoxelRenderer uses standard axis-aligned voxel meshing (face culling + tileset textures). The custom engine replaces this with **marching cubes** (or dual contouring):

- Voxel data stays as a 3D grid (same format as current)
- Meshing produces smooth, organic surfaces instead of blocky cubes
- Enables natural Scandinavian landscapes: rolling hills, eroded coastlines, organic caves
- Material blending at boundaries (stone → dirt gradients, water → land shorelines)
- Chunk-based: each chunk generates its own mesh, streamed around the player

**Implementation order:**
1. Custom flat-face voxel mesher (drop-in JP replacement)
2. Material-aware face colors/textures
3. Marching cubes upgrade (smooth terrain)
4. Material blending at transitions

### Layer 2: Rune Glyphs — SDF Rendering

Elder Futhark rune glyphs are rendered using **Signed Distance Fields** (SDF):

- Each of the 15 rune glyphs is stored as an SDF texture
- Resolution-independent: crisp at any camera distance (no pixelation)
- SDF math enables glow effects (expand the distance field → halo)
- Glyphs are projected as decals onto the marching cubes mesh surface
- Single texture atlas for all 15 glyphs (one draw call via `InstancedMesh`)

**Technical approach:**
- Custom Three.js `ShaderMaterial` with SDF fragment shader
- `InstancedMesh` for all visible rune decals (GPU instancing, one draw call)
- SDF atlas: 4x4 grid of 64x64 SDF textures (256x256 total)
- Per-instance uniforms: position, normal, glyph index, glow intensity

### Layer 3: Living Rune System — Signal Visualization

Rune inscriptions are not static — they are alive. The computation is visible:

| Visual Element | What Drives It |
|---------------|---------------|
| **Glyph glow intensity** | Signal strength at that inscription (0→dim, 10→bright) |
| **Glyph pulse rate** | Whether the inscription is actively emitting |
| **Wavefront trails** | Signal propagation through material (traveling glow along surface) |
| **Activation flare** | Signal arrival at an inscription (burst + particles along normal) |
| **Material veins** | Faint glowing lines through material between connected inscriptions |
| **Particle emission** | Emitter runes shed particles in their signal direction |

**Wavefront visualization:**
- Signal propagation runs at 4Hz (250ms per tick)
- Each tick, the wavefront expands through conducting material
- The expansion is visualized as a traveling glow through the surface mesh
- Stone shows warm orange veins, crystal shows purple, iron shows white-blue
- Players literally watch their rune programs execute in real time

**Performance budget:**
- Max 128 material samples per tick
- Max 32 active emitters
- Max 16 propagation depth
- Glow/particle updates at 4Hz (not per-frame)
- InstancedMesh for all rune decals (single draw call)

### Layer 4: Creature Rendering

Building-block creatures (Mörker, Vittra, Lindormar, etc.) currently use JP's `EnemyRendererBehavior`. The custom engine replaces this with:

- Direct Three.js mesh creation (box geometry primitives, capsule joints)
- Procedural animation via `spring-physics.ts` and `ik-solver.ts` (already custom)
- GPU instancing for creature parts (many creatures with few draw calls)
- No JP Actor/Behavior wrapper

## Game Loop

The custom game loop replaces JP's runtime:

```
function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // 1. Run ECS systems (movement, physics, survival, combat, etc.)
  runEcsSystems(world, dt, sideEffects);

  // 2. Run rune signal tick (4Hz, not per-frame)
  if (signalTickAccumulator >= 0.25) {
    runSignalTick(world);
    signalTickAccumulator -= 0.25;
  }

  // 3. Sync ECS state to Three.js (positions, health bars, animations)
  syncToRenderer(world, scene);

  // 4. Render
  renderer.render(scene, camera);

  requestAnimationFrame(gameLoop);
}
```

## Integration Order

Each layer is built and tested in isolation before integration:

1. **Custom game loop** — replace JP runtime, run ECS systems directly
2. **Custom voxel mesher** — flat faces first (JP replacement)
3. **Direct creature rendering** — replace EnemyRendererBehavior
4. **SDF rune glyph rendering** — decals on voxel surfaces
5. **Signal glow overlay** — strength → brightness on rune decals
6. **Wavefront particle trails** — signal propagation visualization
7. **Marching cubes upgrade** — smooth terrain (can happen later)
8. **Material vein visualization** — connected rune paths glow

## Current State

The **surface rune language** is implemented as an isolated proof in `src/engine/runes/`:
- `wavefront.ts` — flood-fill signal propagation (conductivity-attenuated, budget-limited)
- `rune-effects.ts` — NOT/AND/DELAY gate logic (Turing complete)
- `RuneSimulator.tsx` — 2D visual test harness
- 32 unit tests + 17 browser component tests (Vitest Browser Mode, real Chromium)

This proof validates the rune computation model before engine integration.
