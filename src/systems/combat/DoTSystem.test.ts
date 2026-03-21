import { createWorld, type World } from 'koota';
import { beforeEach, describe, expect, it } from 'vitest';
import { DamageOverTime, Health } from '../../traits/index';
import { dotSystem } from './DoTSystem';

describe('DoTSystem', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
  });

  it('applies damage per tick interval', () => {
    const entity = world.spawn(
      Health({ current: 100, max: 100 }),
      DamageOverTime({ damagePerTick: 5, tickInterval: 1, remainingDuration: 3 }),
    );

    dotSystem(world, 1.0);

    const h = entity.get(Health)!;
    expect(h.current).toBe(95); // 100 - 5
  });

  it('decrements remaining duration', () => {
    const entity = world.spawn(
      Health({ current: 100, max: 100 }),
      DamageOverTime({ damagePerTick: 5, tickInterval: 1, remainingDuration: 3 }),
    );

    dotSystem(world, 0.5);

    const dot = entity.get(DamageOverTime)!;
    expect(dot.remainingDuration).toBeCloseTo(2.5);
  });

  it('removes DamageOverTime when expired', () => {
    const entity = world.spawn(
      Health({ current: 100, max: 100 }),
      DamageOverTime({ damagePerTick: 5, tickInterval: 1, remainingDuration: 0.5 }),
    );

    dotSystem(world, 1.0);

    expect(entity.has(DamageOverTime)).toBe(false);
  });

  it('does not reduce health below 0', () => {
    const entity = world.spawn(
      Health({ current: 2, max: 100 }),
      DamageOverTime({ damagePerTick: 10, tickInterval: 1, remainingDuration: 5 }),
    );

    dotSystem(world, 1.0);

    const h = entity.get(Health)!;
    expect(h.current).toBe(0);
  });

  it('removes trait when remainingDuration is already 0', () => {
    const entity = world.spawn(
      Health({ current: 100, max: 100 }),
      DamageOverTime({ damagePerTick: 5, tickInterval: 1, remainingDuration: 0 }),
    );

    dotSystem(world, 0.016);

    expect(entity.has(DamageOverTime)).toBe(false);
  });
});
