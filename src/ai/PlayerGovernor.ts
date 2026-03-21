/**
 * @module ai/PlayerGovernor
 * @role Yuka GOAP-based governor that recommends targets and manages stamina awareness
 * @input Player position, enemy list, stamina state
 * @output Suggested target index, threat level
 */
import { CompositeGoal, GameEntity, Goal, GoalEvaluator, Think } from 'yuka';
import type { EnemyState } from '../engine/types';

// --- Constants ---

const COMBAT_RANGE = 5.0;
const HIGH_THREAT_RANGE = 2.5;
const DODGE_STAMINA_THRESHOLD = 25;

// --- Position holder ---

/** Lightweight entity used as the Think owner — not a real game entity. */
class GovernorEntity extends GameEntity {
  constructor() {
    super();
    this.name = 'PlayerGovernor';
  }
}

// --- Governor context (shared mutable state for evaluators/goals) ---

export interface GovernorContext {
  playerX: number;
  playerY: number;
  playerZ: number;
  enemies: EnemyState[];
  stamina: number;
  staminaMax: number;
}

// --- Goal: TargetNearestEnemy ---

class TargetNearestEnemyGoal extends Goal {
  private ctx: GovernorContext;
  result: { targetIndex: number; threatLevel: ThreatLevel } = { targetIndex: -1, threatLevel: 'none' };

  constructor(owner: GameEntity, ctx: GovernorContext) {
    super(owner);
    this.ctx = ctx;
  }

  activate(): void {
    this.status = Goal.STATUS.ACTIVE;
  }

  execute(): void {
    const { playerX, playerZ, enemies } = this.ctx;
    let closestIdx = -1;
    let closestDist = Infinity;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const dx = playerX - e.mesh.position.x;
      const dz = playerZ - e.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    if (closestIdx >= 0 && closestDist <= COMBAT_RANGE) {
      this.result.targetIndex = closestIdx;
      this.result.threatLevel = closestDist <= HIGH_THREAT_RANGE ? 'high' : 'medium';
    } else {
      this.result.targetIndex = -1;
      this.result.threatLevel = closestIdx >= 0 ? 'low' : 'none';
    }

    this.status = Goal.STATUS.COMPLETED;
  }

  terminate(): void {}
}

// --- Goal: AssessThreat (composite) ---

class AssessThreatGoal extends CompositeGoal {
  targetGoal: TargetNearestEnemyGoal;

  constructor(owner: GameEntity, ctx: GovernorContext) {
    super(owner);
    this.targetGoal = new TargetNearestEnemyGoal(owner, ctx);
  }

  activate(): void {
    this.clearSubgoals();
    this.addSubgoal(this.targetGoal);
    this.status = Goal.STATUS.ACTIVE;
  }

  execute(): void {
    this.activateIfInactive();
    const subStatus = this.executeSubgoals();
    if (subStatus === Goal.STATUS.COMPLETED || subStatus === Goal.STATUS.FAILED) {
      this.status = subStatus;
    }
  }

  terminate(): void {
    this.clearSubgoals();
  }
}

// --- GoalEvaluator: combat targeting ---

class CombatTargetEvaluator extends GoalEvaluator {
  private ctx: GovernorContext;

  constructor(ctx: GovernorContext, bias: number) {
    super(bias);
    this.ctx = ctx;
  }

  calculateDesirability(): number {
    const { playerX, playerZ, enemies } = this.ctx;
    if (enemies.length === 0) return 0;

    // Find closest enemy distance
    let minDist = Infinity;
    for (const e of enemies) {
      const dx = playerX - e.mesh.position.x;
      const dz = playerZ - e.mesh.position.z;
      minDist = Math.min(minDist, Math.sqrt(dx * dx + dz * dz));
    }

    // Desirability peaks when enemies are in combat range
    if (minDist <= HIGH_THREAT_RANGE) return 1.0;
    if (minDist <= COMBAT_RANGE) return 0.7;
    if (minDist <= COMBAT_RANGE * 2) return 0.3;
    return 0.05;
  }

  setGoal(owner: GameEntity): void {
    const think = owner as unknown as Think;
    // Only add if not already present
    if (!think.subgoals.some((g) => g instanceof AssessThreatGoal)) {
      think.clearSubgoals();
      think.addSubgoal(new AssessThreatGoal(owner, this.ctx));
    }
  }
}

// --- GoalEvaluator: stamina conservation ---

class StaminaConservationEvaluator extends GoalEvaluator {
  private ctx: GovernorContext;

  constructor(ctx: GovernorContext, bias: number) {
    super(bias);
    this.ctx = ctx;
  }

  calculateDesirability(): number {
    const { stamina, staminaMax } = this.ctx;
    if (staminaMax <= 0) return 0;
    const ratio = stamina / staminaMax;
    // High desirability when stamina is critically low
    if (ratio < 0.15) return 0.9;
    if (ratio < 0.3) return 0.5;
    return 0.1;
  }

  setGoal(_owner: GameEntity): void {
    // Stamina conservation is passive — it just affects scoring.
    // The governor output flags canDodge = false, which the UI reads.
  }
}

// --- Threat level type ---

export type ThreatLevel = 'none' | 'low' | 'medium' | 'high';

// --- Public API ---

export interface GovernorOutput {
  /** Index into the enemies array, or -1 if no target suggested */
  suggestedTarget: number;
  /** Current threat assessment */
  threatLevel: ThreatLevel;
  /** Whether player has enough stamina to dodge */
  canDodge: boolean;
}

export interface PlayerGovernor {
  /** Call each frame. Returns recommended action state. */
  update(dt: number): GovernorOutput;
  /** Update the context with fresh game state. */
  setContext(
    playerX: number,
    playerY: number,
    playerZ: number,
    enemies: EnemyState[],
    stamina: number,
    staminaMax: number,
  ): void;
}

export function createPlayerGovernor(): PlayerGovernor {
  const ctx: GovernorContext = {
    playerX: 0,
    playerY: 0,
    playerZ: 0,
    enemies: [],
    stamina: 100,
    staminaMax: 100,
  };

  const entity = new GovernorEntity();
  const brain = new Think(entity);

  brain.addEvaluator(new CombatTargetEvaluator(ctx, 1.0));
  brain.addEvaluator(new StaminaConservationEvaluator(ctx, 0.8));

  return {
    setContext(playerX, playerY, playerZ, enemies, stamina, staminaMax) {
      ctx.playerX = playerX;
      ctx.playerY = playerY;
      ctx.playerZ = playerZ;
      ctx.enemies = enemies;
      ctx.stamina = stamina;
      ctx.staminaMax = staminaMax;
    },

    update(_dt: number): GovernorOutput {
      // Run Yuka's goal arbitration
      brain.execute();

      // Harvest results from the goal tree
      let suggestedTarget = -1;
      let threatLevel: ThreatLevel = 'none';

      for (const sub of brain.subgoals) {
        if (sub instanceof AssessThreatGoal) {
          suggestedTarget = sub.targetGoal.result.targetIndex;
          threatLevel = sub.targetGoal.result.threatLevel;
        }
      }

      const canDodge = ctx.stamina >= DODGE_STAMINA_THRESHOLD;

      return { suggestedTarget, threatLevel, canDodge };
    },
  };
}
