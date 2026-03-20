import { ActorComponent } from '@jolly-pixel/engine';
import * as THREE from 'three';
import type { Entity } from 'koota';
import { Position, Rotation } from '../traits/index.ts';

/**
 * Syncs a JollyPixel Actor's transform from a Koota entity's Position/Rotation traits.
 * Attach to any Actor that represents a Koota entity visually.
 */
export class RenderSyncBehavior extends ActorComponent {
  entity: Entity | null = null;

  private static readonly _euler = new THREE.Euler();

  update(): void {
    if (!this.entity) return;
    const pos = this.entity.get(Position);
    if (pos) {
      this.actor.transform.setLocalPosition(pos);
    }
    const rot = this.entity.get(Rotation);
    if (rot) {
      RenderSyncBehavior._euler.set(rot.x, rot.y, rot.z);
      this.actor.transform.setLocalEulerAngles(RenderSyncBehavior._euler);
    }
  }
}
