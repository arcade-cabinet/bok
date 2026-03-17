/**
 * Raw DOM input state — keyboard, mouse, and touch event tracking.
 * No ECS / Three.js / JP dependencies. Pure browser event listeners.
 * Written to by DOM events, read by input-system.ts each frame.
 */

import { getJoystickStateRef, resetJoystickState } from "./behaviors/joystick-state.ts";
import { isMobile } from "./input-config.ts";

// ─── Keyboard ───

export const keysDown = new Set<string>();
export const keysJustPressed = new Set<string>();

function onKeyDown(e: KeyboardEvent) {
	if (!keysDown.has(e.code)) keysJustPressed.add(e.code);
	keysDown.add(e.code);
}

function onKeyUp(e: KeyboardEvent) {
	keysDown.delete(e.code);
}

// ─── Mouse ───

export let mouseDx = 0;
export let mouseDy = 0;
export let mouseLeftDown = false;
export let mouseRightJustPressed = false;

function onMouseMove(e: MouseEvent) {
	mouseDx += e.movementX;
	mouseDy += e.movementY;
}

function onMouseDown(e: MouseEvent) {
	if (e.button === 0) mouseLeftDown = true;
	if (e.button === 2) mouseRightJustPressed = true;
}

function onMouseUp(e: MouseEvent) {
	if (e.button === 0) mouseLeftDown = false;
}

function onContextMenu(e: Event) {
	e.preventDefault();
}

// ─── Touch ───

export let touchMode = false;
export let joyStartX = 0;
export let joyStartY = 0;
export let joyActive = false;
export let joyTouchId = -1;
export let lookPrevX = 0;
export let lookPrevY = 0;
export let lookActive = false;
export let lookTouchId = -1;
export let pendingJoyEnd = false;
export let pendingLookEnd = false;

export const activeTouches = new Map<number, { x: number; y: number }>();

function onTouchStart(e: TouchEvent) {
	const halfW = window.innerWidth / 2;
	for (let i = 0; i < e.changedTouches.length; i++) {
		const t = e.changedTouches[i];
		activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
		if (!joyActive && t.clientX < halfW) {
			joyStartX = t.clientX;
			joyStartY = t.clientY;
			joyActive = true;
			joyTouchId = t.identifier;
			const js = getJoystickStateRef();
			js.centerX = t.clientX;
			js.centerY = t.clientY;
			js.active = true;
		} else if (!lookActive && t.clientX >= halfW) {
			lookPrevX = t.clientX;
			lookPrevY = t.clientY;
			lookActive = true;
			lookTouchId = t.identifier;
		}
	}
}

function onTouchMove(e: TouchEvent) {
	for (let i = 0; i < e.changedTouches.length; i++) {
		const t = e.changedTouches[i];
		activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
	}
}

function onTouchEnd(e: TouchEvent) {
	for (let i = 0; i < e.changedTouches.length; i++) {
		const t = e.changedTouches[i];
		activeTouches.delete(t.identifier);
		if (t.identifier === joyTouchId) {
			joyActive = false;
			joyTouchId = -1;
			pendingJoyEnd = true;
		}
		if (t.identifier === lookTouchId) {
			lookActive = false;
			lookTouchId = -1;
			pendingLookEnd = true;
		}
	}
}

// ─── Pointer lock ───

let canvas: HTMLCanvasElement | null = null;

export function isPointerLocked(): boolean {
	return document.pointerLockElement === canvas;
}

function onCanvasClick() {
	if (!touchMode && canvas && !isPointerLocked()) {
		canvas.requestPointerLock();
	}
}

// ─── Lifecycle ───

export function initInputState(c: HTMLCanvasElement): void {
	canvas = c;
	touchMode = isMobile();

	document.addEventListener("keydown", onKeyDown);
	document.addEventListener("keyup", onKeyUp);

	if (touchMode) {
		canvas.addEventListener("touchstart", onTouchStart, { passive: true });
		canvas.addEventListener("touchmove", onTouchMove, { passive: true });
		canvas.addEventListener("touchend", onTouchEnd, { passive: true });
		canvas.addEventListener("touchcancel", onTouchEnd, { passive: true });
	} else {
		document.addEventListener("mousemove", onMouseMove);
		canvas.addEventListener("mousedown", onMouseDown);
		document.addEventListener("mouseup", onMouseUp);
		canvas.addEventListener("contextmenu", onContextMenu);
		canvas.addEventListener("click", onCanvasClick);
	}
}

export function destroyInputState(): void {
	document.removeEventListener("keydown", onKeyDown);
	document.removeEventListener("keyup", onKeyUp);

	if (canvas) {
		canvas.removeEventListener("touchstart", onTouchStart);
		canvas.removeEventListener("touchmove", onTouchMove);
		canvas.removeEventListener("touchend", onTouchEnd);
		canvas.removeEventListener("touchcancel", onTouchEnd);
		canvas.removeEventListener("mousedown", onMouseDown);
		canvas.removeEventListener("contextmenu", onContextMenu);
		canvas.removeEventListener("click", onCanvasClick);
	}
	document.removeEventListener("mousemove", onMouseMove);
	document.removeEventListener("mouseup", onMouseUp);

	keysDown.clear();
	keysJustPressed.clear();
	mouseDx = 0;
	mouseDy = 0;
	mouseLeftDown = false;
	mouseRightJustPressed = false;
	joyActive = false;
	joyTouchId = -1;
	lookActive = false;
	lookTouchId = -1;
	activeTouches.clear();
	pendingJoyEnd = false;
	pendingLookEnd = false;
	touchMode = false;
	canvas = null;
	resetJoystickState();
}

/** Clear per-frame accumulators — called after pollInput. */
export function flushFrameState(): void {
	keysJustPressed.clear();
	mouseDx = 0;
	mouseDy = 0;
	mouseRightJustPressed = false;
	pendingJoyEnd = false;
	pendingLookEnd = false;
}

/** Consume look-touch delta: returns dx/dy since last call, then updates prev. */
export function consumeLookDelta(): { dx: number; dy: number } {
	const pos = activeTouches.get(lookTouchId);
	if (!pos) return { dx: 0, dy: 0 };
	const dx = pos.x - lookPrevX;
	const dy = pos.y - lookPrevY;
	lookPrevX = pos.x;
	lookPrevY = pos.y;
	return { dx, dy };
}

/** Release pointer lock (called when opening menus). */
export function releasePointerLock(): void {
	if (isPointerLocked()) document.exitPointerLock();
}
