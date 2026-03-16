/**
 * Input handler — captures keyboard and mouse input and writes to Koota ECS traits.
 * Reads keybindings from input-config.ts (configurable via Settings).
 */

import { Hotbar, MiningState, MoveInput, PlayerState, PlayerTag, Rotation, ToolSwing } from "../ecs/traits/index.ts";
import { kootaWorld, placeBlock } from "./game.ts";
import { actionForKey, getBindings } from "./input-config.ts";

const keys: Record<string, boolean> = {};

/** Set of KeyboardEvent.code values used for gameplay (derived from bindings). */
function isGameplayKey(code: string): boolean {
	const b = getBindings();
	return Object.values(b).includes(code);
}

export function setupInputHandlers(canvas: HTMLCanvasElement): () => void {
	const onKeyDown = (e: KeyboardEvent) => {
		if (isGameplayKey(e.code) || (e.key >= "1" && e.key <= "5")) {
			e.preventDefault();
		}

		keys[e.code] = true;
		syncKeysToECS();

		const action = actionForKey(e.code);
		if (action?.startsWith("hotbar")) {
			const slot = Number.parseInt(action.slice(6), 10) - 1;
			kootaWorld.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
				hotbar.activeSlot = slot;
			});
		}

		if (action === "eat") {
			kootaWorld.query(PlayerTag, PlayerState).updateEach(([state]) => {
				state.wantsEat = true;
			});
		}
	};

	const onKeyUp = (e: KeyboardEvent) => {
		if (isGameplayKey(e.code) || (e.key >= "1" && e.key <= "5")) {
			e.preventDefault();
		}

		keys[e.code] = false;
		syncKeysToECS();
	};

	const onMouseMove = (e: MouseEvent) => {
		if (document.pointerLockElement !== canvas) return;

		kootaWorld.query(PlayerTag, Rotation, ToolSwing).updateEach(([rot, toolSwing]) => {
			rot.yaw -= e.movementX * 0.002;
			rot.pitch -= e.movementY * 0.002;
			rot.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rot.pitch));

			toolSwing.targetSwayY -= e.movementX * 0.0005;
			toolSwing.targetSwayX -= e.movementY * 0.0005;
			toolSwing.targetSwayX = Math.max(-0.1, Math.min(0.1, toolSwing.targetSwayX));
			toolSwing.targetSwayY = Math.max(-0.1, Math.min(0.1, toolSwing.targetSwayY));
		});
	};

	const onMouseDown = (e: MouseEvent) => {
		if (document.pointerLockElement !== canvas) return;

		if (e.button === 0) {
			kootaWorld.query(PlayerTag, MiningState).updateEach(([mining]) => {
				mining.active = true;
			});
		} else if (e.button === 2) {
			e.preventDefault();
			placeBlock();
		}
	};

	const onMouseUp = (e: MouseEvent) => {
		if (e.button === 0) {
			kootaWorld.query(PlayerTag, MiningState).updateEach(([mining]) => {
				mining.active = false;
			});
		}
	};

	const onContextMenu = (e: MouseEvent) => {
		if (document.pointerLockElement === canvas) {
			e.preventDefault();
		}
	};

	const onClick = (e: MouseEvent) => {
		if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return;
		if (document.pointerLockElement !== canvas) {
			canvas.requestPointerLock();
		}
	};

	const resetInputState = () => {
		for (const key of Object.keys(keys)) {
			keys[key] = false;
		}
		syncKeysToECS();
		kootaWorld.query(PlayerTag, MiningState).updateEach(([mining]) => {
			mining.active = false;
		});
	};

	const onBlur = () => {
		resetInputState();
	};

	const onVisibilityChange = () => {
		if (document.hidden) {
			resetInputState();
		}
	};

	const onPointerLockChange = () => {
		if (document.pointerLockElement !== canvas) {
			resetInputState();
		}
	};

	document.addEventListener("keydown", onKeyDown);
	document.addEventListener("keyup", onKeyUp);
	document.addEventListener("mousemove", onMouseMove);
	document.addEventListener("mousedown", onMouseDown);
	document.addEventListener("mouseup", onMouseUp);
	document.addEventListener("contextmenu", onContextMenu);
	canvas.addEventListener("click", onClick);
	window.addEventListener("blur", onBlur);
	document.addEventListener("visibilitychange", onVisibilityChange);
	document.addEventListener("pointerlockchange", onPointerLockChange);

	return () => {
		resetInputState();
		document.removeEventListener("keydown", onKeyDown);
		document.removeEventListener("keyup", onKeyUp);
		document.removeEventListener("mousemove", onMouseMove);
		document.removeEventListener("mousedown", onMouseDown);
		document.removeEventListener("mouseup", onMouseUp);
		document.removeEventListener("contextmenu", onContextMenu);
		canvas.removeEventListener("click", onClick);
		window.removeEventListener("blur", onBlur);
		document.removeEventListener("visibilitychange", onVisibilityChange);
		document.removeEventListener("pointerlockchange", onPointerLockChange);
	};
}

function syncKeysToECS() {
	const b = getBindings();
	kootaWorld.query(PlayerTag, MoveInput).updateEach(([input]) => {
		input.forward = keys[b.forward] || false;
		input.backward = keys[b.backward] || false;
		input.left = keys[b.left] || false;
		input.right = keys[b.right] || false;
		input.jump = keys[b.jump] || false;
		input.sprint = keys[b.sprint] || false;
	});
}

export function isKeyPressed(code: string): boolean {
	return keys[code] || false;
}
