/**
 * @module movement
 * @role Apply velocity and resolve physics collisions
 * @input Koota entities with Position + Velocity traits
 * @output Updated Position traits, physics collision resolution
 * @depends traits, @dimforge/rapier3d
 * @tested MovementSystem.test.ts
 */

export { CollisionResolver } from './CollisionResolver.ts';
export { MovementSystem } from './MovementSystem.ts';
export { PhysicsWorld } from './PhysicsWorld.ts';
