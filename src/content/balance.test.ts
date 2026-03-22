import { describe, expect, it } from 'vitest';
import { ContentRegistry } from './index';
import { TOME_PAGE_CATALOG } from './tomePages';

/** Biome difficulty tiers map biome IDs to expected stat ranges. */
const BIOME_ENEMY_RANGES: Record<string, { hpMin: number; hpMax: number; dmgMin: number; dmgMax: number }> = {
  forest: { hpMin: 20, hpMax: 40, dmgMin: 5, dmgMax: 8 },
  desert: { hpMin: 35, hpMax: 50, dmgMin: 8, dmgMax: 12 },
  tundra: { hpMin: 40, hpMax: 60, dmgMin: 10, dmgMax: 14 },
  volcanic: { hpMin: 50, hpMax: 70, dmgMin: 12, dmgMax: 16 },
  swamp: { hpMin: 45, hpMax: 65, dmgMin: 10, dmgMax: 15 },
  'crystal-caves': { hpMin: 55, hpMax: 75, dmgMin: 14, dmgMax: 18 },
  'sky-ruins': { hpMin: 40, hpMax: 55, dmgMin: 10, dmgMax: 14 },
  'deep-ocean': { hpMin: 60, hpMax: 80, dmgMin: 15, dmgMax: 20 },
};

