import type { World } from 'koota';
import {
  Position, Health, AttackIntent, WeaponStats, ArmorStats,
  Hittable, Invincible,
} from '../../traits/index';
import { isInRange } from './HitDetection';
import { calculateDamage } from './DamageCalculator';

/**
 * Orchestrates combat resolution each frame.
 * Query entities with AttackIntent → HitDetection → DamageCalculator
 * → apply Health changes → reset AttackIntent.
 */
export function combatSystem(world: World): void {
  // Find all entities that are currently attacking
  const attackers = world.query(AttackIntent, Position, WeaponStats);

  for (const attacker of attackers) {
    const intent = attacker.get(AttackIntent);
    if (!intent || !intent.active) continue;

    const attackerPos = attacker.get(Position)!;
    const weapon = attacker.get(WeaponStats)!;

    // Parse combo multipliers from stringified array
    const multipliers = weapon.comboMultipliers.split(',').map(Number);
    const comboStep = intent.comboStep;
    const comboMultiplier = multipliers[comboStep] ?? 1.0;

    // Check all hittable targets
    const targets = world.query(Hittable, Position, Health);

    for (const target of targets) {
      // Don't hit yourself
      if (target === attacker) continue;

      // Skip invincible targets
      if (target.has(Invincible)) {
        const inv = target.get(Invincible)!;
        if (inv.remainingTime > 0) continue;
      }

      const targetPos = target.get(Position)!;

      // Range check
      if (!isInRange({
        attackerX: attackerPos.x,
        attackerY: attackerPos.y,
        attackerZ: attackerPos.z,
        targetX: targetPos.x,
        targetY: targetPos.y,
        targetZ: targetPos.z,
        weaponRange: weapon.range,
      })) {
        continue;
      }

      // Calculate damage
      const armorReduction = target.has(ArmorStats)
        ? target.get(ArmorStats)!.reduction
        : 0;

      const damage = calculateDamage({
        weaponBaseDamage: weapon.baseDamage,
        comboMultiplier,
        critMultiplier: 1.0, // Crit system deferred
        armorReduction,
      });

      // Apply damage
      const health = target.get(Health)!;
      target.set(Health, {
        current: Math.max(0, health.current - damage),
        max: health.max,
      });
    }

    // Reset attack intent after processing
    attacker.set(AttackIntent, {
      active: false,
      comboStep: intent.comboStep,
      timestamp: intent.timestamp,
    });
  }
}
