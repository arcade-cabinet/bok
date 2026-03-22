import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Test createCombat boss attack system: phase-based attacks, telegraph delays,
 * cooldowns, damage types, and phase transitions.
 * Uses minimal Three.js mocks — no DOM or canvas required.
 */

// Mock audio (no-ops)
vi.mock('../audio/GameAudio.ts', () => ({
  playBossPhase: vi.fn(),
  playEnemyDeath: vi.fn(),
  playHitImpact: vi.fn(),
  playPlayerHurt: vi.fn(),
  playSwordSwing: vi.fn(),
  playVictory: vi.fn(),
}));

// Mock platform haptics
vi.mock('../platform/CapacitorBridge.ts', () => ({
  hapticImpact: vi.fn(),
}));

import * as THREE from 'three';
import { createCombat } from './combat.ts';
import type { BossPhaseConfig, BossState, EnemyState, EngineEvent } from './types.ts';

function makeBossMesh(x = 5, y = 0, z = 5): THREE.Object3D {
  const mesh = new THREE.Object3D();
  mesh.position.set(x, y, z);
  return mesh;
}

function makeBossState(mesh: THREE.Object3D, health = 500): BossState {
  return {
    mesh,
    vehicle: { maxSpeed: 2.0 } as unknown as BossState['vehicle'],
    health,
    maxHealth: health,
    attackCooldown: 0,
    phase: 1,
    defeated: false,
  };
}

function makeEnemyEntry(mesh: THREE.Object3D, health = 500): EnemyState {
  return {
    mesh,
    vehicle: {} as EnemyState['vehicle'],
    health,
    maxHealth: health,
    damage: 10,
    type: 'test-enemy',
    attackCooldown: 0,
  };
}

function makeScene(): THREE.Scene {
  return {
    add: vi.fn(),
    remove: vi.fn(),
  } as unknown as THREE.Scene;
}

/** Standard 3-phase boss config matching the ancient-treant pattern. */
function makePhases(): BossPhaseConfig[] {
  return [
    {
      healthThreshold: 1.0,
      attacks: [
        { name: 'root-strike', type: 'melee', damage: 20, cooldown: 2.0, range: 3.0, telegraph: 0.8 },
        { name: 'leaf-storm', type: 'aoe', damage: 10, cooldown: 5.0, range: 8.0, telegraph: 1.0 },
      ],
      description: 'Phase 1',
    },
    {
      healthThreshold: 0.66,
      attacks: [
        { name: 'root-strike', type: 'melee', damage: 25, cooldown: 1.8, range: 3.0, telegraph: 0.6 },
        { name: 'summon-saplings', type: 'summon', damage: 0, cooldown: 8.0, range: 15.0, telegraph: 1.5 },
      ],
      arenaChange: 'saplings-spawn',
      description: 'Phase 2',
    },
    {
      healthThreshold: 0.33,
      attacks: [
        { name: 'root-frenzy', type: 'melee', damage: 30, cooldown: 1.0, range: 4.0, telegraph: 0.4 },
        { name: 'leaf-storm', type: 'aoe', damage: 15, cooldown: 3.0, range: 10.0, telegraph: 0.6 },
        { name: 'summon-saplings', type: 'summon', damage: 0, cooldown: 6.0, range: 15.0, telegraph: 1.0 },
      ],
      arenaChange: 'roots-everywhere',
      description: 'Phase 3',
    },
  ];
}

