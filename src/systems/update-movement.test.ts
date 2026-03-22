import { createWorld } from 'koota';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { Movement, Time, Transform } from '../traits';
import { updateMovement } from './update-movement';

describe('updateMovement', () => {
  it('applies velocity to position over dt', () => {
    const world = createWorld(Time);
    world.set(Time, { delta: 1.0, elapsed: 1.0 });

    const entity = world.spawn(
      Transform({ position: new Vector3(0, 0, 0) }),
      Movement({ velocity: new Vector3(5, 0, 0), maxSpeed: 10, damping: 1.0 }),
    );

    updateMovement(world);

    const pos = entity.get(Transform)?.position;
    expect(pos.x).toBeCloseTo(5);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(0);
  });

  it('applies damping to velocity', () => {
    const world = createWorld(Time);
    world.set(Time, { delta: 1.0, elapsed: 1.0 });

    const entity = world.spawn(Transform, Movement({ velocity: new Vector3(10, 0, 0), maxSpeed: 10, damping: 0.5 }));

    updateMovement(world);

    const vel = entity.get(Movement)?.velocity;
    expect(vel.x).toBeCloseTo(5);
  });

  it('zeros out near-zero velocities to prevent drift', () => {
    const world = createWorld(Time);
    world.set(Time, { delta: 1.0, elapsed: 1.0 });

    const entity = world.spawn(
      Transform,
      Movement({ velocity: new Vector3(0.0005, 0, 0.0002), maxSpeed: 10, damping: 1.0 }),
    );

    updateMovement(world);

    const vel = entity.get(Movement)?.velocity;
    expect(vel.x).toBe(0);
    expect(vel.z).toBe(0);
  });

  it('scales movement with delta time', () => {
    const world = createWorld(Time);
    world.set(Time, { delta: 0.016, elapsed: 0.016 });

    const entity = world.spawn(Transform, Movement({ velocity: new Vector3(100, 0, 0), maxSpeed: 100, damping: 1.0 }));

    updateMovement(world);

    const pos = entity.get(Transform)?.position;
    expect(pos.x).toBeCloseTo(1.6);
  });

  it('handles multiple entities', () => {
    const world = createWorld(Time);
    world.set(Time, { delta: 1.0, elapsed: 1.0 });

    const e1 = world.spawn(Transform, Movement({ velocity: new Vector3(1, 0, 0), maxSpeed: 10, damping: 1.0 }));
    const e2 = world.spawn(Transform, Movement({ velocity: new Vector3(0, 0, 2), maxSpeed: 10, damping: 1.0 }));

    updateMovement(world);

    expect(e1.get(Transform)?.position.x).toBeCloseTo(1);
    expect(e2.get(Transform)?.position.z).toBeCloseTo(2);
  });

  it('throws if world is missing Time trait', () => {
    const world = createWorld();
    expect(() => updateMovement(world)).toThrow('world is missing the Time trait');
  });
});
