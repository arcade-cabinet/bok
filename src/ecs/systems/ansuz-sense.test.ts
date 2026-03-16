import { describe, expect, it } from "vitest";
import { computeAnsuzSignalStrength, countDetectedEntities, detectsEntity, isEntityDetected } from "./ansuz-sense.ts";
import { ANSUZ_DETECT_RADIUS, ANSUZ_EMIT_STRENGTH } from "./interaction-rune-data.ts";

const source = { x: 10, y: 5, z: 10 };

// ─── detectsEntity ───

describe("detectsEntity", () => {
	it("returns false for empty entity list", () => {
		expect(detectsEntity(source, [])).toBe(false);
	});

	it("returns true when entity is at source position", () => {
		expect(detectsEntity(source, [{ x: 10, y: 5, z: 10 }])).toBe(true);
	});

	it("returns true when entity is within radius", () => {
		expect(detectsEntity(source, [{ x: 10 + ANSUZ_DETECT_RADIUS - 1, y: 5, z: 10 }])).toBe(true);
	});

	it("returns false when all entities are beyond radius", () => {
		const far = { x: 10 + ANSUZ_DETECT_RADIUS + 5, y: 5, z: 10 };
		expect(detectsEntity(source, [far])).toBe(false);
	});

	it("returns true if at least one entity is in range", () => {
		const near = { x: 11, y: 5, z: 10 };
		const far = { x: 100, y: 100, z: 100 };
		expect(detectsEntity(source, [far, near])).toBe(true);
	});
});

// ─── countDetectedEntities ───

describe("countDetectedEntities", () => {
	it("returns 0 for empty list", () => {
		expect(countDetectedEntities(source, [])).toBe(0);
	});

	it("counts entities within radius", () => {
		const entities = [
			{ x: 11, y: 5, z: 10 },
			{ x: 12, y: 5, z: 10 },
			{ x: 100, y: 100, z: 100 },
		];
		expect(countDetectedEntities(source, entities)).toBe(2);
	});

	it("counts all when all in range", () => {
		const entities = [
			{ x: 10, y: 5, z: 10 },
			{ x: 11, y: 6, z: 11 },
		];
		expect(countDetectedEntities(source, entities)).toBe(2);
	});
});

// ─── computeAnsuzSignalStrength ───

describe("computeAnsuzSignalStrength", () => {
	it("returns 0 when no entities detected", () => {
		expect(computeAnsuzSignalStrength(0)).toBe(0);
	});

	it("returns ANSUZ_EMIT_STRENGTH when one entity detected", () => {
		expect(computeAnsuzSignalStrength(1)).toBe(ANSUZ_EMIT_STRENGTH);
	});

	it("returns ANSUZ_EMIT_STRENGTH when many entities detected (binary)", () => {
		expect(computeAnsuzSignalStrength(5)).toBe(ANSUZ_EMIT_STRENGTH);
	});

	it("returns 0 for negative count", () => {
		expect(computeAnsuzSignalStrength(-1)).toBe(0);
	});
});

// ─── isEntityDetected ───

describe("isEntityDetected", () => {
	it("returns true for entity at source", () => {
		expect(isEntityDetected(10, 5, 10, 10, 5, 10)).toBe(true);
	});

	it("returns true for entity within radius", () => {
		expect(isEntityDetected(10, 5, 10, 15, 5, 10)).toBe(true);
	});

	it("returns false for entity beyond radius", () => {
		expect(isEntityDetected(10, 5, 10, 10 + ANSUZ_DETECT_RADIUS + 1, 5, 10)).toBe(false);
	});
});

// ─── Constants ───

describe("Ansuz constants", () => {
	it("detection radius is positive", () => {
		expect(ANSUZ_DETECT_RADIUS).toBeGreaterThan(0);
	});

	it("emit strength is within signal range", () => {
		expect(ANSUZ_EMIT_STRENGTH).toBeGreaterThan(0);
		expect(ANSUZ_EMIT_STRENGTH).toBeLessThanOrEqual(15);
	});
});
