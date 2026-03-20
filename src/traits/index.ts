/**
 * @module traits
 * @role Koota trait definitions for all game entities
 * @input None (definitions only)
 * @output Trait constructors for spawning entities
 * @depends koota
 * @tested core.test.ts
 */
export {
  Position, Velocity, AngularVelocity, Rotation, Scale, Transform,
  Health, Stamina,
} from './core.ts';
export {
  AttackIntent, DodgeState, ParryState, Hittable, WeaponStats, ArmorStats,
  DamageOverTime, Invincible, Knockback,
} from './combat.ts';
export {
  AIState, YukaRef, ActorRef, AIMemory, Intent, EnemyType, BossType,
} from './ai.ts';
export {
  IsPlayer, TomePages, RunGear, RunResources, MovementIntent, LookIntent,
} from './player.ts';
export {
  Time, GamePhase, IslandState,
} from './world.ts';
