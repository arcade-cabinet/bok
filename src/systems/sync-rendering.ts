/**
 * @module systems/sync-rendering
 * @role Copy Koota Transform positions to Three.js Object3D transforms
 *
 * Queries (Transform, Ref) and writes position/rotation from ECS to the Three.js scene graph.
 */
import type { World } from 'koota';
import type { Object3D } from 'three';
import { Ref, Transform } from '../traits';

export function syncRendering(world: World): void {
  world.query(Transform, Ref).updateEach(([transform, ref]) => {
    const obj = ref as Object3D | null;
    if (!obj) return;

    obj.position.copy(transform.position);
    obj.quaternion.copy(transform.quaternion);
  });
}
