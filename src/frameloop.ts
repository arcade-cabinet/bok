/**
 * @module frameloop
 * @role Orchestrate all ECS systems in the correct order each frame
 *
 * Pure function that runs one frame of game logic by calling systems in sequence.
 * Systems only interact through the Koota world — no direct dependencies between them.
 */
import type { World } from 'koota';
import { spawnEnemies } from './systems/spawn-enemies';
import { syncRendering } from './systems/sync-rendering';
import { updateCombat } from './systems/update-combat';
import { updateEnemyAI } from './systems/update-enemy-ai';
import { updateGoals } from './systems/update-goals';
import { updateMovement } from './systems/update-movement';
import { updateTime } from './systems/update-time';

/**
 * Run one frame of game logic.
 *
 * System execution order:
 * 1. updateTime — write dt into world so other systems can read it
 * 2. spawnEnemies — spawn new enemies if below max
 * 3. updateEnemyAI — update AI decisions and Yuka vehicles
 * 4. updateCombat — resolve attacks and contact damage
 * 5. updateMovement — apply velocity/damping to all entities
 * 6. updateGoals — track kill/loot progress
 * 7. syncRendering — copy ECS transforms to Three.js objects
 *
 * updateChunks is not included here because it requires a ChunkWorld instance.
 * Wire it separately via createUpdateChunks().
 */
export function runFrame(world: World, dt: number): void {
  updateTime(world, dt);
  spawnEnemies(world);
  updateEnemyAI(world);
  updateCombat(world);
  updateMovement(world);
  updateGoals(world);
  syncRendering(world);
}
