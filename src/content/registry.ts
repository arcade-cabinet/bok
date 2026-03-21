import crystalCavesBiome from './biomes/crystal-caves.json';
import deepOceanBiome from './biomes/deep-ocean.json';
import desertBiome from './biomes/desert.json';
// Static imports for all content (Vite resolves JSON imports)
import forestBiome from './biomes/forest.json';
import skyRuinsBiome from './biomes/sky-ruins.json';
import swampBiome from './biomes/swamp.json';
import tundraBiome from './biomes/tundra.json';
import volcanicBiome from './biomes/volcanic.json';
import abyssalLeviathan from './bosses/abyssal-leviathan.json';
import ancientTreant from './bosses/ancient-treant.json';
import crystalHydra from './bosses/crystal-hydra.json';
import frostWyrm from './bosses/frost-wyrm.json';
import magmaKing from './bosses/magma-king.json';
import mireHag from './bosses/mire-hag.json';
import pharaohConstruct from './bosses/pharaoh-construct.json';
import stormTitan from './bosses/storm-titan.json';
import anglerFish from './enemies/angler-fish.json';
import bogWitch from './enemies/bog-witch.json';
import crystalSentinel from './enemies/crystal-sentinel.json';
import depthCrawler from './enemies/depth-crawler.json';
import fireImp from './enemies/fire-imp.json';
import frostWolf from './enemies/frost-wolf.json';
import gemSpider from './enemies/gem-spider.json';
import iceGolem from './enemies/ice-golem.json';
import lavaElemental from './enemies/lava-elemental.json';
import sandWraith from './enemies/sand-wraith.json';
import scorpion from './enemies/scorpion.json';
import skeletonArcher from './enemies/skeleton-archer.json';
import skyHawk from './enemies/sky-hawk.json';
import slimeEnemy from './enemies/slime.json';
import swampLurker from './enemies/swamp-lurker.json';
import windElemental from './enemies/wind-elemental.json';
import hubBuildings from './hub/buildings.json';
import hubNpcs from './hub/npcs.json';
import craftingRecipes from './items/crafting-recipes.json';
import lootTables from './items/loot-tables.json';
import {
  type BiomeConfig,
  BiomeConfigSchema,
  type BossConfig,
  BossConfigSchema,
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
  type WeaponConfig,
  WeaponConfigSchema,
} from './types.ts';
import battleAxe from './weapons/battle-axe.json';
import crossbow from './weapons/crossbow.json';
import crystalBlade from './weapons/crystal-blade.json';
import crystalSling from './weapons/crystal-sling.json';
import fireStaff from './weapons/fire-staff.json';
import frostCleaver from './weapons/frost-cleaver.json';
import iceWand from './weapons/ice-wand.json';
import ironSword from './weapons/iron-sword.json';
import lightningRod from './weapons/lightning-rod.json';
import shortBow from './weapons/short-bow.json';
import trident from './weapons/trident.json';
import twinDaggers from './weapons/twin-daggers.json';
import volcanicEdge from './weapons/volcanic-edge.json';
import warHammer from './weapons/war-hammer.json';
import woodenSword from './weapons/wooden-sword.json';

export class ContentRegistry {
  readonly #biomes = new Map<string, BiomeConfig>();
  readonly #enemies = new Map<string, EnemyConfig>();
  readonly #weapons = new Map<string, WeaponConfig>();
  readonly #bosses = new Map<string, BossConfig>();
  readonly #buildings = new Map<string, HubBuildingConfig>();
  readonly #npcs = new Map<string, NPCConfig>();
  readonly #craftingRecipes = new Map<string, CraftingRecipeConfig>();
  #lootTables: LootTableConfig | null = null;

