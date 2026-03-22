import { describe, expect, it } from 'vitest';
import { distanceSquared, type HitCheckInput, isInRange } from './HitDetection';

describe('HitDetection — isInRange', () => {
  it('returns true when target is within weapon range', () => {
    const input: HitCheckInput = {
      attackerX: 0,
      attackerY: 0,
      attackerZ: 0,
      targetX: 1,
      targetY: 0,
      targetZ: 0,
      weaponRange: 2,
    };
    expect(isInRange(input)).toBe(true);
  });

  it('returns false when target is beyond weapon range', () => {
    const input: HitCheckInput = {
      attackerX: 0,
      attackerY: 0,
      attackerZ: 0,
      targetX: 10,
      targetY: 0,
      targetZ: 0,
      weaponRange: 2,
    };
    expect(isInRange(input)).toBe(false);
  });

  it('returns true when target is exactly at weapon range', () => {
    const input: HitCheckInput = {
      attackerX: 0,
      attackerY: 0,
      attackerZ: 0,
      targetX: 3,
      targetY: 0,
      targetZ: 0,
      weaponRange: 3,
    };
    expect(isInRange(input)).toBe(true);
  });

  it('considers all three axes for distance check', () => {
    // Distance = sqrt(1 + 1 + 1) = sqrt(3) ≈ 1.732
    const input: HitCheckInput = {
      attackerX: 0,
      attackerY: 0,
      attackerZ: 0,
      targetX: 1,
      targetY: 1,
      targetZ: 1,
      weaponRange: 1.5,
    };
    // sqrt(3) > 1.5 so should be false
    expect(isInRange(input)).toBe(false);
  });

  it('works with negative coordinates', () => {
    const input: HitCheckInput = {
      attackerX: -5,
      attackerY: -3,
      attackerZ: -2,
      targetX: -4,
      targetY: -3,
      targetZ: -2,
      weaponRange: 1,
    };
    expect(isInRange(input)).toBe(true);
  });
});

describe('HitDetection — distanceSquared', () => {
  it('returns 0 for identical points', () => {
    expect(distanceSquared(5, 5, 5, 5, 5, 5)).toBe(0);
  });

  it('returns correct squared distance for axis-aligned points', () => {
    // Distance = 3, squared = 9
    expect(distanceSquared(0, 0, 0, 3, 0, 0)).toBe(9);
  });

  it('returns correct squared distance for 3D points', () => {
    // Distance squared = 1 + 4 + 9 = 14
    expect(distanceSquared(0, 0, 0, 1, 2, 3)).toBe(14);
  });

  it('is commutative (order of points does not matter)', () => {
    const d1 = distanceSquared(1, 2, 3, 4, 5, 6);
    const d2 = distanceSquared(4, 5, 6, 1, 2, 3);
    expect(d1).toBe(d2);
  });
});
