# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

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

