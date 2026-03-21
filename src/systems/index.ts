/**
 * @module systems
 * @role Game logic systems (Koota queries)
 * @input Koota world with entity traits
 * @output Updated entity state per frame
 * @depends traits, content, ai
 * @tested combat/*.test.ts, movement/*.test.ts, spawning/*.test.ts, progression/*.test.ts, inventory/*.test.ts
 */
export { combatSystem } from './combat/index';
export { CollisionResolver, MovementSystem, PhysicsWorld } from './movement/index';
export { RunManager, TomeProgression, UnlockTracker } from './progression/index';
export { EnemySpawner, IslandPopulator, LootSpawner } from './spawning/index';
