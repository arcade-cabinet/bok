import { describe, expect, it } from "vitest";
import { computePullVelocity, FEHU_COLLECT_DISTANCE, isAtSource, isInPullRange } from "./fehu-pull.ts";
import { FEHU_PULL_RADIUS, FEHU_PULL_SPEED } from "./interaction-rune-data.ts";

// ─── isInPullRange ───

describe("isInPullRange", () => {
	const source = { x: 10, y: 5, z: 10 };

	it("returns true for item at source", () => {
		expect(isInPullRange({ x: 10, y: 5, z: 10, itemId: 1, qty: 1 }, source)).toBe(true);
	});

	it("returns true for item within radius", () => {
		expect(isInPullRange({ x: 10 + FEHU_PULL_RADIUS - 1, y: 5, z: 10, itemId: 1, qty: 1 }, source)).toBe(true);
	});

	it("returns true for item exactly at radius boundary", () => {
		expect(isInPullRange({ x: 10 + FEHU_PULL_RADIUS, y: 5, z: 10, itemId: 1, qty: 1 }, source)).toBe(true);
	});

	it("returns false for item beyond radius", () => {
		expect(isInPullRange({ x: 10 + FEHU_PULL_RADIUS + 1, y: 5, z: 10, itemId: 1, qty: 1 }, source)).toBe(false);
	});

	it("checks 3D distance, not just XZ", () => {
		// Item 4 blocks away on each axis = sqrt(48) ≈ 6.93 — within radius 6 only if all 3 axes
		// Item at exactly (4, 4, 4) distance: sqrt(48) ≈ 6.93 > 6
		expect(isInPullRange({ x: 14, y: 9, z: 14, itemId: 1, qty: 1 }, source)).toBe(false);
	});
});

// ─── computePullVelocity ───

describe("computePullVelocity", () => {
	it("returns zero velocity when out of range", () => {
		const [vx, vy, vz] = computePullVelocity(100, 100, 100, 10, 5, 10);
		expect(vx).toBe(0);
		expect(vy).toBe(0);
		expect(vz).toBe(0);
	});

	it("returns zero velocity when already at source", () => {
		const [vx, vy, vz] = computePullVelocity(10, 5, 10, 10, 5, 10);
		expect(vx).toBe(0);
		expect(vy).toBe(0);
		expect(vz).toBe(0);
	});

	it("pulls directly toward source along X axis", () => {
		const [vx, vy, vz] = computePullVelocity(13, 5, 10, 10, 5, 10);
		expect(vx).toBeCloseTo(-FEHU_PULL_SPEED, 1);
		expect(vy).toBeCloseTo(0, 1);
		expect(vz).toBeCloseTo(0, 1);
	});

	it("pulls directly toward source along Y axis", () => {
		const [vx, vy, vz] = computePullVelocity(10, 8, 10, 10, 5, 10);
		expect(vx).toBeCloseTo(0, 1);
		expect(vy).toBeCloseTo(-FEHU_PULL_SPEED, 1);
		expect(vz).toBeCloseTo(0, 1);
	});

	it("velocity magnitude equals FEHU_PULL_SPEED", () => {
		const [vx, vy, vz] = computePullVelocity(12, 7, 12, 10, 5, 10);
		const mag = Math.sqrt(vx * vx + vy * vy + vz * vz);
		expect(mag).toBeCloseTo(FEHU_PULL_SPEED, 1);
	});
});

// ─── isAtSource ───

describe("isAtSource", () => {
	it("returns true when at source", () => {
		expect(isAtSource(10, 5, 10, 10, 5, 10)).toBe(true);
	});

	it("returns true within collect distance", () => {
		expect(isAtSource(10.5, 5, 10, 10, 5, 10)).toBe(true);
	});

	it("returns false beyond collect distance", () => {
		expect(isAtSource(11, 5, 10, 10, 5, 10)).toBe(false);
	});
});

// ─── Constants ───

describe("Fehu constants", () => {
	it("pull radius is positive", () => {
		expect(FEHU_PULL_RADIUS).toBeGreaterThan(0);
	});

	it("collect distance is less than pull radius", () => {
		expect(FEHU_COLLECT_DISTANCE).toBeLessThan(FEHU_PULL_RADIUS);
	});
});
