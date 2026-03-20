import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, type World } from 'koota';
import { Stamina, MovementIntent } from '../../traits/index';
import { staminaSystem } from './StaminaSystem';

describe('StaminaSystem', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld(MovementIntent);
  });

  it('regenerates stamina when not sprinting', () => {
    const entity = world.spawn(
      Stamina({ current: 50, max: 100, regenRate: 20 }),
    );
    world.set(MovementIntent, { dirX: 0, dirZ: 1, sprint: false, jump: false });

    staminaSystem(world, 1.0);

    const s = entity.get(Stamina)!;
    expect(s.current).toBe(70); // 50 + 20*1.0
  });

  it('drains stamina while sprinting', () => {
    const entity = world.spawn(
      Stamina({ current: 50, max: 100, regenRate: 20 }),
    );
    world.set(MovementIntent, { dirX: 0, dirZ: 1, sprint: true, jump: false });

    staminaSystem(world, 1.0);

    const s = entity.get(Stamina)!;
    expect(s.current).toBe(40); // 50 - 10*1.0
  });

  it('clamps stamina to max', () => {
    const entity = world.spawn(
      Stamina({ current: 95, max: 100, regenRate: 20 }),
    );
    world.set(MovementIntent, { dirX: 0, dirZ: 0, sprint: false, jump: false });

    staminaSystem(world, 1.0);

    const s = entity.get(Stamina)!;
    expect(s.current).toBe(100);
  });

  it('clamps stamina to 0', () => {
    const entity = world.spawn(
      Stamina({ current: 5, max: 100, regenRate: 20 }),
    );
    world.set(MovementIntent, { dirX: 0, dirZ: 1, sprint: true, jump: false });

    staminaSystem(world, 1.0);

    const s = entity.get(Stamina)!;
    expect(s.current).toBe(0);
  });

  it('regenerates when no MovementIntent exists', () => {
    const entity = world.spawn(
      Stamina({ current: 50, max: 100, regenRate: 20 }),
    );

    staminaSystem(world, 0.5);

    const s = entity.get(Stamina)!;
    expect(s.current).toBe(60); // 50 + 20*0.5
  });
});
