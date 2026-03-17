/**
 * Custom input system — replaces @jolly-pixel/engine Input.
 * Wraps browser keyboard, mouse, and touch events with per-frame state tracking.
 * Call endFrame() at the end of each game loop tick to clear per-frame flags.
 */

import { BUTTON_MAP, type MouseButton, type Vec2 } from "./input-data.ts";

export type { MouseButton, Vec2 };

export class InputSystem {
	private keysDown = new Set<string>();
	private keysJustPressed = new Set<string>();

	private mouseButtons = new Set<MouseButton>();
	private mouseButtonsJustPressed = new Set<MouseButton>();
	private mouseDeltaX = 0;
	private mouseDeltaY = 0;
	private _pointerLocked = false;
	private wantsPointerLock = false;

	private touches = new Map<number, { x: number; y: number }>();
	private touchesStarted = new Set<number>();
	private touchesEnded = new Set<number>();

	private canvas: HTMLCanvasElement;
	private boundHandlers: Array<[EventTarget, string, EventListener]> = [];

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.bind();
	}

	private on(target: EventTarget, event: string, handler: EventListener, opts?: AddEventListenerOptions) {
		target.addEventListener(event, handler, opts);
		this.boundHandlers.push([target, event, handler]);
	}

	private bind() {
		this.on(window, "keydown", (e) => {
			const code = (e as KeyboardEvent).code;
			if (!this.keysDown.has(code)) this.keysJustPressed.add(code);
			this.keysDown.add(code);
		});
		this.on(window, "keyup", (e) => {
			this.keysDown.delete((e as KeyboardEvent).code);
		});
		this.on(this.canvas, "mousedown", (e) => {
			const btn = BUTTON_MAP[(e as MouseEvent).button];
			if (btn) {
				if (!this.mouseButtons.has(btn)) this.mouseButtonsJustPressed.add(btn);
				this.mouseButtons.add(btn);
			}
			if (this.wantsPointerLock && !this._pointerLocked) {
				this.canvas.requestPointerLock();
			}
		});
		this.on(window, "mouseup", (e) => {
			const btn = BUTTON_MAP[(e as MouseEvent).button];
			if (btn) this.mouseButtons.delete(btn);
		});
		this.on(window, "mousemove", (e) => {
			if (this._pointerLocked) {
				this.mouseDeltaX += (e as MouseEvent).movementX;
				this.mouseDeltaY += (e as MouseEvent).movementY;
			}
		});
		this.on(document, "pointerlockchange", () => {
			this._pointerLocked = document.pointerLockElement === this.canvas;
		});
		this.on(this.canvas, "contextmenu", (e) => e.preventDefault());

		this.on(
			this.canvas,
			"touchstart",
			(e) => {
				const te = e as TouchEvent;
				te.preventDefault();
				for (let i = 0; i < te.changedTouches.length; i++) {
					const t = te.changedTouches[i];
					this.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
					this.touchesStarted.add(t.identifier);
				}
			},
			{ passive: false },
		);
		this.on(this.canvas, "touchmove", (e) => {
			const te = e as TouchEvent;
			te.preventDefault();
			for (let i = 0; i < te.changedTouches.length; i++) {
				const t = te.changedTouches[i];
				const entry = this.touches.get(t.identifier);
				if (entry) {
					entry.x = t.clientX;
					entry.y = t.clientY;
				}
			}
		});
		const touchEnd = (e: Event) => {
			const te = e as TouchEvent;
			for (let i = 0; i < te.changedTouches.length; i++) {
				const t = te.changedTouches[i];
				this.touchesEnded.add(t.identifier);
				this.touches.delete(t.identifier);
			}
		};
		this.on(this.canvas, "touchend", touchEnd);
		this.on(this.canvas, "touchcancel", touchEnd);
	}

	// ─── Keyboard ───

	isKeyDown(code: string): boolean {
		return this.keysDown.has(code);
	}

	wasKeyJustPressed(code: string): boolean {
		return this.keysJustPressed.has(code);
	}

	// ─── Mouse ───

	get mouse(): { locked: boolean } {
		return { locked: this._pointerLocked };
	}

	getMouseDelta(): Vec2 {
		return { x: this.mouseDeltaX, y: this.mouseDeltaY };
	}

	isMouseButtonDown(btn: MouseButton): boolean {
		return this.mouseButtons.has(btn);
	}

	wasMouseButtonJustPressed(btn: MouseButton): boolean {
		return this.mouseButtonsJustPressed.has(btn);
	}

	lockMouse(): void {
		this.wantsPointerLock = true;
	}

	unlockMouse(): void {
		this.wantsPointerLock = false;
		if (this._pointerLocked) document.exitPointerLock();
	}

	// ─── Touch ───

	isTouchpadAvailable(): boolean {
		return "ontouchstart" in window || navigator.maxTouchPoints > 0;
	}

	wasTouchStarted(slot: "primary" | "secondary"): boolean {
		const idx = slot === "primary" ? 0 : 1;
		return this.touchStartedAtSlot(idx);
	}

	wasTouchEnded(slot: "primary" | "secondary"): boolean {
		const idx = slot === "primary" ? 0 : 1;
		return this.touchEndedAtSlot(idx);
	}

	isTouchDown(slot: "primary" | "secondary"): boolean {
		const idx = slot === "primary" ? 0 : 1;
		return this.activeTouchAtSlot(idx) !== null;
	}

	getTouchPosition(slotIdx: number): Vec2 {
		const t = this.activeTouchAtSlot(slotIdx);
		return t ?? { x: 0, y: 0 };
	}

	getScreenSize(): Vec2 {
		return { x: this.canvas.clientWidth, y: this.canvas.clientHeight };
	}

	// ─── Per-frame lifecycle ───

	endFrame(): void {
		this.keysJustPressed.clear();
		this.mouseButtonsJustPressed.clear();
		this.mouseDeltaX = 0;
		this.mouseDeltaY = 0;
		this.touchesStarted.clear();
		this.touchesEnded.clear();
	}

	dispose(): void {
		for (const [target, event, handler] of this.boundHandlers) {
			target.removeEventListener(event, handler);
		}
		this.boundHandlers.length = 0;
	}

	// ─── Touch internals ───

	private touchStartedAtSlot(idx: number): boolean {
		let i = 0;
		for (const id of this.touchesStarted) {
			if (i === idx) return this.touches.has(id) || this.touchesStarted.has(id);
			i++;
		}
		return false;
	}

	private touchEndedAtSlot(idx: number): boolean {
		let i = 0;
		for (const _id of this.touchesEnded) {
			if (i === idx) return true;
			i++;
		}
		return false;
	}

	private activeTouchAtSlot(idx: number): Vec2 | null {
		let i = 0;
		for (const [, pos] of this.touches) {
			if (i === idx) return pos;
			i++;
		}
		return null;
	}
}
