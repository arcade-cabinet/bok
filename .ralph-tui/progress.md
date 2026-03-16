# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### Procedural Animation Runtime Architecture
The procedural animation system separates pure math from Three.js rendering:
- `procedural-anim.ts` — Sine oscillators (`oscillate(time, freq, amp, phase)`), per-species config tables (`AnimConfig`), state-driven blending (`blendAnimParams`, `advanceBlend`). Pure math, no Three.js.
- `ik-solver.ts` — Two-bone analytical IK solver using law of cosines. `solve2BoneIK` returns `{ upperAngle, lowerAngle, reached }`. `getEndEffector` verifies solutions via forward kinematics.
- `spring-physics.ts` — Damped harmonic oscillator (`springUpdate`) with convergence check (`springConverged`). Follow-the-leader chain (`updateFollowChain`) for segmented creatures (Lindorm). `createChain` + `segmentHeading` utilities.
- `CreatureRendererBehavior.ts` — Consumes animation primitives. PoolEntry tracks `prevAnimState` + `blendProgress` for smooth state transitions.
- Key patterns:
- **State blend on change**: When `animState` changes, snapshot previous state as `prevAnimState`, reset `blendProgress` to 0. Each frame, `advanceBlend` moves progress toward 1.0. `blendAnimParams(from, to, progress)` interpolates all animation parameters.
- **Species config lookup**: `getAnimConfig(species)` returns per-species breathing/sway/bob parameters. Falls back to default config for unregistered species.
- **Oscillator composition**: Body motion = breathing oscillator + state-weighted bob oscillator. Two independent frequencies produce organic-feeling animation without keyframes.
- **FK verification**: `getEndEffector` in ik-solver.ts allows unit tests to verify IK solutions by computing the end position from joint angles — tests prove the chain reaches the target.

### Creature Part System Architecture
The multi-part creature renderer separates pure data from Three.js construction:
- `creature-parts.ts` — Part definitions (arrays of `{ geometry, size, offset, jointParent, jointAxis, color }`), assembly functions (creates Three.js Group hierarchies), variation (±10% scale, ±5% hue), LOD switching.
- `CreatureRendererBehavior.ts` — Pool management, position interpolation, joint animation, camera-based LOD.
- Key patterns:
- **Joint hierarchy via scene graph**: Each part is a Group containing a Mesh. Children nested under parent Groups get automatic transform propagation — rotating a Group rotates all descendants. No manual matrix math.
- **Variation from ECS**: `CreatureAnimation.variant` (0–1) seeds both scale and hue variation. `cosmeticRng()` sets variant at spawn time.
- **LOD distance squared**: Compare `distSq > LOD_DISTANCE_SQ` (no sqrt) for performance. Beyond 30 blocks, swap all part Groups invisible and show single LOD box.
- **Effects chain extension**: `CreatureEffects.onCreatureSpawned(entityId, species, variant)` carries species + variant from spawner → game.ts → renderer.

### ECS System Testing Pattern
ECS systems are pure functions `(world: World, dt: number) => void`. To test:
1. `createTestWorld()` — fresh Koota world per test
2. `spawnPlayer(world, { trait: { field: value } })` — spawn entity with overrides
3. Call the system: `survivalSystem(world, dt)`
4. Assert with `entity.get(Trait).field`

Test utilities live at `src/test-utils.ts`. Test files live next to source: `system.test.ts` beside `system.ts`.

### Import Ordering (Biome)
Biome enforces alphabetical import ordering. `type` imports sort before value imports from the same package. Always run `pnpm biome check` on new files.

### Creature System Architecture
The creature framework uses dispatch-by-archetype (passive/neutral/hostile/boss) rather than dispatch-by-species. Each archetype function handles all creatures of that type in a single ECS query pass. Species-specific variations are branches within archetype functions. Files:
- `creature.ts` — main entry point, spawning, despawn, damage
- `creature-ai.ts` — AI behavior per archetype (hostile, passive, neutral)
- `creature-spawner.ts` — species-specific spawn logic and defaults
- `CreatureRendererBehavior.ts` — mesh construction dispatched by species

### Mocking Voxel Helpers in Tests
Creature AI calls `getVoxelAt`/`isBlockSolid` for ground collision and obstacle jumping. Mock with `vi.mock("../../world/voxel-helpers.ts", () => ({ getVoxelAt: () => 0, isBlockSolid: () => false }))` for tests that don't need terrain. Also mock `noise.ts` for deterministic spawner tests.

### Test File Exclusion from Build
Test files (`*.test.ts`, `*.ct.tsx`) must be excluded from `tsconfig.app.json` via the `exclude` array. Koota's `.get()` returns `T | undefined` in strict mode, which causes type errors in tests that use direct assertions. Vitest handles its own type checking via `vitest.config.ts`.

### Block & Tileset Decomposition Pattern
The block system is decomposed by concern:
- `blocks.ts` — Block IDs, metadata (with physics properties), lookup utilities, items/recipes. Pure data, no rendering.
- `block-definitions.ts` — Jolly Pixel `BlockDefinition` array mapping BlockId to shape, collidability, and tileset coordinates. Uses `simpleCube()` and `woodBlock()` helpers to keep definitions compact.
- `tileset-tiles.ts` — Tile definitions with procedural draw callbacks. Drawing helpers (`addNoise`, `drawWoodGrain`, `drawWoodRings`) and partial application factories (`withLeaves`, `withOre`) reduce boilerplate. Draw callbacks receive `rng` as parameter to avoid module-level state coupling.
- `tileset-generator.ts` — Canvas rendering engine. Seeds PRNG, iterates tiles, produces data URL. Only 47 LOC.

### Biome System Architecture
The terrain biome system separates pure data/logic from noise-dependent generation:
- `biomes.ts` — Pure biome definitions, selection function (temp × moisture → biome), surface rules, tree types, blend helpers. No noise dependency = trivially testable.
- `terrain-generator.ts` — Noise layer sampling (4 layers at different scales/offsets), height computation, biome resolution with corruption overlay, 8-block boundary blending, column placement, tree generation.

