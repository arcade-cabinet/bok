import type { World } from 'koota';
import { DamageOverTime, Health } from '../../traits/index';

/**
 * Ticks damage-over-time effects.
 * Applies damage per tickInterval, decrements remainingDuration,
 * removes the DamageOverTime trait when expired.
 */
export function dotSystem(world: World, dt: number): void {
  const entities = world.query(DamageOverTime, Health);

  for (const entity of entities) {
    const dot = entity.get(DamageOverTime)!;
    if (dot.remainingDuration <= 0) {
      entity.remove(DamageOverTime);
      continue;
    }

    const newDuration = dot.remainingDuration - dt;

    // Calculate how many ticks occurred in this frame
    // We track progress by checking if we've crossed a tick boundary
    const prevElapsed = dot.remainingDuration - newDuration;
    if (prevElapsed >= dot.tickInterval || newDuration <= 0) {
      // Apply one tick of damage
      const health = entity.get(Health)!;
      entity.set(Health, {
        current: Math.max(0, health.current - dot.damagePerTick),
        max: health.max,
      });
    }

    if (newDuration <= 0) {
      entity.remove(DamageOverTime);
    } else {
      entity.set(DamageOverTime, {
        damagePerTick: dot.damagePerTick,
        tickInterval: dot.tickInterval,
        remainingDuration: newDuration,
      });
    }
  }
}
