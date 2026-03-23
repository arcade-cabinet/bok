/**
 * @module engine/koota-integration.test
 * @role Verify Koota ECS world initialization, entity spawning, and frameloop execution
 *
 * These tests validate that the Koota migration (T4) correctly:
 * 1. Initializes the world singleton with expected traits
 * 2. Spawns entities via actions with correct trait composition
 * 3. Runs the frameloop without errors
 * 4. Keeps enemy entities with Ref and YukaRef traits
 */
import { createWorld } from 'koota';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { actions } from '../actions';
import { runFrame } from '../frameloop';
import {
  ContactDamage,
  EnemySpawner,
  GameModeState,
  GoalState,
  Health,
  IsEnemy,
  IsPlayer,
  Movement,
  Ref,
  Time,
  Transform,
  YukaRef,
} from '../traits';

/**
 * Create a test world matching the singleton's trait composition.
 * Uses the same world-level traits as src/world.ts.
 */
function createTestWorld() {
  return createWorld(Time, GameModeState, GoalState, EnemySpawner);
}

describe('Koota world initialization', () => {
  it('sets GameModeState on the world', () => {
    const world = createTestWorld();
    world.set(GameModeState, { mode: 'survival' });

    const state = world.get(GameModeState);
    expect(state).toBeDefined();
    expect(state?.mode).toBe('survival');

    world.destroy();
  });

  it('supports creative mode', () => {
    const world = createTestWorld();
    world.set(GameModeState, { mode: 'creative' });

    const state = world.get(GameModeState);
    expect(state?.mode).toBe('creative');

    world.destroy();
  });

  it('has Time trait with default values', () => {
    const world = createTestWorld();

    const time = world.get(Time);
    expect(time).toBeDefined();
    expect(time?.delta).toBe(0);
    expect(time?.elapsed).toBe(0);

    world.destroy();
  });

  it('has GoalState trait with default values', () => {
    const world = createTestWorld();

    const goals = world.get(GoalState);
    expect(goals).toBeDefined();
    expect(goals?.kills).toBe(0);
    expect(goals?.bossUnlocked).toBe(false);

    world.destroy();
  });

  it('has EnemySpawner trait with default values', () => {
    const world = createTestWorld();

    const spawner = world.get(EnemySpawner);
    expect(spawner).toBeDefined();
    expect(spawner?.interval).toBe(8);
    expect(spawner?.maxEnemies).toBe(12);

    world.destroy();
  });
});

describe('actions.spawnEnemy creates entities with correct traits', () => {
  it('spawns an enemy with all required traits', () => {
    const world = createTestWorld();

    const { spawnEnemy } = actions(world);
    const entity = spawnEnemy({
      type: 'skeleton',
      x: 10,
      y: 5,
      z: 15,
      health: 50,
      damage: 10,
      speed: 3,
      modelName: 'Skeleton',
    });

    expect(entity.has(IsEnemy)).toBe(true);
    expect(entity.has(Transform)).toBe(true);
    expect(entity.has(Health)).toBe(true);
    expect(entity.has(Movement)).toBe(true);
    expect(entity.has(ContactDamage)).toBe(true);
    expect(entity.has(Ref)).toBe(true);
    expect(entity.has(YukaRef)).toBe(true);

    const health = entity.get(Health);
    expect(health?.current).toBe(50);
    expect(health?.max).toBe(50);

    const transform = entity.get(Transform);
    expect(transform?.position.x).toBe(10);
    expect(transform?.position.y).toBe(5);
    expect(transform?.position.z).toBe(15);

    const contact = entity.get(ContactDamage);
    expect(contact?.damage).toBe(10);

    world.destroy();
  });

  it('spawns multiple enemies queryable by IsEnemy', () => {
    const world = createTestWorld();

    const { spawnEnemy } = actions(world);
    spawnEnemy({ type: 'slime', x: 0, y: 0, z: 0, health: 30, damage: 5, speed: 2, modelName: 'Slime' });
    spawnEnemy({ type: 'skeleton', x: 5, y: 0, z: 5, health: 50, damage: 10, speed: 3, modelName: 'Skeleton' });
    spawnEnemy({ type: 'bat', x: 10, y: 5, z: 10, health: 20, damage: 8, speed: 4, modelName: 'Bat' });

    const enemies = world.query(IsEnemy);
    expect(enemies.length).toBe(3);

    world.destroy();
  });
});