  constructor() {
    this.#registerBiomes([
      forestBiome,
      desertBiome,
      tundraBiome,
      volcanicBiome,
      swampBiome,
      crystalCavesBiome,
      skyRuinsBiome,
      deepOceanBiome,
    ]);
    this.#registerEnemies([
      slimeEnemy,
      skeletonArcher,
      sandWraith,
      scorpion,
      frostWolf,
      iceGolem,
      fireImp,
      lavaElemental,
      swampLurker,
      bogWitch,
      crystalSentinel,
      gemSpider,
      skyHawk,
      windElemental,
      depthCrawler,
      anglerFish,
    ]);
    this.#registerWeapons([
      woodenSword,
      ironSword,
      crystalBlade,
      volcanicEdge,
      frostCleaver,
      warHammer,
      battleAxe,
      twinDaggers,
      trident,
      shortBow,
      crossbow,
      fireStaff,
      iceWand,
      lightningRod,
      crystalSling,
    ]);
    this.#registerBosses([
      ancientTreant,
      pharaohConstruct,
      frostWyrm,
      magmaKing,
      mireHag,
      crystalHydra,
      stormTitan,
      abyssalLeviathan,
    ]);
    this.#registerBuildings(hubBuildings);
    this.#registerNPCs(hubNpcs);
    this.#lootTables = LootTableConfigSchema.parse(lootTables);
    this.#registerCraftingRecipes(craftingRecipes);
  }

  #registerBiomes(raw: unknown[]): void {
    for (const data of raw) {
      const config = BiomeConfigSchema.parse(data);
      this.#biomes.set(config.id, config);
    }
  }

  #registerEnemies(raw: unknown[]): void {
    for (const data of raw) {
      const config = EnemyConfigSchema.parse(data);
      this.#enemies.set(config.id, config);
    }
  }

  #registerWeapons(raw: unknown[]): void {
    for (const data of raw) {
      const config = WeaponConfigSchema.parse(data);
      this.#weapons.set(config.id, config);
    }
  }

  #registerBosses(raw: unknown[]): void {
    for (const data of raw) {
      const config = BossConfigSchema.parse(data);
      this.#bosses.set(config.id, config);
    }
  }

  #registerBuildings(raw: unknown[]): void {
    for (const data of raw) {
      const config = HubBuildingConfigSchema.parse(data);
      this.#buildings.set(config.id, config);
    }
  }

  #registerNPCs(raw: unknown[]): void {
    for (const data of raw) {
      const config = NPCConfigSchema.parse(data);
      this.#npcs.set(config.id, config);
    }
  }

  #registerCraftingRecipes(raw: unknown[]): void {
    for (const data of raw) {
      const config = CraftingRecipeConfigSchema.parse(data);
      this.#craftingRecipes.set(config.id, config);
    }
  }

  getBiome(id: string): BiomeConfig {
    const config = this.#biomes.get(id);
    if (!config) throw new Error(`Unknown biome: ${id}`);
    return config;
  }

  getEnemy(id: string): EnemyConfig {
    const config = this.#enemies.get(id);
    if (!config) throw new Error(`Unknown enemy: ${id}`);
    return config;
  }

  getWeapon(id: string): WeaponConfig {
    const config = this.#weapons.get(id);
    if (!config) throw new Error(`Unknown weapon: ${id}`);
    return config;
  }

  getBoss(id: string): BossConfig {
    const config = this.#bosses.get(id);
    if (!config) throw new Error(`Unknown boss: ${id}`);
    return config;
  }

  getBuilding(id: string): HubBuildingConfig {
    const config = this.#buildings.get(id);
    if (!config) throw new Error(`Unknown building: ${id}`);
    return config;
  }

  getNPC(id: string): NPCConfig {
    const config = this.#npcs.get(id);
    if (!config) throw new Error(`Unknown NPC: ${id}`);
    return config;
  }

  getLootTables(): LootTableConfig {
    if (!this.#lootTables) throw new Error('Loot tables not loaded');
    return this.#lootTables;
  }

  getCraftingRecipe(id: string): CraftingRecipeConfig {
    const config = this.#craftingRecipes.get(id);
    if (!config) throw new Error(`Unknown crafting recipe: ${id}`);
    return config;
  }

  getAllBiomes(): BiomeConfig[] {
    return [...this.#biomes.values()];
  }
  getAllEnemies(): EnemyConfig[] {
    return [...this.#enemies.values()];
  }
  getAllWeapons(): WeaponConfig[] {
    return [...this.#weapons.values()];
  }
  getAllBosses(): BossConfig[] {
    return [...this.#bosses.values()];
  }
  getAllBuildings(): HubBuildingConfig[] {
    return [...this.#buildings.values()];
  }
  getAllNPCs(): NPCConfig[] {
    return [...this.#npcs.values()];
  }
  getAllCraftingRecipes(): CraftingRecipeConfig[] {
    return [...this.#craftingRecipes.values()];
  }
}
