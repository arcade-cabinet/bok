import { afterEach, describe, expect, it } from "vitest";
import {
	_resetJattenState,
	ATTACK_RANGE,
	consumeBlock,
	getJattenData,
	INSCRIPTION_THRESHOLD,
	inAttackRange,
	JATTEN_MAX_HP,
	MOVE_SPEED,
	meetsInscriptionThreshold,
	moveToward,
	REGEN_COOLDOWN,
	REGEN_PER_BLOCK,
	recordDamage,
	registerJatten,
	STAGGER_THRESHOLD,
	shouldRegen,
} from "./jatten-boss.ts";

afterEach(() => {
	_resetJattenState();
});

// ─── Inscription Level Threshold ───

describe("meetsInscriptionThreshold", () => {
	it("returns false below threshold", () => {
		expect(meetsInscriptionThreshold(500)).toBe(false);
		expect(meetsInscriptionThreshold(999)).toBe(false);
	});

	it("returns true at threshold", () => {
		expect(meetsInscriptionThreshold(INSCRIPTION_THRESHOLD)).toBe(true);
	});

	it("returns true above threshold", () => {
		expect(meetsInscriptionThreshold(1500)).toBe(true);
	});
});

// ─── Movement ───

describe("moveToward", () => {
	it("moves toward target", () => {
		const result = moveToward(0, 0, 10, 0, MOVE_SPEED, 1.0);
		expect(result.dx).toBeCloseTo(MOVE_SPEED, 1);
		expect(result.dz).toBeCloseTo(0, 1);
	});

	it("returns zero when at target", () => {
		const result = moveToward(5, 5, 5, 5, MOVE_SPEED, 1.0);
		expect(result.dx).toBe(0);
		expect(result.dz).toBe(0);
	});

	it("normalizes direction for diagonal movement", () => {
		const result = moveToward(0, 0, 10, 10, MOVE_SPEED, 1.0);
		const mag = Math.sqrt(result.dx * result.dx + result.dz * result.dz);
		expect(mag).toBeCloseTo(MOVE_SPEED, 1);
	});
});

// ─── Attack Range ───

describe("inAttackRange", () => {
	it("returns true when within attack range", () => {
		expect(inAttackRange(5, 5, 6, 5)).toBe(true);
	});

	it("returns false when beyond attack range", () => {
		expect(inAttackRange(0, 0, ATTACK_RANGE + 5, 0)).toBe(false);
	});
});

// ─── Terrain Block Consumption for Regeneration ───

describe("terrain block consumption", () => {
	it("shouldRegen returns true when hurt and off cooldown", () => {
		registerJatten(1, 0, 0);
		expect(shouldRegen(1, 50, 100)).toBe(true);
	});

	it("shouldRegen returns false at full HP", () => {
		registerJatten(1, 0, 0);
		expect(shouldRegen(1, 100, 100)).toBe(false);
	});

	it("shouldRegen returns false during cooldown", () => {
		registerJatten(1, 0, 0);
		consumeBlock(1); // sets regenCooldown
		expect(shouldRegen(1, 50, 100)).toBe(false);
	});

	it("shouldRegen returns false during stagger phase", () => {
		registerJatten(1, 0, 0);
		const data = getJattenData(1);
		if (data) data.phase = "stagger";
		expect(shouldRegen(1, 50, 100)).toBe(false);
	});

	it("consumeBlock returns REGEN_PER_BLOCK and sets cooldown", () => {
		registerJatten(1, 0, 0);
		const healed = consumeBlock(1);
		expect(healed).toBe(REGEN_PER_BLOCK);
		const data = getJattenData(1);
		expect(data?.regenCooldown).toBe(REGEN_COOLDOWN);
	});

	it("consumeBlock increments blocksConsumed counter", () => {
		registerJatten(1, 0, 0);
		consumeBlock(1);
		consumeBlock(1);
		expect(getJattenData(1)?.blocksConsumed).toBe(2);
	});

	it("consumeBlock returns 0 for unknown entity", () => {
		expect(consumeBlock(999)).toBe(0);
	});
});

// ─── Stagger ───

describe("recordDamage", () => {
	it("accumulates damage and triggers stagger at threshold", () => {
		registerJatten(1, 0, 0);
		expect(recordDamage(1, STAGGER_THRESHOLD - 1)).toBe(false);
		expect(recordDamage(1, 1)).toBe(true);
	});

	it("resets accumulator after stagger", () => {
		registerJatten(1, 0, 0);
		recordDamage(1, STAGGER_THRESHOLD);
		expect(getJattenData(1)?.damageAccum).toBe(0);
	});

	it("returns false for unknown entity", () => {
		expect(recordDamage(999, 10)).toBe(false);
	});
});

// ─── State Management ───

describe("state management", () => {
	it("registers and retrieves Jatten data", () => {
		registerJatten(1, 100, 50);
		const data = getJattenData(1);
		expect(data).toBeDefined();
		expect(data?.phase).toBe("approach");
		expect(data?.targetX).toBe(100);
		expect(data?.targetZ).toBe(50);
		expect(data?.blocksConsumed).toBe(0);
	});

	it("returns undefined for unknown entity", () => {
		expect(getJattenData(999)).toBeUndefined();
	});
});

// ─── Constants ───

describe("constants", () => {
	it("has reasonable boss HP", () => {
		expect(JATTEN_MAX_HP).toBe(100);
	});

	it("inscription threshold is 1000", () => {
		expect(INSCRIPTION_THRESHOLD).toBe(1000);
	});
});