describe('Content Balance', () => {
  const registry = new ContentRegistry();

  // --- Biome validation ---

  describe('biomes', () => {
    const biomes = registry.getAllBiomes();

    it('has exactly 8 biomes', () => {
      expect(biomes).toHaveLength(8);
    });

    it.each(biomes.map((b) => [b.id, b]))('biome "%s" has required terrain fields', (_id, biome) => {
      expect(biome.terrain.noiseAmplitude).toBeGreaterThan(0);
      expect(biome.terrain.noiseFrequency).toBeGreaterThan(0);
      expect(biome.terrain.baseHeight).toBeGreaterThanOrEqual(0);
      expect(biome.terrain.waterLevel).toBeGreaterThanOrEqual(0);
    });

    it.each(biomes.map((b) => [b.id, b]))('biome "%s" has valid color hex codes', (_id, biome) => {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      expect(biome.skyColor).toMatch(hexRegex);
      expect(biome.fogColor).toMatch(hexRegex);
    });

    it.each(biomes.map((b) => [b.id, b]))('biome "%s" has at least 2 enemies assigned', (_id, biome) => {
      expect(biome.enemies.length).toBeGreaterThanOrEqual(2);
    });

    it.each(biomes.map((b) => [b.id, b]))('biome "%s" has a valid bossId', (_id, biome) => {
      expect(() => registry.getBoss(biome.bossId)).not.toThrow();
    });

    it.each(biomes.map((b) => [b.id, b]))('biome "%s" enemy references exist in registry', (_id, biome) => {
      for (const spawn of biome.enemies) {
        expect(() => registry.getEnemy(spawn.enemyId)).not.toThrow();
      }
    });
  });

  // --- Enemy validation ---

  describe('enemies', () => {
    const enemies = registry.getAllEnemies();

    it('has exactly 16 enemies', () => {
      expect(enemies).toHaveLength(16);
    });

    it.each(enemies.map((e) => [e.id, e]))('enemy "%s" has positive health, speed, damage', (_id, enemy) => {
      expect(enemy.health).toBeGreaterThan(0);
      expect(enemy.speed).toBeGreaterThan(0);
      expect(enemy.damage).toBeGreaterThan(0);
    });

    it.each(enemies.map((e) => [e.id, e]))('enemy "%s" has at least one attack', (_id, enemy) => {
      expect(enemy.attacks.length).toBeGreaterThanOrEqual(1);
    });

    it('enemies fit biome difficulty ranges', () => {
      const biomes = registry.getAllBiomes();
      for (const biome of biomes) {
        const range = BIOME_ENEMY_RANGES[biome.id];
        if (!range) continue;
        for (const spawn of biome.enemies) {
          const enemy = registry.getEnemy(spawn.enemyId);
          expect(
            enemy.health,
            `${enemy.id} health ${enemy.health} not in [${range.hpMin}, ${range.hpMax}] for biome ${biome.id}`,
          ).toBeGreaterThanOrEqual(range.hpMin);
          expect(
            enemy.health,
            `${enemy.id} health ${enemy.health} not in [${range.hpMin}, ${range.hpMax}] for biome ${biome.id}`,
          ).toBeLessThanOrEqual(range.hpMax);
          expect(
            enemy.damage,
            `${enemy.id} damage ${enemy.damage} not in [${range.dmgMin}, ${range.dmgMax}] for biome ${biome.id}`,
          ).toBeGreaterThanOrEqual(range.dmgMin);
          expect(
            enemy.damage,
            `${enemy.id} damage ${enemy.damage} not in [${range.dmgMin}, ${range.dmgMax}] for biome ${biome.id}`,
          ).toBeLessThanOrEqual(range.dmgMax);
        }
      }
    });
  });

  // --- Boss validation ---

  describe('bosses', () => {
    const bosses = registry.getAllBosses();

    it('has exactly 8 bosses', () => {
      expect(bosses).toHaveLength(8);
    });

    it.each(bosses.map((b) => [b.id, b]))('boss "%s" has 3 phases', (_id, boss) => {
      expect(boss.phases).toHaveLength(3);
    });

    it.each(bosses.map((b) => [b.id, b]))('boss "%s" phase thresholds are [1.0, 0.66, 0.33]', (_id, boss) => {
      expect(boss.phases[0].healthThreshold).toBe(1.0);
      expect(boss.phases[1].healthThreshold).toBe(0.66);
      expect(boss.phases[2].healthThreshold).toBe(0.33);
    });

    it.each(bosses.map((b) => [b.id, b]))('boss "%s" HP is in [500, 1500]', (_id, boss) => {
      expect(boss.health).toBeGreaterThanOrEqual(500);
      expect(boss.health).toBeLessThanOrEqual(1500);
    });

    it.each(bosses.map((b) => [b.id, b]))('boss "%s" has a valid tomePageDrop', (_id, boss) => {
      expect(boss.tomePageDrop).toBeTruthy();
      expect(TOME_PAGE_CATALOG).toHaveProperty(boss.tomePageDrop);
    });

    it('all 8 tome abilities are covered by boss drops', () => {
      const tomeAbilities = new Set(bosses.map((b) => b.tomePageDrop));
      const catalogKeys = Object.keys(TOME_PAGE_CATALOG);
      expect(tomeAbilities.size).toBe(catalogKeys.length);
      for (const key of catalogKeys) {
        expect(tomeAbilities.has(key), `Tome ability "${key}" not dropped by any boss`).toBe(true);
      }
    });
  });

  // --- Weapon validation ---

  describe('weapons', () => {
    const weapons = registry.getAllWeapons();

    it('has exactly 15 weapons', () => {
      expect(weapons).toHaveLength(15);
    });

    it.each(weapons.map((w) => [w.id, w]))('weapon "%s" has required fields', (_id, weapon) => {
      expect(weapon.id).toBeTruthy();
      expect(weapon.name).toBeTruthy();
      expect(['melee', 'ranged']).toContain(weapon.type);
      expect(weapon.baseDamage).toBeGreaterThan(0);
      expect(weapon.attackSpeed).toBeGreaterThan(0);
      expect(weapon.range).toBeGreaterThan(0);
      expect(weapon.combo).toHaveLength(3);
    });

    it.each(
      weapons.filter((w) => w.type === 'melee').map((w) => [w.id, w]),
    )('melee weapon "%s" has damage in [8, 25]', (_id, weapon) => {
      expect(weapon.baseDamage).toBeGreaterThanOrEqual(8);
      expect(weapon.baseDamage).toBeLessThanOrEqual(25);
    });

    it.each(
      weapons.filter((w) => w.type === 'melee').map((w) => [w.id, w]),
    )('melee weapon "%s" has speed in [0.5, 1.5]', (_id, weapon) => {
      expect(weapon.attackSpeed).toBeGreaterThanOrEqual(0.5);
      expect(weapon.attackSpeed).toBeLessThanOrEqual(1.5);
    });

    it.each(
      weapons.filter((w) => w.type === 'melee').map((w) => [w.id, w]),
    )('melee weapon "%s" has range in [1.0, 3.0]', (_id, weapon) => {
      expect(weapon.range).toBeGreaterThanOrEqual(1.0);
      expect(weapon.range).toBeLessThanOrEqual(3.0);
    });

    it.each(
      weapons.filter((w) => w.type === 'ranged').map((w) => [w.id, w]),
    )('ranged weapon "%s" has damage in [5, 20]', (_id, weapon) => {
      expect(weapon.baseDamage).toBeGreaterThanOrEqual(5);
      expect(weapon.baseDamage).toBeLessThanOrEqual(20);
    });

    it.each(
      weapons.filter((w) => w.type === 'ranged').map((w) => [w.id, w]),
    )('ranged weapon "%s" has speed in [0.3, 1.0]', (_id, weapon) => {
      expect(weapon.attackSpeed).toBeGreaterThanOrEqual(0.3);
      expect(weapon.attackSpeed).toBeLessThanOrEqual(1.0);
    });

    it.each(
      weapons.filter((w) => w.type === 'ranged').map((w) => [w.id, w]),
    )('ranged weapon "%s" has range in [5.0, 15.0]', (_id, weapon) => {
      expect(weapon.range).toBeGreaterThanOrEqual(5.0);
      expect(weapon.range).toBeLessThanOrEqual(15.0);
    });

    it('weapon damage progression is correct', () => {
      const woodenSword = registry.getWeapon('wooden-sword');
      const ironSword = registry.getWeapon('iron-sword');
      const crystalBlade = registry.getWeapon('crystal-blade');
      const volcanicEdge = registry.getWeapon('volcanic-edge');
      const frostCleaver = registry.getWeapon('frost-cleaver');

      expect(woodenSword.baseDamage).toBe(8);
      expect(ironSword.baseDamage).toBe(12);
      expect(crystalBlade.baseDamage).toBe(18);
      expect(volcanicEdge.baseDamage).toBe(22);
      expect(frostCleaver.baseDamage).toBe(20);

      // Progression: wooden < iron < crystal < volcanic
      expect(woodenSword.baseDamage).toBeLessThan(ironSword.baseDamage);
      expect(ironSword.baseDamage).toBeLessThan(crystalBlade.baseDamage);
      expect(crystalBlade.baseDamage).toBeLessThan(volcanicEdge.baseDamage);
    });
  });
});
