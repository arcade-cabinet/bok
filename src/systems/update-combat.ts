/**
 * @module systems/update-combat
 * @role Resolve attacks and contact damage between player and enemies
 *
 * Queries (IsPlayer, Transform, WeaponStats, Health) vs (IsEnemy, Transform, Health, ContactDamage).
 * Handles player attacking enemies in weapon range and enemies dealing contact damage to the player.
 */
import type { World } from 'koota';
import {
  AttackIntent,
  ContactDamage,
  Health,
  Invincible,
  IsEnemy,
  IsPlayer,
  Time,
  Transform,
  WeaponStats,
} from '../traits';

export function updateCombat(world: World): void {
  const time = world.get(Time);
  if (!time) {
    throw new Error('updateCombat: world is missing the Time trait');
  }
  const dt = time.delta;

  // --- Player attacks enemies ---
  const players = world.query(IsPlayer, Transform, WeaponStats);
  if (players.length === 0) return;

  const player = players[0];
  const playerTransform = player.get(Transform);
  const weapon = player.get(WeaponStats);
  const attackIntent = player.has(AttackIntent) ? player.get(AttackIntent) : null;
  if (!playerTransform || !weapon) return;

  // Process player attack if intent is active
  if (attackIntent?.active) {
    const comboMultipliers = weapon.comboMultipliers.split(',').map(Number);
    const comboStep = attackIntent.comboStep;
    const multiplier = comboMultipliers[comboStep % comboMultipliers.length] ?? 1.0;
    const baseDamage = Math.floor(weapon.baseDamage * multiplier);
    const finalDamage = Math.max(1, baseDamage);

    // Find closest enemy in weapon range
    const enemies = world.query(IsEnemy, Transform, Health);
    let closestEntity = null;
    let closestDist = weapon.range;

    for (const enemy of enemies) {
      const enemyTransform = enemy.get(Transform);
      if (!enemyTransform) continue;

      const dx = playerTransform.position.x - enemyTransform.position.x;
      const dz = playerTransform.position.z - enemyTransform.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < closestDist) {
        closestDist = dist;
        closestEntity = enemy;
      }
    }

    if (closestEntity) {
      const health = closestEntity.get(Health);
      if (health) {
        closestEntity.set(Health, {
          current: Math.max(0, health.current - finalDamage),
          max: health.max,
        });
      }
    }

    // Reset attack intent
    player.set(AttackIntent, {
      active: false,
      comboStep: (comboStep + 1) % comboMultipliers.length,
    });
  }

  // --- Enemies deal contact damage to player ---
  const playerHealth = player.get(Health);
  if (!playerHealth || playerHealth.current <= 0) return;

  // Check player invincibility
  if (player.has(Invincible)) {
    const inv = player.get(Invincible);
    if (inv && inv.remaining > 0) {
      player.set(Invincible, { remaining: inv.remaining - dt });
      return;
    }
  }

  const contactEnemies = world.query(IsEnemy, Transform, ContactDamage);
  for (const enemy of contactEnemies) {
    const enemyTransform = enemy.get(Transform);
    const contact = enemy.get(ContactDamage);
    if (!enemyTransform || !contact) continue;

    const dx = playerTransform.position.x - enemyTransform.position.x;
    const dz = playerTransform.position.z - enemyTransform.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 1.8) {
      // Tick contact cooldown timer
      if (contact.timer > 0) {
        enemy.set(ContactDamage, {
          damage: contact.damage,
          cooldown: contact.cooldown,
          timer: contact.timer - dt,
        });
        continue;
      }

      // Deal damage to player
      const currentHealth = player.get(Health);
      if (!currentHealth) continue;

      player.set(Health, {
        current: Math.max(0, currentHealth.current - contact.damage),
        max: currentHealth.max,
      });

      // Reset contact cooldown
      enemy.set(ContactDamage, {
        damage: contact.damage,
        cooldown: contact.cooldown,
        timer: contact.cooldown,
      });
    }
  }
}
