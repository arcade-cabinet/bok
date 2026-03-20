import { describe, it, expect } from 'vitest';
import { createWorld } from 'koota';
import { Position, Velocity, Health, Transform } from './index';

describe('Core traits', () => {
  it('spawns entity with Position and Velocity', () => {
    const world = createWorld();
    const entity = world.spawn(Position({ x: 5, y: 0, z: 10 }), Velocity());
    expect(entity.get(Position)).toEqual({ x: 5, y: 0, z: 10 });
    expect(entity.get(Velocity)).toEqual({ x: 0, y: 0, z: 0 });
    world.destroy();
  });

  it('spawns entity with Health', () => {
    const world = createWorld();
    const entity = world.spawn(Health({ current: 100, max: 100 }));
    expect(entity.get(Health)).toEqual({ current: 100, max: 100 });
    entity.set(Health, { current: 50, max: 100 });
    expect(entity.get(Health)!.current).toBe(50);
    world.destroy();
  });

  it('queries entities by trait', () => {
    const world = createWorld();
    world.spawn(Position({ x: 0, y: 0, z: 0 }), Velocity());
    world.spawn(Position({ x: 1, y: 0, z: 0 }));
    const moving = world.query(Position, Velocity);
    expect(moving.length).toBe(1);
    world.destroy();
  });
});
