/**
 * @module traits
 * @role ALL Koota trait definitions for the game
 *
 * Follows Koota convention: single flat module exporting all traits.
 * Traits are data schemas — they define WHAT an entity has, not HOW it behaves.
 * Systems query traits to implement behavior.
 */
import { relation, trait } from 'koota';
import type { Object3D } from 'three';
import { Euler, Quaternion, Vector3 } from 'three';

// =============================================================================
// World-Level Traits (global state, not per-entity)
// =============================================================================

/** Frame timing. */
export const Time = trait({ delta: 0, elapsed: 0 });

/** Currently pressed keyboard keys. */
export const Keyboard = trait(() => new Set<string>());

/** Game mode — affects spawning, damage, goals. */
export const GameModeState = trait({ mode: 'survival' as 'creative' | 'survival' });

/** Goal tracking for survival mode. */
export const GoalState = trait({
  kills: 0,
  chestsOpened: 0,
  landmarksDiscovered: 0,
  bossUnlocked: false,
});

/** Enemy spawn controller. */
export const EnemySpawner = trait({
  interval: 8,
  accumulatedTime: 0,
  maxEnemies: 12,
  spawnRadius: 30,
});

// =============================================================================
// Transform / Physics Traits
// =============================================================================

/** 3D transform with position, rotation, quaternion. */
export const Transform = trait({
  position: () => new Vector3(),
  rotation: () => new Euler(),
  quaternion: () => new Quaternion(),
});

/** Movement with velocity, force, and constraints. */
export const Movement = trait({
  velocity: () => new Vector3(),
  force: () => new Vector3(),
  maxSpeed: 6,
  damping: 0.9,
});

// =============================================================================
// Entity Type Markers (tag traits — no data)
// =============================================================================

/** Marks an entity as the player. */
export const IsPlayer = trait();

/** Marks an entity as a hostile enemy. */
export const IsEnemy = trait();

/** Marks an entity as a boss. */
export const IsBoss = trait();

/** Marks an entity as a passive animal. */
export const IsAnimal = trait();

/** Marks an entity as an NPC. */
export const IsNPC = trait();

/** Marks an entity as a loot chest. */
export const IsChest = trait();

/** Marks an entity as a world prop (tree, rock, crystal, etc.). */
export const IsProp = trait();

/** Marks an entity as a tool/weapon item. */
export const IsTool = trait();

// =============================================================================
// Combat Traits
// =============================================================================

/** Health pool. */
export const Health = trait({ current: 100, max: 100 });

/** Stamina for dodge/sprint. */
export const Stamina = trait({ current: 100, max: 100, regenRate: 20 });

/** Attack intent — set by input or AI. */
export const AttackIntent = trait({ active: false, comboStep: 0 });

/** Dodge state. */
export const DodgeState = trait({ iFrames: 0, cooldown: 0 });

/** Block/parry state. */
export const ParryState = trait({ blocking: false, parryWindow: 0 });

/** Weapon stats (on the entity that IS a weapon, or on equipped entity). */
export const WeaponStats = trait({
  baseDamage: 10,
  attackSpeed: 1.0,
  range: 1.5,
  comboMultipliers: '1.0,1.2,1.5',
  weaponId: 'wooden-sword',
});

/** Damage this entity deals on contact (for enemies). */
export const ContactDamage = trait({ damage: 10, cooldown: 1.5, timer: 0 });

/** Invincibility frames. */
export const Invincible = trait({ remaining: 0 });

/** Damage over time effect. */
export const DamageOverTime = trait({ damagePerTick: 0, tickInterval: 1, remaining: 0 });

// =============================================================================
// Identity / Content Traits
// =============================================================================

/** Links entity to a content config by ID (e.g., "slime", "wooden-sword"). */
export const ContentId = trait({ id: '', category: '' as 'enemy' | 'boss' | 'weapon' | 'animal' | 'prop' });

/** Three.js scene object reference. */
export const Ref = trait(() => null as Object3D | null);

/** Model path for loading. */
export const ModelPath = trait({ path: '' });

/** Entity is dying (shrink/fade animation). */
export const Dying = trait({ timer: 0.5 });

// =============================================================================
// AI Traits
// =============================================================================

/** AI behavior state. */
export const AIState = trait({ state: 'idle' as string });

/** Yuka Vehicle reference. */
export const YukaRef = trait(() => null as unknown);

// =============================================================================
// Environment / Interactive Traits
// =============================================================================

/** Chest state. */
export const ChestState = trait({ opened: false, tier: 'wooden' as 'wooden' | 'iron' | 'crystal' });

/** Interactable — player can interact within range. */
export const Interactable = trait({ range: 1.5, type: '' as string });

/** Harvestable — can be broken/harvested for resources. */
export const Harvestable = trait({ resource: '', amount: 1, tool: '' as string });

// =============================================================================
// Relations
// =============================================================================

/** Entity was fired/spawned by another entity. */
export const FiredBy = relation({ autoDestroy: 'orphan' });

/** Entity is targeting another entity. */
export const Targeting = relation({ exclusive: true });

/** Entity is equipped by another entity. */
export const EquippedBy = relation({ exclusive: true });
