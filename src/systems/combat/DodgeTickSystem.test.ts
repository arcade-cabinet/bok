import { createWorld, type World } from 'koota';
import { beforeEach, describe, expect, it } from 'vitest';
import { DodgeState, Stamina } from '../../traits/index';
import { dodgeTickSystem } from './DodgeTickSystem';

describe('DodgeTickSystem', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
  });

  it('expires i-frames after 0.3s', () => {
    const entity = world.spawn(DodgeState({ active: true, iFrames: true, cooldownRemaining: 0.8 }));

    // Tick past i-frame duration
    dodgeTickSystem(world, 0.31);

    const dodge = entity.get(DodgeState)!;
    expect(dodge.active).toBe(true);
    expect(dodge.iFrames).toBe(false);
  });

  it('resets dodge entirely after 0.8s cooldown', () => {
    const entity = world.spawn(DodgeState({ active: true, iFrames: true, cooldownRemaining: 0.8 }));

    dodgeTickSystem(world, 0.81);

    const dodge = entity.get(DodgeState)!;
    expect(dodge.active).toBe(false);
    expect(dodge.iFrames).toBe(false);
    expect(dodge.cooldownRemaining).toBe(0);
  });

  it('does not touch inactive dodge', () => {
    const entity = world.spawn(DodgeState({ active: false, iFrames: false, cooldownRemaining: 0 }));

    dodgeTickSystem(world, 0.1);

    const dodge = entity.get(DodgeState)!;
    expect(dodge.active).toBe(false);
    expect(dodge.iFrames).toBe(false);
  });

  it('deducts stamina on fresh dodge activation', () => {
    const entity = world.spawn(
      DodgeState({ active: true, iFrames: true, cooldownRemaining: 0 }),
      Stamina({ current: 100, max: 100, regenRate: 20 }),
    );

    dodgeTickSystem(world, 0.016);

    const stamina = entity.get(Stamina)!;
    expect(stamina.current).toBe(75); // 100 - 25 cost
  });

  it('cancels dodge when stamina is insufficient', () => {
    const entity = world.spawn(
      DodgeState({ active: true, iFrames: true, cooldownRemaining: 0 }),
      Stamina({ current: 10, max: 100, regenRate: 20 }),
    );

    dodgeTickSystem(world, 0.016);

    const dodge = entity.get(DodgeState)!;
    expect(dodge.active).toBe(false);
    expect(dodge.iFrames).toBe(false);

    const stamina = entity.get(Stamina)!;
    expect(stamina.current).toBe(10); // unchanged
  });

  it('keeps i-frames during initial 0.3s window', () => {
    const entity = world.spawn(DodgeState({ active: true, iFrames: true, cooldownRemaining: 0.8 }));

    dodgeTickSystem(world, 0.1);

    const dodge = entity.get(DodgeState)!;
    expect(dodge.active).toBe(true);
    expect(dodge.iFrames).toBe(true);
  });
});
