/**
 * InputBehavior — polls Jolly Pixel's unified Input system every frame
 * and writes to Koota ECS traits. Replaces manual DOM event listeners
 * (input-handler.ts) and React touch controls (MobileControls.tsx).
 *
 * Desktop: pointer-locked keyboard + mouse
 * Mobile: invisible touch zones — left half = movement, right half = look
 */

import { Behavior, type Input, type InputKeyboardAction } from "@jolly-pixel/engine";
import { Hotbar, MiningState, MoveInput, PlayerState, PlayerTag, Rotation, ToolSwing } from "../../ecs/traits/index.ts";
import { kootaWorld, placeBlock } from "../game.ts";
import { getBindings, getMobileConfig } from "../input-config.ts";

/** Cast binding string to JP's strict KeyCode union. */
const key = (code: string) => code as InputKeyboardAction;

/** Sensitivity multipliers for mouse look. */
const MOUSE_SENSITIVITY = 0.002;
const MOUSE_SWAY_FACTOR = 0.0005;

/** Touch look sensitivity base (scaled by user config). */
const TOUCH_LOOK_BASE = 0.005;
const TOUCH_SWAY_FACTOR = 0.001;

/** Joystick radius in pixels for normalizing touch movement. */
const JOYSTICK_RADIUS = 40;

export class InputBehavior extends Behavior {
	/** Tracks the touch start position for the left-side joystick. */
	private joyStartX = 0;
	private joyStartY = 0;
	private joyActive = false;

	/** Previous touch position for right-side look delta. */
	private lookPrevX = 0;
	private lookPrevY = 0;
	private lookActive = false;

	/** Whether we detected touch as the primary input device. */
	private touchMode = false;

	awake() {
		this.needUpdate = true;
		this.touchMode = this.actor.world.input.isTouchpadAvailable();
	}

	update(_dt: number) {
		const { input } = this.actor.world;

		if (this.touchMode) {
			this.pollTouch(input);
		} else {
			this.pollDesktop(input);
		}
	}

	// ─── Desktop: pointer-locked keyboard + mouse ───

