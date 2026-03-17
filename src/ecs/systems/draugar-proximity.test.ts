import { describe, expect, it } from "vitest";
import {
	computeDraugarProximity,
	DRAUGAR_ABERRATION_RANGE,
	DRAUGAR_FROST_RANGE,
	DRAUGAR_MAX_ABERRATION,
	DRAUGAR_SILENCE_RANGE,
} from "./draugar-proximity.ts";

// ─── computeDraugarProximity ───

describe("computeDraugarProximity", () => {
	it("returns zero effects when no Draugar are nearby", () => {
		const result = computeDraugarProximity(0, 0, []);
		expect(result.aberration).toBe(0);
		expect(result.frostIntensity).toBe(0);
		expect(result.silenceFactor).toBe(0);
	});

	it("returns zero effects when Draugar is beyond all ranges", () => {
		const result = computeDraugarProximity(0, 0, [{ x: 100, z: 100 }]);
		expect(result.aberration).toBe(0);
		expect(result.frostIntensity).toBe(0);
		expect(result.silenceFactor).toBe(0);
	});

	it("returns max aberration when Draugar is on top of player", () => {
		const result = computeDraugarProximity(5, 5, [{ x: 5, z: 5 }]);
		expect(result.aberration).toBeCloseTo(DRAUGAR_MAX_ABERRATION, 2);
	});

	it("scales aberration linearly with distance", () => {
		const halfRange = DRAUGAR_ABERRATION_RANGE / 2;
		const result = computeDraugarProximity(0, 0, [{ x: halfRange, z: 0 }]);
		// At half range, intensity should be ~50% of max
		expect(result.aberration).toBeCloseTo(DRAUGAR_MAX_ABERRATION * 0.5, 1);
	});

	it("returns zero aberration at exactly the range boundary", () => {
		const result = computeDraugarProximity(0, 0, [{ x: DRAUGAR_ABERRATION_RANGE, z: 0 }]);
		expect(result.aberration).toBe(0);
	});

	it("returns max frost intensity when Draugar is at player position", () => {
		const result = computeDraugarProximity(0, 0, [{ x: 0, z: 0 }]);
		expect(result.frostIntensity).toBe(1);
	});

	it("returns zero frost beyond frost range", () => {
		const result = computeDraugarProximity(0, 0, [{ x: DRAUGAR_FROST_RANGE + 1, z: 0 }]);
		expect(result.frostIntensity).toBe(0);
	});

	it("returns max silence factor at player position", () => {
		const result = computeDraugarProximity(0, 0, [{ x: 0, z: 0 }]);
		expect(result.silenceFactor).toBe(1);
	});

	it("returns zero silence beyond silence range", () => {
		const result = computeDraugarProximity(0, 0, [{ x: DRAUGAR_SILENCE_RANGE + 1, z: 0 }]);
		expect(result.silenceFactor).toBe(0);
	});

	it("uses the nearest Draugar for effect calculation", () => {
		const far = { x: DRAUGAR_ABERRATION_RANGE + 10, z: 0 };
		const near = { x: 2, z: 0 };
		const result = computeDraugarProximity(0, 0, [far, near]);
		expect(result.aberration).toBeGreaterThan(0);
	});

	it("silence range is larger than aberration range", () => {
		expect(DRAUGAR_SILENCE_RANGE).toBeGreaterThan(DRAUGAR_ABERRATION_RANGE);
	});

	it("aberration range is larger than frost range", () => {
		expect(DRAUGAR_ABERRATION_RANGE).toBeGreaterThan(DRAUGAR_FROST_RANGE);
	});
});
