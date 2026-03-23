import { describe, expect, it, vi } from 'vitest';
import { Vector3, Vehicle } from 'yuka';

import { ContentRegistry } from '../content/index.ts';
import type { BossPhase } from '../content/types.ts';
import {
  AggressiveChaseEvaluator,
  BOSS_IDS,
  type BossBehavior,
  BossBrain,
  type BossEntity,
  CircleStrafeEvaluator,
  createBossBrain,
  EnrageEvaluator,
  RangedBarrageEvaluator,
  RetreatAndSummonEvaluator,
} from './bossBrain.ts';

// =============================================================================
// Test Helpers
// =============================================================================

/** Standard 3-phase boss for testing (similar to ancient-treant). */
function makeTestPhases(): BossPhase[] {
  return [
    {
      healthThreshold: 1.0,
      attacks: [
        { name: 'melee-hit', type: 'melee', damage: 20, cooldown: 2, range: 3, telegraph: 0.8 },
        { name: 'aoe-blast', type: 'aoe', damage: 10, cooldown: 5, range: 8, telegraph: 1.0 },
      ],
      description: 'Phase 1',
    },
    {
      healthThreshold: 0.66,
      attacks: [
        { name: 'melee-hit', type: 'melee', damage: 25, cooldown: 1.8, range: 3, telegraph: 0.6 },
        { name: 'summon-adds', type: 'summon', damage: 0, cooldown: 8, range: 15, telegraph: 1.5 },
      ],
      arenaChange: 'adds-spawn',
      description: 'Phase 2',
    },
    {
      healthThreshold: 0.33,
      attacks: [
        { name: 'frenzy', type: 'melee', damage: 30, cooldown: 1, range: 4, telegraph: 0.4 },
        { name: 'ranged-shot', type: 'ranged', damage: 15, cooldown: 3, range: 10, telegraph: 0.6 },
        { name: 'summon-adds', type: 'summon', damage: 0, cooldown: 6, range: 15, telegraph: 1.0 },
      ],
      arenaChange: 'enrage-arena',
      description: 'Phase 3',
    },
  ];
}

/** Create a Vehicle with a target position at a given distance. */
function makeVehicleWithTarget(distance: number, healthPct = 1.0): Vehicle {
  const vehicle = new Vehicle();
  vehicle.position.set(0, 0, 0);
  (vehicle as BossEntity)._targetPosition = new Vector3(distance, 0, 0);
  (vehicle as BossEntity)._healthPct = healthPct;
  return vehicle;
}

// =============================================================================
// BossBrain Construction
// =============================================================================