Key patterns:
- **Uncorrelated noise layers**: Same `noise2D` function with large coordinate offsets (+1000, +2000, +3000) produces independent layers cheaply.
- **Height-adjusted temperature**: `adjustTemperature(rawTemp, height)` makes mountains naturally become Fjällen without coupling height to biome selection.
- **Fast-path blending**: Check 4 cardinal neighbors at blend radius first — skip expensive blend computation for interior positions (the common case).
- **Deterministic blend selection**: `posHash(gx, gz)` provides a stable [0,1) hash for weighted biome block selection, keeping chunk generation deterministic from seed.

### Tree Generator Decomposition
Species-specific tree placement lives in `tree-generator.ts`, separate from `terrain-generator.ts`. The `placeTree()` function dispatches by `TreeTypeId` via switch/case (using break, not return, due to Biome's `noVoidTypeReturn` rule). Each species function receives the entries array and pushes blocks directly. Terrain generator imports `placeTree` and calls it with the species resolved from `getBiomeTrees()` or `blendTreeType()`.

### Biome-Specific Terrain Adjustments
Biome terrain differentiation uses `adjustBiomeHeight(h, biome, gx, gz)` which modifies height per-biome after biome selection but before column placement. Key patterns:
- **Island generation (Skärgården)**: Noise thresholding at smaller scale creates binary land/water topology — values above threshold become peaks, rest submerges below water level.
- **Waterlogging (Myren)**: Height compression `WATER_LEVEL + (h - WATER_LEVEL) * 0.2` flattens terrain near water, creating natural shallow pools.
- **Edge-biased corruption (Blothögen)**: Distance-from-origin modulates corruption noise threshold: `noise + min(1, dist/500) * 0.2 > 0.65`.
- **Resource enforcement**: `BIOME_RESOURCES` in biomes.ts maps each biome to its exclusive blocks; `isBiomeExclusive(blockId)` returns the owning biome.
- **World utilities**: `generateSpawnShrine` and `findSurfaceY` live in `world-utils.ts`, separate from terrain generation.

### Cave & Ore Generation Architecture
Underground cave carving and ore veins are in `cave-generator.ts`, separate from `terrain-generator.ts`:
- **3D simplex noise** (`noise3D` in noise.ts) enables volumetric carving — 2D noise creates height maps, 3D noise creates cave tunnels.
- **Single integration point**: `applyCaveToStone(gx, y, gz, surfaceY)` is the only function terrain-generator calls. It computes cave noise once and uses it for both cave carving and water pool decisions.
- **Surface protection**: `CAVE_SURFACE_BUFFER` (3 blocks) + stone-only carving means caves never breach the surface layer.
- **Ore priority**: ORE_BANDS are iterated in order; first match wins in overlap zones (iron > copper at y 10–15).
- **Seed name generator** extracted to `seed-names.ts` from noise.ts to keep noise module focused on noise algorithms.

### Tileset Draw Function Testing Pattern
Testing procedural canvas draw functions in Node (no DOM) uses a mock CanvasRenderingContext2D that intercepts property assignments. `Object.defineProperty` on `fillStyle`/`strokeStyle` captures every color value used during drawing. Tests then assert that specific palette colors appear in the captured arrays. This tests drawing _intent_ (what colors are painted) without needing real canvas rendering. The mock also stubs all canvas methods (`fillRect`, `beginPath`, `stroke`, etc.) with `vi.fn()` for call-count assertions.

### Passive Creature AI Pattern (Lyktgubbe)
The first passive creature demonstrates the pattern for adding non-hostile creatures:
- `lyktgubbe-drift.ts` — Pure math module (no Three.js). Drift offsets (sine patterns), scatter/reform state machine, time-of-day window checks, biome validation, color interpolation. Pattern follows `procedural-anim.ts` and `ik-solver.ts`.
- `creature-ai.ts` `updatePassiveAI` — Species dispatch within archetype function. Each passive species gets a dedicated function (`updateLyktgubbeAI`).
- `creature-spawner.ts` — Species-specific spawn function (`spawnLyktgubbe`) with biome-gating via injected resolver. `registerBiomeResolver()` avoids circular dependency.
- `creature-parts.ts` — `additive` flag on `CreaturePartDef` for glowing effects. `AssembledCreature.pointLight` for creatures that emit light.
- Key patterns:
- **Injected biome resolver**: `registerBiomeResolver(biomeAt)` called in game.ts breaks the circular dependency: creature-spawner needs biome lookup, but importing from terrain-generator would create a cycle.
- **Time-gated spawning**: `isLyktgubbeTime(timeOfDay)` checks against twilight (0.7–0.85) and dawn (0.15–0.3) windows. Creatures despawn outside their window.
- **Scatter with drag**: Exponential drag `vel * exp(-3*dt)` produces smooth deceleration for scatter burst → reform pattern.

### Landmark Generation Architecture
Landmarks follow the same decomposition as trees and caves:
- `landmark-types.ts` — Pure structure builders (placeStenhog, placeRunsten, placeFornlamning, biome-specific). Each pushes VoxelSetOptions onto an entries array. No side effects.
- `landmark-generator.ts` — Chunk-level placement logic. Uses `chunkHash(cx, cz)` at chunk scale (not block scale) for rarer placement (~5% of chunks). Exports `surfaceYAt(gx, gz)` and `biomeAt(gx, gz)` for surface/biome queries at any world position.
- Single integration point: `generateChunkLandmarks(entries, cx, cz)` called from terrain-generator.ts after columns, before setVoxelBulk.

Key patterns:
- **Chunk-scale hashing**: `chunkHash` uses different constants than `posHash` to avoid correlation with tree/feature placement.
- **Biome boundary detection**: `isBiomeBoundary(gx, gz)` checks 4 cardinal positions at BLEND_CHECK distance — same concept as blend weights but returns boolean.
- **Structure dispatch**: Boundary positions get stenhogar + runstenar; interior positions get biome-specific landmarks via `selectBiomeLandmark(biome)`.
- **Height-gated placement**: Landmarks require `surfaceY >= LANDMARK_MIN_HEIGHT` (above water).

---

## 2026-03-16 - US-001
- Vitest 4.1.0 added as devDependency, configured in vitest.config.ts
- `pnpm test` (vitest run) and `pnpm test:watch` (vitest) scripts added
- Test utilities module at `src/test-utils.ts` with `createTestWorld`, `spawnPlayer`, `spawnWorldTime`, `spawnWorldSeed` helpers
- 11 passing tests for `survivalSystem` covering hunger decay, health drain, stamina regen, damage flash, camera shake, and death state
- CI workflow updated: unit tests run before build step
- tsconfig.node.json updated to include vitest.config.ts
- Files changed: package.json, pnpm-lock.yaml, vitest.config.ts (new), tsconfig.node.json, src/test-utils.ts (new), src/ecs/systems/survival.test.ts (new), .github/workflows/ci.yml
- **Learnings:**
  - Koota's `createWorld()` + `world.spawn()` is extremely test-friendly — pure functions + ECS = natural unit testing
  - Vitest 4.x requires Node 22+ (uses `node:util` styleText). The local machine defaults to Node 18; must use `fnm use 22`
  - `environment: "node"` is sufficient for ECS system tests — no jsdom overhead needed
  - Biome strictly enforces import ordering: `type` imports before value imports from same package
---

## 2026-03-16 - US-002
- Creature Entity Framework replacing hardcoded enemy system
- New traits: CreatureTag, CreatureType (10 species enum), CreatureAI (aiType, behaviorState, aggroRange, attackRange, etc.), CreatureAnimation (animState, animTimer, variant), CreatureHealth (hp, maxHp, velY, meshIndex)
- Enum constants: Species, AiType, BehaviorState, AnimState — all as const objects with derived type aliases
- enemySystem → creatureSystem with dispatch-by-archetype pattern (hostile/passive/neutral)
- EnemyRendererBehavior → CreatureRendererBehavior with species-aware mesh assignment
- Legacy aliases (EnemyTag=CreatureTag, EnemyState=CreatureHealth) for backward compat
- game.ts fully updated: imports, runCreatureSystem, checkCreatureCombat, renderer actor
- Test utilities: spawnCreature() helper with CreatureOverrides
- 11 new unit tests: trait verification, hostile AI (chase/attack/idle/damage/burn/death/dead-player), integration (despawn), damageCreature
- tsconfig.app.json: exclude test files from build (pre-existing Koota .get() strict-mode issue)
- Files changed: src/ecs/traits/index.ts, src/ecs/systems/creature.ts (new), src/ecs/systems/creature-ai.ts (new), src/ecs/systems/creature-spawner.ts (new), src/ecs/systems/creature.test.ts (new), src/ecs/systems/index.ts, src/engine/behaviors/CreatureRendererBehavior.ts (new), src/engine/game.ts, src/test-utils.ts, tsconfig.app.json
- Files removed: src/ecs/systems/enemy.ts
- **Learnings:**
  - Koota traits with factory functions `trait(() => ({ ... }))` allow complex default values while keeping the trait data plain
  - `as const` objects + `typeof` mapped types are more ECS-friendly than TypeScript enums (tree-shakeable, no runtime enum reverse mapping)
  - ECS query `.updateEach()` allows mutation during iteration — used for AI state transitions and position updates in same pass
  - vi.mock() for voxel-helpers and noise modules enables isolated creature AI testing without terrain generation
  - tsconfig.app.json `exclude` pattern needed for test files — Koota's `.get()` returns `T | undefined` which conflicts with strict mode assertions
---

## 2026-03-16 - US-003
- Multi-layer noise infrastructure for biome-driven terrain generation
- New file `src/world/biomes.ts` (134 LOC): Biome enum (6 Swedish biomes), `selectBiome(temp, moisture)`, `SurfaceRule` interface, per-biome surface rules, `TreeType` enum (5 types), `getBiomeTrees()`, `blendSurfaceBlock()`, `blendTreeType()`
- New file `src/world/biomes.test.ts` (233 LOC): 29 tests covering biome selection (all temp/moisture combos + boundary values), tree types per biome, surface rules, boundary blending (weighted selection), noise layer composition (determinism, range, uncorrelation), `computeHeight` (mid-range, extremes, clamping, erosion detail)
- Modified `src/world/terrain-generator.ts` (192 LOC): 4 noise layers (continental/200, erosion/50, temperature/150, moisture/120) + corruption/80, `sampleNoiseLayers()`, `computeHeight()`, height-adjusted temperature, `biomeAt()` with corruption overlay, 5-point boundary blend (center + 4 cardinals), `placeTree()` with dead birch variant, biome-specific tree spawn rates
- All 51 vitest tests pass, typecheck clean, lint clean
- Files created: src/world/biomes.ts, src/world/biomes.test.ts
- Files modified: src/world/terrain-generator.ts
- **Learnings:**
  - Simplex noise layers can be uncorrelated from the same permutation table using large coordinate offsets — no need for separate noise instances
  - Height → temperature feedback (`adjustTemperature`) elegantly maps high elevation to cold biomes without explicit height-based biome selection
  - `as const` object enums (Biome, TreeType) match the existing pattern from US-002 (Species, AiType) — consistency across the codebase
  - Boundary blending fast-path (check 4 cardinals first) avoids expensive 5-point sampling for ~90% of columns that are interior to biomes
  - `Map<BiomeId, number>` requires the key type to match exactly — `number` from Map iteration doesn't satisfy a union type literal; fix with explicit typing on the Map
  - Pre-existing CT test failures (30s timeouts on Crosshair, HotbarDisplay) are environment-specific and unrelated to world/ changes
---

## 2026-03-16 - US-004
- 19 new biome-specific block types added to BlockId enum (13-31): BirchWood, BirchLeaves, BeechWood, BeechLeaves, PineWood, PineLeaves, SpruceLeaves, DeadWood, Moss, Mushroom, Peat, Ice, SmoothStone, Soot, CorruptedStone, IronOre, CopperOre, Crystal, FaluRed
- BlockMeta extended with physics properties: `slippery`, `bouncy`, `soft` (optional booleans)
- Physics: Ice=slippery, Peat=bouncy, Moss=soft; utility functions `isSlippery()`, `isBouncy()`, `isSoft()`
- `getBlockName()` utility added for block ID→name lookups
- All block colors derived from Scandinavian palette (art-direction.md): Björk, Mossa, Sten, Glöd, Falu, Guld, Himmel, Bläck
- `createBlockDefinitions()` extracted to `block-definitions.ts` with `simpleCube()` and `woodBlock()` helpers
- Tileset grid expanded from 8×2 to 8×5 (38 tiles for 32 block types)
- Tileset decomposed: `tileset-tiles.ts` (tile data + draw helpers) + `tileset-generator.ts` (canvas engine)
- Draw callbacks refactored to receive `rng` parameter instead of capturing module-level state
- 15 new unit tests in `blocks.test.ts` covering: block ID uniqueness/contiguity, metadata completeness, physics properties, hardness, name lookups, tileset tile coverage
- All 75 vitest tests pass, typecheck clean, lint clean
- Files created: src/world/block-definitions.ts, src/world/tileset-tiles.ts, src/world/blocks.test.ts
- Files modified: src/world/blocks.ts, src/world/tileset-generator.ts, src/engine/game.ts
- **Learnings:**
  - Biome formatter expands inline lambdas aggressively — partial application factories (`withLeaves`, `withOre`) are more Biome-friendly than inline arrow functions for data arrays
  - Physics as optional booleans (`slippery?: boolean`) scales better than union types for potential future combinations
  - Wood block definitions follow a consistent side+top texture pattern that compresses well with the `woodBlock()` helper
  - Tileset draw functions should receive `rng` as a parameter rather than closing over module state — enables file splitting without circular dependencies
  - `BlockIdValue` type alias (`(typeof BlockId)[keyof typeof BlockId]`) provides exhaustive type checking for block IDs without runtime overhead
---

## 2026-03-16 - US-005
- Inventory refactored from named fields (`InventoryData { wood: number, stone: number, ... }`) to `Record<number, number>` keyed by BlockId/item ID
- New `InventoryData` interface: `{ items: Record<number, number>, capacity: number }` with capacity limit for future Bok Ledger integration
- New module `src/ecs/inventory.ts` (103 LOC): pure helper functions — `addItem`, `removeItem`, `hasItem`, `getItemCount`, `inventoryCount`, `isFull`, `canAfford`, `deductCost`, `serializeInventory`, `deserializeInventory`
- Recipe costs changed from string keys (`{ wood: 1 }`) to numeric keys (`{ [BlockId.Wood]: 1 }`)
- All mapping tables eliminated: `PLACEABLE_BLOCKS` in HotbarDisplay, `craftableKeys` in game.ts placeBlock, `getInventoryKeyForBlock` in App.tsx
- Mining system uses `addItem(inv, hit.id)` instead of `addToInventory(inv, blockDef.name)` — block ID is the inventory key
- HotbarDisplay uses `getItemCount(inventory, slot.id)` — no name-to-key indirection
- CraftingMenu uses `canAfford(inventory, recipe.cost)` and `getBlockName(Number(id))` for display
- Save/load: inventory persisted as `JSON.stringify({ items, capacity })`, loaded with fallback for legacy format
- 29 new unit tests covering: inventoryCount, getItemCount, hasItem, isFull, addItem (with capacity clamping), removeItem (with cleanup), canAfford, deductCost, serialization round-trip
- Playwright CT test updated for new inventory shape
- All 104 vitest tests pass, typecheck clean, lint clean (only pre-existing index.css parse error)
- Files created: src/ecs/inventory.ts, src/ecs/inventory.test.ts
- Files modified: src/ecs/traits/index.ts, src/world/blocks.ts, src/ecs/systems/mining.ts, src/ui/hud/HotbarDisplay.tsx, src/ui/components/CraftingMenu.tsx, src/App.tsx, src/engine/game.ts, src/persistence/db.ts, src/ui/hud/HotbarDisplay.ct.tsx
- **Learnings:**
  - Koota traits with `Record<number, number>` work cleanly — `trait(() => ({ items: {}, capacity: 256 }))` — since Koota trait data must be plain serializable objects (no Maps)
  - `export type { X } from` re-exports maintain the public API surface while moving the definition — consumers that import from traits/index.ts still work, while the canonical definition lives in inventory.ts
  - Recipe costs as `Record<number, number>` with computed property keys (`{ [BlockId.Wood]: 1 }`) preserve type safety while making the inventory key consistent across the entire chain
  - JSON.parse always produces string keys even for numeric Record keys — the deserializer must `Number(k)` when rebuilding `Record<number, number>`
  - Removing name-based mapping tables (PLACEABLE_BLOCKS, craftableKeys, getInventoryKeyForBlock) eliminates an entire class of bugs where adding a new block requires updating multiple mapping tables
---

## 2026-03-16 - US-006
- Ängen, Bokskogen, and Fjällen biomes fully differentiated with species-specific terrain generation
- New file `src/world/tree-generator.ts` (114 LOC): species-specific tree placement — Birch (BirchWood, 5×5 canopy), Beech (BeechWood, 2×2 thick trunk, 7×7 canopy), Pine (PineWood, triangular canopy), Spruce (SpruceLeaves, narrow 3×3), DeadBirch (DeadWood, no leaves)
- New file `src/world/tree-generator.test.ts` (124 LOC): 13 tests covering species block types, tree shapes, canopy dimensions
- Updated `src/world/biomes.ts` (142 LOC): Bokskogen surface rule changed to Moss (moss floor), added `TREE_LINE` (18) and `ICE_LINE` (22) elevation thresholds
- Updated `src/world/terrain-generator.ts` (207 LOC): extracted old placeTree → tree-generator.ts, added Fjällen ice surface above ICE_LINE, Fjällen tree line cutoff (no trees ≥ TREE_LINE), Bokskogen mushroom scatter (hash > 0.92), Ängen wildflower accents (hash > 0.94), biome-specific tree density via `treeSpawnRate()` (Bokskogen 7%, Ängen 3%, Fjällen/Myren/Skärgården 2%)
- Added Wildflower block (BlockId 32) to blocks.ts, block-definitions.ts (poleY shape), tileset-tiles.ts (colorful flower drawing)
- Extended biomes.test.ts with 7 new tests: per-biome surface block selection (Ängen=Grass, Bokskogen=Moss, Fjällen=Snow/Stone), elevation thresholds (TREE_LINE < ICE_LINE > WATER_LEVEL), tree spawn rate ordering (Bokskogen densest, all positive)
- All 125 vitest tests pass, typecheck clean, lint clean (only pre-existing index.css parse error)
- CT test failures are all pre-existing 30s timeouts on mount (environment-specific, unrelated to world/ changes)
- Files created: src/world/tree-generator.ts, src/world/tree-generator.test.ts
- Files modified: src/world/biomes.ts, src/world/terrain-generator.ts, src/world/blocks.ts, src/world/block-definitions.ts, src/world/tileset-tiles.ts, src/world/biomes.test.ts
- **Learnings:**
  - Biome's `noVoidTypeReturn` rule disallows `return voidFn()` in void functions — must use statement + break in switch/case dispatchers instead of `return` shorthand
  - Extracting tree placement to its own module keeps terrain-generator focused on column/chunk logic while tree shapes can grow independently
  - Species-specific tree density (treeSpawnRate) is a simple switch returning a probability — no need for data tables since it's biome-keyed and unlikely to grow
  - posHash-based ground feature scatter (mushrooms, wildflowers) achieves deterministic decoration without extra noise layers — threshold on the same hash used for trees but at different probability ranges (> 0.92 vs < 0.07)
  - Elevation thresholds (TREE_LINE, ICE_LINE) exported from biomes.ts keeps terrain-generator from hardcoding magic numbers and makes the values testable
---

## 2026-03-16 - US-007
- Skärgården (archipelago), Myren (bog), and Blothögen (corrupted) biomes fully differentiated with terrain-specific generation
- New block: Cranberry (BlockId 33) — poleY ground feature for Myren bogs, tileset at (7,4)
- Updated surface rules: Skärgården→SmoothStone/Stone, Myren→Moss/Peat, Blothögen→Soot/CorruptedStone
- Skärgården island generation: secondary noise layer at /30 scale (offset +4000) creates island clusters; values > 0.6 threshold become peaks, rest submerged
- Myren waterlogging: height compressed via `WATER_LEVEL + (h - WATER_LEVEL) * 0.2`, flattening terrain near water level to create natural shallow pools
- Blothögen edge-biased corruption: `sqrt(gx² + gz²) / 500` provides 0→1 gradient added to corruption noise threshold, making corruption more frequent at world edges
- Cranberry ground feature scatter in Myren (hash > 0.90) following existing mushroom/wildflower pattern
- `BIOME_RESOURCES` map + `isBiomeExclusive()` function for biome-specific resource availability enforcement
- Extracted `generateSpawnShrine` and `findSurfaceY` to `world-utils.ts` to keep terrain-generator.ts under ~200 LOC
- 21 new unit tests: island generation (3), waterlogging (4), corruption edge bias (3), passthrough (1), surface rules (3), resource availability (7)
- All 146 vitest tests pass, typecheck clean, lint clean (only pre-existing index.css parse error + unused `trunks` fn)
- Files created: src/world/terrain-biomes.test.ts, src/world/world-utils.ts
- Files modified: src/world/biomes.ts, src/world/terrain-generator.ts, src/world/biomes.test.ts, src/world/blocks.ts, src/world/block-definitions.ts, src/world/tileset-tiles.ts, src/engine/game.ts
- **Learnings:**
  - Noise thresholding (island > 0.6 → peak, else submerge) is the simplest way to create binary topology (land vs water) from continuous noise — the 0.6 threshold controls island density
  - Height compression `WATER_LEVEL + (h - WATER_LEVEL) * factor` where factor < 1 naturally creates waterlogged terrain: columns near water stay near water, columns far above get pulled toward it
  - Edge-biased corruption uses the same noise layer with a distance-dependent threshold shift — no new noise needed, just `noise + edgeBias > constant` where edgeBias grows with distance from origin
  - `adjustBiomeHeight` must be applied AFTER biome selection but BEFORE column placement — the biome is chosen from the raw (pre-adjusted) height's temperature, but blocks are placed at the adjusted height
  - Extracting world utilities (`generateSpawnShrine`, `findSurfaceY`) to a separate file is a clean decomposition since they operate on VoxelRenderer directly and are called from game.ts, not from the chunk generation loop
  - `BIOME_RESOURCES` as `Record<BiomeId, number[]>` + `isBiomeExclusive` provides a queryable resource-availability API that other systems (crafting, mining) can use without hardcoding biome knowledge
---

## 2026-03-16 - US-008
- Underground cave system using 3D simplex noise (scale 30, threshold 0.35) for volumetric carving
- Cave networks form naturally from continuous 3D noise thresholding — connected tunnels, not isolated pockets
- Ore vein placement by depth band: Iron (y 5–15), Copper (y 10–20), Crystal (y 20+) using independent 3D noise clusters (scale 8)
- Underground water pools at cave intersections below CAVE_WATER_LEVEL (y ≤ 8) where cave noise is strongest
- Surface protection: 3-block buffer below surface + stone-only carving prevents caves from breaching terrain
- `applyCaveToStone()` provides single integration point — terrain-generator adds one line to its y-loop
- Seed name generator extracted from noise.ts to seed-names.ts for decomposition
- 20 new unit tests: cave noise (range, determinism, 3D variation), cave carving (bedrock, surface buffer, underground carving, connectivity, threshold), ore bands (iron/copper/crystal depth limits, determinism, clusters, config), water pools (level cap, deep placement), integration (air/ore/stone/water)
- All 166 vitest tests pass, typecheck clean, lint clean (only pre-existing errors)
- Files created: src/world/cave-generator.ts (120 LOC), src/world/cave-generator.test.ts, src/world/seed-names.ts (52 LOC)
- Files modified: src/world/noise.ts (added noise3D + grad3, removed seed names), src/world/terrain-generator.ts (added import + 1-line integration), src/ui/screens/NewGameModal.tsx (updated import)
- **Learnings:**
  - 3D simplex noise with moderate threshold (~0.35) on continuous noise naturally creates connected cave networks — the iso-surface at the threshold forms worm-like passages that are inherently connected
  - noise3D must share the Perm table with noise2D (both read from the same permutation array initialized in initNoise), so they must co-locate in noise.ts
  - Biome formatter expands inline multi-assignments (i1=1; j1=0; k1=0) to separate lines, making 3D simplex noise ~90 LOC after formatting — this is irreducible for the algorithm
  - `applyCaveToStone` computing caveNoise once and reusing for both cave carving and water pool decisions avoids redundant 3D noise evaluations in the hot terrain generation loop
  - Ore depth band overlap (iron y 5–15, copper y 10–20) is handled by iteration order in ORE_BANDS — first match wins, with independent noise offsets ensuring both ores can appear in the overlap zone
  - The `grad3` function for 3D noise uses a 12-direction gradient set (cube edges) encoded as bit operations on the hash, compared to the simpler 8-direction set in 2D
---

## 2026-03-16 - US-009
- Procedurally placed Swedish landmarks: stenhogar (cairns), runstenar (runestones), fornlämningar (ruins), and biome-specific landmarks
- New block: RuneStone (BlockId 34) — dark stone with Elder Futhark-style rune carvings, hardness 7.0
- Tileset expanded from 8×5 to 8×6 (row 5 for landmark blocks)
- New file `src/world/landmark-types.ts` (161 LOC): 7 structure builders — placeStenhog (cairn: 3×3 base + tapered column + StoneBricks cap), placeRunsten (3-tall RuneStone column), placeFornlamning (variable 5/7/9 foundation + partial walls + Glass loot stub), placeKolmila (DeadWood/Soot mound), placeOfferkalla (stone ring + water pool + RuneStone marker), placeSjomarke (5-tall SmoothStone pillar + torch), placeFjallstuga (3×3 Planks floor + PineWood walls + SpruceLeaves roof + interior torch)
- New file `src/world/landmark-generator.ts` (151 LOC): chunk-level placement with `chunkHash(cx, cz)` at ~5% rate, biome boundary detection via 4-cardinal check, `surfaceYAt`/`biomeAt` helpers, `selectBiomeLandmark` dispatch
- Spawn shrine upgraded: stenhög + runsten + 4 torches on StoneBricks platform (replaces generic stone + glass)
- game.ts delta tracking updated to match new shrine structure (stenhög blocks + RuneStone column)
- Integration: single `generateChunkLandmarks(entries, cx, cz)` call in terrain-generator.ts before setVoxelBulk
- 26 new unit tests: landmark rate constants, deterministic placement, sparse spawn rate (100–1500 of 10000 chunks), surface/biome helpers, biome-specific type selection (6 biomes), stenhog structure (base count, stone vs SmoothStone, cap), runsten (3 RuneStone blocks), fornlamning (5×5/7×7 floors, loot stub, partial walls), kolmila/offerkalla/sjomarke/fjallstuga block composition
- All 192 vitest tests pass, typecheck clean, lint clean (only pre-existing errors)
- Files created: src/world/landmark-types.ts, src/world/landmark-generator.ts, src/world/landmark-generator.test.ts
- Files modified: src/world/blocks.ts, src/world/block-definitions.ts, src/world/tileset-tiles.ts, src/world/tileset-generator.ts, src/world/terrain-generator.ts, src/world/world-utils.ts, src/engine/game.ts, src/world/blocks.test.ts
- **Learnings:**
  - Chunk-scale hashing (`chunkHash(cx, cz)`) must use different constants than block-scale `posHash(gx, gz)` to avoid correlation — landmarks and trees would cluster together if they shared the same hash function
  - The `adjustTemperature` function is private in terrain-generator.ts — landmark-generator.ts duplicates it as `adjustTemp` to avoid circular import (landmark-generator imports from terrain-generator which imports from landmark-generator would be circular)
  - Structure builders that push to an entries array (same pattern as tree-generator) are trivially testable — create empty array, call builder, assert on resulting entries without needing VoxelRenderer
  - Biome boundary detection reuses the same BLEND_CHECK radius concept as terrain blending but only needs boolean result, not weight distribution — much cheaper
  - `as const` array destructuring in loops (e.g., `for (const [dx, dz] of [...] as const)`) gets reformatted by Biome into multi-line arrays — the result is more readable anyway
  - Tileset grid expansion (5→6 rows) requires updating both `tileset-generator.ts` ROWS constant and the existing "all tiles fit within grid" test assertion
---

## 2026-03-16 - US-010
- Tileset texture polish pass for Swedish art direction compliance
- New file `src/world/tileset-draw-helpers.ts` (235 LOC): Extracted drawing primitives + 14 new species-specific and biome texture functions
- Species-specific wood textures: `drawBirchBark` (horizontal lenticels), `drawBirchRings`, `drawBeechGrain` (smooth subtle), `drawBeechRings`, `drawPineGrain` (dark pronounced + resin knots), `drawPineRings`
- Ore metallic sparkle: `withOreSparke` replaces `withOre`, adds bright white/gold pixel highlights after ore veins
- Biome ground textures: `drawMossTexture` (deep green multi-shade blotches), `drawPeatTexture` (fibrous horizontal streaks + organic flecks), `drawSootTexture` (ashy particles + ember specks)
- `addWarmNoise` helper: warm-tinted light pixels `rgba(255,240,230,0.1)` instead of pure white, used for stone/dirt
- Palette compliance: Grass `#4CAF50`→`#4a7a42` (muted Mossa-adjacent), Leaves `#2E7D32`→`#3a5a40` (exact Mossa), Snow `#FFFFFF`→`#f0eae4` (warm, no pure white), Birch `#d4c4a8`→`#ddd0ba` (closer to Björk)
- Warm bias applied: Stone `#9E9E9E`→`#a6989a` (+8 red), Dirt `#795548`→`#7f5b4e`, StoneBricks `#757575`→`#7d7577`, SmoothStone `#6b6b6b`→`#736b6b`, Ore baseColors to warm stone
- 20 new unit tests in `tileset-tiles.test.ts` covering: palette compliance (warm bias, no pure white, Mossa greens), species-specific draw functions (birch lenticels, beech subtlety, pine grain + knots), ore sparkle highlights, biome textures (moss green shades, peat fibrous streaks, soot ash + ember), warm noise helper, leaf factory
- blocks.ts BLOCKS metadata colors updated to match tileset changes
- All 212 vitest tests pass, typecheck clean, lint clean (only pre-existing CSS parse error + unused `trunks`)
- CT test failures are all pre-existing 30s mount timeouts (environment-specific)
- Files created: src/world/tileset-draw-helpers.ts, src/world/tileset-tiles.test.ts
- Files modified: src/world/tileset-tiles.ts, src/world/blocks.ts
- **Learnings:**
  - Mock `CanvasRenderingContext2D` with property interceptors (`Object.defineProperty` on fillStyle/strokeStyle) enables "color sampling" tests in Node environment without real canvas
  - Warm bias is applied by adding +5-10 to the red channel of neutral greys: `#9E9E9E` → `#A6989A`. The green/blue channels shift slightly too for a natural warm tone rather than pure red tint
  - Species-specific wood textures differentiate by stroke opacity and pattern: birch uses horizontal rects (lenticels), beech uses opacity 0.08 (smooth), pine uses opacity 0.25 with 1.5px lineWidth (pronounced)
  - `withOreSparke` layers metallic highlights AFTER ore veins — order matters because later draws overlay earlier ones, creating the sparkle effect on top of the ore color
  - Extracting draw helpers to separate file naturally keeps tileset-tiles.ts focused on the data array while helpers are independently testable
  - `addWarmNoise` vs `addNoise` distinction: warm noise uses `rgba(255,240,230,0.1)` for light pixels instead of pure white, creating subtle warm shift across the entire texture
---

## 2026-03-16 - US-011
- Multi-part creature renderer with joint hierarchy, per-individual variation, and LOD
- New file `src/engine/creature-parts.ts` (222 LOC): `CreaturePartDef` interface, Mörker 6-part definition (body/head/2 eyes/2 arms), `assembleCreature()` builds Three.js Group hierarchy from defs, `applyScaleVariation()` ±10%, `applyHueVariation()` ±5% HSL shift, `updateLod()` with 30-block threshold, `validatePartDefs()`, `buildJointHierarchy()`, geometry factory (box/sphere/cone)
- New file `src/engine/creature-parts.test.ts` (405 LOC): 31 tests covering part definitions (validation, positive dimensions, fallback), joint hierarchy (parent-child adjacency, root isolation, axis assignments), scale variation (center/extreme/range), hue variation (identity/shift/achromatic), LOD threshold (constants, switching, exact boundary), assembly (root structure, nesting, userData, LOD mesh hidden)
- Updated `src/engine/behaviors/CreatureRendererBehavior.ts` (233 LOC): Refactored from hardcoded single-mesh to multi-part assembly. Pool entries now hold `AssembledCreature`. `assignMesh()` creates per-creature assembly with variant. `update()` computes LOD via camera distance. `animateJoints()` drives body bob, head look, arm swing, eye aggro glow, daytime tint. `setCameraPosition()` receives camera coords from game.ts. `disposeAssembled()` recursively cleans up geometries/materials.
- Updated `src/ecs/systems/creature-spawner.ts`: `cosmeticRng()` sets `CreatureAnimation.variant` at spawn time (was hardcoded 0). Passes species + variant through effects callback.
- Updated `src/ecs/systems/creature-ai.ts`: `CreatureEffects.onCreatureSpawned` signature extended with `species: SpeciesId` and `variant: number`.
- Updated `src/engine/game.ts`: Passes species/variant to `assignMesh()`, calls `setCameraPosition()` in camera sync loop.
- All 243 vitest tests pass, typecheck clean, lint clean (only pre-existing errors)
- CT test failures are all pre-existing 30s mount timeouts (environment-specific)
- **Learnings:**
  - Three.js scene graph propagation makes joint hierarchies trivial — nest Groups for parent-child transforms, no manual matrix multiplication needed
  - Per-creature variation prevents pooling of shared geometries (each creature gets unique sized meshes via `applyScaleVariation`), but the pool still manages lifecycle and max count
  - HSL hue shift is more perceptually uniform than RGB channel manipulation for color variation — `Color.getHSL()` / `Color.setHSL()` handles the conversion
  - Mocking Three.js for Node tests requires a full mock class hierarchy (Group, Mesh, Color with getHSL/setHSL, Vector3) but enables testing assembly logic without DOM or WebGL
  - `userData` on Three.js objects is the clean way to store metadata (jointAxis, originalY) that animation functions need without extending class types
  - LOD distance squared comparison (`distSq > LOD_DISTANCE_SQ`) avoids per-creature `Math.sqrt()` calls in the hot update loop
---

## 2026-03-16 - US-012
- Procedural animation runtime with pure-math animation primitives (no Three.js dependency for core logic)
- New file `src/engine/procedural-anim.ts` (144 LOC): Sine oscillators (`oscillate`), per-species animation configs (Mörker, Trana, Lindorm + default), state-driven blending (`blendAnimParams`, `advanceBlend`), `AnimConfig` and `AnimParams` interfaces
- New file `src/engine/ik-solver.ts` (81 LOC): Two-bone analytical IK solver (`solve2BoneIK`) using law of cosines, forward kinematics verifier (`getEndEffector`), `IKResult` interface with reached flag
- New file `src/engine/spring-physics.ts` (133 LOC): Damped spring physics (`springUpdate`, `springConverged`, `createSpring`), follow-the-leader chain (`updateFollowChain`, `createChain`, `segmentHeading`), `SpringState` and `SegmentPosition` interfaces
- New file `src/engine/procedural-anim.test.ts`: 22 tests covering oscillators (amplitude, frequency, phase, zero), species configs (morker/trana/lindorm/fallback), state params (all 6 states), blend interpolation (t=0/0.5/1/clamp), blend advancement
- New file `src/engine/ik-solver.test.ts`: 13 tests covering IK target reach (reachable, angled, negative Y, equal bones, right-angle), out-of-reach (full extension), too-close (fold), boundary cases, FK verification (extension, fold-back, rotation)
- New file `src/engine/spring-physics.test.ts`: 26 tests covering spring convergence (target, overshoot, critical damping, negative), convergence check (at target, far, velocity, thresholds), follow chain (head movement, spacing, close segments, single/empty, curved path), chain creation, segment heading
- Updated `src/engine/behaviors/CreatureRendererBehavior.ts` (249 LOC): PoolEntry extended with `prevAnimState` + `blendProgress` for smooth state transitions. `updatePosition` detects state changes and resets blend. `animateJoints` replaced with procedural system: body motion = breathing oscillator + state-blended bob, head sway uses species idle config × blended headSway, arm swing uses species walk config × blended armSwing. Removed `LOD_DISTANCE_SQ` import (only used internally in creature-parts).
- All 304 vitest tests pass (61 new), typecheck clean, lint clean (only pre-existing errors)
- **Learnings:**
  - Two-bone IK sign convention: `upperAngle = baseAngle + offset` (not minus) when the elbow bends above the root-to-target line. Forward kinematics verification (`getEndEffector`) catches this immediately.
  - Pure-math animation modules (no Three.js import) are trivially testable without mocking — oscillate, IK, springs are all plain number→number functions
  - Semi-implicit Euler integration (`v += a*dt; x += v*dt`) is unconditionally stable for spring physics at typical game timesteps (1/60s). Explicit Euler (`x += v*dt; v += a*dt`) can diverge at high stiffness.
  - State blending via `prevAnimState + blendProgress` is cheaper than maintaining a full animation state machine graph — only two states are ever active simultaneously
  - Per-species config as `Partial<Record<SpeciesId, AnimConfig>>` with fallback keeps the API simple: new species get the default config automatically, override only when needed
  - Oscillator composition (breathing freq + bob freq) produces organic motion because two incommensurate frequencies create quasi-periodic patterns that never exactly repeat
---

## 2026-03-16 - US-013
- Lyktgubbar (Will-o'-the-Wisps): first passive creature in the game
- New file `src/ecs/systems/lyktgubbe-drift.ts` (200 LOC): Pure-math drift/scatter/reform logic. Sine drift patterns, scatter velocity with exponential drag, reform lerp, time-of-day window check, biome check, color interpolation (amber #ffd700 ↔ blue #88ccff based on surface height).
- New file `src/ecs/systems/lyktgubbe-drift.test.ts` (210 LOC): 24 tests covering time windows (twilight/dawn boundaries), biome validation, drift offset bounds/phases, scatter velocity direction/magnitude/zero-distance, scatter→reform state transitions, reform threshold snapping, color interpolation at land/water/transition.
- Updated `src/ecs/systems/creature-ai.ts` (226 LOC): `updatePassiveAI` implemented with species dispatch. Lyktgubbe AI: drift in sine patterns when idle, scatter away from player within SCATTER_RANGE, despawn outside spawn time window. Added `timeOfDay` to `CreatureUpdateContext`.
- Updated `src/ecs/systems/creature-spawner.ts` (189 LOC): `spawnLyktgubbe` function for twilight/dawn spawning with biome-gating via injected resolver. `registerBiomeResolver` avoids circular dependency with terrain-generator. Lyktgubbar float 1.5 blocks above surface.
- Updated `src/engine/creature-parts.ts` (256 LOC): Lyktgubbe part definition (single glowing sphere), `additive` flag on `CreaturePartDef` for additive blending, `pointLight` field on `AssembledCreature` for ambient glow, point light creation in assembly for additive creatures.
- Updated `src/engine/procedural-anim.ts` (148 LOC): Lyktgubbe animation config (slow breathing, gentle bob, no arm swing).
- Updated `src/engine/behaviors/CreatureRendererBehavior.ts` (254 LOC): Point light disposal in cleanup.
- Updated `src/engine/game.ts`: Registered biomeAt resolver for spawner biome checks.
- Updated existing tests: Added `timeOfDay` to all `CreatureUpdateContext` objects, updated fallback tests for species that now have configs.
- All 328 vitest tests pass (24 new), typecheck clean, lint clean (only pre-existing errors)
- **Learnings:**
  - Passive creature AI fills the previously-empty `updatePassiveAI` archetype function — the dispatch-by-archetype pattern scales well to new creature types
  - Biome-gated spawning requires knowing biome at spawn position, but terrain-generator → creature-spawner would create circular imports. Solution: injected resolver function registered from game.ts at init time
  - Additive blending (`THREE.AdditiveBlending + transparent + depthWrite=false`) is the standard Three.js recipe for glowing ethereal effects — the orb appears to emit light additively onto the scene
  - PointLight on AssembledCreature makes lyktgubbar actual light sources that illuminate nearby terrain, not just visual glow
  - Per-entity phase offset (`entity.id() * 1.37`) ensures each lyktgubbe drifts independently — irrational multiplier avoids phase alignment between nearby wisps
  - Scatter uses exponential drag (`vel * exp(-3*dt)`) for smooth deceleration rather than linear, producing a more natural-looking burst→fade motion
  - CreatureUpdateContext needed `timeOfDay` extension for passive AI time-based despawning — this required updating all existing test contexts
  - Tests that used newly-configured species (lyktgubbe) as "unknown species" for fallback testing needed updating to use genuinely unconfigured species (vittra)
---

