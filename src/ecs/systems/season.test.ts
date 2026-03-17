import { describe, expect, it } from "vitest";
import { createTestWorld } from "../../test-utils.ts";
import { SeasonState, WorldTime } from "../traits/index.ts";
import { getCurrentSeason, resetSeasonState, seasonSystem } from "./season.ts";
import { SEASON_LENGTH, Season } from "./season-data.ts";

function spawnSeasonWorld(dayCount: number) {
	const world = createTestWorld();
	world.spawn(WorldTime({ timeOfDay: 0.25, dayDuration: 240, dayCount }), SeasonState());
	return world;
}

describe("seasonSystem", () => {
	it("sets season to Vår on day 1", () => {
		const world = spawnSeasonWorld(1);
		resetSeasonState();
		seasonSystem(world, 0.016);

		world.query(SeasonState).readEach(([s]) => {
			expect(s.current).toBe(Season.Var);
		});
	});

	it("sets season to Sommar on day SEASON_LENGTH+1", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH + 1);
		resetSeasonState();
		seasonSystem(world, 0.016);

		world.query(SeasonState).readEach(([s]) => {
			expect(s.current).toBe(Season.Sommar);
		});
	});

	it("sets season to Höst on day SEASON_LENGTH*2+1", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH * 2 + 1);
		resetSeasonState();
		seasonSystem(world, 0.016);

		world.query(SeasonState).readEach(([s]) => {
			expect(s.current).toBe(Season.Host);
		});
	});

	it("sets season to Vinter on day SEASON_LENGTH*3+1", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH * 3 + 1);
		resetSeasonState();
		seasonSystem(world, 0.016);

		world.query(SeasonState).readEach(([s]) => {
			expect(s.current).toBe(Season.Vinter);
		});
	});

	it("updates hunger multiplier for Vinter", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH * 3 + 1);
		resetSeasonState();
		seasonSystem(world, 0.016);

		world.query(SeasonState).readEach(([s]) => {
			expect(s.hungerMult).toBeGreaterThan(1.0);
		});
	});

	it("updates mörker multiplier for Vinter", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH * 3 + 1);
		resetSeasonState();
		seasonSystem(world, 0.016);

		world.query(SeasonState).readEach(([s]) => {
			expect(s.morkerMult).toBe(1.5);
		});
	});

	it("sets tranaMigrating true in Höst", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH * 2 + 1);
		resetSeasonState();
		seasonSystem(world, 0.016);

		world.query(SeasonState).readEach(([s]) => {
			expect(s.tranaMigrating).toBe(true);
		});
	});

	it("sets tranaMigrating false in Sommar", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH + 1);
		resetSeasonState();
		seasonSystem(world, 0.016);

		world.query(SeasonState).readEach(([s]) => {
			expect(s.tranaMigrating).toBe(false);
		});
	});

	it("updates module-level cache", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH * 2 + 1);
		resetSeasonState();
		seasonSystem(world, 0.016);

		expect(getCurrentSeason()).toBe(Season.Host);
	});

	it("skips recomputation when dayCount has not changed", () => {
		const world = spawnSeasonWorld(1);
		resetSeasonState();
		seasonSystem(world, 0.016);
		expect(getCurrentSeason()).toBe(Season.Var);

		// Manually change trait without changing dayCount
		world.query(SeasonState).updateEach(([s]) => {
			s.current = Season.Vinter as 0 | 1 | 2 | 3;
		});

		// Re-run: should not recalculate since dayCount unchanged
		seasonSystem(world, 0.016);
		world.query(SeasonState).readEach(([s]) => {
			expect(s.current).toBe(Season.Vinter);
		});
	});

	it("night duration multiplier higher in vinter", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH * 3 + 1);
		resetSeasonState();
		seasonSystem(world, 0.016);

		world.query(SeasonState).readEach(([s]) => {
			expect(s.nightMult).toBeGreaterThan(1.0);
		});
	});

	it("resetSeasonState clears module cache", () => {
		const world = spawnSeasonWorld(SEASON_LENGTH * 2 + 1);
		resetSeasonState();
		seasonSystem(world, 0.016);
		expect(getCurrentSeason()).toBe(Season.Host);

		resetSeasonState();
		expect(getCurrentSeason()).toBe(Season.Var);
	});
});
