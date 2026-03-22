import type { ActionMap } from './ActionMap.ts';

export class KeyboardMouseDevice {
  readonly #actionMap: ActionMap;
  #mouseDeltaX = 0;
  #mouseDeltaY = 0;
  #mouseLeftDown = false;
  #mouseRightDown = false;
  #attached = false;

  constructor(actionMap: ActionMap) {
    this.#actionMap = actionMap;
  }

  attach(canvas: HTMLCanvasElement): void {
    if (this.#attached) return;
    this.#attached = true;

    document.addEventListener('keydown', (e) => {
      this.#actionMap.setKeyDown(e.code);
    });
    document.addEventListener('keyup', (e) => {
      this.#actionMap.setKeyUp(e.code);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.#mouseLeftDown = true;
      if (e.button === 2) this.#mouseRightDown = true;
    });
    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.#mouseLeftDown = false;
      if (e.button === 2) this.#mouseRightDown = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      // Only accumulate mouse deltas when pointer is locked to prevent
      // camera flying off on first pointer lock acquisition
      if (document.pointerLockElement === canvas) {
        this.#mouseDeltaX += e.movementX;
        this.#mouseDeltaY += e.movementY;
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get attackDown(): boolean {
    return this.#mouseLeftDown;
  }
  get parryDown(): boolean {
    return this.#mouseRightDown;
  }
  get mouseDeltaX(): number {
    return this.#mouseDeltaX;
  }
  get mouseDeltaY(): number {
    return this.#mouseDeltaY;
  }

  consumeMouseDelta(): { x: number; y: number } {
    const result = { x: this.#mouseDeltaX, y: this.#mouseDeltaY };
    this.#mouseDeltaX = 0;
    this.#mouseDeltaY = 0;
    return result;
  }
}
