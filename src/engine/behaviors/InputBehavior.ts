/** InputBehavior — polls custom InputSystem, writes to Koota ECS traits. */

import { Hotbar, MiningState, MoveInput, PlayerState, PlayerTag, Rotation, ToolSwing } from "../../ecs/traits/index.ts";
import { Behavior } from "../behavior.ts";
import { kootaWorld, placeBlock } from "../game.ts";
import { getBindings, getMobileConfig } from "../input-config.ts";
import type { InputSystem } from "../input-system.ts";
import { clamp, clampPitch, computeJoystickAnalog, computeMouseLook } from "./input-helpers.ts";
import { getJoystickStateRef } from "./joystick-state.ts";

export { getJoystickState, resetJoystickState } from "./joystick-state.ts";

const MOUSE_SENSITIVITY = 0.002;
const MOUSE_SWAY_FACTOR = 0.0005;
const TOUCH_LOOK_BASE = 0.005;
const TOUCH_SWAY_FACTOR = 0.001;
const JOYSTICK_RADIUS = 40;

export class InputBehavior extends Behavior {
	private input: InputSystem;

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

	constructor(inputSystem: InputSystem) {
		super();
		this.input = inputSystem;
	}

	awake() {
		this.needUpdate = true;
		this.touchMode = this.input.isTouchpadAvailable();
		if (!this.touchMode) {
			this.input.lockMouse();
		}
	}

	update(_dt: number) {
		if (this.touchMode) {
			this.pollTouch();
		} else {
			this.pollDesktop();
		}
	}

	private pollDesktop() {
		const input = this.input;
		const b = getBindings();
		kootaWorld.query(PlayerTag, MoveInput).updateEach(([move]) => {
			move.forward = input.isKeyDown(b.forward) || input.isKeyDown("ArrowUp");
			move.backward = input.isKeyDown(b.backward) || input.isKeyDown("ArrowDown");
			move.left = input.isKeyDown(b.left) || input.isKeyDown("ArrowLeft");
			move.right = input.isKeyDown(b.right) || input.isKeyDown("ArrowRight");
			move.jump = input.isKeyDown(b.jump);
			move.sprint = input.isKeyDown(b.sprint);
		});

		if (input.mouse.locked) {
			const delta = input.getMouseDelta();
			const look = computeMouseLook(delta.x, delta.y, MOUSE_SENSITIVITY, MOUSE_SWAY_FACTOR);
			kootaWorld.query(PlayerTag, Rotation, ToolSwing).updateEach(([rot, toolSwing]) => {
				rot.yaw += look.yawDelta;
				rot.pitch += look.pitchDelta;
				rot.pitch = clampPitch(rot.pitch);

				toolSwing.targetSwayX = look.swayX;
				toolSwing.targetSwayY = look.swayY;
			});
		}

		kootaWorld.query(PlayerTag, MiningState).updateEach(([mining]) => {
			mining.active = input.mouse.locked && input.isMouseButtonDown("left");
		});

		if (input.mouse.locked && input.wasMouseButtonJustPressed("right")) {
			placeBlock();
		}

		for (let i = 0; i < 5; i++) {
			const slotKey = `Digit${i + 1}`;
			if (input.wasKeyJustPressed(slotKey)) {
				kootaWorld.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
					hotbar.activeSlot = i;
				});
			}
		}

		if (input.wasKeyJustPressed(b.eat)) {
			kootaWorld.query(PlayerTag, PlayerState).updateEach(([state]) => {
				state.wantsEat = true;
			});
		}
	}

	private pollTouch() {
		const input = this.input;
		const mobileConfig = getMobileConfig();
		const screen = input.getScreenSize();
		const halfW = screen.x / 2;

		this.pollMovementTouch(halfW, mobileConfig.joystickDeadZone);
		this.pollLookTouch(mobileConfig.lookSensitivity);
	}

	private pollMovementTouch(halfW: number, deadZone: number) {
		const input = this.input;
		const joyState = getJoystickStateRef();

		if (input.wasTouchStarted("primary")) {
			const pos = input.getTouchPosition(0);
			if (pos.x < halfW) {
				this.joyStartX = pos.x;
				this.joyStartY = pos.y;
				this.joyActive = true;
				joyState.centerX = pos.x;
				joyState.centerY = pos.y;
				joyState.active = true;
			}
		}

		if (input.wasTouchEnded("primary")) {
			this.joyActive = false;
			joyState.active = false;
			joyState.offsetX = 0;
			joyState.offsetY = 0;
			kootaWorld.query(PlayerTag, MoveInput).updateEach(([move]) => {
				move.forward = false;
				move.backward = false;
				move.left = false;
				move.right = false;
			});
		}

		if (this.joyActive && input.isTouchDown("primary")) {
			const pos = input.getTouchPosition(0);
			const joy = computeJoystickAnalog(pos.x, pos.y, this.joyStartX, this.joyStartY, JOYSTICK_RADIUS, deadZone);

			joyState.offsetX = joy.clampedDx;
			joyState.offsetY = joy.clampedDy;

			kootaWorld.query(PlayerTag, MoveInput).updateEach(([move]) => {
				move.forward = joy.ny < 0;
				move.backward = joy.ny > 0;
				move.left = joy.nx < 0;
				move.right = joy.nx > 0;
			});
		}
	}

	private pollLookTouch(sensitivity: number) {
		const input = this.input;

		if (input.wasTouchStarted("secondary")) {
			const pos = input.getTouchPosition(1);
			this.lookPrevX = pos.x;
			this.lookPrevY = pos.y;
			this.lookActive = true;

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
