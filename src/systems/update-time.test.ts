import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { Time } from '../traits';
import { updateTime } from './update-time';

describe('updateTime', () => {
  it('sets delta and accumulates elapsed time', () => {
    const world = createWorld(Time);

    updateTime(world, 0.016);

    const time = world.get(Time);
    expect(time).toBeDefined();
    expect(time?.delta).toBeCloseTo(0.016);
    expect(time?.elapsed).toBeCloseTo(0.016);

    updateTime(world, 0.016);

    const time2 = world.get(Time);
    expect(time2?.delta).toBeCloseTo(0.016);
    expect(time2?.elapsed).toBeCloseTo(0.032);
  });

  it('handles large delta values', () => {
    const world = createWorld(Time);

    updateTime(world, 1.0);

    const time = world.get(Time);
    expect(time?.delta).toBeCloseTo(1.0);
    expect(time?.elapsed).toBeCloseTo(1.0);
  });

  it('handles zero delta', () => {
    const world = createWorld(Time);

    updateTime(world, 0);

    const time = world.get(Time);
    expect(time?.delta).toBe(0);
    expect(time?.elapsed).toBe(0);
  });

  it('throws if world is missing Time trait', () => {
    const world = createWorld();

    expect(() => updateTime(world, 0.016)).toThrow('world is missing the Time trait');
  });
});
