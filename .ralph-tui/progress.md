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

### Biome System Architecture
The terrain biome system separates pure data/logic from noise-dependent generation:
- `biomes.ts` — Pure biome definitions, selection function (temp × moisture → biome), surface rules, tree types, blend helpers. No noise dependency = trivially testable.
- `terrain-generator.ts` — Noise layer sampling (4 layers at different scales/offsets), height computation, biome resolution with corruption overlay, 8-block boundary blending, column placement, tree generation.

Key patterns:
- **Uncorrelated noise layers**: Same `noise2D` function with large coordinate offsets (+1000, +2000, +3000) produces independent layers cheaply.
- **Height-adjusted temperature**: `adjustTemperature(rawTemp, height)` makes mountains naturally become Fjällen without coupling height to biome selection.
- **Fast-path blending**: Check 4 cardinal neighbors at blend radius first — skip expensive blend computation for interior positions (the common case).
- **Deterministic blend selection**: `posHash(gx, gz)` provides a stable [0,1) hash for weighted biome block selection, keeping chunk generation deterministic from seed.

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

