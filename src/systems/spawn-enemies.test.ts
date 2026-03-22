import { createWorld } from 'koota';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { EnemySpawner, IsEnemy, IsPlayer, Movement, Time, Transform } from '../traits';
import { spawnEnemies } from './spawn-enemies';

function createTestWorld() {
  const world = createWorld(Time, EnemySpawner);
  // Set initial time
  world.set(Time, { delta: 0.016, elapsed: 0 });
  return world;
}

function spawnPlayer(world: ReturnType<typeof createWorld>, x = 0, z = 0) {
  return world.spawn(IsPlayer, Transform({ position: new Vector3(x, 0, z) }), Movement);
}

describe('spawnEnemies', () => {
  it('does not spawn before interval elapses', () => {
    const world = createTestWorld();
    spawnPlayer(world);

    // Default interval is 8s, dt is 0.016s
    spawnEnemies(world);

    const enemies = world.query(IsEnemy);
    expect(enemies.length).toBe(0);
  });

  it('spawns an enemy when interval elapses', () => {
    const world = createTestWorld();
    spawnPlayer(world);

    // Set spawner with short interval
    world.set(EnemySpawner, { interval: 1, accumulatedTime: 0, maxEnemies: 12, spawnRadius: 30 });
    world.set(Time, { delta: 1.5, elapsed: 1.5 });

    spawnEnemies(world);

    const enemies = world.query(IsEnemy);
    expect(enemies.length).toBe(1);
  });

  it('respects maxEnemies limit', () => {
    const world = createTestWorld();
    spawnPlayer(world);

    // Set maxEnemies to 1 and short interval
    world.set(EnemySpawner, { interval: 0.1, accumulatedTime: 0, maxEnemies: 1, spawnRadius: 30 });

    // Spawn first enemy
    world.set(Time, { delta: 0.2, elapsed: 0.2 });
    spawnEnemies(world);
    expect(world.query(IsEnemy).length).toBe(1);

    // Try to spawn another — should not
    world.set(Time, { delta: 0.2, elapsed: 0.4 });
    spawnEnemies(world);
    expect(world.query(IsEnemy).length).toBe(1);
  });

  it('does not spawn without a player', () => {
    const world = createTestWorld();

    world.set(EnemySpawner, { interval: 0.1, accumulatedTime: 0, maxEnemies: 12, spawnRadius: 30 });
    world.set(Time, { delta: 0.2, elapsed: 0.2 });

    spawnEnemies(world);

    const enemies = world.query(IsEnemy);
    expect(enemies.length).toBe(0);
  });

  it('throws if world is missing Time trait', () => {
    const world = createWorld(EnemySpawner);
    expect(() => spawnEnemies(world)).toThrow('world is missing the Time trait');
  });

  it('throws if world is missing EnemySpawner trait', () => {
    const world = createWorld(Time);
    world.set(Time, { delta: 0.016, elapsed: 0 });
    expect(() => spawnEnemies(world)).toThrow('world is missing the EnemySpawner trait');
  });
});
