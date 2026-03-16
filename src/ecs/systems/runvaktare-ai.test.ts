import { afterEach, describe, expect, it } from "vitest";
import {
	_resetRunvaktareState,
	ACTIVATION_RANGE,
	activate,
	atPost,
	canSlam,
	getRunvaktareData,
	moveToward,
	RETURN_RANGE,
	RunvaktareState,
	registerRunvaktare,
	SLAM_COOLDOWN,
	SLAM_RANGE,
	shouldActivate,
	shouldReturn,
} from "./runvaktare-ai.ts";

afterEach(() => {
	_resetRunvaktareState();
});

// ─── Activation ───

describe("shouldActivate", () => {
	it("returns true when RuneStone mined within range of post", () => {
		expect(shouldActivate(10, 10, 12, 12, true)).toBe(true);
	});

	it("returns false when mined block is not RuneStone", () => {
		expect(shouldActivate(10, 10, 12, 12, false)).toBe(false);
	});

	it("returns false when mined position is beyond activation range", () => {
		const far = ACTIVATION_RANGE + 5;
		expect(shouldActivate(0, 0, far, far, true)).toBe(false);
	});

	it("returns true at exact activation range boundary", () => {
		expect(shouldActivate(0, 0, ACTIVATION_RANGE, 0, true)).toBe(true);
	});
});

describe("activate", () => {
	it("transitions dormant Runväktare to active", () => {
		registerRunvaktare(1, 10, 5, 10);
		activate(1);
		expect(getRunvaktareData(1)?.state).toBe(RunvaktareState.Active);
	});

	it("does not activate an already active Runväktare", () => {
		registerRunvaktare(1, 10, 5, 10);
		activate(1);
		const data = getRunvaktareData(1);
		expect(data?.state).toBe(RunvaktareState.Active);
		// Second activate shouldn't change to dormant
		activate(1);
		expect(getRunvaktareData(1)?.state).toBe(RunvaktareState.Active);
	});

	it("does nothing for unregistered entity", () => {
		activate(999); // Should not throw
	});
});

// ─── State Management ───

describe("state management", () => {
	it("registers and retrieves Runväktare data", () => {
		registerRunvaktare(42, 5, 10, 15);
		const data = getRunvaktareData(42);
		expect(data).toBeDefined();
		expect(data?.state).toBe(RunvaktareState.Dormant);
		expect(data?.postX).toBe(5);
		expect(data?.postY).toBe(10);
		expect(data?.postZ).toBe(15);
	});

	it("returns undefined for unknown entity", () => {
		expect(getRunvaktareData(999)).toBeUndefined();
	});
});

// ─── Movement ───

describe("moveToward", () => {
	it("returns movement toward target", () => {
		const result = moveToward(0, 0, 10, 0, 2, 1.0);
		expect(result.dx).toBeCloseTo(2, 1);
		expect(result.dz).toBeCloseTo(0, 1);
	});

	it("returns zero when at target", () => {
		const result = moveToward(5, 5, 5, 5, 2, 1.0);
		expect(result.dx).toBe(0);
		expect(result.dz).toBe(0);
	});

	it("scales with dt", () => {
		const r1 = moveToward(0, 0, 10, 0, 2, 0.5);
		const r2 = moveToward(0, 0, 10, 0, 2, 1.0);
		expect(r2.dx).toBeCloseTo(r1.dx * 2, 4);
	});
});

describe("shouldReturn", () => {
	it("returns true when player is beyond return range", () => {
		expect(shouldReturn(0, 0, RETURN_RANGE + 5, 0)).toBe(true);
	});

	it("returns false when player is within return range", () => {
		expect(shouldReturn(0, 0, 5, 0)).toBe(false);
	});
});

describe("atPost", () => {
	it("returns true when at post position", () => {
		expect(atPost(10, 10, 10, 10)).toBe(true);
	});

	it("returns false when far from post", () => {
		expect(atPost(0, 0, 10, 10)).toBe(false);
	});
});

// ─── Slam Attack ───

describe("canSlam", () => {
	it("returns true when player in range and no cooldown", () => {
		expect(canSlam(0, 0, 1, 0, 0)).toBe(true);
	});

	it("returns false when on cooldown", () => {
		expect(canSlam(0, 0, 1, 0, SLAM_COOLDOWN)).toBe(false);
	});

	it("returns false when player beyond slam range", () => {
		expect(canSlam(0, 0, SLAM_RANGE + 5, 0, 0)).toBe(false);
	});
});
