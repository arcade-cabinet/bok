import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { InputSystem } from "./input-system.ts";

// InputSystem uses browser globals. Stub the minimum needed for the node test env.
const eventListeners: Record<string, EventListener[]> = {};
const canvasListeners: Record<string, EventListener[]> = {};

function fireListeners(listeners: EventListener[], e: Event): void {
	for (const h of listeners) {
		h(e);
	}
}

const fakeWindow = {
	addEventListener: (event: string, handler: EventListener) => {
		eventListeners[event] ??= [];
		eventListeners[event].push(handler);
	},
	removeEventListener: (event: string, handler: EventListener) => {
		eventListeners[event] = (eventListeners[event] ?? []).filter((h) => h !== handler);
	},
};

const fakeDocument = {
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	pointerLockElement: null as Element | null,
	exitPointerLock: vi.fn(),
};

function makeCanvas() {
	return {
		clientWidth: 800,
		clientHeight: 600,
		requestPointerLock: vi.fn(),
		addEventListener: (event: string, handler: EventListener, _opts?: unknown) => {
			canvasListeners[event] ??= [];
			canvasListeners[event].push(handler);
		},
		removeEventListener: (event: string, handler: EventListener) => {
			canvasListeners[event] = (canvasListeners[event] ?? []).filter((h) => h !== handler);
		},
	} as unknown as HTMLCanvasElement;
}

beforeAll(() => {
	vi.stubGlobal("window", fakeWindow);
	vi.stubGlobal("document", fakeDocument);
	vi.stubGlobal("navigator", { maxTouchPoints: 0 });
});

afterAll(() => {
	vi.unstubAllGlobals();
});

describe("InputSystem", () => {
	it("constructs and disposes without throwing", () => {
		const canvas = makeCanvas();
		const sys = new InputSystem(canvas);
		expect(() => sys.dispose()).not.toThrow();
	});

	it("isKeyDown starts false", () => {
		const canvas = makeCanvas();
		const sys = new InputSystem(canvas);
		expect(sys.isKeyDown("KeyW")).toBe(false);
		sys.dispose();
	});

	it("isKeyDown true after keydown, false after keyup", () => {
		const canvas = makeCanvas();
		const sys = new InputSystem(canvas);

		const downEvent = { code: "KeyW", type: "keydown" } as KeyboardEvent;
		fireListeners(eventListeners.keydown ?? [], downEvent);
		expect(sys.isKeyDown("KeyW")).toBe(true);

		const upEvent = { code: "KeyW", type: "keyup" } as KeyboardEvent;
		fireListeners(eventListeners.keyup ?? [], upEvent);
		expect(sys.isKeyDown("KeyW")).toBe(false);
		sys.dispose();
	});

	it("wasKeyJustPressed resets after endFrame", () => {
		const canvas = makeCanvas();
		const sys = new InputSystem(canvas);

		const downEvent = { code: "Space", type: "keydown" } as KeyboardEvent;
		fireListeners(eventListeners.keydown ?? [], downEvent);
		expect(sys.wasKeyJustPressed("Space")).toBe(true);

		sys.endFrame();
		expect(sys.wasKeyJustPressed("Space")).toBe(false);
		sys.dispose();
	});

	it("getMouseDelta returns zero initially and after endFrame", () => {
		const canvas = makeCanvas();
		const sys = new InputSystem(canvas);
		expect(sys.getMouseDelta()).toEqual({ x: 0, y: 0 });
		sys.endFrame();
		expect(sys.getMouseDelta()).toEqual({ x: 0, y: 0 });
		sys.dispose();
	});

	it("isMouseButtonDown starts false for all buttons", () => {
		const canvas = makeCanvas();
		const sys = new InputSystem(canvas);
		expect(sys.isMouseButtonDown("left")).toBe(false);
		expect(sys.isMouseButtonDown("right")).toBe(false);
		expect(sys.isMouseButtonDown("middle")).toBe(false);
		sys.dispose();
	});

	it("getScreenSize returns canvas dimensions", () => {
		const canvas = makeCanvas();
		const sys = new InputSystem(canvas);
		expect(sys.getScreenSize()).toEqual({ x: 800, y: 600 });
		sys.dispose();
	});

	it("mouse.locked is false initially", () => {
		const canvas = makeCanvas();
		const sys = new InputSystem(canvas);
		expect(sys.mouse.locked).toBe(false);
		sys.dispose();
	});
});
