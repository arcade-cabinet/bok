/**
 * @module input
 * @role Platform-agnostic input capture → Koota trait writes
 * @input Raw keyboard/mouse/gamepad/touch events
 * @output MovementIntent, LookIntent traits on Koota world
 * @depends traits
 * @tested ActionMap.test.ts
 */
export { ActionMap, type GameAction } from './ActionMap.ts';
export { GamepadDevice } from './GamepadDevice.ts';
export { InputSystem } from './InputSystem.ts';
export { KeyboardMouseDevice } from './KeyboardMouseDevice.ts';
export { isMobileDevice, type MobileControlState } from './MobileControls.ts';
export { TouchDevice } from './TouchDevice.ts';
