import { describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { Health, Hunger, PlayerState, Stamina } from "../traits/index.ts";
import { survivalSystem } from "./survival.ts";

describe("survivalSystem", () => {
	it("decays hunger over time", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 100, decayRate: 10 },
		});

		survivalSystem(world, 1);

		const hunger = entity.get(Hunger);
		expect(hunger.current).toBe(90);
	});

	it("clamps hunger at zero", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 1, decayRate: 10 },
		});

		survivalSystem(world, 1);

		expect(entity.get(Hunger).current).toBe(0);
	});

	it("drains health when hunger is zero", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 0 },
			health: { current: 50 },
		});

		survivalSystem(world, 2);

		expect(entity.get(Health).current).toBe(48);
	});

	it("does not drain health when hunger is positive", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 50, decayRate: 1 },
			health: { current: 100 },
		});

		survivalSystem(world, 1);

		expect(entity.get(Health).current).toBe(100);
	});

	it("regenerates stamina when idle", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			stamina: { current: 50, max: 100, regenRate: 10 },
			moveInput: { sprint: false, jump: false },
		});

		survivalSystem(world, 1);

		expect(entity.get(Stamina).current).toBe(60);
	});

	it("does not regenerate stamina while sprinting", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			stamina: { current: 50, max: 100, regenRate: 10 },
			moveInput: { sprint: true },
		});

		survivalSystem(world, 1);

		expect(entity.get(Stamina).current).toBe(50);
	});

	it("caps stamina at max", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			stamina: { current: 95, max: 100, regenRate: 10 },
		});

		survivalSystem(world, 1);

		expect(entity.get(Stamina).current).toBe(100);
	});

	it("decays damageFlash toward zero", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			playerState: { damageFlash: 1 },
		});

		survivalSystem(world, 1);

		expect(entity.get(PlayerState).damageFlash).toBe(0);
	});

	it("decays camera shake toward zero", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			playerState: { shakeX: 0.5, shakeY: 0.3 },
		});

		survivalSystem(world, 0.5);

		const state = entity.get(PlayerState);
		expect(state.shakeX).toBe(0);
		expect(state.shakeY).toBe(0);
	});

	it("marks player dead when health reaches zero", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 0 },
			health: { current: 0.5 },
		});

		survivalSystem(world, 1);

		const state = entity.get(PlayerState);
		expect(state.isDead).toBe(true);
		expect(state.isRunning).toBe(false);
	});

	it("does not re-trigger death on already dead player", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, {
			hunger: { current: 0 },
			health: { current: 0 },
			playerState: { isDead: true },
		});

		// Should not throw or change state
		survivalSystem(world, 1);

		expect(entity.get(PlayerState).isDead).toBe(true);
	});
});
