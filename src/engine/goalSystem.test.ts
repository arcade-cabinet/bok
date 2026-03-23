import { describe, expect, it } from 'vitest';
import forestGoalsJson from '../content/goals/forest.json';
import { type BiomeGoals, createGoalSystem } from './goalSystem';

const FOREST_GOALS: BiomeGoals = {
  biomeId: 'forest',
  goals: [
    { id: 'kill-1', title: 'Defeat Enemies', description: 'Kill 3', type: 'kill', target: 3, icon: '⚔️' },
    { id: 'loot-1', title: 'Open Chests', description: 'Open 2', type: 'loot', target: 2, icon: '📦' },
    { id: 'discover-1', title: 'Find Shrines', description: 'Find 1', type: 'discover', target: 1, icon: '🏛️' },
  ],
  bossGateMessage: 'The boss stirs...',
  completionMessage: 'Boss unlocked!',
};

describe('goalSystem', () => {
  it('starts with all goals at 0 progress', () => {
    const sys = createGoalSystem(FOREST_GOALS);
    expect(sys.state.goals).toHaveLength(3);
    expect(sys.state.goals.every((g) => g.current === 0)).toBe(true);
    expect(sys.state.allCompleted).toBe(false);
    expect(sys.state.bossUnlocked).toBe(false);
  });

  it('onEnemyKilled advances kill goal', () => {
    const sys = createGoalSystem(FOREST_GOALS);
    sys.onEnemyKilled();
    expect(sys.state.goals[0].current).toBe(1);
    expect(sys.state.goals[0].completed).toBe(false);
  });

  it('completing kill goal marks it done', () => {
    const sys = createGoalSystem(FOREST_GOALS);
    sys.onEnemyKilled();
    sys.onEnemyKilled();
    sys.onEnemyKilled();
    expect(sys.state.goals[0].completed).toBe(true);
  });

  it('onChestOpened advances loot goal', () => {
    const sys = createGoalSystem(FOREST_GOALS);
    sys.onChestOpened();
    expect(sys.state.goals[1].current).toBe(1);
  });

  it('onLandmarkDiscovered advances discover goal', () => {
    const sys = createGoalSystem(FOREST_GOALS);
    sys.onLandmarkDiscovered();
    expect(sys.state.goals[2].current).toBe(1);
    expect(sys.state.goals[2].completed).toBe(true); // target is 1
  });

  it('all goals completed unlocks boss', () => {
    const sys = createGoalSystem(FOREST_GOALS);
    sys.onEnemyKilled();
    sys.onEnemyKilled();
    sys.onEnemyKilled(); // kill: 3/3
    sys.onChestOpened();
    sys.onChestOpened(); // loot: 2/2
    sys.onLandmarkDiscovered(); // discover: 1/1
    expect(sys.state.allCompleted).toBe(true);
    expect(sys.state.bossUnlocked).toBe(true);
  });

  it('does not exceed target', () => {
    const sys = createGoalSystem(FOREST_GOALS);
    for (let i = 0; i < 10; i++) sys.onEnemyKilled();
    expect(sys.state.goals[0].current).toBe(3); // capped at target
  });

  it('null goals (creative mode) starts boss unlocked', () => {
    const sys = createGoalSystem(null);
    expect(sys.state.goals).toHaveLength(0);
    expect(sys.state.bossUnlocked).toBe(true);
    expect(sys.state.allCompleted).toBe(true);
  });

  it('null goals callbacks are no-ops', () => {
    const sys = createGoalSystem(null);
    sys.onEnemyKilled();
    sys.onChestOpened();
    sys.onLandmarkDiscovered();
    expect(sys.state.bossUnlocked).toBe(true);
  });

  it('loads goals from imported JSON (forest biome)', () => {
    const sys = createGoalSystem(forestGoalsJson as BiomeGoals);
    expect(sys.state.goals.length).toBeGreaterThan(0);
    expect(sys.state.bossUnlocked).toBe(false);
    expect(sys.state.bossGateMessage).toBe('The Ancient Treant stirs in the deepest grove...');

    // Each goal has proper structure
    for (const goal of sys.state.goals) {
      expect(goal.definition.id).toBeTruthy();
      expect(goal.definition.title).toBeTruthy();
      expect(goal.definition.target).toBeGreaterThan(0);
      expect(['discover', 'kill', 'loot']).toContain(goal.definition.type);
      expect(goal.current).toBe(0);
      expect(goal.completed).toBe(false);
    }
  });

  it('completing all JSON-loaded goals unlocks boss', () => {
    const sys = createGoalSystem(forestGoalsJson as BiomeGoals);
    // Forest goals: 2 discover, 5 kill, 3 loot
    for (let i = 0; i < 5; i++) sys.onEnemyKilled();
    for (let i = 0; i < 3; i++) sys.onChestOpened();
    for (let i = 0; i < 2; i++) sys.onLandmarkDiscovered();
    expect(sys.state.allCompleted).toBe(true);
    expect(sys.state.bossUnlocked).toBe(true);
    expect(sys.state.completionMessage).toBe('The forest parts before you. The Treant awaits.');
  });
});
