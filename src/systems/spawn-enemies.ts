/**
 * @module systems/spawn-enemies
 * @role Periodically spawn enemies near the player using the EnemySpawner world trait
 *
 * Reads EnemySpawner world trait for interval/max/radius config.
 * Counts current IsEnemy entities. Spawns when count < max and interval elapses.
 */
import type { World } from 'koota';
import { actions } from '../actions';
import { EnemySpawner, IsEnemy, IsPlayer, Time, Transform } from '../traits';

/** Enemy type templates for spawning. */
const ENEMY_TYPES = [
  { type: 'slime', health: 30, damage: 5, speed: 2, modelName: 'Slime' },
  { type: 'skeleton', health: 50, damage: 10, speed: 3, modelName: 'Skeleton' },
  { type: 'bat', health: 20, damage: 8, speed: 4, modelName: 'Bat' },
] as const;

export function spawnEnemies(world: World): void {
  const time = world.get(Time);
  if (!time) {
    throw new Error('spawnEnemies: world is missing the Time trait');
  }
  const dt = time.delta;

  const spawner = world.get(EnemySpawner);
  if (!spawner) {
    throw new Error('spawnEnemies: world is missing the EnemySpawner trait');
  }

  // Accumulate time
  const newAccumulated = spawner.accumulatedTime + dt;

  if (newAccumulated < spawner.interval) {
    world.set(EnemySpawner, { ...spawner, accumulatedTime: newAccumulated });
    return;
  }

  // Reset timer
  world.set(EnemySpawner, { ...spawner, accumulatedTime: 0 });

  // Count existing enemies
  const enemyCount = world.query(IsEnemy).length;
  if (enemyCount >= spawner.maxEnemies) return;

  // Find player position for spawn radius
  const players = world.query(IsPlayer, Transform);
  if (players.length === 0) return;

  const playerTransform = players[0].get(Transform);
  if (!playerTransform) return;

  // Pick a random enemy type
  const template = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];

  // Random position within spawn radius around player
  const angle = Math.random() * Math.PI * 2;
  const distance = spawner.spawnRadius * (0.5 + Math.random() * 0.5);
  const spawnX = playerTransform.position.x + Math.cos(angle) * distance;
  const spawnZ = playerTransform.position.z + Math.sin(angle) * distance;

  actions(world).spawnEnemy({
    type: template.type,
    x: spawnX,
    y: 0,
    z: spawnZ,
    health: template.health,
    damage: template.damage,
    speed: template.speed,
    modelName: template.modelName,
  });
}
