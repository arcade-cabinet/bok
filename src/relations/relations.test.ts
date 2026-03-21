import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { Position } from '../traits/index';
import { ChildOf, Contains, Targeting } from './index';

describe('Relations', () => {
  it('creates parent-child relationship', () => {
    const world = createWorld();
    const parent = world.spawn(Position());
    const child = world.spawn(Position(), ChildOf(parent));
    expect(child.targetFor(ChildOf)).toBe(parent);
    world.destroy();
  });

  it('exclusive targeting replaces previous target', () => {
    const world = createWorld();
    const hunter = world.spawn(Position());
    const prey1 = world.spawn(Position());
    const prey2 = world.spawn(Position());
    hunter.add(Targeting(prey1));
    hunter.add(Targeting(prey2));
    expect(hunter.targetFor(Targeting)).toBe(prey2);
    world.destroy();
  });

  it('Contains relation stores amount', () => {
    const world = createWorld();
    const inventory = world.spawn();
    const item = world.spawn();
    inventory.add(Contains(item));
    inventory.set(Contains(item), { amount: 5 });
    expect(inventory.get(Contains(item))?.amount).toBe(5);
    world.destroy();
  });
});
