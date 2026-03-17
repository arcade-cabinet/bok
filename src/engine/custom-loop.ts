/**
 * Custom game loop — replaces JP Runtime's animation loop.
 * Drives JP World.tick() each frame via Three.js setAnimationLoop.
 */
import type * as THREE from "three";

export interface CustomLoop {
	start(): void;
	stop(): void;
	readonly running: boolean;
}

/**
 * Creates a game loop that calls `onTick` every frame.
 * Uses Three.js setAnimationLoop for built-in rAF + XR support.
 */
export function createCustomLoop(renderer: THREE.WebGLRenderer, onTick: () => boolean | undefined): CustomLoop {
	let isRunning = false;

	const loop: CustomLoop = {
		start() {
			if (isRunning) return;
			isRunning = true;
			renderer.setAnimationLoop(() => {
				const exit = onTick();
				if (exit) loop.stop();
			});
		},
		stop() {
			if (!isRunning) return;
			isRunning = false;
			renderer.setAnimationLoop(null);
		},
		get running() {
			return isRunning;
		},
	};

	return loop;
}
