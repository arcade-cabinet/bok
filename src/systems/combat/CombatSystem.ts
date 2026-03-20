import type { World, Entity } from 'koota';
import {
  Position, Health, AttackIntent, WeaponStats, ArmorStats,
  Hittable, Invincible, DodgeState, ParryState,
} from '../../traits/index';
import { isInRange } from './HitDetection';
import { calculateDamage } from './DamageCalculator';
import { WeaponComboTracker } from './WeaponComboSystem';

/** Per-entity combo trackers, keyed by entity reference. */
const comboTrackers = new WeakMap<Entity, WeaponComboTracker>();

/**
 * Orchestrates combat resolution each frame.
 * Query entities with AttackIntent -> HitDetection -> DamageCalculator
 * -> apply Health changes -> reset AttackIntent.
 *
 * Checks dodge i-frames, parry window, and blocking before applying damage.
 * Integrates WeaponComboTracker for combo step advancement.
 */
export function combatSystem(world: World): void {
  // Find all entities that are currently attacking
  const attackers = world.query(AttackIntent, Position, WeaponStats);

  for (const attacker of attackers) {
    const intent = attacker.get(AttackIntent);
    if (!intent || !intent.active) continue;

    const attackerPos = attacker.get(Position)!;
    const weapon = attacker.get(WeaponStats)!;

    // Get or create combo tracker for this attacker
    let tracker = comboTrackers.get(attacker);
    if (!tracker) {
      const multipliers = weapon.comboMultipliers.split(',').map(Number);
      const combo = multipliers.map((m, i) => ({
        damageMultiplier: m,
        windowMs: 500,
        animation: `attack${i}`,
      }));
      tracker = new WeaponComboTracker(combo);
      comboTrackers.set(attacker, tracker);
    }

    // Advance combo — timestamp is in seconds, tracker expects ms
    const hit = tracker.attack(intent.timestamp * 1000);
    const comboMultiplier = hit.damageMultiplier;

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

      // H3: Check dodge i-frames — skip damage entirely
      if (target.has(DodgeState)) {
        const dodge = target.get(DodgeState)!;
        if (dodge.iFrames) continue;
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

      // H3: Check parry window — deal 0 damage, emit counter opportunity
      if (target.has(ParryState)) {
        const parry = target.get(ParryState)!;
        if (parry.parryWindow) {
          // Perfect parry — no damage, counter opportunity
          // TODO: emit 'parry' event for counter-attack system
          continue;
        }
        if (parry.blocking) {
          // Blocking — deal 50% damage
          const armorReduction = target.has(ArmorStats)
            ? target.get(ArmorStats)!.reduction
            : 0;

          const damage = calculateDamage({
            weaponBaseDamage: weapon.baseDamage,
            comboMultiplier,
            critMultiplier: 1.0,
            armorReduction,
          });

          const blocked = Math.floor(damage * 0.5);
          const health = target.get(Health)!;
          target.set(Health, {
            current: Math.max(0, health.current - blocked),
            max: health.max,
          });
          continue;
        }
      }

      // Calculate full damage
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

    // Reset attack intent after processing, preserving combo step from tracker
    attacker.set(AttackIntent, {
      active: false,
      comboStep: tracker.currentStep,
      timestamp: intent.timestamp,
    });
  }
}
