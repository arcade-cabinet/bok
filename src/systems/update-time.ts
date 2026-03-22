/**
 * @module systems/update-time
 * @role Write frame delta and elapsed time into the world-level Time trait
 */
import type { World } from 'koota';
import { Time } from '../traits';

export function updateTime(world: World, dt: number): void {
  const prev = world.get(Time);
  if (!prev) {
    throw new Error('updateTime: world is missing the Time trait');
  }
  world.set(Time, { delta: dt, elapsed: prev.elapsed + dt });
}
