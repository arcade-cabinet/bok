/**
 * @module ai/enemyBrain
 * @role Create Yuka GOAP brains for different enemy types
 *
 * Each enemy type gets a Think brain with appropriate GoalEvaluators:
 * - Melee enemies: chase → attack
 * - Ranged enemies: keep distance → shoot
 * - Pack enemies: group up → coordinated chase
 * - Ambush enemies: hide → surprise attack
 */
import { type GameEntity, GoalEvaluator, Think, type Vector3 } from 'yuka';

/** Extended GameEntity with custom game properties. */
interface BokEntity extends GameEntity {
  _targetPosition?: Vector3;
  _brain?: Think;
  _healthPct?: number;
}

// =============================================================================
// Goal Evaluators — each returns a desirability score [0, 1]
// =============================================================================

/** Chase the player when nearby. */
class ChaseEvaluator extends GoalEvaluator {
  calculateDesirability(entity: BokEntity): number {
    const target = (entity as BokEntity)._targetPosition;
    if (!target) return 0;
    const dist = entity.position.distanceTo(target);
    // High desirability when player is in range but not too close
    if (dist < 2) return 0.1; // Too close — prefer attack
    if (dist < 15) return 0.7; // Chase range
    return 0.3; // Wander instead
  }

  setGoal(entity: BokEntity): void {
    const brain = (entity as BokEntity)._brain as Think;
    brain.clearSubgoals();
    // Chase is handled by steering behaviors on the Vehicle
  }
}

/** Attack when in melee range. */
class MeleeAttackEvaluator extends GoalEvaluator {
  calculateDesirability(entity: BokEntity): number {
    const target = (entity as BokEntity)._targetPosition;
    if (!target) return 0;
    const dist = entity.position.distanceTo(target);
    return dist < 2 ? 0.9 : 0; // Very high when in melee range
  }

  setGoal(entity: BokEntity): void {
    const brain = (entity as BokEntity)._brain as Think;
    brain.clearSubgoals();
    // Attack is handled by the combat system based on proximity
  }
}

/** Keep distance for ranged attackers. */
class KeepDistanceEvaluator extends GoalEvaluator {
  calculateDesirability(entity: BokEntity): number {
    const target = (entity as BokEntity)._targetPosition;
    if (!target) return 0;
    const dist = entity.position.distanceTo(target);
    // Want to be 8-12 units away for ranged attacks
    if (dist < 6) return 0.8; // Too close — flee
    if (dist > 15) return 0.3; // Too far — approach
    return 0.5; // Good distance — hold
  }

  setGoal(_entity: BokEntity): void {
    // Handled by flee steering behavior
  }
}

/** Wander when nothing better to do. */
class WanderEvaluator extends GoalEvaluator {
  calculateDesirability(_entity: BokEntity): number {
    return 0.2; // Low priority — always available as fallback
  }

  setGoal(_entity: BokEntity): void {
    // Wander behavior is always active on the Vehicle
  }
}

/** Flee when health is low. */
class FleeEvaluator extends GoalEvaluator {
  calculateDesirability(entity: BokEntity): number {
    const health = (entity as BokEntity)._healthPct ?? 1;
    if (health < 0.2) return 0.95; // Very low health — flee is top priority
    if (health < 0.4) return 0.5;
    return 0;
  }

  setGoal(_entity: BokEntity): void {
    // Flee behavior activated by steering
  }
}

// =============================================================================
// Enemy Brain Factory
// =============================================================================

export type EnemyAIType =
  | 'melee' // chase + melee attack (skeleton, goblin, zombie)
  | 'ranged' // keep distance + ranged (wizard, skeleton-archer)
  | 'pack' // chase in groups (wolf, frost-wolf)
  | 'ambush' // hide + surprise (swamp-lurker)
  | 'boss' // scripted phases
  | 'passive'; // wander only (animals)

/** Map enemy content IDs to AI types. */
export const ENEMY_AI_TYPES: Record<string, EnemyAIType> = {
  slime: 'melee',
  'skeleton-archer': 'ranged',
  goblin: 'melee',
  zombie: 'melee',
  skeleton: 'melee',
  'sand-wraith': 'ambush',
  scorpion: 'melee',
  'frost-wolf': 'pack',
  'ice-golem': 'melee',
  'fire-imp': 'ranged',
  'lava-elemental': 'melee',
  'swamp-lurker': 'ambush',
  'bog-witch': 'ranged',
  'crystal-sentinel': 'melee',
  'gem-spider': 'ambush',
  'sky-hawk': 'ranged',
  'wind-elemental': 'ranged',
  'depth-crawler': 'melee',
  'angler-fish': 'ambush',
};

/**
 * Create a Yuka Think brain for an enemy based on its AI type.
 * Returns the brain with appropriate evaluators configured.
 */
export function createEnemyBrain(entity: GameEntity, aiType: EnemyAIType): Think {
  const brain = new Think(entity);
  (entity as BokEntity)._brain = brain;

  switch (aiType) {
    case 'melee':
      brain.addEvaluator(new ChaseEvaluator(0.7));
      brain.addEvaluator(new MeleeAttackEvaluator(1.0));
      brain.addEvaluator(new WanderEvaluator(0.2));
      brain.addEvaluator(new FleeEvaluator(0.5));
      break;

    case 'ranged':
      brain.addEvaluator(new KeepDistanceEvaluator(0.8));
      brain.addEvaluator(new WanderEvaluator(0.2));
      brain.addEvaluator(new FleeEvaluator(0.6));
      break;

    case 'pack':
      brain.addEvaluator(new ChaseEvaluator(0.9)); // Aggressive chase
      brain.addEvaluator(new MeleeAttackEvaluator(1.0));
      brain.addEvaluator(new WanderEvaluator(0.1));
      break;

    case 'ambush':
      brain.addEvaluator(new WanderEvaluator(0.6)); // Mostly wander
      brain.addEvaluator(new MeleeAttackEvaluator(1.0)); // But attack hard when close
      break;

    case 'boss':
      brain.addEvaluator(new ChaseEvaluator(0.5));
      brain.addEvaluator(new MeleeAttackEvaluator(1.0));
      // Boss phases are handled by combat system, not GOAP
      break;

    case 'passive':
      brain.addEvaluator(new WanderEvaluator(1.0));
      break;
  }

  return brain;
}
