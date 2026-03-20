import RAPIER from '@dimforge/rapier3d';
import type { World as KootaWorld, Entity } from 'koota';
import { Position } from '../../traits/index.ts';

export class PhysicsWorld {
  readonly rapierWorld: RAPIER.World;
  readonly #bodies = new Map<number, RAPIER.RigidBody>();
  readonly #entityMap = new Map<number, Entity>();
  readonly #eventQueue: RAPIER.EventQueue;

  constructor() {
    this.rapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.#eventQueue = new RAPIER.EventQueue(true);
  }

  createKinematicBody(entityId: number, entity: Entity, halfExtents = { x: 0.4, y: 0.9, z: 0.4 }): RAPIER.RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
    const body = this.rapierWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z);
    this.rapierWorld.createCollider(colliderDesc, body);
    this.#bodies.set(entityId, body);
    this.#entityMap.set(entityId, entity);
    return body;
  }

  removeBody(entityId: number): void {
    const body = this.#bodies.get(entityId);
    if (body) {
      this.rapierWorld.removeRigidBody(body);
      this.#bodies.delete(entityId);
      this.#entityMap.delete(entityId);
    }
  }

  step(): void {
    this.rapierWorld.step(this.#eventQueue);
  }

  syncToKoota(_world: KootaWorld): void {
    for (const [entityId, body] of this.#bodies) {
      const entity = this.#entityMap.get(entityId);
      if (entity && entity.has(Position)) {
        const translation = body.translation();
        entity.set(Position, { x: translation.x, y: translation.y, z: translation.z });
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
