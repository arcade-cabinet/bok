import { trait } from 'koota';

/** Active attack request from player or enemy. */
export const AttackIntent = trait({ active: false, comboStep: 0, timestamp: 0 });

/** Dodge roll state. */
export const DodgeState = trait({ active: false, iFrames: false, cooldownRemaining: 0 });

/** Parry/block state. */
export const ParryState = trait({ blocking: false, parryWindow: false, parryTimestamp: 0 });

/** Entity can be hit by attacks. */
export const Hittable = trait();

/** Weapon stats on equipped weapon. */
export const WeaponStats = trait({
  baseDamage: 10,
  attackSpeed: 1.0,
  range: 1.5,
  comboMultipliers: '1.0,1.2,1.5', // stringified array for SoA
  weaponId: '',
});

/** Armor stats. */
export const ArmorStats = trait({ reduction: 0, armorId: '' });

/** Damage-over-time effect. */
export const DamageOverTime = trait({ damagePerTick: 0, tickInterval: 1, remainingDuration: 0 });

/** Invincibility frames (post-dodge, post-hit). */
export const Invincible = trait({ remainingTime: 0 });

/** Knockback force applied this frame. */
export const Knockback = trait({ x: 0, y: 0, z: 0 });