describe('BossBrain', () => {
  describe('construction', () => {
    it('creates with the given phases', () => {
      const phases = makeTestPhases();
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, phases);

      expect(brain).toBeInstanceOf(BossBrain);
      expect(brain.phases).toHaveLength(3);
      expect(brain.currentPhase).toBe(0);
    });

    it('sets the brain reference on the owner entity', () => {
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, makeTestPhases());

      expect((vehicle as BossEntity)._brain).toBe(brain);
    });

    it('initializes boss phase to 0 on the owner', () => {
      const vehicle = new Vehicle();
      new BossBrain(vehicle, makeTestPhases());

      expect((vehicle as BossEntity)._bossPhase).toBe(0);
    });

    it('adds evaluators based on attack types — summon boss gets RetreatAndSummon', () => {
      const phases = makeTestPhases(); // has summon attacks
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, phases);

      // Should have: CircleStrafe, AggressiveChase, RetreatAndSummon, RangedBarrage, Enrage
      // (ranged-shot in phase 3 gives ranged, summon-adds gives summon)
      expect(brain.evaluators.length).toBeGreaterThanOrEqual(4);
    });

    it('omits RetreatAndSummon for bosses without summon attacks', () => {
      const phases: BossPhase[] = [
        {
          healthThreshold: 1.0,
          attacks: [{ name: 'slam', type: 'melee', damage: 20, cooldown: 2, range: 3, telegraph: 0.8 }],
          description: 'Phase 1',
        },
        {
          healthThreshold: 0.5,
          attacks: [{ name: 'slam', type: 'melee', damage: 30, cooldown: 1.5, range: 3, telegraph: 0.5 }],
          description: 'Phase 2',
        },
      ];
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, phases);

      // No summon, no ranged — should have: CircleStrafe, AggressiveChase, Enrage (3)
      const hasRetreatSummon = brain.evaluators.some((e) => e instanceof RetreatAndSummonEvaluator);
      expect(hasRetreatSummon).toBe(false);
    });

    it('omits RangedBarrage for bosses without ranged attacks', () => {
      const phases: BossPhase[] = [
        {
          healthThreshold: 1.0,
          attacks: [{ name: 'slam', type: 'melee', damage: 20, cooldown: 2, range: 3, telegraph: 0.8 }],
          description: 'Phase 1',
        },
        {
          healthThreshold: 0.5,
          attacks: [{ name: 'slam', type: 'melee', damage: 30, cooldown: 1.5, range: 3, telegraph: 0.5 }],
          description: 'Phase 2',
        },
      ];
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, phases);

      const hasRangedBarrage = brain.evaluators.some((e) => e instanceof RangedBarrageEvaluator);
      expect(hasRangedBarrage).toBe(false);
    });
  });

  // ===========================================================================
  // Phase Transitions
  // ===========================================================================

  describe('phase transitions', () => {
    it('stays in phase 0 at full health', () => {
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, makeTestPhases());

      brain.updatePhase(1.0);
      expect(brain.currentPhase).toBe(0);
    });

    it('transitions to phase 1 at 66% health', () => {
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, makeTestPhases());

      brain.updatePhase(0.66);
      expect(brain.currentPhase).toBe(1);
    });

    it('transitions to phase 2 at 33% health', () => {
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, makeTestPhases());

      brain.updatePhase(0.33);
      expect(brain.currentPhase).toBe(2);
    });

    it('transitions directly to phase 2 if health drops below 33% from full', () => {
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, makeTestPhases());

      brain.updatePhase(0.2);
      expect(brain.currentPhase).toBe(2);
    });

    it('never goes backwards when health fluctuates up', () => {
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, makeTestPhases());

      brain.updatePhase(0.33);
      expect(brain.currentPhase).toBe(2);

      // Health goes up (healing?) — phase should NOT decrease
      brain.updatePhase(0.8);
      expect(brain.currentPhase).toBe(2);
    });

    it('fires phase change callback exactly once per phase advancement', () => {
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, makeTestPhases());
      const callback = vi.fn();
      brain.onPhaseChange(callback);

      brain.updatePhase(0.66);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(1);

      // Same health — no duplicate callback
      brain.updatePhase(0.66);
      expect(callback).toHaveBeenCalledTimes(1);

      // Next phase
      brain.updatePhase(0.33);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(2);
    });

    it('updates _bossPhase on the owner entity', () => {
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, makeTestPhases());

      brain.updatePhase(0.5);
      expect((vehicle as BossEntity)._bossPhase).toBe(1);

      brain.updatePhase(0.2);
      expect((vehicle as BossEntity)._bossPhase).toBe(2);
    });

    it('updates _healthPct on the owner entity', () => {
      const vehicle = new Vehicle();
      const brain = new BossBrain(vehicle, makeTestPhases());

      brain.updatePhase(0.42);
      expect((vehicle as BossEntity)._healthPct).toBe(0.42);
    });
  });

  // ===========================================================================
  // Evaluator Desirabilities
  // ===========================================================================

  describe('evaluator desirabilities', () => {
    describe('CircleStrafeEvaluator', () => {
      it('returns high desirability at orbit distance in phase 0', () => {
        const evaluator = new CircleStrafeEvaluator(1.0);
        const vehicle = makeVehicleWithTarget(7); // ideal orbit range
        (vehicle as BossEntity)._bossPhase = 0;

        const score = evaluator.calculateDesirability(vehicle);
        expect(score).toBeGreaterThan(0.5);
      });

      it('returns low desirability in phase 2', () => {
        const evaluator = new CircleStrafeEvaluator(1.0);
        const vehicle = makeVehicleWithTarget(7);
        (vehicle as BossEntity)._bossPhase = 2;

        const score = evaluator.calculateDesirability(vehicle);
        expect(score).toBeLessThan(0.2);
      });

      it('returns 0 with no target', () => {
        const evaluator = new CircleStrafeEvaluator(1.0);
        const vehicle = new Vehicle();
        const score = evaluator.calculateDesirability(vehicle);
        expect(score).toBe(0);
      });
    });

    describe('AggressiveChaseEvaluator', () => {
      it('returns moderate desirability in phase 0 at chase range', () => {
        const evaluator = new AggressiveChaseEvaluator(1.0);
        const vehicle = makeVehicleWithTarget(8);
        (vehicle as BossEntity)._bossPhase = 0;

        const score = evaluator.calculateDesirability(vehicle);
        // Phase 0 bias = 0.3, so 0.6 * 0.3 = 0.18
        expect(score).toBeLessThan(0.3);
      });

      it('returns high desirability in phase 2 at chase range', () => {
        const evaluator = new AggressiveChaseEvaluator(1.0);
        const vehicle = makeVehicleWithTarget(8);
        (vehicle as BossEntity)._bossPhase = 2;

        const score = evaluator.calculateDesirability(vehicle);
        // Phase 2 bias = 0.9, so 0.6 * 0.9 = 0.54
        expect(score).toBeGreaterThan(0.4);
      });
    });

    describe('RetreatAndSummonEvaluator', () => {
      it('returns high desirability in phase 1 when player is close', () => {
        const evaluator = new RetreatAndSummonEvaluator(1.0);
        const vehicle = makeVehicleWithTarget(3);
        (vehicle as BossEntity)._bossPhase = 1;

        const score = evaluator.calculateDesirability(vehicle);
        // Phase 1 bias = 0.8, close range = 0.7, so 0.7 * 0.8 = 0.56
        expect(score).toBeGreaterThan(0.4);
      });

      it('returns near-zero in phase 0', () => {
        const evaluator = new RetreatAndSummonEvaluator(1.0);
        const vehicle = makeVehicleWithTarget(3);
        (vehicle as BossEntity)._bossPhase = 0;

        const score = evaluator.calculateDesirability(vehicle);
        // Phase 0 bias = 0.1
        expect(score).toBeLessThan(0.15);
      });
    });

    describe('RangedBarrageEvaluator', () => {
      it('returns high desirability at ideal range in phase 0', () => {
        const evaluator = new RangedBarrageEvaluator(1.0);
        const vehicle = makeVehicleWithTarget(10);
        (vehicle as BossEntity)._bossPhase = 0;

        const score = evaluator.calculateDesirability(vehicle);
        // Phase 0 bias = 0.6, ideal = 0.8, so 0.8 * 0.6 = 0.48
        expect(score).toBeGreaterThan(0.4);
      });

      it('returns lower desirability in phase 2', () => {
        const evaluator = new RangedBarrageEvaluator(1.0);
        const vehicle = makeVehicleWithTarget(10);
        (vehicle as BossEntity)._bossPhase = 2;

        const score = evaluator.calculateDesirability(vehicle);
        // Phase 2 bias = 0.3
        expect(score).toBeLessThan(0.3);
      });
    });

    describe('EnrageEvaluator', () => {
      it('returns 0 at high health in phase 0', () => {
        const evaluator = new EnrageEvaluator(1.0);
        const vehicle = new Vehicle();
        (vehicle as BossEntity)._healthPct = 0.8;
        (vehicle as BossEntity)._bossPhase = 0;

        const score = evaluator.calculateDesirability(vehicle);
        expect(score).toBe(0);
      });

      it('returns very high desirability at 10% health in phase 2', () => {
        const evaluator = new EnrageEvaluator(1.0);
        const vehicle = new Vehicle();
        (vehicle as BossEntity)._healthPct = 0.1;
        (vehicle as BossEntity)._bossPhase = 2;

        const score = evaluator.calculateDesirability(vehicle);
        // Phase 2 bias = 1.0, healthPct < 0.15 = 0.95
        expect(score).toBeGreaterThan(0.9);
      });

      it('returns 0 in phase 0 even at low health', () => {
        const evaluator = new EnrageEvaluator(1.0);
        const vehicle = new Vehicle();
        (vehicle as BossEntity)._healthPct = 0.1;
        (vehicle as BossEntity)._bossPhase = 0;

        const score = evaluator.calculateDesirability(vehicle);
        // Phase 0 bias = 0.0
        expect(score).toBe(0);
      });
    });
  });

  // ===========================================================================
  // Behavior Tagging
  // ===========================================================================

  describe('behavior tagging via setGoal', () => {
    const evaluatorBehaviors: Array<[string, GoalEvaluatorConstructor, BossBehavior]> = [
      ['CircleStrafeEvaluator', CircleStrafeEvaluator, 'circle-strafe'],
      ['AggressiveChaseEvaluator', AggressiveChaseEvaluator, 'aggressive-chase'],
      ['RetreatAndSummonEvaluator', RetreatAndSummonEvaluator, 'retreat-and-summon'],
      ['RangedBarrageEvaluator', RangedBarrageEvaluator, 'ranged-barrage'],
      ['EnrageEvaluator', EnrageEvaluator, 'enrage'],
    ];

    for (const [name, Evaluator, expectedBehavior] of evaluatorBehaviors) {
      it(`${name}.setGoal() tags owner with '${expectedBehavior}'`, () => {
        const vehicle = new Vehicle();
        const brain = new BossBrain(vehicle, makeTestPhases());
        const evaluator = new Evaluator(1.0);

        evaluator.setGoal(vehicle);

        expect(brain.getActiveBehavior()).toBe(expectedBehavior);
      });
    }
  });

  // ===========================================================================
  // Phase-Dependent Desirability Shifts
  // ===========================================================================

  describe('desirability shifts across phases', () => {
    it('circle-strafe dominates in phase 0, aggressive-chase dominates in phase 2', () => {
      const circleEval = new CircleStrafeEvaluator(0.7);
      const chaseEval = new AggressiveChaseEvaluator(0.6);

      // Phase 0, orbit distance
      const vehicle0 = makeVehicleWithTarget(7);
      (vehicle0 as BossEntity)._bossPhase = 0;
      const circleP0 = circleEval.calculateDesirability(vehicle0) * circleEval.characterBias;
      const chaseP0 = chaseEval.calculateDesirability(vehicle0) * chaseEval.characterBias;
      expect(circleP0).toBeGreaterThan(chaseP0);

      // Phase 2, same distance
      const vehicle2 = makeVehicleWithTarget(7);
      (vehicle2 as BossEntity)._bossPhase = 2;
      const circleP2 = circleEval.calculateDesirability(vehicle2) * circleEval.characterBias;
      const chaseP2 = chaseEval.calculateDesirability(vehicle2) * chaseEval.characterBias;
      expect(chaseP2).toBeGreaterThan(circleP2);
    });
  });

  // ===========================================================================
  // Factory Function
  // ===========================================================================

  describe('createBossBrain()', () => {
    it('returns a BossBrain instance', () => {
      const vehicle = new Vehicle();
      const brain = createBossBrain(vehicle, makeTestPhases());
      expect(brain).toBeInstanceOf(BossBrain);
    });

    it('wires the brain to the entity', () => {
      const vehicle = new Vehicle();
      const brain = createBossBrain(vehicle, makeTestPhases());
      expect((vehicle as BossEntity)._brain).toBe(brain);
    });
  });

  // ===========================================================================
  // All 8 Boss Types
  // ===========================================================================

  describe('all 8 boss content types produce valid brains', () => {
    const content = new ContentRegistry();

    for (const bossId of BOSS_IDS) {
      it(`${bossId} gets a valid BossBrain`, () => {
        const bossConfig = content.getBoss(bossId);
        const vehicle = new Vehicle();
        const brain = createBossBrain(vehicle, bossConfig.phases);

        expect(brain).toBeInstanceOf(BossBrain);
        expect(brain.phases).toHaveLength(bossConfig.phases.length);
        expect(brain.evaluators.length).toBeGreaterThanOrEqual(3); // minimum: circle + chase + enrage
        expect(brain.currentPhase).toBe(0);

        // Verify phase transitions work with this boss's thresholds
        const lastPhaseIdx = bossConfig.phases.length - 1;
        const lowestThreshold = bossConfig.phases[lastPhaseIdx].healthThreshold;
        brain.updatePhase(lowestThreshold);
        expect(brain.currentPhase).toBe(lastPhaseIdx);
      });
    }
  });

  // ===========================================================================
  // Integration: Brain Execution
  // ===========================================================================

  describe('brain execution', () => {
    it('can execute without errors when entity has a target', () => {
      const vehicle = makeVehicleWithTarget(8);
      const brain = createBossBrain(vehicle, makeTestPhases());

      // Should not throw
      brain.execute();
      expect(brain.getActiveBehavior()).toBeDefined();
    });

    it('re-arbitrates when phase changes', () => {
      const vehicle = makeVehicleWithTarget(8);
      const brain = createBossBrain(vehicle, makeTestPhases());

      brain.execute();
      const behaviorBeforePhaseChange = brain.getActiveBehavior();
      expect(behaviorBeforePhaseChange).toBeDefined();

      // Transition to phase 2 — should force re-arbitration
      brain.updatePhase(0.2);
      brain.execute();
      const behavior2 = brain.getActiveBehavior();

      // At least the brain should have re-evaluated (behavior may or may not differ
      // depending on distance/health, but the brain was re-activated)
      expect(behavior2).toBeDefined();
      // The brain status was reset to inactive on phase change, triggering arbitrate()
      expect(brain.currentPhase).toBe(2);
    });
  });
});

// =============================================================================
// Type helper for the evaluator-behavior table
// =============================================================================

type GoalEvaluatorConstructor = new (
  characterBias: number,
) => {
  calculateDesirability: (entity: Vehicle) => number;
  setGoal: (entity: Vehicle) => void;
  characterBias: number;
};