describe('actions.spawnPlayer creates player entity', () => {
  it('spawns a player entity with IsPlayer and Transform', () => {
    const world = createTestWorld();

    const { spawnPlayer } = actions(world);
    const player = spawnPlayer(5, 10);

    expect(player.has(IsPlayer)).toBe(true);
    expect(player.has(Transform)).toBe(true);
    expect(player.has(Health)).toBe(true);

    const transform = player.get(Transform);
    expect(transform?.position.x).toBe(5);
    expect(transform?.position.z).toBe(10);

    world.destroy();
  });
});

describe('frameloop runs without errors', () => {
  it('runs a single frame with empty world', () => {
    const world = createTestWorld();

    // Should not throw even with no entities
    expect(() => runFrame(world, 0.016)).not.toThrow();

    const time = world.get(Time);
    expect(time?.delta).toBeCloseTo(0.016);
    expect(time?.elapsed).toBeCloseTo(0.016);

    world.destroy();
  });

  it('runs multiple frames accumulating time', () => {
    const world = createTestWorld();

    runFrame(world, 0.016);
    runFrame(world, 0.016);
    runFrame(world, 0.016);

    const time = world.get(Time);
    expect(time?.elapsed).toBeCloseTo(0.048);

    world.destroy();
  });

  it('runs with player and enemies present', () => {
    const world = createTestWorld();

    const { spawnPlayer, spawnEnemy } = actions(world);
    spawnPlayer(0, 0);
    spawnEnemy({ type: 'slime', x: 5, y: 0, z: 5, health: 30, damage: 5, speed: 2, modelName: 'Slime' });

    // Should not throw with entities present
    expect(() => runFrame(world, 0.016)).not.toThrow();

    world.destroy();
  });

  it('updateGoals tracks enemy kills when health reaches zero', () => {
    const world = createTestWorld();

    const { spawnPlayer, spawnEnemy } = actions(world);
    spawnPlayer(0, 0);
    const enemy = spawnEnemy({ type: 'slime', x: 5, y: 0, z: 5, health: 30, damage: 5, speed: 2, modelName: 'Slime' });

    // Kill the enemy
    enemy.set(Health, { current: 0, max: 30 });

    // Run frame to process goals
    runFrame(world, 0.016);

    const goals = world.get(GoalState);
    expect(goals?.kills).toBe(1);

    world.destroy();
  });
});

describe('Ref and YukaRef traits hold references', () => {
  it('stores a Three.js Object3D in Ref', () => {
    const world = createTestWorld();

    const { spawnEnemy } = actions(world);
    const entity = spawnEnemy({
      type: 'skeleton',
      x: 0,
      y: 0,
      z: 0,
      health: 50,
      damage: 10,
      speed: 3,
      modelName: 'Skeleton',
    });

    // Default Ref is null
    expect(entity.get(Ref)).toBeNull();

    // Set a mock Object3D (cast for test — real game uses actual Object3D)
    const mockObject3D = { position: new Vector3(1, 2, 3) } as unknown as import('three').Object3D;
    entity.set(Ref, mockObject3D);
    expect(entity.get(Ref)).toBe(mockObject3D);

    world.destroy();
  });

  it('stores a Yuka Vehicle in YukaRef', () => {
    const world = createTestWorld();

    const { spawnEnemy } = actions(world);
    const entity = spawnEnemy({
      type: 'skeleton',
      x: 0,
      y: 0,
      z: 0,
      health: 50,
      damage: 10,
      speed: 3,
      modelName: 'Skeleton',
    });

    // Default YukaRef is null
    expect(entity.get(YukaRef)).toBeNull();

    // Set a mock vehicle
    const mockVehicle = { position: { x: 1, y: 2, z: 3 }, velocity: { x: 0, y: 0, z: 0 } };
    entity.set(YukaRef, mockVehicle);
    expect(entity.get(YukaRef)).toBe(mockVehicle);

    world.destroy();
  });
});
