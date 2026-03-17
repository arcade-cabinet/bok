/**
 * Scene infrastructure factory — replaces JP Runtime construction.
 * Creates ThreeRenderer, SceneManager, and World from @jolly-pixel/engine.
 * The World manages actors, behaviors, input, and per-frame updates.
 */
import { Systems } from "@jolly-pixel/engine";
import type * as THREE from "three";

export interface GameInfra {
	/** JP World — owns actors, behaviors, input, scene manager. */
	world: Systems.World<THREE.WebGLRenderer>;
	/** Access the underlying Three.js WebGLRenderer. */
	webglRenderer: THREE.WebGLRenderer;
}

/**
 * Construct the game's rendering/actor infrastructure.
 * Replicates what JP Runtime does internally — without the
 * loading UI, GPU detection, or stats overlay.
 */
export function createGameInfra(canvas: HTMLCanvasElement): GameInfra {
	const sceneManager = new Systems.SceneManager();
	const renderer = new Systems.ThreeRenderer(canvas, {
		sceneManager,
		renderMode: "direct",
	});

	// Cast: ThreeRenderer.onDraw wraps the callback param in { source }, but
	// World's Renderer generic expects the raw WebGLRenderer. JP Runtime's JS
	// source does the same assignment without types — this cast is safe.
	const world = new Systems.World(renderer as unknown as Systems.Renderer<THREE.WebGLRenderer>, {
		enableOnExit: true,
		sceneManager,
	});

	// Match what loadRuntime sets: 60fps default, device pixel ratio
	world.setFps(60);
	renderer.getSource().setPixelRatio(Math.min(window.devicePixelRatio, 2));

	return {
		world,
		webglRenderer: renderer.getSource(),
	};
}
