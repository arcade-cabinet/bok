/**
 * @module content
 * @role Data-driven game content definitions validated by Zod schemas
 * @input JSON config files (biomes, enemies, weapons, bosses, hub buildings, NPCs, loot tables, crafting recipes)
 * @output Typed, validated config objects via ContentRegistry
 * @depends zod
 * @tested registry.test.ts
 */
export { ContentRegistry } from './registry.ts';
export {
  getResourceForBlock,
  getResourcesForBiome,
  getUniversalResources,
  RESOURCES,
  type ResourceDef,
} from './resources.ts';
export {
  type AttackPattern,
  type BiomeConfig,
  BiomeConfigSchema,
  type BossConfig,
  BossConfigSchema,
  type BossPhase,
  type ComboHit,
  type CraftingRecipeConfig,
  CraftingRecipeConfigSchema,
  type EnemyConfig,
  EnemyConfigSchema,
  type HubBuildingConfig,
  HubBuildingConfigSchema,
  type LootTableConfig,
  LootTableConfigSchema,
  type NPCConfig,
  NPCConfigSchema,
  type TerrainConfig,
  type WeaponConfig,
  WeaponConfigSchema,
} from './types.ts';
