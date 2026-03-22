/**
 * @module systems/update-enemy-ai
 * @role Update Yuka AI vehicles for all enemy entities, write positions back to Transform
 *
 * Queries (IsEnemy, Transform, AIState, YukaRef) and updates Yuka vehicle positions.
 * Enemies chase the player when within detection range, wander when far, stop when very close.
 */
import type { World } from 'koota';
import type { Vehicle } from 'yuka';
import { AIState, IsEnemy, IsPlayer, Time, Transform, YukaRef } from '../traits';

const CHASE_RANGE = 15;
const STOP_RANGE = 1.5;
const CHASE_SPEED = 2;
const WANDER_SPEED = 0.5;

export function updateEnemyAI(world: World): void {
  const time = world.get(Time);
  if (!time) {
    throw new Error('updateEnemyAI: world is missing the Time trait');
  }
  const dt = time.delta;

  // Find the player position
  const players = world.query(IsPlayer, Transform);
  if (players.length === 0) return;

  const playerTransform = players[0].get(Transform);
  if (!playerTransform) return;
  const playerPos = playerTransform.position;

  // Update all enemies
  const enemies = world.query(IsEnemy, Transform, AIState, YukaRef);
  for (const enemy of enemies) {
    const transform = enemy.get(Transform);
    const aiState = enemy.get(AIState);
    const yukaRef = enemy.get(YukaRef) as Vehicle | null;
    if (!transform || !aiState || !yukaRef) continue;

    const dx = playerPos.x - transform.position.x;
    const dz = playerPos.z - transform.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Update AI state and Yuka vehicle velocity
    if (dist < STOP_RANGE) {
      // Too close — stop
      yukaRef.velocity.set(0, 0, 0);
      if (aiState.state !== 'attack') {
        enemy.set(AIState, { state: 'attack' });
      }
    } else if (dist < CHASE_RANGE) {
      // Chase the player
      const nx = dx / dist;
      const nz = dz / dist;
      yukaRef.velocity.set(nx * CHASE_SPEED, 0, nz * CHASE_SPEED);
      if (aiState.state !== 'chase') {
        enemy.set(AIState, { state: 'chase' });
      }
    } else {
      // Wander randomly
      yukaRef.velocity.set((Math.random() - 0.5) * WANDER_SPEED, 0, (Math.random() - 0.5) * WANDER_SPEED);
      if (aiState.state !== 'patrol') {
        enemy.set(AIState, { state: 'patrol' });
      }
    }

    // Write Yuka vehicle position back to Transform
    // Yuka updates its own position via vehicle.update(); we sync from vehicle -> ECS
    transform.position.x += yukaRef.velocity.x * dt;
    transform.position.z += yukaRef.velocity.z * dt;

    // Sync vehicle position to match
    yukaRef.position.set(transform.position.x, transform.position.y, transform.position.z);
  }
}
