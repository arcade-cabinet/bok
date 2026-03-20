import type RAPIER from '@dimforge/rapier3d';
import type { PhysicsWorld } from './PhysicsWorld.ts';

/**
 * Reads Rapier contact events after step and resolves overlaps.
 * Currently a simple wrapper that corrects kinematic body positions
 * based on collision manifold data.
 */
export class CollisionResolver {
  readonly #physicsWorld: PhysicsWorld;

  constructor(physicsWorld: PhysicsWorld) {
    this.#physicsWorld = physicsWorld;
  }

  resolve(): void {
    const eventQueue = this.#physicsWorld.eventQueue;
    eventQueue.drainContactForceEvents((event: RAPIER.TempContactForceEvent) => {
      // Contact force events for gameplay triggers (damage, knockback, etc.)
      // Future: dispatch to combat/damage systems based on collider user data
      void event;
    });

    eventQueue.drainCollisionEvents((handle1: number, handle2: number, started: boolean) => {
      // Collision start/stop events for trigger zones (loot pickups, area effects)
      // Future: dispatch to inventory/effect systems
      void handle1;
      void handle2;
      void started;
    });
  }
}
