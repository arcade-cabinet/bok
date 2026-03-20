import {
  BiomeConfigSchema, EnemyConfigSchema, WeaponConfigSchema, BossConfigSchema,
  type BiomeConfig, type EnemyConfig, type WeaponConfig, type BossConfig,
} from './types.ts';

// Static imports for all content (Vite resolves JSON imports)
import forestBiome from './biomes/forest.json';
import desertBiome from './biomes/desert.json';
import tundraBiome from './biomes/tundra.json';
import volcanicBiome from './biomes/volcanic.json';
import swampBiome from './biomes/swamp.json';
import crystalCavesBiome from './biomes/crystal-caves.json';
import skyRuinsBiome from './biomes/sky-ruins.json';
import deepOceanBiome from './biomes/deep-ocean.json';
import slimeEnemy from './enemies/slime.json';
import skeletonArcher from './enemies/skeleton-archer.json';
import sandWraith from './enemies/sand-wraith.json';
import scorpion from './enemies/scorpion.json';
import frostWolf from './enemies/frost-wolf.json';
import iceGolem from './enemies/ice-golem.json';
import fireImp from './enemies/fire-imp.json';
import lavaElemental from './enemies/lava-elemental.json';
import swampLurker from './enemies/swamp-lurker.json';
import bogWitch from './enemies/bog-witch.json';
import crystalSentinel from './enemies/crystal-sentinel.json';
import gemSpider from './enemies/gem-spider.json';
import skyHawk from './enemies/sky-hawk.json';
import windElemental from './enemies/wind-elemental.json';
import depthCrawler from './enemies/depth-crawler.json';
import anglerFish from './enemies/angler-fish.json';
import woodenSword from './weapons/wooden-sword.json';
import ironSword from './weapons/iron-sword.json';
import crystalBlade from './weapons/crystal-blade.json';
import volcanicEdge from './weapons/volcanic-edge.json';
import frostCleaver from './weapons/frost-cleaver.json';
import warHammer from './weapons/war-hammer.json';
import battleAxe from './weapons/battle-axe.json';
import twinDaggers from './weapons/twin-daggers.json';
import trident from './weapons/trident.json';
import shortBow from './weapons/short-bow.json';
import crossbow from './weapons/crossbow.json';
import fireStaff from './weapons/fire-staff.json';
import iceWand from './weapons/ice-wand.json';
import lightningRod from './weapons/lightning-rod.json';
import crystalSling from './weapons/crystal-sling.json';
import ancientTreant from './bosses/ancient-treant.json';
import pharaohConstruct from './bosses/pharaoh-construct.json';
import frostWyrm from './bosses/frost-wyrm.json';
import magmaKing from './bosses/magma-king.json';
import mireHag from './bosses/mire-hag.json';
import crystalHydra from './bosses/crystal-hydra.json';
import stormTitan from './bosses/storm-titan.json';
import abyssalLeviathan from './bosses/abyssal-leviathan.json';

export class ContentRegistry {
  readonly #biomes = new Map<string, BiomeConfig>();
  readonly #enemies = new Map<string, EnemyConfig>();
  readonly #weapons = new Map<string, WeaponConfig>();
  readonly #bosses = new Map<string, BossConfig>();

  constructor() {
    this.#registerBiomes([
      forestBiome, desertBiome, tundraBiome, volcanicBiome,
      swampBiome, crystalCavesBiome, skyRuinsBiome, deepOceanBiome,
    ]);
    this.#registerEnemies([
      slimeEnemy, skeletonArcher, sandWraith, scorpion,
      frostWolf, iceGolem, fireImp, lavaElemental,
      swampLurker, bogWitch, crystalSentinel, gemSpider,
      skyHawk, windElemental, depthCrawler, anglerFish,
    ]);
    this.#registerWeapons([
      woodenSword, ironSword, crystalBlade, volcanicEdge, frostCleaver,
      warHammer, battleAxe, twinDaggers, trident,
      shortBow, crossbow, fireStaff, iceWand, lightningRod, crystalSling,
    ]);
    this.#registerBosses([
      ancientTreant, pharaohConstruct, frostWyrm, magmaKing,
      mireHag, crystalHydra, stormTitan, abyssalLeviathan,
    ]);
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

  getAllBiomes(): BiomeConfig[] { return [...this.#biomes.values()]; }
  getAllEnemies(): EnemyConfig[] { return [...this.#enemies.values()]; }
  getAllWeapons(): WeaponConfig[] { return [...this.#weapons.values()]; }
  getAllBosses(): BossConfig[] { return [...this.#bosses.values()]; }
}
