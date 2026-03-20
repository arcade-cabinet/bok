import { describe, it, expect } from 'vitest';
import { EnemySpawner, type SpawnedEnemy } from './EnemySpawner.ts';
import type { EnemySpawn } from '../../generation/EnemyPlacer.ts';
import type { EnemyConfig } from '../../content/types.ts';

const SLIME_CONFIG: EnemyConfig = {
  id: 'slime',
  name: 'Slime',
  health: 30,
  speed: 2,
  damage: 5,
  attackPattern: 'melee_simple',
  attacks: [{ name: 'Tackle', type: 'melee', damage: 5, cooldown: 1.5, range: 1.5, telegraph: 0.3 }],
  drops: [{ itemId: 'slime-gel', chance: 0.5, minAmount: 1, maxAmount: 2 }],
};

describe('EnemySpawner', () => {
  it('creates spawned enemies from spawn points', () => {
    const spawns: EnemySpawn[] = [
      { position: { x: 10, y: 5, z: 20 }, enemyId: 'slime' },
      { position: { x: 30, y: 8, z: 15 }, enemyId: 'slime' },
    ];
    const configs = new Map<string, EnemyConfig>([['slime', SLIME_CONFIG]]);

    const result = EnemySpawner.spawn(spawns, configs);
    expect(result).toHaveLength(2);
  });

  it('spawned enemy has correct position', () => {
    const spawns: EnemySpawn[] = [
      { position: { x: 10, y: 5, z: 20 }, enemyId: 'slime' },
    ];
    const configs = new Map<string, EnemyConfig>([['slime', SLIME_CONFIG]]);

    const [enemy] = EnemySpawner.spawn(spawns, configs);
    expect(enemy.position).toEqual({ x: 10, y: 5, z: 20 });
  });

  it('spawned enemy carries trait data from config', () => {
    const spawns: EnemySpawn[] = [
      { position: { x: 10, y: 5, z: 20 }, enemyId: 'slime' },
    ];
    const configs = new Map<string, EnemyConfig>([['slime', SLIME_CONFIG]]);

    const [enemy] = EnemySpawner.spawn(spawns, configs);
    expect(enemy.health).toBe(30);
    expect(enemy.speed).toBe(2);
    expect(enemy.configId).toBe('slime');
  });

  it('skips enemies with unknown config', () => {
    const spawns: EnemySpawn[] = [
      { position: { x: 10, y: 5, z: 20 }, enemyId: 'unknown-monster' },
    ];
    const configs = new Map<string, EnemyConfig>();

    const result = EnemySpawner.spawn(spawns, configs);
    expect(result).toHaveLength(0);
  });
});
