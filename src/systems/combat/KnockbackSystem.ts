import type { World } from 'koota';
import { Knockback, Velocity } from '../../traits/index';

/**
 * Applies knockback force to velocity, then zeroes knockback.
 */
export function knockbackSystem(world: World): void {
  const entities = world.query(Knockback, Velocity);

  for (const entity of entities) {
    const kb = entity.get(Knockback);
    if (!kb || (kb.x === 0 && kb.y === 0 && kb.z === 0)) continue;

    const vel = entity.get(Velocity);
    if (!vel) continue;
    entity.set(Velocity, {
      x: vel.x + kb.x,
      y: vel.y + kb.y,
      z: vel.z + kb.z,
    });

    entity.set(Knockback, { x: 0, y: 0, z: 0 });
  }
}
