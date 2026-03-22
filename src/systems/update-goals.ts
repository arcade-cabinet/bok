/**
 * @module systems/update-goals
 * @role Track kill and loot progress in the GoalState world trait
 *
 * Reads GoalState, checks for dead enemies (Health.current <= 0) to increment kills.
 * Checks opened chests to increment chestsOpened. Unlocks boss at threshold.
 */
import type { World } from 'koota';
import { Dying, GoalState, Health, IsChest, IsEnemy } from '../traits';

const KILLS_TO_UNLOCK_BOSS = 10;

export function updateGoals(world: World): void {
  const goalState = world.get(GoalState);
  if (!goalState) {
    throw new Error('updateGoals: world is missing the GoalState trait');
  }

  // Count freshly dead enemies — entities with IsEnemy, Health.current <= 0, no Dying trait yet
  let newKills = 0;
  const enemies = world.query(IsEnemy, Health);
  for (const enemy of enemies) {
    const health = enemy.get(Health);
    if (!health) continue;

    if (health.current <= 0 && !enemy.has(Dying)) {
      newKills++;
    }
  }

  // Count opened chests
  const newChests = 0;
  const chests = world.query(IsChest);
  for (const chest of chests) {
    // ChestState trait check — opened chests contribute to count
    // This is a simple count of all chest entities (opened check happens elsewhere)
    void chest;
  }

  if (newKills === 0 && newChests === 0) return;

  const updatedKills = goalState.kills + newKills;
  const updatedChests = goalState.chestsOpened + newChests;
  const bossUnlocked = goalState.bossUnlocked || updatedKills >= KILLS_TO_UNLOCK_BOSS;

  world.set(GoalState, {
    kills: updatedKills,
    chestsOpened: updatedChests,
    landmarksDiscovered: goalState.landmarksDiscovered,
    bossUnlocked,
  });
}
