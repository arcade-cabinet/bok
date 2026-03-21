import { describe, expect, it } from 'vitest';
import { calculateDamage, type DamageInput } from './DamageCalculator';

describe('DamageCalculator', () => {
  it('calculates base damage with no modifiers', () => {
    const input: DamageInput = {
      weaponBaseDamage: 20,
      comboMultiplier: 1.0,
      critMultiplier: 1.0,
      armorReduction: 0,
    };
    expect(calculateDamage(input)).toBe(20);
  });

  it('applies combo multiplier', () => {
    const input: DamageInput = {
      weaponBaseDamage: 20,
      comboMultiplier: 1.5,
      critMultiplier: 1.0,
      armorReduction: 0,
    };
    expect(calculateDamage(input)).toBe(30);
  });

  it('applies crit multiplier', () => {
    const input: DamageInput = {
      weaponBaseDamage: 20,
      comboMultiplier: 1.0,
      critMultiplier: 2.0,
      armorReduction: 0,
    };
    expect(calculateDamage(input)).toBe(40);
  });

  it('stacks combo and crit multipliers', () => {
    const input: DamageInput = {
      weaponBaseDamage: 10,
      comboMultiplier: 1.2,
      critMultiplier: 2.0,
      armorReduction: 0,
    };
    expect(calculateDamage(input)).toBe(24);
  });

  it('subtracts armor reduction', () => {
    const input: DamageInput = {
      weaponBaseDamage: 20,
      comboMultiplier: 1.0,
      critMultiplier: 1.0,
      armorReduction: 5,
    };
    expect(calculateDamage(input)).toBe(15);
  });

  it('applies minimum 1 damage when armor exceeds attack', () => {
    const input: DamageInput = {
      weaponBaseDamage: 5,
      comboMultiplier: 1.0,
      critMultiplier: 1.0,
      armorReduction: 100,
    };
    expect(calculateDamage(input)).toBe(1);
  });

  it('applies minimum 1 damage when armor exactly equals attack', () => {
    const input: DamageInput = {
      weaponBaseDamage: 10,
      comboMultiplier: 1.0,
      critMultiplier: 1.0,
      armorReduction: 10,
    };
    expect(calculateDamage(input)).toBe(1);
  });

  it('floors fractional damage', () => {
    const _input: DamageInput = {
      weaponBaseDamage: 10,
      comboMultiplier: 1.3,
      critMultiplier: 1.0,
      armorReduction: 0,
    };
    // 10 * 1.3 = 13.0 (exact), but test with truly fractional
    const input2: DamageInput = {
      weaponBaseDamage: 7,
      comboMultiplier: 1.5,
      critMultiplier: 1.0,
      armorReduction: 0,
    };
    // 7 * 1.5 = 10.5 → floor to 10
    expect(calculateDamage(input2)).toBe(10);
  });
});