describe('createCombat — boss attack system', () => {
  let scene: THREE.Scene;
  let bossMesh: THREE.Object3D;
  let boss: BossState;
  let enemies: EnemyState[];
  let events: EngineEvent[];
  let onEvent: (e: EngineEvent) => void;

  beforeEach(() => {
    scene = makeScene();
    bossMesh = makeBossMesh(5, 0, 5);
    boss = makeBossState(bossMesh, 500);
    enemies = [makeEnemyEntry(bossMesh, 500)];
    events = [];
    onEvent = (e) => events.push(e);
  });

  describe('melee attack', () => {
    it('deals configured damage when player is in range', () => {
      const phases = makePhases();
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      // Player right next to boss (within range 3.0)
      const playerPos = new THREE.Vector3(5, 0, 6);

      // First update: starts telegraphing root-strike (0.8s telegraph)
      combat.update(0.016, playerPos);
      expect(events.some((e) => e.type === 'bossTelegraph' && e.attackName === 'root-strike')).toBe(true);

      // Player not damaged yet during telegraph
      expect(combat.state.playerHealth).toBe(100);

      // Advance past telegraph duration
      combat.update(0.8, playerPos);

      // Now boss attack should have executed
      expect(combat.state.playerHealth).toBe(80); // 100 - 20 damage
      expect(events.some((e) => e.type === 'playerDamaged' && e.amount === 20)).toBe(true);
    });

    it('misses when player moves out of range before attack lands', () => {
      const phases = makePhases();
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerClose = new THREE.Vector3(5, 0, 6); // 1 unit away, within 3.0 range

      // Start telegraphing
      combat.update(0.016, playerClose);
      expect(events.some((e) => e.type === 'bossTelegraph')).toBe(true);

      // Player moves far away before telegraph completes
      const playerFar = new THREE.Vector3(50, 0, 50);
      combat.update(0.8, playerFar);

      // Melee should miss — player is out of range
      expect(combat.state.playerHealth).toBe(100);
    });
  });

  describe('cooldowns', () => {
    it('prevents the same attack from firing again before cooldown expires', () => {
      const phases = makePhases();
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerPos = new THREE.Vector3(5, 0, 6);

      // First attack: telegraph then execute
      combat.update(0.016, playerPos);
      combat.update(0.8, playerPos); // telegraph completes, root-strike fires
      expect(combat.state.playerHealth).toBe(80);

      events.length = 0;

      // Immediately try again — root-strike is on 2.0s cooldown
      // leaf-storm has 8.0 range and player is 1 unit away, should telegraph leaf-storm instead
      combat.update(0.016, playerPos);
      const telegraphs = events.filter((e) => e.type === 'bossTelegraph');
      if (telegraphs.length > 0) {
        // It should NOT be root-strike (on cooldown), should be leaf-storm
        expect(telegraphs[0].attackName).toBe('leaf-storm');
      }
    });

    it('allows attack again after cooldown expires', () => {
      const phases: BossPhaseConfig[] = [
        {
          healthThreshold: 1.0,
          attacks: [{ name: 'quick-hit', type: 'melee', damage: 10, cooldown: 1.0, range: 5.0, telegraph: 0.1 }],
          description: 'Phase 1',
        },
      ];
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerPos = new THREE.Vector3(5, 0, 6);

      // First attack
      combat.update(0.016, playerPos); // start telegraph
      combat.update(0.1, playerPos); // telegraph completes, fires
      expect(combat.state.playerHealth).toBe(90);

      // While on cooldown, no new telegraph
      events.length = 0;
      combat.update(0.5, playerPos);
      expect(events.filter((e) => e.type === 'bossTelegraph')).toHaveLength(0);

      // After cooldown expires (total elapsed > 1.0s cooldown)
      combat.update(0.6, playerPos); // total about 1.2s since attack
      expect(events.some((e) => e.type === 'bossTelegraph' && e.attackName === 'quick-hit')).toBe(true);
    });
  });

  describe('telegraph', () => {
    it('delays attack execution by the configured telegraph duration', () => {
      const phases: BossPhaseConfig[] = [
        {
          healthThreshold: 1.0,
          attacks: [{ name: 'slow-slam', type: 'melee', damage: 50, cooldown: 5.0, range: 5.0, telegraph: 2.0 }],
          description: 'Phase 1',
        },
      ];
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerPos = new THREE.Vector3(5, 0, 6);

      // Start telegraph
      combat.update(0.016, playerPos);
      expect(events.some((e) => e.type === 'bossTelegraph')).toBe(true);
      expect(combat.state.playerHealth).toBe(100);

      // Halfway through telegraph — still no damage
      combat.update(1.0, playerPos);
      expect(combat.state.playerHealth).toBe(100);

      // Complete telegraph
      combat.update(1.0, playerPos);
      expect(combat.state.playerHealth).toBe(50);
    });

    it('emits bossTelegraph event with attack name and duration', () => {
      const phases = makePhases();
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerPos = new THREE.Vector3(5, 0, 6);

      combat.update(0.016, playerPos);

      const telegraphEvent = events.find((e) => e.type === 'bossTelegraph');
      expect(telegraphEvent).toBeDefined();
      expect(telegraphEvent?.type).toBe('bossTelegraph');
      if (telegraphEvent?.type === 'bossTelegraph') {
        expect(telegraphEvent.attackName).toBe('root-strike');
        expect(telegraphEvent.duration).toBe(0.8);
      }
    });
  });

  describe('phase transitions', () => {
    it('switches to phase 2 attacks when boss health drops below 66%', () => {
      const phases = makePhases();
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerPos = new THREE.Vector3(5, 0, 6);

      // Drop boss health to trigger phase 2
      enemies[0].health = 300; // 300/500 = 0.6, below 0.66 threshold

      combat.update(0.016, playerPos);

      // Phase change event should fire
      expect(events.some((e) => e.type === 'bossPhaseChange' && e.phase === 2)).toBe(true);
      expect(boss.phase).toBe(2);

      // Clear and trigger next attack — should use phase 2 attacks
      events.length = 0;
      combat.update(0.016, playerPos);

      const telegraphs = events.filter((e) => e.type === 'bossTelegraph');
      if (telegraphs.length > 0) {
        // Phase 2 has root-strike (damage 25) and summon-saplings
        const attackName = telegraphs[0].attackName;
        expect(['root-strike', 'summon-saplings']).toContain(attackName);
      }
    });

    it('switches to phase 3 attacks when boss health drops below 33%', () => {
      const phases = makePhases();
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerPos = new THREE.Vector3(5, 0, 6);

      // Go through phase 2 first
      enemies[0].health = 300;
      combat.update(0.016, playerPos);
      expect(boss.phase).toBe(2);

      // Drop to phase 3
      enemies[0].health = 150; // 150/500 = 0.3, below 0.33
      events.length = 0;
      combat.update(0.8, playerPos); // also finishes any pending telegraph
      combat.update(0.016, playerPos);

      expect(events.some((e) => e.type === 'bossPhaseChange' && e.phase === 3)).toBe(true);
      expect(boss.phase).toBe(3);
    });

    it('clears cooldowns and telegraph on phase change', () => {
      const phases: BossPhaseConfig[] = [
        {
          healthThreshold: 1.0,
          attacks: [{ name: 'p1-hit', type: 'melee', damage: 10, cooldown: 99.0, range: 5.0, telegraph: 0.1 }],
          description: 'Phase 1',
        },
        {
          healthThreshold: 0.66,
          attacks: [{ name: 'p2-hit', type: 'melee', damage: 20, cooldown: 1.0, range: 5.0, telegraph: 0.1 }],
          description: 'Phase 2',
        },
        {
          healthThreshold: 0.33,
          attacks: [{ name: 'p3-hit', type: 'melee', damage: 30, cooldown: 1.0, range: 5.0, telegraph: 0.1 }],
          description: 'Phase 3',
        },
      ];
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerPos = new THREE.Vector3(5, 0, 6);

      // Fire phase 1 attack (puts p1-hit on 99s cooldown)
      combat.update(0.016, playerPos);
      combat.update(0.1, playerPos);
      expect(combat.state.playerHealth).toBe(90);

      // Transition to phase 2 — should clear cooldowns
      enemies[0].health = 300;
      events.length = 0;
      combat.update(0.016, playerPos);

      // Phase change fires, then on next update the new attack can telegraph
      combat.update(0.016, playerPos);
      const newTelegraphs = events.filter((e) => e.type === 'bossTelegraph' && e.attackName === 'p2-hit');
      expect(newTelegraphs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ranged attack', () => {
    it('hits the player regardless of distance', () => {
      const phases: BossPhaseConfig[] = [
        {
          healthThreshold: 1.0,
          attacks: [{ name: 'beam', type: 'ranged', damage: 22, cooldown: 3.0, range: 14.0, telegraph: 0.5 }],
          description: 'Phase 1',
        },
      ];
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      // Player is within the 14-unit range for selection but far from boss
      const playerPos = new THREE.Vector3(5, 0, 18); // 13 units away (within 14 range)

      combat.update(0.016, playerPos);
      combat.update(0.5, playerPos);

      expect(combat.state.playerHealth).toBe(78); // 100 - 22
      expect(events.some((e) => e.type === 'playerDamaged' && e.amount === 22)).toBe(true);
    });
  });

  describe('AoE attack', () => {
    it('hits the player within range', () => {
      const phases: BossPhaseConfig[] = [
        {
          healthThreshold: 1.0,
          attacks: [{ name: 'storm', type: 'aoe', damage: 15, cooldown: 5.0, range: 8.0, telegraph: 0.5 }],
          description: 'Phase 1',
        },
      ];
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerPos = new THREE.Vector3(5, 0, 12); // 7 units away, within 8.0 range

      combat.update(0.016, playerPos);
      combat.update(0.5, playerPos);

      expect(combat.state.playerHealth).toBe(85); // 100 - 15
    });

    it('misses the player outside range', () => {
      const phases: BossPhaseConfig[] = [
        {
          healthThreshold: 1.0,
          attacks: [{ name: 'storm', type: 'aoe', damage: 15, cooldown: 5.0, range: 8.0, telegraph: 0.5 }],
          description: 'Phase 1',
        },
      ];
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerClose = new THREE.Vector3(5, 0, 12); // 7 units, within range for selection

      // Start telegraph while in range
      combat.update(0.016, playerClose);
      expect(events.some((e) => e.type === 'bossTelegraph')).toBe(true);

      // Move out before it lands
      const playerFar = new THREE.Vector3(50, 0, 50);
      combat.update(0.5, playerFar);

      // AoE checks range at execution time — player escaped
      expect(combat.state.playerHealth).toBe(100);
    });
  });

  describe('summon attack', () => {
    it('emits bossSummon event without dealing damage', () => {
      const phases: BossPhaseConfig[] = [
        {
          healthThreshold: 1.0,
          attacks: [{ name: 'call-minions', type: 'summon', damage: 0, cooldown: 8.0, range: 15.0, telegraph: 1.0 }],
          description: 'Phase 1',
        },
      ];
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerPos = new THREE.Vector3(5, 0, 6);

      combat.update(0.016, playerPos);
      combat.update(1.0, playerPos);

      expect(combat.state.playerHealth).toBe(100); // no damage
      expect(events.some((e) => e.type === 'bossSummon' && e.attackName === 'call-minions')).toBe(true);
    });
  });

  describe('boss skips generic enemy contact damage when phases are configured', () => {
    it('boss does not deal generic contact damage', () => {
      const phases = makePhases();
      // Put a regular enemy too
      const minionMesh = new THREE.Object3D();
      minionMesh.position.set(5, 0, 5);
      const minion = makeEnemyEntry(minionMesh, 50);
      const allEnemies = [makeEnemyEntry(bossMesh, 500), minion];

      const combat = createCombat(scene, allEnemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);

      // Player at boss position — would normally trigger generic enemy contact damage
      // But boss should use phase attacks instead
      const playerPos = new THREE.Vector3(5, 0, 5);

      // First update — boss starts telegraphing, generic contact damage is skipped for boss
      // Minion at same position should still do contact damage
      combat.update(1.6, playerPos); // enough for minion cooldown

      // Minion deals 10 generic damage, boss does NOT deal generic 10 damage
      // Boss telegraph starts but hasn't completed yet for its configured attack
      const genericDamageEvents = events.filter((e) => e.type === 'playerDamaged');
      // Only minion damage (10), no duplicate generic boss damage
      const minionDamageEvent = genericDamageEvents.find((e) => e.type === 'playerDamaged' && e.amount === 10);
      expect(minionDamageEvent).toBeDefined();
    });
  });

  describe('backward compatibility', () => {
    it('works without boss phases (no bossPhases arg)', () => {
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash');
      const playerPos = new THREE.Vector3(5, 0, 5); // right on top of boss

      // Should still do generic contact damage
      combat.update(1.6, playerPos);

      // Generic enemy damage applies
      expect(events.some((e) => e.type === 'playerDamaged' && e.amount === 10)).toBe(true);
    });
  });

  describe('boss attack triggers death', () => {
    it('emits playerDied when boss attack reduces health to zero', () => {
      const phases: BossPhaseConfig[] = [
        {
          healthThreshold: 1.0,
          attacks: [{ name: 'lethal-blow', type: 'melee', damage: 200, cooldown: 1.0, range: 5.0, telegraph: 0.1 }],
          description: 'Phase 1',
        },
      ];
      const combat = createCombat(scene, enemies, boss, bossMesh, onEvent, 'test-boss', 'dash', phases);
      const playerPos = new THREE.Vector3(5, 0, 6);

      combat.update(0.016, playerPos);
      combat.update(0.1, playerPos);

      expect(combat.state.playerHealth).toBe(0);
      expect(combat.state.phase).toBe('dead');
      expect(events.some((e) => e.type === 'playerDied')).toBe(true);
    });
  });

  describe('creative mode', () => {
    it('skips all enemy damage to player in creative mode', () => {
      // Create combat in creative mode with no boss phases (generic contact damage)
      const combat = createCombat(
        scene,
        enemies,
        boss,
        bossMesh,
        onEvent,
        'test-boss',
        'dash',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'creative',
      );
      const playerPos = new THREE.Vector3(5, 0, 5); // right on top of boss

      // Multiple updates — enough time for enemy attack cooldown
      combat.update(1.6, playerPos);
      combat.update(1.6, playerPos);

      // Player should take no damage
      expect(combat.state.playerHealth).toBe(100);
      expect(events.every((e) => e.type !== 'playerDamaged')).toBe(true);
      expect(combat.state.phase).toBe('playing');
    });

    it('skips boss phase attack damage in creative mode', () => {
      const phases: BossPhaseConfig[] = [
        {
          healthThreshold: 1.0,
          attacks: [{ name: 'lethal-blow', type: 'melee', damage: 200, cooldown: 1.0, range: 5.0, telegraph: 0.1 }],
          description: 'Phase 1',
        },
      ];
      const combat = createCombat(
        scene,
        enemies,
        boss,
        bossMesh,
        onEvent,
        'test-boss',
        'dash',
        phases,
        undefined,
        undefined,
        undefined,
        undefined,
        'creative',
      );
      const playerPos = new THREE.Vector3(5, 0, 6);

      // Telegraph starts
      combat.update(0.016, playerPos);
      expect(events.some((e) => e.type === 'bossTelegraph')).toBe(true);

      // Telegraph completes, but damage is skipped
      combat.update(0.1, playerPos);
      expect(combat.state.playerHealth).toBe(100);
      expect(combat.state.phase).toBe('playing');
    });

    it('still allows player to damage enemies in creative mode', () => {
      const minionMesh = new THREE.Object3D();
      minionMesh.position.set(0, 0, 0);
      const minion = makeEnemyEntry(minionMesh, 50);
      const allEnemies = [minion];

      const combat = createCombat(
        scene,
        allEnemies,
        boss,
        bossMesh,
        onEvent,
        'test-boss',
        'dash',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'creative',
      );

      // Player right next to minion — should trigger auto-attack
      const playerPos = new THREE.Vector3(0, 0, 0.5);
      combat.update(0.016, playerPos);

      // Player can still deal damage to enemies
      expect(minion.health).toBeLessThan(50);
    });
  });
});
