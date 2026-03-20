/**
 * Mobile touch controls overlay — virtual joystick + camera swipe + action buttons.
 * Only shown when touch is detected (no pointer lock available).
 */

export interface MobileControlState {
  moveX: number;  // -1 to 1
  moveZ: number;  // -1 to 1
  lookDX: number; // delta pixels this frame
  lookDY: number;
  attacking: boolean;
  dodging: boolean;
}

export class MobileControls {
  readonly #container: HTMLDivElement;
  readonly #state: MobileControlState = {
    moveX: 0, moveZ: 0, lookDX: 0, lookDY: 0, attacking: false, dodging: false,
  };

  // Joystick state
  #joystickActive = false;
  #joystickTouchId: number | null = null;
  #joystickCenterX = 0;
  #joystickCenterY = 0;
  readonly #joystickRadius = 50;
  #joystickKnob: HTMLDivElement;
  #joystickBase: HTMLDivElement;

  // Camera look state
  #cameraTouchId: number | null = null;
  #cameraLastX = 0;
  #cameraLastY = 0;

  #visible = false;

  constructor() {
    this.#container = document.createElement('div');
    this.#container.id = 'mobile-controls';
    this.#container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:90;pointer-events:none;display:none;';

    // Virtual joystick (left side)
    this.#joystickBase = document.createElement('div');
    this.#joystickBase.style.cssText = 'position:absolute;bottom:80px;left:40px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);pointer-events:auto;touch-action:none;';
    this.#joystickKnob = document.createElement('div');
    this.#joystickKnob.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.5);border:2px solid rgba(255,255,255,0.7);';
    this.#joystickBase.appendChild(this.#joystickKnob);

    // Action buttons (right side)
    const attackBtn = this.#createButton('Attack', 'right:40px;bottom:120px;', () => { this.#state.attacking = true; });
    const dodgeBtn = this.#createButton('Dodge', 'right:40px;bottom:60px;', () => { this.#state.dodging = true; });

    // Camera zone label
    const cameraLabel = document.createElement('div');
    cameraLabel.textContent = 'Swipe to look';
    cameraLabel.style.cssText = 'position:absolute;top:50%;right:20px;transform:translateY(-50%);color:rgba(255,255,255,0.3);font-family:Georgia,serif;font-size:12px;pointer-events:none;';

    this.#container.append(this.#joystickBase, attackBtn, dodgeBtn, cameraLabel);
    document.body.appendChild(this.#container);

    // Touch handlers on the whole canvas
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    if (canvas) {
      canvas.addEventListener('touchstart', this.#onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', this.#onTouchMove, { passive: false });
      canvas.addEventListener('touchend', this.#onTouchEnd, { passive: false });
    }
  }

  #createButton(label: string, posCSS: string, onTap: () => void): HTMLDivElement {
    const btn = document.createElement('div');
    btn.textContent = label;
    btn.style.cssText = `position:absolute;${posCSS}width:64px;height:64px;border-radius:50%;background:rgba(253,246,227,0.7);border:2px solid #8b5a2b;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:12px;color:#2c1e16;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;`;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); onTap(); }, { passive: false });
    return btn;
  }

  show(): void {
    if (this.#visible) return;
    this.#visible = true;
    this.#container.style.display = '';
  }

  hide(): void {
    this.#visible = false;
    this.#container.style.display = 'none';
  }

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

  consumeDodge(): boolean {
    const v = this.#state.dodging;
    this.#state.dodging = false;
    return v;
  }

  #onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const halfW = window.innerWidth / 2;

    for (const touch of Array.from(e.changedTouches)) {
      if (touch.clientX < halfW && this.#joystickTouchId === null) {
        // Left side — joystick
        this.#joystickTouchId = touch.identifier;
        this.#joystickActive = true;
        const rect = this.#joystickBase.getBoundingClientRect();
        this.#joystickCenterX = rect.left + rect.width / 2;
        this.#joystickCenterY = rect.top + rect.height / 2;
      } else if (touch.clientX >= halfW && this.#cameraTouchId === null) {
        // Right side — camera look
        this.#cameraTouchId = touch.identifier;
        this.#cameraLastX = touch.clientX;
        this.#cameraLastY = touch.clientY;
      }
    }
  };

  #onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === this.#joystickTouchId) {
        const dx = touch.clientX - this.#joystickCenterX;
        const dy = touch.clientY - this.#joystickCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, this.#joystickRadius);
        const angle = Math.atan2(dy, dx);
        const nx = (Math.cos(angle) * clampedDist) / this.#joystickRadius;
        const ny = (Math.sin(angle) * clampedDist) / this.#joystickRadius;

        this.#state.moveX = nx;
        this.#state.moveZ = ny;

        // Move knob visually
        this.#joystickKnob.style.transform = `translate(calc(-50% + ${nx * this.#joystickRadius}px), calc(-50% + ${ny * this.#joystickRadius}px))`;
      }

      if (touch.identifier === this.#cameraTouchId) {
        this.#state.lookDX += touch.clientX - this.#cameraLastX;
        this.#state.lookDY += touch.clientY - this.#cameraLastY;
        this.#cameraLastX = touch.clientX;
        this.#cameraLastY = touch.clientY;
      }
    }
  };

  #onTouchEnd = (e: TouchEvent): void => {
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === this.#joystickTouchId) {
        this.#joystickTouchId = null;
        this.#joystickActive = false;
        this.#state.moveX = 0;
        this.#state.moveZ = 0;
        this.#joystickKnob.style.transform = 'translate(-50%, -50%)';
      }
      if (touch.identifier === this.#cameraTouchId) {
        this.#cameraTouchId = null;
      }
    }
  };

  destroy(): void {
    this.#container.remove();
  }
}

/** Detect if device has touch and no fine pointer (likely mobile). */
export function isMobileDevice(): boolean {
  return 'ontouchstart' in document.documentElement && !matchMedia('(pointer: fine)').matches;
}