	private pollDesktop(input: Input) {
		const b = getBindings();

		// Movement keys → MoveInput trait (configured bindings + arrow key fallback)
		kootaWorld.query(PlayerTag, MoveInput).updateEach(([move]) => {
			move.forward = input.isKeyDown(key(b.forward)) || input.isKeyDown("ArrowUp");
			move.backward = input.isKeyDown(key(b.backward)) || input.isKeyDown("ArrowDown");
			move.left = input.isKeyDown(key(b.left)) || input.isKeyDown("ArrowLeft");
			move.right = input.isKeyDown(key(b.right)) || input.isKeyDown("ArrowRight");
			move.jump = input.isKeyDown(key(b.jump));
			move.sprint = input.isKeyDown(key(b.sprint));
		});

		// Mouse look → Rotation + ToolSwing sway (only when pointer locked)
		if (input.mouse.locked) {
			const delta = input.getMouseDelta();
			kootaWorld.query(PlayerTag, Rotation, ToolSwing).updateEach(([rot, toolSwing]) => {
				rot.yaw -= delta.x * MOUSE_SENSITIVITY;
				rot.pitch -= delta.y * MOUSE_SENSITIVITY;
				rot.pitch = clampPitch(rot.pitch);

				toolSwing.targetSwayY -= delta.x * MOUSE_SWAY_FACTOR;
				toolSwing.targetSwayX -= delta.y * MOUSE_SWAY_FACTOR;
				toolSwing.targetSwayX = clamp(toolSwing.targetSwayX, -0.1, 0.1);
				toolSwing.targetSwayY = clamp(toolSwing.targetSwayY, -0.1, 0.1);
			});
		}

		// Mining: left mouse held → MiningState.active
		kootaWorld.query(PlayerTag, MiningState).updateEach(([mining]) => {
			mining.active = input.mouse.locked && input.isMouseButtonDown("left");
		});

		// Block placement: right click (just pressed)
		if (input.mouse.locked && input.wasMouseButtonJustPressed("right")) {
			placeBlock();
		}

		// Hotbar slots 1-5
		for (let i = 0; i < 5; i++) {
			const slotKey = key(`Digit${i + 1}`);
			if (input.wasKeyJustPressed(slotKey)) {
				kootaWorld.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
					hotbar.activeSlot = i;
				});
			}
		}

		// Eat action
		if (input.wasKeyJustPressed(key(b.eat))) {
			kootaWorld.query(PlayerTag, PlayerState).updateEach(([state]) => {
				state.wantsEat = true;
			});
		}

		// Pointer lock: click canvas to lock when not locked
		if (input.wasMouseButtonJustPressed("left") && !input.mouse.locked) {
			input.lockMouse();
		}
	}

	// ─── Mobile: invisible touch zones ───

	private pollTouch(input: Input) {
		const mobileConfig = getMobileConfig();
		const screen = input.getScreenSize();
		const halfW = screen.x / 2;

		// Primary touch (finger 0) — joystick on left half
		this.pollMovementTouch(input, halfW, mobileConfig.joystickDeadZone);

		// Secondary touch (finger 1) — camera look on right half
		this.pollLookTouch(input, mobileConfig.lookSensitivity);
	}

	private pollMovementTouch(input: Input, halfW: number, deadZone: number) {
		if (input.wasTouchStarted("primary")) {
			const pos = input.getTouchPosition(0);
			if (pos.x < halfW) {
				this.joyStartX = pos.x;
				this.joyStartY = pos.y;
				this.joyActive = true;
			}
		}

		if (input.wasTouchEnded("primary")) {
			this.joyActive = false;
			kootaWorld.query(PlayerTag, MoveInput).updateEach(([move]) => {
				move.forward = false;
				move.backward = false;
				move.left = false;
				move.right = false;
			});
		}

		if (this.joyActive && input.isTouchDown("primary")) {
			const pos = input.getTouchPosition(0);
			let dx = pos.x - this.joyStartX;
			let dy = pos.y - this.joyStartY;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > JOYSTICK_RADIUS) {
				dx = (dx / dist) * JOYSTICK_RADIUS;
				dy = (dy / dist) * JOYSTICK_RADIUS;
			}
			const nx = dx / JOYSTICK_RADIUS;
			const ny = dy / JOYSTICK_RADIUS;

			kootaWorld.query(PlayerTag, MoveInput).updateEach(([move]) => {
				move.forward = ny < -deadZone;
				move.backward = ny > deadZone;
				move.left = nx < -deadZone;
				move.right = nx > deadZone;
			});
		}
	}

	private pollLookTouch(input: Input, sensitivity: number) {
		if (input.wasTouchStarted("secondary")) {
			const pos = input.getTouchPosition(1);
			this.lookPrevX = pos.x;
			this.lookPrevY = pos.y;
			this.lookActive = true;

			// Contextual mining: touching right side starts mining
			kootaWorld.query(PlayerTag, MiningState).updateEach(([mining]) => {
				mining.active = true;
			});
		}

		if (input.wasTouchEnded("secondary")) {
			this.lookActive = false;
			kootaWorld.query(PlayerTag, MiningState).updateEach(([mining]) => {
				mining.active = false;
			});
		}

		if (this.lookActive && input.isTouchDown("secondary")) {
			const pos = input.getTouchPosition(1);
			const dx = pos.x - this.lookPrevX;
			const dy = pos.y - this.lookPrevY;
			this.lookPrevX = pos.x;
			this.lookPrevY = pos.y;

			const lookScale = TOUCH_LOOK_BASE * sensitivity;

			kootaWorld.query(PlayerTag, Rotation, ToolSwing).updateEach(([rot, toolSwing]) => {
				rot.yaw -= dx * lookScale;
				rot.pitch -= dy * lookScale;
				rot.pitch = clampPitch(rot.pitch);

				toolSwing.targetSwayY -= dx * TOUCH_SWAY_FACTOR;
				toolSwing.targetSwayX -= dy * TOUCH_SWAY_FACTOR;
				toolSwing.targetSwayX = clamp(toolSwing.targetSwayX, -0.1, 0.1);
				toolSwing.targetSwayY = clamp(toolSwing.targetSwayY, -0.1, 0.1);
			});
		}
	}
}

// ─── Helpers ───

function clampPitch(pitch: number): number {
	const limit = Math.PI / 2 - 0.1;
	return Math.max(-limit, Math.min(limit, pitch));
}

function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}
