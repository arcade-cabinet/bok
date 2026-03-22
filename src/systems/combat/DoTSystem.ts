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
    const dot = entity.get(DamageOverTime);
    if (!dot) continue;
    if (dot.remainingDuration <= 0) {
      entity.remove(DamageOverTime);
      continue;
    }

    const newDuration = dot.remainingDuration - dt;

    // Calculate how many tick boundaries were crossed this frame
    const prevBuckets = Math.floor(dot.remainingDuration / dot.tickInterval);
    const newBuckets = Math.floor(Math.max(newDuration, 0) / dot.tickInterval);
    const ticksToApply = prevBuckets - newBuckets;

    if (ticksToApply > 0) {
      const health = entity.get(Health);
      if (!health) continue;
      const totalDamage = dot.damagePerTick * ticksToApply;
      entity.set(Health, {
        current: Math.max(0, health.current - totalDamage),
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
