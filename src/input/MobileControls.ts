/**
 * Split-half touch controls for mobile.
 * Left half: drag to move (relative to initial touch point)
 * Right half: drag to look around (camera rotation)
 * Double-tap right side: attack
 *
 * This matches the desktop paradigm: WASD (left) + mouse (right).
 */

export interface MobileControlState {
  moveX: number;  // -1 to 1
  moveZ: number;  // -1 to 1
  lookDX: number; // pixels this frame
  lookDY: number;
  attacking: boolean;
}

export class MobileControls {
  readonly #state: MobileControlState = {
    moveX: 0, moveZ: 0, lookDX: 0, lookDY: 0, attacking: false,
  };

  // Left half: movement
  #moveTouchId: number | null = null;
  #moveOriginX = 0;
  #moveOriginY = 0;
  readonly #moveRadius = 60; // pixels from origin = full speed

  // Right half: camera
  #cameraTouchId: number | null = null;
  #cameraLastX = 0;
  #cameraLastY = 0;

  // Double-tap detection for attack
  #lastTapTime = 0;

  #overlay: HTMLDivElement;
  #attackBtn: HTMLDivElement;
  #onOrientationChange: () => void;

  constructor() {
    // Minimal overlay — just shows split indicator
    this.#overlay = document.createElement('div');
    this.#overlay.id = 'mobile-controls';
    this.#overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:90;pointer-events:none;display:none;';

    // Split line indicator
    const splitLine = document.createElement('div');
    splitLine.style.cssText = 'position:absolute;top:10%;left:50%;width:1px;height:80%;background:rgba(255,255,255,0.1);';

    // Labels
    const moveLabel = document.createElement('div');
    moveLabel.textContent = 'MOVE';
    moveLabel.style.cssText = 'position:absolute;bottom:20px;left:25%;transform:translateX(-50%);color:rgba(255,255,255,0.2);font-family:Georgia,serif;font-size:12px;';
    const lookLabel = document.createElement('div');
    lookLabel.textContent = 'LOOK';
    lookLabel.style.cssText = 'position:absolute;bottom:20px;left:75%;transform:translateX(-50%);color:rgba(255,255,255,0.2);font-family:Georgia,serif;font-size:12px;';

    // Attack button (bottom right) — scaled to screen
    this.#attackBtn = document.createElement('div');
    this.#attackBtn.textContent = 'ATK';
    this.#updateAttackBtnSize();
    this.#attackBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.#state.attacking = true; }, { passive: false });

    this.#overlay.append(splitLine, moveLabel, lookLabel, this.#attackBtn);
    document.body.appendChild(this.#overlay);

    // Touch handlers on canvas
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    if (canvas) {
      canvas.addEventListener('touchstart', this.#onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', this.#onTouchMove, { passive: false });
      canvas.addEventListener('touchend', this.#onTouchEnd, { passive: false });
    }

    // Recalculate on orientation change
    this.#onOrientationChange = () => {
      this.#updateAttackBtnSize();
    };
    window.addEventListener('resize', this.#onOrientationChange);
    window.addEventListener('orientationchange', this.#onOrientationChange);
  }

  #updateAttackBtnSize(): void {
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const size = Math.max(48, Math.min(72, Math.round(minDim * 0.12)));
    const fontSize = Math.max(11, Math.round(size * 0.23));
    this.#attackBtn.style.cssText = `position:absolute;bottom:30px;right:30px;width:${size}px;height:${size}px;border-radius:50%;background:rgba(192,57,43,0.6);border:2px solid rgba(192,57,43,0.8);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:${fontSize}px;color:#fdf6e3;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;`;
  }

  show(): void { this.#overlay.style.display = ''; }
  hide(): void { this.#overlay.style.display = 'none'; }

  get state(): MobileControlState { return this.#state; }

  consumeLookDelta(): { x: number; y: number } {
    const result = { x: this.#state.lookDX, y: this.#state.lookDY };
    this.#state.lookDX = 0;
    this.#state.lookDY = 0;
    return result;
  }

  consumeAttack(): boolean {
    const v = this.#state.attacking;
    this.#state.attacking = false;
    return v;
  }

  #spawnTouchFeedback(x: number, y: number): void {
    const circle = document.createElement('div');
    circle.style.cssText = `position:fixed;left:${x - 20}px;top:${y - 20}px;width:40px;height:40px;border-radius:50%;border:2px solid rgba(253,246,227,0.5);pointer-events:none;z-index:91;`;
    document.body.appendChild(circle);
    circle.animate([
      { opacity: 0.6, transform: 'scale(0.5)' },
      { opacity: 0, transform: 'scale(1.2)' },
    ], { duration: 300, easing: 'ease-out' });
    setTimeout(() => circle.remove(), 300);
  }

  #onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const halfW = window.innerWidth / 2;

    for (const touch of Array.from(e.changedTouches)) {
      this.#spawnTouchFeedback(touch.clientX, touch.clientY);

      if (touch.clientX < halfW && this.#moveTouchId === null) {
        // Left half — movement origin
        this.#moveTouchId = touch.identifier;
        this.#moveOriginX = touch.clientX;
        this.#moveOriginY = touch.clientY;
      } else if (touch.clientX >= halfW && this.#cameraTouchId === null) {
        // Right half — camera
        this.#cameraTouchId = touch.identifier;
        this.#cameraLastX = touch.clientX;
        this.#cameraLastY = touch.clientY;

        // Double-tap detection for attack
        const now = Date.now();
        if (now - this.#lastTapTime < 300) {
          this.#state.attacking = true;
        }
        this.#lastTapTime = now;
      }
    }
  };

  #onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === this.#moveTouchId) {
        // Movement: drag relative to origin, clamped to radius
        const dx = touch.clientX - this.#moveOriginX;
        const dy = touch.clientY - this.#moveOriginY;
        this.#state.moveX = Math.max(-1, Math.min(1, dx / this.#moveRadius));
        this.#state.moveZ = Math.max(-1, Math.min(1, dy / this.#moveRadius));
      }

      if (touch.identifier === this.#cameraTouchId) {
        // Camera look: accumulate delta
        this.#state.lookDX += touch.clientX - this.#cameraLastX;
        this.#state.lookDY += touch.clientY - this.#cameraLastY;
        this.#cameraLastX = touch.clientX;
        this.#cameraLastY = touch.clientY;
      }
    }
  };

  #onTouchEnd = (e: TouchEvent): void => {
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === this.#moveTouchId) {
        this.#moveTouchId = null;
        this.#state.moveX = 0;
        this.#state.moveZ = 0;
      }
      if (touch.identifier === this.#cameraTouchId) {
        this.#cameraTouchId = null;
      }
    }
  };

  destroy(): void {
    window.removeEventListener('resize', this.#onOrientationChange);
    window.removeEventListener('orientationchange', this.#onOrientationChange);
    this.#overlay.remove();
  }
}

/** Detect if device has touch and no fine pointer (likely mobile). */
export function isMobileDevice(): boolean {
  return 'ontouchstart' in document.documentElement && !matchMedia('(pointer: fine)').matches;
}
