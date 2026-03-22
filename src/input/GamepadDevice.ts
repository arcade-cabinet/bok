export class GamepadDevice {
  #leftStickX = 0;
  #leftStickY = 0;
  #rightStickX = 0;
  #rightStickY = 0;
  readonly #deadzone = 0.15;

  poll(): void {
    const gamepads = navigator.getGamepads();
    // v1: single gamepad support
    const gp = gamepads[0];
    if (!gp) return;

    this.#leftStickX = this.#applyDeadzone(gp.axes[0] ?? 0);
    this.#leftStickY = this.#applyDeadzone(gp.axes[1] ?? 0);
    this.#rightStickX = this.#applyDeadzone(gp.axes[2] ?? 0);
    this.#rightStickY = this.#applyDeadzone(gp.axes[3] ?? 0);
  }

  get leftStick(): { x: number; y: number } {
    return { x: this.#leftStickX, y: this.#leftStickY };
  }

  get rightStick(): { x: number; y: number } {
    return { x: this.#rightStickX, y: this.#rightStickY };
  }

  #applyDeadzone(value: number): number {
    return Math.abs(value) < this.#deadzone ? 0 : value;
  }
}
