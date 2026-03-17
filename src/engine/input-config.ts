/**
 * Input configuration — action-to-key mapping for desktop, touch zone config for mobile.
 * Loaded from SQLite user_settings, falls back to defaults.
 * The input handler reads from this config at runtime.
 */

import { Capacitor } from "@capacitor/core";

/** All game actions that can be bound to input. */
export type InputAction =
	| "forward"
	| "backward"
	| "left"
	| "right"
	| "jump"
	| "sprint"
	| "mine"
	| "place"
	| "eat"
	| "inventory"
	| "bok"
	| "toggleVitals"
	| "hotbar1"
	| "hotbar2"
	| "hotbar3"
	| "hotbar4"
	| "hotbar5";

/** Desktop keybinding: action -> KeyboardEvent.code */
export type KeyBindings = Record<InputAction, string>;

/** Mobile touch sensitivity and control layout preferences. */
export interface MobileConfig {
	lookSensitivity: number;
	joystickDeadZone: number;
	buttonScale: number;
}

export const DEFAULT_KEYBINDINGS: KeyBindings = {
	forward: "KeyW",
	backward: "KeyS",
	left: "KeyA",
	right: "KeyD",
	jump: "Space",
	sprint: "ShiftLeft",
	mine: "MouseLeft",
	place: "MouseRight",
	eat: "KeyF",
	inventory: "KeyE",
	bok: "KeyB",
	toggleVitals: "KeyV",
	hotbar1: "Digit1",
	hotbar2: "Digit2",
	hotbar3: "Digit3",
	hotbar4: "Digit4",
	hotbar5: "Digit5",
};

export const DEFAULT_MOBILE_CONFIG: MobileConfig = {
	lookSensitivity: 1.0,
	joystickDeadZone: 0.15,
	buttonScale: 1.0,
};

/** Runtime keybinding state — mutated by settings, read by input handler. */
let activeBindings: KeyBindings = { ...DEFAULT_KEYBINDINGS };
let activeMobileConfig: MobileConfig = { ...DEFAULT_MOBILE_CONFIG };

export function getBindings(): Readonly<KeyBindings> {
	return activeBindings;
}

export function getMobileConfig(): Readonly<MobileConfig> {
	return activeMobileConfig;
}

export function setBindings(bindings: KeyBindings): void {
	activeBindings = { ...bindings };
}

export function setMobileConfig(config: MobileConfig): void {
	activeMobileConfig = { ...config };
}

/** Reverse lookup: KeyboardEvent.code -> InputAction (for key dispatch). */
export function actionForKey(code: string): InputAction | null {
	for (const [action, key] of Object.entries(activeBindings)) {
		if (key === code) return action as InputAction;
	}
	return null;
}

export function isMobile(): boolean {
	if (typeof window === "undefined" || typeof navigator === "undefined") return false;
	if (Capacitor.isNativePlatform()) return true;
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** Human-readable label for a key code. */
export function keyLabel(code: string): string {
	if (code === "MouseLeft") return "Left Click";
	if (code === "MouseRight") return "Right Click";
	if (code.startsWith("Key")) return code.slice(3);
	if (code.startsWith("Digit")) return code.slice(5);
	if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
	if (code === "Space") return "Space";
	if (code === "ArrowUp") return "\u2191";
	if (code === "ArrowDown") return "\u2193";
	if (code === "ArrowLeft") return "\u2190";
	if (code === "ArrowRight") return "\u2192";
	return code;
}

/** Human-readable label for an action. */
export function actionLabel(action: InputAction): string {
	const labels: Record<InputAction, string> = {
		forward: "Move Forward",
		backward: "Move Backward",
		left: "Move Left",
		right: "Move Right",
		jump: "Jump",
		sprint: "Sprint",
		mine: "Mine",
		place: "Place",
		eat: "Eat",
		inventory: "Inventory",
		bok: "Bok Journal",
		toggleVitals: "Toggle Vitals",
		hotbar1: "Hotbar 1",
		hotbar2: "Hotbar 2",
		hotbar3: "Hotbar 3",
		hotbar4: "Hotbar 4",
		hotbar5: "Hotbar 5",
	};
	return labels[action];
}

/** Serialize bindings to JSON for SQLite storage. */
export function serializeBindings(bindings: KeyBindings): string {
	return JSON.stringify(bindings);
}

/** Deserialize bindings from SQLite. Falls back to defaults for missing keys. */
export function deserializeBindings(json: string): KeyBindings {
	try {
		const parsed = JSON.parse(json);
		return { ...DEFAULT_KEYBINDINGS, ...parsed };
	} catch {
		return { ...DEFAULT_KEYBINDINGS };
	}
}
