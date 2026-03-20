import RAPIER from '@dimforge/rapier3d';
import type { World as KootaWorld } from 'koota';
import { Position } from '../../traits/index.ts';

export class PhysicsWorld {
  readonly rapierWorld: RAPIER.World;
  readonly #bodies = new Map<number, RAPIER.RigidBody>();
  readonly #eventQueue: RAPIER.EventQueue;

  constructor() {
    this.rapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.#eventQueue = new RAPIER.EventQueue(true);
  }

  createKinematicBody(entityId: number, halfExtents = { x: 0.4, y: 0.9, z: 0.4 }): RAPIER.RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
    const body = this.rapierWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z);
    this.rapierWorld.createCollider(colliderDesc, body);
    this.#bodies.set(entityId, body);
    return body;
  }

  removeBody(entityId: number): void {
    const body = this.#bodies.get(entityId);
    if (body) {
      this.rapierWorld.removeRigidBody(body);
      this.#bodies.delete(entityId);
    }
  }

  step(): void {
    this.rapierWorld.step(this.#eventQueue);
  }

  syncToKoota(world: KootaWorld): void {
    for (const [entityId, body] of this.#bodies) {
      const translation = body.translation();
      // Find the entity by ID and update its Position trait
      const entities = world.entities;
      for (const entity of entities) {
        if (entity.id() === entityId && entity.has(Position)) {
          entity.set(Position, { x: translation.x, y: translation.y, z: translation.z });
          break;
        }
      }
    }
  }

  get eventQueue(): RAPIER.EventQueue {
    return this.#eventQueue;
  }

  destroy(): void {
    this.rapierWorld.free();
  }
}
