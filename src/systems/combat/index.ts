/**
 * @module combat
 * @role Resolve attacks into damage: hit detection, damage calculation, combo tracking
 * @input Koota entities with AttackIntent, Position, WeaponStats, Health, Hittable
 * @output Updated Health traits, reset AttackIntent
 * @depends traits, content
 * @tested DamageCalculator.test.ts, WeaponComboSystem.test.ts
 */
export { calculateDamage, type DamageInput } from './DamageCalculator';
export { isInRange, distanceSquared, type HitCheckInput } from './HitDetection';
export { WeaponComboTracker } from './WeaponComboSystem';
export { combatSystem } from './CombatSystem';
