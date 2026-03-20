import {
  BiomeConfigSchema, EnemyConfigSchema, WeaponConfigSchema, BossConfigSchema,
  type BiomeConfig, type EnemyConfig, type WeaponConfig, type BossConfig,
} from './types.ts';

// Static imports for all content (Vite resolves JSON imports)
import forestBiome from './biomes/forest.json';
import slimeEnemy from './enemies/slime.json';
import woodenSword from './weapons/wooden-sword.json';
import ancientTreant from './bosses/ancient-treant.json';

export class ContentRegistry {
  readonly #biomes = new Map<string, BiomeConfig>();
  readonly #enemies = new Map<string, EnemyConfig>();
  readonly #weapons = new Map<string, WeaponConfig>();
  readonly #bosses = new Map<string, BossConfig>();

  constructor() {
    this.#registerBiomes([forestBiome]);
    this.#registerEnemies([slimeEnemy]);
    this.#registerWeapons([woodenSword]);
    this.#registerBosses([ancientTreant]);
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
