import { afterEach, describe, expect, it } from "vitest";
import {
	_resetDraugarState,
	ADVANCE_SPEED,
	advanceToward,
	CONTACT_DAMAGE,
	CONTACT_RANGE,
	DRAUGAR_HP,
	FROST_BLUE,
	getDraugarData,
	inContactRange,
	isDawn,
	isObserved,
	OBSERVE_THRESHOLD,
	registerDraugar,
} from "./draugar-gaze.ts";

afterEach(() => {
	_resetDraugarState();
});

// ─── Observation Check ───

describe("isObserved", () => {
	it("returns true when player looks directly at creature", () => {
		// Player at origin, looking along +X (yaw = PI/2)
		// Creature at (10, 0) — directly in look direction
		const yaw = Math.PI / 2;
		expect(isObserved(0, 0, yaw, 10, 0)).toBe(true);
	});

	it("returns false when creature is behind player", () => {
		// Player looking along +X, creature at (-10, 0)
		const yaw = Math.PI / 2;
		expect(isObserved(0, 0, yaw, -10, 0)).toBe(false);
	});

	it("returns true when creature is within ~60° cone", () => {
		// Player looking along +Z (yaw = 0), creature at (3, 10) — 16° off center
		expect(isObserved(0, 0, 0, 3, 10)).toBe(true);
	});

	it("returns false when creature is at ~90° to look direction", () => {
		// Player looking along +Z (yaw = 0), creature at (10, 0) — perpendicular
		expect(isObserved(0, 0, 0, 10, 0)).toBe(false);
	});

	it("returns true when creature is on top of player", () => {
		expect(isObserved(5, 5, 0, 5, 5)).toBe(true);
	});

	it("threshold matches OBSERVE_THRESHOLD constant", () => {
		// At exactly threshold angle cos(60°) = 0.5
		// Player looking along +Z (yaw=0), lookDir = (sin(0), cos(0)) = (0, 1)
		// Creature at angle where dot product ≈ threshold
		const angle = Math.acos(OBSERVE_THRESHOLD); // ~60°
		const cx = Math.sin(angle) * 10;
		const cz = Math.cos(angle) * 10;
		// dot = lookZ * ndz = 1 * cos(angle) = OBSERVE_THRESHOLD
		// At exact boundary, > check means this is NOT observed
		expect(isObserved(0, 0, 0, cx, cz)).toBe(false);
		// Slightly inside the cone
		expect(isObserved(0, 0, 0, cx * 0.9, cz * 1.1)).toBe(true);
	});
});

// ─── Dawn Check ───

describe("isDawn", () => {
	it("returns true during late night transition", () => {
		expect(isDawn(0.96)).toBe(true);
		expect(isDawn(0.99)).toBe(true);
	});

	it("returns true during early morning", () => {
		expect(isDawn(0.01)).toBe(true);
		expect(isDawn(0.04)).toBe(true);
	});

	it("returns false at midnight", () => {
		expect(isDawn(0.75)).toBe(false);
	});

	it("returns false at noon", () => {
		expect(isDawn(0.25)).toBe(false);
	});
});

// ─── State Management ───

describe("state management", () => {
	it("registers and retrieves Draugar data", () => {
		registerDraugar(1, 10, 5, 15);
		const data = getDraugarData(1);
		expect(data).toBeDefined();
		expect(data?.moundX).toBe(10);
		expect(data?.moundY).toBe(5);
		expect(data?.moundZ).toBe(15);
		expect(data?.frozen).toBe(false);
	});

	it("returns undefined for unknown entity", () => {
		expect(getDraugarData(999)).toBeUndefined();
	});
});

// ─── Movement ───

describe("advanceToward", () => {
	it("moves toward target", () => {
		const result = advanceToward(0, 0, 10, 0, ADVANCE_SPEED, 1.0);
		expect(result.dx).toBeCloseTo(ADVANCE_SPEED, 1);
		expect(result.dz).toBeCloseTo(0, 1);
	});

	it("returns zero when at target", () => {
		const result = advanceToward(5, 5, 5, 5, ADVANCE_SPEED, 1.0);
		expect(result.dx).toBe(0);
		expect(result.dz).toBe(0);
	});
});

describe("inContactRange", () => {
	it("returns true when within contact range", () => {
		expect(inContactRange(5, 5, 5.5, 5)).toBe(true);
	});

	it("returns false when beyond contact range", () => {
		expect(inContactRange(0, 0, CONTACT_RANGE + 5, 0)).toBe(false);
	});
});

// ─── Constants ───

describe("constants", () => {
	it("has massive contact damage", () => {
		expect(CONTACT_DAMAGE).toBeGreaterThanOrEqual(30);
	});

	it("has frost blue emissive color", () => {
		expect(FROST_BLUE).toBe(0xaaccee);
	});

	it("has reasonable HP", () => {
		expect(DRAUGAR_HP).toBeGreaterThan(0);
	});
});
