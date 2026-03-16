import { describe, expect, it } from "vitest";
import { createTestWorld, spawnWorldTime } from "../../test-utils.ts";
import { SeasonState, WorldTime } from "../traits/index.ts";
import { getAmbientIntensity, getSkyColor, getSunIntensity, getTimePhase, timeSystem } from "./time.ts";

describe("timeSystem", () => {
	it("advances time of day based on dt and dayDuration", () => {
		const world = createTestWorld();
		const entity = spawnWorldTime(world, {
			timeOfDay: 0.25,
			dayDuration: 240,
		});

		timeSystem(world, 24);

		// 24 / 240 = 0.1 => 0.25 + 0.1 = 0.35
		expect(entity.get(WorldTime).timeOfDay).toBeCloseTo(0.35);
	});

	it("wraps time past 1.0 and increments dayCount", () => {
		const world = createTestWorld();
		const entity = spawnWorldTime(world, {
			timeOfDay: 0.9,
			dayDuration: 100,
			dayCount: 1,
		});

		// 20 / 100 = 0.2 => 0.9 + 0.2 = 1.1 => wraps to 0.1, day 2
		timeSystem(world, 20);

		expect(entity.get(WorldTime).timeOfDay).toBeCloseTo(0.1);
		expect(entity.get(WorldTime).dayCount).toBe(2);
	});

	it("does not increment dayCount when no rollover", () => {
		const world = createTestWorld();
		const entity = spawnWorldTime(world, {
			timeOfDay: 0.25,
			dayDuration: 240,
			dayCount: 3,
		});

		timeSystem(world, 10);

		expect(entity.get(WorldTime).dayCount).toBe(3);
	});

	it("handles zero or negative dayDuration safely", () => {
		const world = createTestWorld();
		const entity = spawnWorldTime(world, {
			timeOfDay: 0.5,
			dayDuration: 0,
		});

		timeSystem(world, 1);

		// dayDuration 0 should default to 240
		expect(entity.get(WorldTime).timeOfDay).toBeCloseTo(0.5 + 1 / 240);
	});

	it("slows time during night when nightMult > 1", () => {
		const world = createTestWorld();
		const entity = spawnWorldTime(world, {
			timeOfDay: 0.8, // night
			dayDuration: 100,
		});
		// Spawn a season entity with nightMult = 2
		world.spawn(SeasonState({ nightMult: 2 }));

		timeSystem(world, 10);

		// Night: speedMult = 1/2 => advance = (10/100) * 0.5 = 0.05
		expect(entity.get(WorldTime).timeOfDay).toBeCloseTo(0.85);
	});

	it("does not slow time during daytime even with nightMult", () => {
		const world = createTestWorld();
		const entity = spawnWorldTime(world, {
			timeOfDay: 0.4, // daytime
			dayDuration: 100,
		});
		world.spawn(SeasonState({ nightMult: 2 }));

		timeSystem(world, 10);

		// Day: speedMult = 1 => advance = 10/100 = 0.1
		expect(entity.get(WorldTime).timeOfDay).toBeCloseTo(0.5);
	});
});

describe("getTimePhase", () => {
	it("returns Morning near sunrise", () => {
		// timeOfDay=0.07 => angle=0.44 => sin=0.425 => >0.4 => Midday
		// timeOfDay=0.065 => angle=0.408 => sin=0.397 => (0,0.4] && <0.5 => Morning
		expect(getTimePhase(0.065)).toBe("Morning");
	});

	it("returns Midday at peak sun", () => {
		expect(getTimePhase(0.25)).toBe("Midday");
	});

	it("returns Night at midnight", () => {
		expect(getTimePhase(0.75)).toBe("Night");
	});

	it("returns Dusk at the sunset boundary", () => {
		// timeOfDay=0.5 => sin(PI) is epsilon-positive (float), >= 0.5 => Dusk
		expect(getTimePhase(0.5)).toBe("Dusk");
	});

	it("returns Night well past sunset", () => {
		expect(getTimePhase(0.6)).toBe("Night");
	});

	it("returns Night for midnight", () => {
		expect(getTimePhase(0.0)).toBe("Night");
	});
});

describe("getSkyColor", () => {
	it("returns blue for Midday", () => {
		expect(getSkyColor("Midday")).toBe(0x87ceeb);
	});

	it("returns dark for Night", () => {
		expect(getSkyColor("Night")).toBe(0x050510);
	});
});

describe("getSunIntensity", () => {
	it("returns 0 at Night", () => {
		expect(getSunIntensity("Night")).toBe(0);
	});

	it("returns 1.2 at Midday", () => {
		expect(getSunIntensity("Midday")).toBe(1.2);
	});
});

describe("getAmbientIntensity", () => {
	it("returns 0.05 at Night", () => {
		expect(getAmbientIntensity("Night")).toBe(0.05);
	});

	it("returns 0.35 at Midday", () => {
		expect(getAmbientIntensity("Midday")).toBe(0.35);
	});
});
