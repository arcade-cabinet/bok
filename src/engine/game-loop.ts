/**
 * Custom game loop — replaces @jolly-pixel/runtime.
 * Manages Three.js WebGLRenderer, requestAnimationFrame loop, and behavior lifecycle.
 */

import * as THREE from "three";
import type { Behavior } from "./behavior.ts";
import type { InputSystem } from "./input-system.ts";

export class GameLoop {
	readonly renderer: THREE.WebGLRenderer;
	readonly scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera | null = null;
	private behaviors: Behavior[] = [];
	private rafId: number | null = null;
	private lastTime = 0;
	private running = false;
	private inputSystem: InputSystem | null = null;

	constructor(canvas: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.scene = new THREE.Scene();
	}

	setCamera(camera: THREE.PerspectiveCamera): void {
		this.camera = camera;
	}

	setInputSystem(input: InputSystem): void {
		this.inputSystem = input;
	}

	/** Register a behavior. Calls awake() immediately. */
	addBehavior(behavior: Behavior): void {
		this.behaviors.push(behavior);
		behavior.awake();
	}

	/** Start the game loop. */
	start(): void {
		if (this.running) return;
		this.running = true;
		this.lastTime = performance.now();
		this.rafId = requestAnimationFrame((t) => this.loop(t));
	}

	/** Stop the game loop and dispose renderer. */
	stop(): void {
		this.running = false;
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		for (const b of this.behaviors) b.dispose();
		this.behaviors.length = 0;
		this.renderer.dispose();
	}

	private loop(timestamp: number): void {
		if (!this.running) return;
		const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
		this.lastTime = timestamp;

		// Update all behaviors that have needUpdate set
		for (const b of this.behaviors) {
			if (b.needUpdate) b.update(dt);
		}

		// Clear per-frame input state after all behaviors have polled
		this.inputSystem?.endFrame();

		// Render
		if (this.camera) {
			this.renderer.render(this.scene, this.camera);
		}

		this.rafId = requestAnimationFrame((t) => this.loop(t));
	}
}
