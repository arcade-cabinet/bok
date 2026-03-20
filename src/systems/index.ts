/**
 * @module systems
 * @role Game logic systems (Koota queries)
 * @input Koota world with entity traits
 * @output Updated entity state per frame
 * @depends traits, content, ai
 * @tested combat/*.test.ts, movement/*.test.ts, spawning/*.test.ts, progression/*.test.ts, inventory/*.test.ts
 */
export { combatSystem } from './combat/index';
export { MovementSystem, PhysicsWorld, CollisionResolver } from './movement/index';
export { EnemySpawner, LootSpawner, IslandPopulator } from './spawning/index';
export { RunManager, UnlockTracker, TomeProgression } from './progression/index';
