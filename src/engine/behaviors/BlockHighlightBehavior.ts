/**
 * Block highlight — wireframe box on the block the player is looking at.
 * Uses raycasting from box.html's getLookingAt().
 */

import * as THREE from "three";
import { Behavior } from "@jolly-pixel/engine";

export class BlockHighlightBehavior extends Behavior {
  private highlight!: THREE.LineSegments;
  private camera!: THREE.PerspectiveCamera;
  private getVoxelFn!: (x: number, y: number, z: number) => number;

  private raycaster = new THREE.Raycaster();
  private center = new THREE.Vector2(0, 0);

  // Exposed for external reads (mining system, block placement)
  public lastHit: { x: number; y: number; z: number; id: number } | null = null;
  public lastPrev: { x: number; y: number; z: number } | null = null;

  setup(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    getVoxel: (x: number, y: number, z: number) => number,
  ) {
    this.camera = camera;
    this.getVoxelFn = getVoxel;
    this.raycaster.far = 6;

    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        transparent: true,
        opacity: 0.5,
      }),
    );
    this.highlight.visible = false;
    scene.add(this.highlight);
  }

  awake() {
    this.needUpdate = true;
  }

  update(_dt: number) {
    this.raycaster.setFromCamera(this.center, this.camera);
    let t = 0;
    const step = 0.05;
    const ray = this.raycaster.ray;
    const pos = new THREE.Vector3();

    this.lastHit = null;
    this.lastPrev = null;

    while (t < 6) {
      ray.at(t, pos);
      const vx = Math.floor(pos.x);
      const vy = Math.floor(pos.y);
      const vz = Math.floor(pos.z);
      const blockId = this.getVoxelFn(vx, vy, vz);
      if (blockId > 0 && blockId !== 7) {
        this.lastHit = { x: vx, y: vy, z: vz, id: blockId };
        break;
      }
      this.lastPrev = { x: vx, y: vy, z: vz };
      t += step;
    }

    if (this.lastHit) {
      this.highlight.position.set(
        this.lastHit.x + 0.5,
        this.lastHit.y + 0.5,
        this.lastHit.z + 0.5,
      );
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
  }
}
