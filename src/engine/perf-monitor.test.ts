/**
 * Performance monitor unit tests — verifies budget thresholds
 * and snapshot computation (pure logic, no DOM).
 */

import { describe, expect, it } from "vitest";
import { PERF_BUDGETS, snapshot } from "./perf-monitor.ts";

describe("perf-monitor", () => {
	describe("PERF_BUDGETS", () => {
		it("defines all required budget thresholds", () => {
			expect(PERF_BUDGETS.fpsMobile).toBe(55);
			expect(PERF_BUDGETS.fpsDesktop).toBe(60);
			expect(PERF_BUDGETS.drawCalls).toBe(50);
			expect(PERF_BUDGETS.memoryMB).toBe(100);
			expect(PERF_BUDGETS.bundleKB).toBe(500);
			expect(PERF_BUDGETS.ttiMs).toBe(3000);
		});
	});

	describe("snapshot", () => {
		it("returns a valid snapshot with default values", () => {
			const snap = snapshot();
			expect(snap).toHaveProperty("fps");
			expect(snap).toHaveProperty("frameTimeMs");
			expect(snap).toHaveProperty("drawCalls");
			expect(snap).toHaveProperty("triangles");
			expect(snap).toHaveProperty("geometries");
			expect(snap).toHaveProperty("textures");
			expect(snap).toHaveProperty("violations");
			expect(snap.drawCalls).toBe(0);
			expect(snap.triangles).toBe(0);
		});

		it("computes FPS from frame timing", () => {
			// Take multiple snapshots to build up frame history
			for (let i = 0; i < 10; i++) {
				snapshot();
			}
			const snap = snapshot();
			// FPS should be > 0 after multiple samples
			expect(snap.fps).toBeGreaterThan(0);
			expect(snap.frameTimeMs).toBeGreaterThan(0);
		});

		it("reports no draw-call violations when no renderer bound", () => {
			const snap = snapshot();
			// Draw calls are 0 (no renderer) — no draw call violations
			const drawViolations = snap.violations.filter((v) => v.startsWith("Draw"));
			expect(drawViolations).toHaveLength(0);
		});

		it("reports no memory violations in test environment", () => {
			const snap = snapshot();
			const memViolations = snap.violations.filter((v) => v.startsWith("Memory"));
			expect(memViolations).toHaveLength(0);
		});
	});
});
