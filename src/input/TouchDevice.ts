export class TouchDevice {
  #moveX = 0;
  #moveY = 0;
  #lookDeltaX = 0;
  #lookDeltaY = 0;
  #lastTouchX = 0;
  #lastTouchY = 0;
  #attached = false;
  #moveTouchId: number | null = null;
  #cameraTouchId: number | null = null;

  attach(canvas: HTMLCanvasElement): void {
    if (this.#attached) return;
    this.#attached = true;

    canvas.addEventListener('touchstart', (e) => {
      const halfWidth = canvas.clientWidth / 2;
      for (const touch of e.changedTouches) {
        if (touch.clientX < halfWidth && this.#moveTouchId === null) {
          this.#moveTouchId = touch.identifier;
        } else if (touch.clientX >= halfWidth && this.#cameraTouchId === null) {
          this.#cameraTouchId = touch.identifier;
          this.#lastTouchX = touch.clientX;
          this.#lastTouchY = touch.clientY;
        }
      }
    });

    canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        const halfWidth = canvas.clientWidth / 2;
        for (const touch of e.changedTouches) {
          if (touch.identifier === this.#moveTouchId) {
            // Left side = movement joystick
            const centerX = halfWidth / 2;
            const centerY = canvas.clientHeight / 2;
            this.#moveX = (touch.clientX - centerX) / (halfWidth / 2);
            this.#moveY = (touch.clientY - centerY) / (canvas.clientHeight / 2);
          } else if (touch.identifier === this.#cameraTouchId) {
            // Right side = camera look
            this.#lookDeltaX += touch.clientX - this.#lastTouchX;
            this.#lookDeltaY += touch.clientY - this.#lastTouchY;
            this.#lastTouchX = touch.clientX;
            this.#lastTouchY = touch.clientY;
          }
        }
      },
      { passive: false },
    );

    canvas.addEventListener('touchend', (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.#moveTouchId) {
          this.#moveTouchId = null;
          this.#moveX = 0;
          this.#moveY = 0;
        } else if (touch.identifier === this.#cameraTouchId) {
          this.#cameraTouchId = null;
        }
      }
    });
  }

  get moveStick(): { x: number; y: number } {
    return { x: this.#moveX, y: this.#moveY };
  }

  consumeLookDelta(): { x: number; y: number } {
    const result = { x: this.#lookDeltaX, y: this.#lookDeltaY };
    this.#lookDeltaX = 0;
    this.#lookDeltaY = 0;
    return result;
  }
}
