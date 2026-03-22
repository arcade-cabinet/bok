/**
 * @module generation
 * @role Procedural island generation — deterministic from seed
 * @input BiomeConfig + seed + difficulty
 * @output IslandBlueprint (terrain, spawns, chests, boss arena, structures)
 * @depends content (BiomeConfig), shared (Vec3)
 * @tested PRNG.test.ts, TerrainBuilder.test.ts, IslandGenerator.test.ts
 */

export { EnemyPlacer, type EnemySpawn } from './EnemyPlacer';
export { type IslandBlueprint, IslandGenerator } from './IslandGenerator';
export { type ChestPlacement, LootPlacer } from './LootPlacer';
export { PRNG, SimplexNoise } from './noise';
export { type Structure, StructureGenerator } from './StructureGenerator';
export { TerrainBuilder, type TerrainData } from './TerrainBuilder';
