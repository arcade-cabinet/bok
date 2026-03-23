/**
 * @module engine/goalSystem
 * @role Track per-biome goals for Survival mode
 * @input Goal definitions from content, engine events
 * @output Goal progress state for HUD
 *
 * Goals are optional — they unlock the boss fight but don't prevent exploration.
 * In Creative mode, goals are disabled entirely.
 */

export interface GoalDefinition {
  id: string;
  title: string;
  description: string;
  type: 'discover' | 'kill' | 'loot' | 'gather';
  target: number;
  icon: string;
  /** For 'gather' type: which resource ID to track */
  resourceId?: string;
}

export interface GoalProgress {
  definition: GoalDefinition;
  current: number;
  completed: boolean;
}

export interface GoalSystemState {
  goals: GoalProgress[];
  allCompleted: boolean;
  bossUnlocked: boolean;
  bossGateMessage: string;
  completionMessage: string;
}

export interface BiomeGoals {
  biomeId: string;
  goals: GoalDefinition[];
  bossGateMessage: string;
  completionMessage: string;
}

/**
 * Creates a goal tracking system for a biome.
 * Returns methods to advance goal progress and query state.
 *
 * @param biomeGoals - Goal definitions for the biome (null = Creative mode / no goals)
 * @param restoredGoalIds - Previously completed goal IDs to restore (from persistence)
 */
export function createGoalSystem(
  biomeGoals: BiomeGoals | null,
  restoredGoalIds?: string[],
): {
  state: GoalSystemState;
  onEnemyKilled: () => void;
  onChestOpened: () => void;
  onLandmarkDiscovered: () => void;
  onResourceGathered: (resourceId: string) => void;
  /** Get the IDs of all completed goals (for persistence). */
  getCompletedGoalIds: () => string[];
} {
  // No goals in Creative mode or if biome has no goals defined
  if (!biomeGoals) {
    return {
      state: {
        goals: [],
        allCompleted: true,
        bossUnlocked: true,
        bossGateMessage: '',
        completionMessage: '',
      },
      onEnemyKilled: () => {},
      onChestOpened: () => {},
      onLandmarkDiscovered: () => {},
      onResourceGathered: () => {},
      getCompletedGoalIds: () => [],
    };
  }

  const restoredSet = new Set(restoredGoalIds ?? []);

  const goals: GoalProgress[] = biomeGoals.goals.map((g) => {
    const wasCompleted = restoredSet.has(g.id);
    return {
      definition: g,
      current: wasCompleted ? g.target : 0,
      completed: wasCompleted,
    };
  });

  const state: GoalSystemState = {
    goals,
    allCompleted: false,
    bossUnlocked: false,
    bossGateMessage: biomeGoals.bossGateMessage,
    completionMessage: biomeGoals.completionMessage,
  };

  function checkCompletion() {
    state.allCompleted = goals.every((g) => g.completed);
    if (state.allCompleted && !state.bossUnlocked) {
      state.bossUnlocked = true;
    }
  }

  function advanceGoal(type: GoalDefinition['type'], resourceId?: string) {
    for (const goal of goals) {
      if (goal.definition.type === type && !goal.completed) {
        // For gather goals, only advance if the resourceId matches
        if (type === 'gather' && goal.definition.resourceId && goal.definition.resourceId !== resourceId) {
          continue;
        }
        goal.current = Math.min(goal.current + 1, goal.definition.target);
        if (goal.current >= goal.definition.target) {
          goal.completed = true;
        }
        break; // Only advance one goal of this type per event
      }
    }
    checkCompletion();
  }

  // Check if restored goals already satisfy completion
  checkCompletion();

  return {
    state,
    onEnemyKilled: () => advanceGoal('kill'),
    onChestOpened: () => advanceGoal('loot'),
    onLandmarkDiscovered: () => advanceGoal('discover'),
    onResourceGathered: (resourceId: string) => advanceGoal('gather', resourceId),
    getCompletedGoalIds: () => goals.filter((g) => g.completed).map((g) => g.definition.id),
  };
}
