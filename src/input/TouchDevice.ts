export class TouchDevice {
  #moveX = 0;
  #moveY = 0;
  #lookDeltaX = 0;
  #lookDeltaY = 0;
  #lastTouchX = 0;
  #lastTouchY = 0;
  #attached = false;

  attach(canvas: HTMLCanvasElement): void {
    if (this.#attached) return;
    this.#attached = true;
    const halfWidth = canvas.clientWidth / 2;

    canvas.addEventListener('touchstart', (e) => {
      for (const touch of e.changedTouches) {
        if (touch.clientX > halfWidth) {
          this.#lastTouchX = touch.clientX;
          this.#lastTouchY = touch.clientY;
        }
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.clientX < halfWidth) {
          // Left side = movement joystick
          const centerX = halfWidth / 2;
          const centerY = canvas.clientHeight / 2;
          this.#moveX = (touch.clientX - centerX) / (halfWidth / 2);
          this.#moveY = (touch.clientY - centerY) / (canvas.clientHeight / 2);
        } else {
          // Right side = camera look
          this.#lookDeltaX += touch.clientX - this.#lastTouchX;
          this.#lookDeltaY += touch.clientY - this.#lastTouchY;
          this.#lastTouchX = touch.clientX;
          this.#lastTouchY = touch.clientY;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.#moveX = 0;
      this.#moveY = 0;
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
