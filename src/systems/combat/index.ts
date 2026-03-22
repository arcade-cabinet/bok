/**
 * @module combat
 * @role Resolve attacks into damage: hit detection, damage calculation, combo tracking,
 *       dodge/parry/blocking, stamina, DoT, knockback, boss phases
 * @input Koota entities with AttackIntent, Position, WeaponStats, Health, Hittable
 * @output Updated Health traits, reset AttackIntent
 * @depends traits, content
 * @tested DamageCalculator.test.ts, WeaponComboSystem.test.ts, DodgeTickSystem.test.ts,
 *         StaminaSystem.test.ts, DoTSystem.test.ts, BossPhaseSystem.test.ts
 */

export { bossPhaseSystem } from './BossPhaseSystem';
export { combatSystem } from './CombatSystem';
export { calculateDamage, type DamageInput } from './DamageCalculator';
export { dodgeTickSystem } from './DodgeTickSystem';
export { dotSystem } from './DoTSystem';
export { distanceSquared, type HitCheckInput, isInRange } from './HitDetection';
export { knockbackSystem } from './KnockbackSystem';
export { staminaSystem } from './StaminaSystem';
export { WeaponComboTracker } from './WeaponComboSystem';
