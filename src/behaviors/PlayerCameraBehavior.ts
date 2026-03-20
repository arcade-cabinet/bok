import { ActorComponent } from '@jolly-pixel/engine';
import * as THREE from 'three';

/**
 * First-person camera controller. Reads pointer lock mouse deltas.
 */
export class PlayerCameraBehavior extends ActorComponent {
  readonly #euler = new THREE.Euler(0, 0, 0, 'YXZ');
  readonly #sensitivity = 0.002;
  #pitchMin = -Math.PI / 2 + 0.01;
  #pitchMax = Math.PI / 2 - 0.01;
  camera: THREE.PerspectiveCamera | null = null;

  applyLook(deltaX: number, deltaY: number): void {
    if (!this.camera) return;
    this.#euler.setFromQuaternion(this.camera.quaternion);
    this.#euler.y -= deltaX * this.#sensitivity;
    this.#euler.x -= deltaY * this.#sensitivity;
    this.#euler.x = Math.max(this.#pitchMin, Math.min(this.#pitchMax, this.#euler.x));
    this.camera.quaternion.setFromEuler(this.#euler);
  }
}
