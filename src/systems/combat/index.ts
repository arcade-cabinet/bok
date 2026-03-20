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
export { calculateDamage, type DamageInput } from './DamageCalculator';
export { isInRange, distanceSquared, type HitCheckInput } from './HitDetection';
export { WeaponComboTracker } from './WeaponComboSystem';
export { combatSystem } from './CombatSystem';
export { dodgeTickSystem } from './DodgeTickSystem';
export { staminaSystem } from './StaminaSystem';
export { dotSystem } from './DoTSystem';
export { knockbackSystem } from './KnockbackSystem';
export { bossPhaseSystem } from './BossPhaseSystem';
