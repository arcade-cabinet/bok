import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { Position, Velocity } from '../../traits/index.ts';
import { MovementSystem } from './MovementSystem.ts';

describe('MovementSystem', () => {
  it('applies velocity to position over dt', () => {
    const world = createWorld();
    const entity = world.spawn(Position, Velocity({ x: 1, y: 0, z: 0 }));
    const system = new MovementSystem();

    system.update(world, 1.0);

    const pos = entity.get(Position)!;
    expect(pos.x).toBeCloseTo(1);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(0);
  });

  it('does not move entity with zero velocity', () => {
    const world = createWorld();
    const entity = world.spawn(Position, Velocity);
    const system = new MovementSystem();

    system.update(world, 1.0);

    const pos = entity.get(Position)!;
    expect(pos.x).toBeCloseTo(0);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(0);
  });

  it('handles negative velocity', () => {
    const world = createWorld();
    const entity = world.spawn(Position, Velocity({ x: -2, y: -1, z: -3 }));
    const system = new MovementSystem();

    system.update(world, 0.5);

    const pos = entity.get(Position)!;
    expect(pos.x).toBeCloseTo(-1);
    expect(pos.y).toBeCloseTo(-0.5);
    expect(pos.z).toBeCloseTo(-1.5);
  });

  it('scales with delta time', () => {
    const world = createWorld();
    const entity = world.spawn(Position, Velocity({ x: 10, y: 0, z: 0 }));
    const system = new MovementSystem();

    system.update(world, 0.016);

    const pos = entity.get(Position)!;
    expect(pos.x).toBeCloseTo(0.16);
  });
});
