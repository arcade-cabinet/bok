/**
 * @module traits
 * @role Koota trait definitions for all game entities
 * @input None (definitions only)
 * @output Trait constructors for spawning entities
 * @depends koota
 * @tested core.test.ts
 */

export { ActorRef, AIMemory, AIState, BossType, EnemyType, Intent, YukaRef } from './ai.ts';
export {
  ArmorStats,
  AttackIntent,
  DamageOverTime,
  DodgeState,
  Hittable,
  Invincible,
  Knockback,
  ParryState,
  WeaponStats,
} from './combat.ts';
export { AngularVelocity, Health, Position, Rotation, Scale, Stamina, Transform, Velocity } from './core.ts';
export {
  IsPlayer,
  LookIntent,
  MovementIntent,
  RunGear,
  RunResources,
  TomePages,
} from './player.ts';
export { GamePhase, IslandState, Time } from './world.ts';
