/**
 * Scene manager — creates and manages Three.js scene, camera, and renderer.
 * Replaces the JP Runtime scene infrastructure.
 */

import * as THREE from "three";

export interface SceneManagerOptions {
	fov?: number;
	near?: number;
	far?: number;
	background?: number;
}

export interface SceneManager {
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.WebGLRenderer & { setSize: (w: number, h: number) => void; dispose: () => void };
	add(id: string, object: THREE.Object3D): void;
	get(id: string): THREE.Object3D | undefined;
	remove(id: string): void;
	resize(width: number, height: number): void;
	destroy(): void;
}

export function createSceneManager(canvas: HTMLCanvasElement, opts: SceneManagerOptions = {}): SceneManager {
	const { fov = 75, near = 0.1, far = 100, background } = opts;

	const scene = new THREE.Scene();
	if (background !== undefined) scene.background = new THREE.Color(background);

	const camera = new THREE.PerspectiveCamera(fov, canvas.clientWidth / canvas.clientHeight, near, far);

	const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false }) as SceneManager["renderer"];
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setSize(canvas.clientWidth, canvas.clientHeight);

	const registry = new Map<string, THREE.Object3D>();

	const resizeHandler = () => {
		camera.aspect = canvas.clientWidth / canvas.clientHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
	};
	window.addEventListener("resize", resizeHandler);

	return {
		scene,
		camera,
		renderer,

		add(id: string, object: THREE.Object3D) {
			const existing = registry.get(id);
			if (existing) scene.remove(existing);
			registry.set(id, object);
			scene.add(object);
		},

		get(id: string) {
			return registry.get(id);
		},

		remove(id: string) {
			const object = registry.get(id);
			if (!object) return;
			scene.remove(object);
			registry.delete(id);
		},

		resize(width: number, height: number) {
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			renderer.setSize(width, height);
		},

		destroy() {
			window.removeEventListener("resize", resizeHandler);
			for (const obj of registry.values()) {
				scene.remove(obj);
			}
			registry.clear();
			renderer.dispose();
		},
	};
}
