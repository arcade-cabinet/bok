import { describe, expect, it } from "vitest";
import { createTestWorld } from "../../test-utils.ts";
import { SeasonState, Species, WorldTime } from "../traits/index.ts";
import { resetSeasonState, seasonSystem } from "./season.ts";
import { SEASON_LENGTH, Season } from "./season-data.ts";
import {
	creatureSpawnMultiplier,
	getResourceYieldMult,
	getSeasonCreatureSpawnMult,
	isGrowthSeason,
	isMushroomSeason,
	resetSeasonEffectsState,
	resourceYieldMultiplier,
	seasonEffectsSystem,
} from "./season-effects.ts";

function spawnSeasonWorld(dayCount: number) {
	const world = createTestWorld();
	world.spawn(WorldTime({ timeOfDay: 0.25, dayDuration: 240, dayCount }), SeasonState());
	return world;
}

/** Run both season + effects systems so trait + cache are in sync. */
function runSystems(world: ReturnType<typeof spawnSeasonWorld>) {
	resetSeasonState();
	resetSeasonEffectsState();
	seasonSystem(world, 0.016);
	seasonEffectsSystem(world, 0.016);
}

// ─── Per-species spawn multipliers (pure functions) ───

describe("creatureSpawnMultiplier", () => {
	it("Sommar reduces hostile spawn rates", () => {
		expect(creatureSpawnMultiplier(Season.Sommar, Species.Morker)).toBeLessThan(1.0);
	});

	it("Sommar boosts passive creature spawns", () => {
		expect(creatureSpawnMultiplier(Season.Sommar, Species.Skogssnigle)).toBeGreaterThan(1.0);
	});

	it("Vinter increases hostile spawn rates", () => {
		expect(creatureSpawnMultiplier(Season.Vinter, Species.Morker)).toBeGreaterThan(1.0);
	});

	it("Vinter suppresses passive creature spawns", () => {
		expect(creatureSpawnMultiplier(Season.Vinter, Species.Skogssnigle)).toBeLessThan(1.0);
		expect(creatureSpawnMultiplier(Season.Vinter, Species.Lyktgubbe)).toBeLessThan(1.0);
	});

	it("Höst boosts Vittra (creature prep)", () => {
		expect(creatureSpawnMultiplier(Season.Host, Species.Vittra)).toBeGreaterThan(1.0);
	});

	it("Vår has returning creatures — Trana spawns boosted", () => {
		expect(creatureSpawnMultiplier(Season.Var, Species.Trana)).toBeGreaterThanOrEqual(1.0);
	});

	it("Höst suppresses Trana (migration)", () => {
		expect(creatureSpawnMultiplier(Season.Host, Species.Trana)).toBe(0);
	});

	it("Vinter suppresses Trana (migrated away)", () => {
		expect(creatureSpawnMultiplier(Season.Vinter, Species.Trana)).toBe(0);
	});

	it("unknown species returns 1.0 (neutral)", () => {
		expect(creatureSpawnMultiplier(Season.Sommar, "unknown" as never)).toBe(1.0);
	});
});

// ─── Resource yield ───

describe("resourceYieldMultiplier", () => {
	it("Sommar has highest resource yield", () => {
		const sommar = resourceYieldMultiplier(Season.Sommar);
		expect(sommar).toBeGreaterThan(resourceYieldMultiplier(Season.Var));
		expect(sommar).toBeGreaterThan(resourceYieldMultiplier(Season.Host));
		expect(sommar).toBeGreaterThan(resourceYieldMultiplier(Season.Vinter));
	});

	it("Vinter has lowest resource yield (scarcity)", () => {
		expect(resourceYieldMultiplier(Season.Vinter)).toBeLessThan(1.0);
	});

	it("Vår is neutral", () => {
		expect(resourceYieldMultiplier(Season.Var)).toBe(1.0);
	});
});

// ─── Season flags ───

describe("isMushroomSeason", () => {
	it("only Höst is mushroom season", () => {
		expect(isMushroomSeason(Season.Host)).toBe(true);
		expect(isMushroomSeason(Season.Var)).toBe(false);
		expect(isMushroomSeason(Season.Sommar)).toBe(false);
		expect(isMushroomSeason(Season.Vinter)).toBe(false);
	});
});

describe("isGrowthSeason", () => {
	it("Vår and Sommar are growth seasons", () => {
		expect(isGrowthSeason(Season.Var)).toBe(true);
		expect(isGrowthSeason(Season.Sommar)).toBe(true);
	});

	it("Höst and Vinter are not growth seasons", () => {
		expect(isGrowthSeason(Season.Host)).toBe(false);
		expect(isGrowthSeason(Season.Vinter)).toBe(false);
	});
});

// ─── ECS system + module-level cache ───

describe("seasonEffectsSystem", () => {
	it("caches creature spawn multiplier for current season", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH + 1); // Sommar
		runSystems(world);

		const mult = getSeasonCreatureSpawnMult(Species.Morker);
		expect(mult).toBeLessThan(1.0);
	});

	it("caches resource yield multiplier for current season", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH * 3 + 1); // Vinter
		runSystems(world);

		expect(getResourceYieldMult()).toBeLessThan(1.0);
	});

	it("updates cache when season changes", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH + 1); // Sommar
		runSystems(world);
		const sommarMult = getSeasonCreatureSpawnMult(Species.Morker);

		// Advance to Vinter
		world.query(WorldTime).updateEach(([time]) => {
			time.dayCount = SEASON_LENGTH * 3 + 1;
		});
		resetSeasonState();
		seasonSystem(world, 0.016);
		seasonEffectsSystem(world, 0.016);

		const vinterMult = getSeasonCreatureSpawnMult(Species.Morker);
		expect(vinterMult).toBeGreaterThan(sommarMult);
	});

	it("resetSeasonEffectsState resets all caches", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH * 3 + 1); // Vinter
		runSystems(world);
		expect(getResourceYieldMult()).toBeLessThan(1.0);

		resetSeasonEffectsState();
		expect(getResourceYieldMult()).toBe(1.0);
	});
});
