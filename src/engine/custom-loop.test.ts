import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGameLoop, type GameLoop } from "./custom-loop.ts";

/**
 * Manual rAF stub: collects pending callbacks and fires them
 * one at a time via `fireFrame(timestamp)`. This avoids the
 * infinite-chain problem of setTimeout(0) stubs.
 */
function createRafStub() {
	let nextId = 1;
	const pending = new Map<number, FrameRequestCallback>();

	function requestAnimationFrame(cb: FrameRequestCallback): number {
		const id = nextId++;
		pending.set(id, cb);
		return id;
	}

	function cancelAnimationFrame(id: number): void {
		pending.delete(id);
	}

	/** Fire the oldest pending rAF callback with the given timestamp. */
	function fireFrame(timestamp: number): void {
		const entry = pending.entries().next();
		if (entry.done) return;
		const [id, cb] = entry.value;
		pending.delete(id);
		cb(timestamp);
	}

	return { requestAnimationFrame, cancelAnimationFrame, fireFrame, pending };
}

describe("custom-loop", () => {
	let loop: GameLoop;
	let callback: ReturnType<typeof vi.fn>;
	let raf: ReturnType<typeof createRafStub>;

	beforeEach(() => {
		raf = createRafStub();
		vi.stubGlobal("requestAnimationFrame", raf.requestAnimationFrame);
		vi.stubGlobal("cancelAnimationFrame", raf.cancelAnimationFrame);
		callback = vi.fn();
		loop = createGameLoop(callback);
	});

	afterEach(() => {
		loop.stop();
		vi.unstubAllGlobals();
	});

	it("creates a loop in stopped state", () => {
		expect(loop.isRunning()).toBe(false);
		expect(loop.isPaused()).toBe(false);
	});

	it("starts the loop and calls callback with dt in seconds", () => {
		loop.start();
		expect(loop.isRunning()).toBe(true);

		// First frame at t=0 — dt should be 0 (no previous timestamp)
		raf.fireFrame(0);
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(0);

		// Second frame at t=16ms
		raf.fireFrame(16);
		expect(callback).toHaveBeenCalledTimes(2);
		const dt = callback.mock.calls[1][0] as number;
		expect(dt).toBeCloseTo(0.016, 3);
	});

	it("stop cancels the animation frame", () => {
		loop.start();
		raf.fireFrame(0);
		loop.stop();

		expect(loop.isRunning()).toBe(false);

		// No more callbacks after stop
		raf.fireFrame(16);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("clamps dt to max (default 100ms = 0.1s)", () => {
		loop.start();
		raf.fireFrame(0); // first frame

		// Simulate a long gap (tab was backgrounded for 2 seconds)
		raf.fireFrame(2000);
		const dt = callback.mock.calls[1][0] as number;
		expect(dt).toBe(0.1);
	});

	it("respects custom maxDt", () => {
		loop = createGameLoop(callback, { maxDt: 0.05 });
		loop.start();
		raf.fireFrame(0);

		raf.fireFrame(200);
		const dt = callback.mock.calls[1][0] as number;
		expect(dt).toBe(0.05);
	});

	it("pause stops calling callback but keeps running state", () => {
		loop.start();
		raf.fireFrame(0);
		expect(callback).toHaveBeenCalledTimes(1);

		loop.pause();
		expect(loop.isPaused()).toBe(true);
		expect(loop.isRunning()).toBe(true);

		// Frames still fire internally but callback is skipped
		raf.fireFrame(16);
		raf.fireFrame(32);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("resume restarts callback with fresh dt (no accumulated time)", () => {
		loop.start();
		raf.fireFrame(0); // frame 0
		expect(callback).toHaveBeenCalledTimes(1);

		loop.pause();
		raf.fireFrame(1000); // 1s passes while paused
		raf.fireFrame(5000); // 5s passes while paused

		loop.resume();
		raf.fireFrame(5016); // first frame after resume

		// The dt after resume should be 0 (fresh start), not 5+ seconds
		const lastDt = callback.mock.calls[callback.mock.calls.length - 1][0] as number;
		expect(lastDt).toBe(0);
		expect(loop.isPaused()).toBe(false);
	});

	it("start is idempotent — calling twice does not double-schedule", () => {
		loop.start();
		loop.start();

		// Only one pending rAF, not two
		expect(raf.pending.size).toBe(1);

		raf.fireFrame(0);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("stop then start resets timestamps", () => {
		loop.start();
		raf.fireFrame(0);
		raf.fireFrame(16);
		loop.stop();

		loop.start();
		raf.fireFrame(100);

		// First frame after restart should have dt = 0
		const lastDt = callback.mock.calls[callback.mock.calls.length - 1][0] as number;
		expect(lastDt).toBe(0);
	});

	it("does not call callback when paused even across many frames", () => {
		loop.start();
		raf.fireFrame(0);
		const callsBeforePause = callback.mock.calls.length;

		loop.pause();
		for (let i = 1; i <= 10; i++) {
			raf.fireFrame(i * 16);
		}

		expect(callback).toHaveBeenCalledTimes(callsBeforePause);
	});

	it("computes correct dt across multiple normal frames", () => {
		loop.start();
		raf.fireFrame(0); // dt=0
		raf.fireFrame(16); // dt≈0.016
		raf.fireFrame(33); // dt≈0.017
		raf.fireFrame(50); // dt≈0.017

		expect(callback).toHaveBeenCalledTimes(4);
		expect(callback.mock.calls[0][0]).toBe(0);
		expect(callback.mock.calls[1][0]).toBeCloseTo(0.016, 3);
		expect(callback.mock.calls[2][0]).toBeCloseTo(0.017, 3);
		expect(callback.mock.calls[3][0]).toBeCloseTo(0.017, 3);
	});
});
