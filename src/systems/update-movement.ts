/**
 * @module systems/update-movement
 * @role Apply velocity to position with damping for all entities with Transform + Movement
 */
import type { World } from 'koota';
import { Movement, Time, Transform } from '../traits';

export function updateMovement(world: World): void {
  const time = world.get(Time);
  if (!time) {
    throw new Error('updateMovement: world is missing the Time trait');
  }
  const dt = time.delta;

  world.query(Transform, Movement).updateEach(([transform, movement]) => {
    // Apply velocity to position
    transform.position.x += movement.velocity.x * dt;
    transform.position.y += movement.velocity.y * dt;
    transform.position.z += movement.velocity.z * dt;

    // Apply damping
    movement.velocity.x *= movement.damping;
    movement.velocity.y *= movement.damping;
    movement.velocity.z *= movement.damping;

    // Zero out near-zero velocities to avoid drift
    const threshold = 0.001;
    if (Math.abs(movement.velocity.x) < threshold) movement.velocity.x = 0;
    if (Math.abs(movement.velocity.y) < threshold) movement.velocity.y = 0;
    if (Math.abs(movement.velocity.z) < threshold) movement.velocity.z = 0;
  });
}
