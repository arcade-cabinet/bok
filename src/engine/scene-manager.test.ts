import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock Three.js WebGLRenderer (needs WebGL context unavailable in Node)
vi.mock("three", async () => {
	const actual = await vi.importActual<typeof import("three")>("three");
	return {
		...actual,
		// biome-ignore lint/complexity/useArrowFunction: Vitest 4 requires `function` for constructor mocks
		WebGLRenderer: vi.fn().mockImplementation(function () {
			return {
				setSize: vi.fn(),
				setPixelRatio: vi.fn(),
				dispose: vi.fn(),
			};
		}),
	};
});

// Stub minimal DOM globals for Node environment
const listeners = new Map<string, Set<() => void>>();
vi.stubGlobal("window", {
	addEventListener: vi.fn((event: string, fn: () => void) => {
		if (!listeners.has(event)) listeners.set(event, new Set());
		listeners.get(event)?.add(fn);
	}),
	removeEventListener: vi.fn((event: string, fn: () => void) => {
		listeners.get(event)?.delete(fn);
	}),
	devicePixelRatio: 1,
});

import { createSceneManager, type SceneManager } from "./scene-manager.ts";

function makeCanvas(w = 800, h = 600) {
	return { clientWidth: w, clientHeight: h } as unknown as HTMLCanvasElement;
}

describe("scene-manager", () => {
	let sm: SceneManager;

	beforeEach(() => {
		listeners.clear();
		sm = createSceneManager(makeCanvas());
	});

	afterEach(() => {
		sm.destroy();
	});

	// ─── Construction ───

	test("creates scene, camera, and renderer", () => {
		expect(sm.scene).toBeInstanceOf(THREE.Scene);
		expect(sm.camera).toBeInstanceOf(THREE.PerspectiveCamera);
		expect(sm.renderer).toBeDefined();
	});

	test("camera uses provided FOV and aspect ratio", () => {
		const sm2 = createSceneManager(makeCanvas(1024, 768), { fov: 90 });
		expect(sm2.camera.fov).toBe(90);
		expect(sm2.camera.aspect).toBeCloseTo(1024 / 768, 2);
		sm2.destroy();
	});

	test("defaults to fov=75, near=0.1, far=100", () => {
		expect(sm.camera.fov).toBe(75);
		expect(sm.camera.near).toBeCloseTo(0.1);
		expect(sm.camera.far).toBe(100);
	});

	// ─── Object management ───

	test("add registers object by ID and adds to scene", () => {
		const obj = new THREE.Object3D();
		sm.add("light-1", obj);
		expect(sm.get("light-1")).toBe(obj);
		expect(sm.scene.children).toContain(obj);
	});

	test("remove takes object out of scene and registry", () => {
		const obj = new THREE.Object3D();
		sm.add("temp", obj);
		sm.remove("temp");
		expect(sm.get("temp")).toBeUndefined();
		expect(sm.scene.children).not.toContain(obj);
	});

	test("remove is a no-op for unknown ID", () => {
		expect(() => sm.remove("nonexistent")).not.toThrow();
	});

	test("add overwrites existing ID and removes old from scene", () => {
		const a = new THREE.Object3D();
		const b = new THREE.Object3D();
		sm.add("slot", a);
		sm.add("slot", b);
		expect(sm.get("slot")).toBe(b);
		expect(sm.scene.children).not.toContain(a);
		expect(sm.scene.children).toContain(b);
	});

	// ─── Resize ───

	test("resize updates camera aspect and projection matrix", () => {
		sm.resize(1920, 1080);
		expect(sm.camera.aspect).toBeCloseTo(1920 / 1080, 2);
	});

	test("resize calls renderer.setSize", () => {
		sm.resize(1920, 1080);
		expect(sm.renderer.setSize).toHaveBeenCalledWith(1920, 1080);
	});

	// ─── Destroy ───

	test("destroy removes all objects from scene", () => {
		sm.add("a", new THREE.Object3D());
		sm.add("b", new THREE.Object3D());
		sm.destroy();
		expect(sm.scene.children.length).toBe(0);
	});

	test("destroy disposes renderer", () => {
		sm.destroy();
		expect(sm.renderer.dispose).toHaveBeenCalled();
	});

	test("destroy clears object registry", () => {
		sm.add("x", new THREE.Object3D());
		sm.destroy();
		expect(sm.get("x")).toBeUndefined();
	});

	test("destroy removes resize listener", () => {
		sm.destroy();
		const resizeCalls = (window.removeEventListener as ReturnType<typeof vi.fn>).mock.calls;
		const hasResize = resizeCalls.some((c: unknown[]) => c[0] === "resize");
		expect(hasResize).toBe(true);
	});

	// ─── Background color ───

	test("sets scene background when option provided", () => {
		const sm2 = createSceneManager(makeCanvas(), { background: 0x87ceeb });
		expect(sm2.scene.background).toBeInstanceOf(THREE.Color);
		sm2.destroy();
	});
});
