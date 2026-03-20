import type RAPIER from '@dimforge/rapier3d';
import type { PhysicsWorld } from './PhysicsWorld.ts';

/**
 * Reads Rapier contact events after step and resolves overlaps.
 * Corrects kinematic body positions based on collision manifold data
 * so entities don't walk through terrain or each other.
 */
export class CollisionResolver {
  readonly #physicsWorld: PhysicsWorld;

  constructor(physicsWorld: PhysicsWorld) {
    this.#physicsWorld = physicsWorld;
  }

  resolve(): void {
    const rapier = this.#physicsWorld.rapierWorld;
    const eventQueue = this.#physicsWorld.eventQueue;

    eventQueue.drainContactForceEvents((event: RAPIER.TempContactForceEvent) => {
      const collider1 = rapier.getCollider(event.collider1());
      const collider2 = rapier.getCollider(event.collider2());
      if (!collider1 || !collider2) return;

      const body1 = collider1.parent();
      const body2 = collider2.parent();
      if (!body1 || !body2) return;

      // Push kinematic bodies out of collision along the contact normal
      rapier.contactPair(collider1, collider2, (manifold, _flipped) => {
        const normal = manifold.normal();
        const depth = manifold.contactDist();
        if (depth >= 0 || !normal) return;

        const penetration = -depth;

        if (body1.isKinematic() && !body2.isKinematic()) {
          const pos = body1.translation();
          body1.setTranslation(
            { x: pos.x + normal.x * penetration, y: pos.y + normal.y * penetration, z: pos.z + normal.z * penetration },
            true,
          );
        } else if (body2.isKinematic() && !body1.isKinematic()) {
          const pos = body2.translation();
          body2.setTranslation(
            { x: pos.x - normal.x * penetration, y: pos.y - normal.y * penetration, z: pos.z - normal.z * penetration },
            true,
          );
        }
      });
    });

    eventQueue.drainCollisionEvents((handle1: number, handle2: number, started: boolean) => {
      // Collision start/stop events for trigger zones (loot pickups, area effects)
      void handle1;
      void handle2;
      void started;
    });
  }
}
