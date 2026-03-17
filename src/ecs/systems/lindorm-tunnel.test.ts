import { afterEach, describe, expect, it } from "vitest";
import {
	_resetLindormState,
	attractedByMining,
	BREACH_ARC_HEIGHT,
	breachArcXZ,
	breachArcY,
	breachHitsPlayer,
	canTunnelThrough,
	getLindormData,
	LindormPhase,
	nearTarget,
	registerLindorm,
	SEGMENT_COUNT,
	SEGMENT_SPACING,
	tunnelToward,
	VIBRATION_RANGE,
} from "./lindorm-tunnel.ts";

afterEach(() => {
	_resetLindormState();
});

// ─── Soft Block Check ───

describe("canTunnelThrough", () => {
	it("returns true for soft blocks", () => {
		expect(canTunnelThrough(true)).toBe(true);
	});

	it("returns false for hard blocks (stone)", () => {
		expect(canTunnelThrough(false)).toBe(false);
	});
});

// ─── State Management ───

describe("state management", () => {
	it("registers and retrieves Lindorm data", () => {
		registerLindorm(1, 10, 20);
		const data = getLindormData(1);
		expect(data).toBeDefined();
		expect(data?.phase).toBe(LindormPhase.Underground);
		expect(data?.targetX).toBe(10);
		expect(data?.targetZ).toBe(20);
	});

	it("returns undefined for unknown entity", () => {
		expect(getLindormData(999)).toBeUndefined();
	});
});

// ─── Tunnel Pathfinding ───

describe("tunnelToward", () => {
	it("moves toward target position", () => {
		const result = tunnelToward(0, 0, 10, 0, 3, 1.0);
		expect(result.dx).toBeCloseTo(3, 1);
		expect(result.dz).toBeCloseTo(0, 1);
	});

	it("returns zero at target", () => {
		const result = tunnelToward(5, 5, 5, 5, 3, 1.0);
		expect(result.dx).toBe(0);
		expect(result.dz).toBe(0);
	});

	it("normalizes direction for diagonal movement", () => {
		const result = tunnelToward(0, 0, 10, 10, 3, 1.0);
		const mag = Math.sqrt(result.dx * result.dx + result.dz * result.dz);
		expect(mag).toBeCloseTo(3, 1);
	});
});

describe("nearTarget", () => {
	it("returns true when close to target", () => {
		expect(nearTarget(10, 10, 11, 11)).toBe(true);
	});

	it("returns false when far from target", () => {
		expect(nearTarget(0, 0, 50, 50)).toBe(false);
	});
});

// ─── Breach Arc ───

describe("breachArcY", () => {
	it("returns surface Y at progress 0", () => {
		expect(breachArcY(0, 10)).toBe(10);
	});

	it("returns surface Y at progress 1 (dive back)", () => {
		expect(breachArcY(1, 10)).toBe(10);
	});

	it("peaks at progress 0.5", () => {
		const peak = breachArcY(0.5, 10);
		expect(peak).toBeCloseTo(10 + BREACH_ARC_HEIGHT, 1);
	});

	it("is symmetric around 0.5", () => {
		const y25 = breachArcY(0.25, 10);
		const y75 = breachArcY(0.75, 10);
		expect(y25).toBeCloseTo(y75, 4);
	});
});

describe("breachArcXZ", () => {
	it("returns breach origin at progress 0", () => {
		const pos = breachArcXZ(10, 20, 0, 0);
		expect(pos.x).toBe(10);
		expect(pos.z).toBe(20);
	});

	it("advances in the direction of the angle", () => {
		// angle = 0 means forward along Z
		const pos = breachArcXZ(0, 0, 0, 0.5);
		expect(pos.z).toBeGreaterThan(0);
	});
});

describe("breachHitsPlayer", () => {
	it("returns true when head is near player", () => {
		expect(breachHitsPlayer(5, 5, 5.5, 5.5)).toBe(true);
	});

	it("returns false when head is far from player", () => {
		expect(breachHitsPlayer(0, 0, 20, 20)).toBe(false);
	});
});

// ─── Mining Vibration ───

describe("attractedByMining", () => {
	it("returns true when mining within vibration range", () => {
		expect(attractedByMining(0, 0, 5, 5)).toBe(true);
	});

	it("returns false when mining beyond range", () => {
		expect(attractedByMining(0, 0, VIBRATION_RANGE + 10, 0)).toBe(false);
	});
});

// ─── Constants ───

describe("constants", () => {
	it("has 12 segments", () => {
		expect(SEGMENT_COUNT).toBe(12);
	});

	it("has positive segment spacing", () => {
		expect(SEGMENT_SPACING).toBeGreaterThan(0);
	});
});
