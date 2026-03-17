import { describe, expect, it } from "vitest";
import {
	createChain,
	createSpring,
	segmentHeading,
	springConverged,
	springUpdate,
	updateFollowChain,
} from "./spring-physics.ts";

describe("spring physics", () => {
	it("creates spring at given position with zero velocity", () => {
		const s = createSpring(5);
		expect(s.position).toBe(5);
		expect(s.velocity).toBe(0);
	});

	it("converges toward target over many steps", () => {
		const s = createSpring(0);
		const target = 1.0;
		for (let i = 0; i < 500; i++) {
			springUpdate(s, target, 100, 15, 1 / 60);
		}
		expect(s.position).toBeCloseTo(target, 2);
	});

	it("overshoots with low damping", () => {
		const s = createSpring(0);
		const target = 1.0;
		let maxPos = 0;
		for (let i = 0; i < 120; i++) {
			springUpdate(s, target, 200, 2, 1 / 60);
			if (s.position > maxPos) maxPos = s.position;
		}
		// With low damping, should overshoot past target
		expect(maxPos).toBeGreaterThan(target);
	});

	it("does not overshoot with high damping (critically damped)", () => {
		const s = createSpring(0);
		const target = 1.0;
		let maxPos = 0;
		for (let i = 0; i < 300; i++) {
			springUpdate(s, target, 100, 30, 1 / 60);
			if (s.position > maxPos) maxPos = s.position;
		}
		// High damping should prevent overshoot (or minimal)
		expect(maxPos).toBeLessThan(target + 0.05);
	});

	it("stays at target when already there", () => {
		const s = createSpring(5);
		springUpdate(s, 5, 100, 10, 1 / 60);
		expect(s.position).toBeCloseTo(5);
		expect(s.velocity).toBeCloseTo(0);
	});

	it("works with negative targets", () => {
		const s = createSpring(0);
		for (let i = 0; i < 500; i++) {
			springUpdate(s, -3, 100, 15, 1 / 60);
		}
		expect(s.position).toBeCloseTo(-3, 2);
	});
});

describe("springConverged", () => {
	it("returns true when spring is at target with zero velocity", () => {
		const s = createSpring(5);
		expect(springConverged(s, 5)).toBe(true);
	});

	it("returns false when position is far from target", () => {
		const s = createSpring(0);
		expect(springConverged(s, 5)).toBe(false);
	});

	it("returns false when velocity is high", () => {
		const s = createSpring(5);
		s.velocity = 1;
		expect(springConverged(s, 5)).toBe(false);
	});

	it("respects custom thresholds", () => {
		const s = createSpring(5.05);
		expect(springConverged(s, 5, 0.1, 0.1)).toBe(true);
		expect(springConverged(s, 5, 0.01, 0.01)).toBe(false);
	});
});

describe("follow-the-leader chain", () => {
	it("moves head to new position", () => {
		const chain = createChain(0, 0, 0, 3, 1);
		updateFollowChain(chain, 5, 0, 0, 1);
		expect(chain[0].x).toBe(5);
		expect(chain[0].y).toBe(0);
		expect(chain[0].z).toBe(0);
	});

	it("maintains spacing between segments", () => {
		const chain = createChain(0, 0, 0, 5, 2);
		updateFollowChain(chain, 10, 0, 0, 2);

		for (let i = 1; i < chain.length; i++) {
			const dx = chain[i].x - chain[i - 1].x;
			const dy = chain[i].y - chain[i - 1].y;
			const dz = chain[i].z - chain[i - 1].z;
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
			expect(dist).toBeLessThanOrEqual(2 + 0.001);
		}
	});

	it("does not move segments closer than spacing", () => {
		// Segments already within spacing should not be pulled closer
		const chain = [
			{ x: 0, y: 0, z: 0 },
			{ x: 0.5, y: 0, z: 0 },
		];
		updateFollowChain(chain, 0, 0, 0, 2);
		// Segment 1 is only 0.5 away (< spacing of 2), should stay put
		expect(chain[1].x).toBe(0.5);
	});

	it("handles single-segment chain", () => {
		const chain = [{ x: 0, y: 0, z: 0 }];
		updateFollowChain(chain, 5, 3, 1, 1);
		expect(chain[0].x).toBe(5);
		expect(chain[0].y).toBe(3);
		expect(chain[0].z).toBe(1);
	});

	it("handles empty chain", () => {
		const chain: { x: number; y: number; z: number }[] = [];
		// Should not throw
		updateFollowChain(chain, 5, 0, 0, 1);
		expect(chain.length).toBe(0);
	});

	it("chain follows curved path over multiple updates", () => {
		const chain = createChain(0, 0, 0, 4, 1);

		// Move head in a curve
		updateFollowChain(chain, 3, 0, 0, 1);
		updateFollowChain(chain, 3, 0, 3, 1);

		// All segments should have moved
		for (let i = 1; i < chain.length; i++) {
			const dx = chain[i].x - chain[i - 1].x;
			const dy = chain[i].y - chain[i - 1].y;
			const dz = chain[i].z - chain[i - 1].z;
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
			expect(dist).toBeLessThanOrEqual(1 + 0.001);
		}
	});
});

describe("createChain", () => {
	it("creates correct number of segments", () => {
		const chain = createChain(0, 5, 0, 8, 1);
		expect(chain.length).toBe(8);
	});

	it("spaces segments along Z axis initially", () => {
		const chain = createChain(0, 0, 0, 3, 2);
		expect(chain[0]).toEqual({ x: 0, y: 0, z: 0 });
		expect(chain[1]).toEqual({ x: 0, y: 0, z: 2 });
		expect(chain[2]).toEqual({ x: 0, y: 0, z: 4 });
	});
});

describe("segmentHeading", () => {
	it("returns 0 for segments aligned along +Z", () => {
		expect(segmentHeading(0, 0, 0, 5)).toBeCloseTo(0);
	});

	it("returns π/2 for segments along +X", () => {
		expect(segmentHeading(0, 0, 5, 0)).toBeCloseTo(Math.PI / 2);
	});

	it("returns -π/2 for segments along -X", () => {
		expect(segmentHeading(0, 0, -5, 0)).toBeCloseTo(-Math.PI / 2);
	});

	it("returns π for segments along -Z", () => {
		expect(Math.abs(segmentHeading(0, 0, 0, -5))).toBeCloseTo(Math.PI);
	});
});
