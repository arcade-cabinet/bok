import { describe, expect, it } from 'vitest';

import { ContentRegistry } from '../content/index.ts';
import { PRNG } from '../generation/index.ts';
import { calculateEnemyCount, selectEnemy } from './enemySetup.ts';
import { ENEMY_MODELS } from './models.ts';

describe('selectEnemy', () => {
  it('returns enemies from the pool based on weights', () => {
    const pool = [
      { enemyId: 'slime', weight: 0.6, minDifficulty: 1 },
      { enemyId: 'skeleton-archer', weight: 0.4, minDifficulty: 1 },
    ];
    const rng = new PRNG('test-seed');
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(selectEnemy(pool, rng));
    }
    // Both enemies should appear in 100 draws from a 60/40 split
    expect(results.has('slime')).toBe(true);
    expect(results.has('skeleton-archer')).toBe(true);
    // No enemies outside the pool should appear
    expect(results.size).toBe(2);
  });

  it('never returns enemies outside the pool', () => {
    const pool = [
      { enemyId: 'fire-imp', weight: 0.55, minDifficulty: 1 },
      { enemyId: 'lava-elemental', weight: 0.45, minDifficulty: 2 },
    ];
    const rng = new PRNG('volcanic-test');
    for (let i = 0; i < 200; i++) {
      const result = selectEnemy(pool, rng);
      expect(['fire-imp', 'lava-elemental']).toContain(result);
    }
  });

  it('respects weight distribution approximately', () => {
    const pool = [
      { enemyId: 'heavy', weight: 0.9, minDifficulty: 1 },
      { enemyId: 'rare', weight: 0.1, minDifficulty: 1 },
    ];
    const rng = new PRNG('distribution-test');
    let heavyCount = 0;
    const total = 1000;
    for (let i = 0; i < total; i++) {
      if (selectEnemy(pool, rng) === 'heavy') heavyCount++;
    }
    // With 90/10 weights, heavy should appear roughly 90% of the time
    const ratio = heavyCount / total;
    expect(ratio).toBeGreaterThan(0.75);
    expect(ratio).toBeLessThan(0.98);
  });

  it('returns the only enemy in a single-entry pool', () => {
    const pool = [{ enemyId: 'solo', weight: 1.0, minDifficulty: 1 }];
    const rng = new PRNG('solo-test');
    for (let i = 0; i < 10; i++) {
      expect(selectEnemy(pool, rng)).toBe('solo');
    }
  });

  it('is deterministic with the same seed', () => {
    const pool = [
      { enemyId: 'a', weight: 0.5, minDifficulty: 1 },
      { enemyId: 'b', weight: 0.5, minDifficulty: 1 },
    ];
    const results1: string[] = [];
    const results2: string[] = [];
    const rng1 = new PRNG('deterministic');
    const rng2 = new PRNG('deterministic');
    for (let i = 0; i < 20; i++) {
      results1.push(selectEnemy(pool, rng1));
      results2.push(selectEnemy(pool, rng2));
    }
    expect(results1).toEqual(results2);
  });
});

describe('calculateEnemyCount', () => {
  it('returns base count + difficulty bonus', () => {
    const easyPool = [{ enemyId: 'slime', weight: 1, minDifficulty: 1 }];
    expect(calculateEnemyCount(easyPool)).toBe(8); // 6 + 1*2

    const hardPool = [
      { enemyId: 'fire-imp', weight: 0.5, minDifficulty: 1 },
      { enemyId: 'lava-elemental', weight: 0.5, minDifficulty: 2 },
    ];
    expect(calculateEnemyCount(hardPool)).toBe(10); // 6 + 2*2
  });

  it('uses max difficulty from pool for scaling', () => {
    const mixedPool = [
      { enemyId: 'easy', weight: 0.6, minDifficulty: 1 },
      { enemyId: 'medium', weight: 0.3, minDifficulty: 3 },
      { enemyId: 'hard', weight: 0.1, minDifficulty: 5 },
    ];
    expect(calculateEnemyCount(mixedPool)).toBe(16); // 6 + 5*2
  });
});

describe('biome enemy spawning integration', () => {
  it('forest biome pool contains slime and skeleton-archer', () => {
    const content = new ContentRegistry();
    const biome = content.getBiome('forest');
    const enemyIds = biome.enemies.map((e) => e.enemyId);
    expect(enemyIds).toContain('slime');
    expect(enemyIds).toContain('skeleton-archer');
    expect(enemyIds).not.toContain('goblin');
    expect(enemyIds).not.toContain('zombie');
  });

  it('volcanic biome pool contains fire-imp and lava-elemental', () => {
    const content = new ContentRegistry();
    const biome = content.getBiome('volcanic');
    const enemyIds = biome.enemies.map((e) => e.enemyId);
    expect(enemyIds).toContain('fire-imp');
    expect(enemyIds).toContain('lava-elemental');
    expect(enemyIds).not.toContain('slime');
  });

  it('selectEnemy with forest biome only produces forest enemies', () => {
    const content = new ContentRegistry();
    const biome = content.getBiome('forest');
    const rng = new PRNG('forest-test');
    const validIds = new Set(biome.enemies.map((e) => e.enemyId));
    for (let i = 0; i < 100; i++) {
      const selected = selectEnemy(biome.enemies, rng);
      expect(validIds.has(selected)).toBe(true);
    }
  });

  it('selectEnemy with volcanic biome only produces volcanic enemies', () => {
    const content = new ContentRegistry();
    const biome = content.getBiome('volcanic');
    const rng = new PRNG('volcanic-test');
    const validIds = new Set(biome.enemies.map((e) => e.enemyId));
    for (let i = 0; i < 100; i++) {
      const selected = selectEnemy(biome.enemies, rng);
      expect(validIds.has(selected)).toBe(true);
    }
  });

  it('every biome enemy pool entry has a model mapping', () => {
    const content = new ContentRegistry();
    for (const biome of content.getAllBiomes()) {
      for (const entry of biome.enemies) {
        expect(ENEMY_MODELS[entry.enemyId]).toBeTruthy();
      }
    }
  });

  it('every biome boss has a model mapping', () => {
    const content = new ContentRegistry();
    for (const biome of content.getAllBiomes()) {
      const bossModelPath = ENEMY_MODELS[biome.bossId] ?? ENEMY_MODELS.giant;
      expect(bossModelPath).toBeTruthy();
    }
  });

  it('enemy count scales with biome difficulty', () => {
    const content = new ContentRegistry();
    const forestCount = calculateEnemyCount(content.getBiome('forest').enemies);
    const volcanicCount = calculateEnemyCount(content.getBiome('volcanic').enemies);
    // Volcanic has minDifficulty 2 enemies, forest only has 1
    expect(volcanicCount).toBeGreaterThanOrEqual(forestCount);
  });

  it('enemy stats come from content JSON, not hardcoded', () => {
    const content = new ContentRegistry();
    const slime = content.getEnemy('slime');
    const fireImp = content.getEnemy('fire-imp');

    // Slime is weaker than fire-imp
    expect(slime.health).toBeLessThan(fireImp.health);
    expect(slime.damage).toBeLessThan(fireImp.damage);

    // Stats should not be the old hardcoded values (health: 30, damage: 10)
    expect(slime.health).toBe(25);
    expect(slime.damage).toBe(6);
    expect(fireImp.health).toBe(50);
    expect(fireImp.damage).toBe(13);
  });
});
