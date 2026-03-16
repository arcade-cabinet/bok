/**
 * Module-level joystick visual state cache.
 * Written by InputBehavior, read by MobileControls overlay via App.tsx polling.
 * Follows the same pattern as getSignalMap(), getActiveWards(), etc.
 */

export interface JoystickVisualState {
	active: boolean;
	centerX: number;
	centerY: number;
	offsetX: number;
	offsetY: number;
}

let joystickState: JoystickVisualState = { active: false, centerX: 0, centerY: 0, offsetX: 0, offsetY: 0 };

/** Read-only access to joystick visual state for the MobileControls overlay. */
export function getJoystickState(): Readonly<JoystickVisualState> {
	return joystickState;
}

/** Mutable reference for InputBehavior to write to. */
export function getJoystickStateRef(): JoystickVisualState {
	return joystickState;
}

/** Reset joystick visual state (called from destroyGame). */
export function resetJoystickState(): void {
	joystickState = { active: false, centerX: 0, centerY: 0, offsetX: 0, offsetY: 0 };
}
