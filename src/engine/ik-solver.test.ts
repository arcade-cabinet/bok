import { describe, expect, it } from "vitest";
import { getEndEffector, solve2BoneIK } from "./ik-solver.ts";

describe("solve2BoneIK", () => {
	const UPPER = 3;
	const LOWER = 2;

	it("reaches a reachable target within tolerance", () => {
		const result = solve2BoneIK(UPPER, LOWER, 4, 0);
		expect(result.reached).toBe(true);

		const end = getEndEffector(UPPER, LOWER, result.upperAngle, result.lowerAngle);
		expect(end.x).toBeCloseTo(4, 3);
		expect(end.y).toBeCloseTo(0, 3);
	});

	it("reaches a target at an angle", () => {
		const result = solve2BoneIK(UPPER, LOWER, 2, 3);
		expect(result.reached).toBe(true);

		const end = getEndEffector(UPPER, LOWER, result.upperAngle, result.lowerAngle);
		expect(end.x).toBeCloseTo(2, 3);
		expect(end.y).toBeCloseTo(3, 3);
	});

	it("reaches target below the root (negative Y)", () => {
		const result = solve2BoneIK(UPPER, LOWER, 1, -3);
		expect(result.reached).toBe(true);

		const end = getEndEffector(UPPER, LOWER, result.upperAngle, result.lowerAngle);
		expect(end.x).toBeCloseTo(1, 3);
		expect(end.y).toBeCloseTo(-3, 3);
	});

	it("extends fully when target is out of reach", () => {
		const result = solve2BoneIK(UPPER, LOWER, 10, 0);
		expect(result.reached).toBe(false);
		expect(result.lowerAngle).toBeCloseTo(0); // fully extended
	});

	it("folds when target is inside minimum reach", () => {
		// min reach = |3-2| = 1, target at 0.5
		const result = solve2BoneIK(UPPER, LOWER, 0.5, 0);
		expect(result.reached).toBe(false);
		expect(result.lowerAngle).toBeCloseTo(Math.PI); // fully folded
	});

	it("reaches target exactly at max reach boundary", () => {
		// max reach = 3 + 2 = 5, exactly 5 away => out of reach (>=)
		const result = solve2BoneIK(UPPER, LOWER, 5, 0);
		expect(result.reached).toBe(false);
		expect(result.lowerAngle).toBeCloseTo(0);
	});

	it("reaches target just inside max reach", () => {
		const result = solve2BoneIK(UPPER, LOWER, 4.99, 0);
		expect(result.reached).toBe(true);

		const end = getEndEffector(UPPER, LOWER, result.upperAngle, result.lowerAngle);
		expect(end.x).toBeCloseTo(4.99, 2);
	});

	it("handles equal bone lengths", () => {
		const result = solve2BoneIK(3, 3, 4, 0);
		expect(result.reached).toBe(true);

		const end = getEndEffector(3, 3, result.upperAngle, result.lowerAngle);
		expect(end.x).toBeCloseTo(4, 3);
		expect(end.y).toBeCloseTo(0, 3);
	});

	it("upper angle points toward target when out of reach", () => {
		const result = solve2BoneIK(UPPER, LOWER, 0, 100);
		expect(result.reached).toBe(false);
		// Should point straight up (π/2)
		expect(result.upperAngle).toBeCloseTo(Math.PI / 2, 1);
	});

	it("lower angle bends correctly for right-angle target", () => {
		// Target at (UPPER, LOWER) — forms a right angle
		const result = solve2BoneIK(UPPER, LOWER, UPPER, LOWER);
		expect(result.reached).toBe(true);

		const end = getEndEffector(UPPER, LOWER, result.upperAngle, result.lowerAngle);
		expect(end.x).toBeCloseTo(UPPER, 3);
		expect(end.y).toBeCloseTo(LOWER, 3);
	});
});

describe("getEndEffector", () => {
	it("returns tip of fully extended chain", () => {
		const end = getEndEffector(3, 2, 0, 0);
		expect(end.x).toBeCloseTo(5);
		expect(end.y).toBeCloseTo(0);
	});

	it("returns origin when bones fold back completely", () => {
		const end = getEndEffector(3, 3, 0, Math.PI);
		expect(end.x).toBeCloseTo(0, 3);
		expect(end.y).toBeCloseTo(0, 3);
	});

	it("upper-only rotation rotates entire chain", () => {
		const end = getEndEffector(3, 2, Math.PI / 2, 0);
		expect(end.x).toBeCloseTo(0, 3);
		expect(end.y).toBeCloseTo(5, 3);
	});
});
