import { describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnCreature, spawnPlayer, spawnWorldTime } from "../../test-utils.ts";
import { Health, PlayerTag, RuneDiscovery, SagaLog, Species, WorldTime } from "../traits/index.ts";
import { RuneId } from "./rune-data.ts";
import type { RuneDiscoveryEffects } from "./rune-discovery-system.ts";
import { grantTutorialRunes, runeDiscoverySystem } from "./rune-discovery-system.ts";

// Mock exploration to provide empty landmarks
vi.mock("./exploration.ts", () => ({
	getDiscoveredLandmarks: () => [],
}));

function makeEffects(): RuneDiscoveryEffects & { sagaEntries: string[] } {
	const sagaEntries: string[] = [];
	return {
		sagaEntries,
		addSagaEntry: (text: string) => sagaEntries.push(text),
		spawnParticles: vi.fn(),
	};
}

describe("runeDiscoverySystem", () => {
	it("grants tutorial runes via grantTutorialRunes", () => {
		const discovered = new Set<number>();
		grantTutorialRunes(discovered);
		expect(discovered.has(RuneId.Kenaz)).toBe(true);
	});

	it("does not scan before interval elapses", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		spawnWorldTime(world);
		const effects = makeEffects();

		// dt = 0.5s, scan interval is 1.0s
		runeDiscoverySystem(world, 0.5, effects);

		let discovered = new Set<number>();
		world.query(PlayerTag, RuneDiscovery).readEach(([disc]) => {
			discovered = disc.discovered;
		});
		// Tutorial runes not auto-granted by system — only by grantTutorialRunes
		expect(discovered.size).toBe(0);
	});

	it("discovers Thurisaz when player takes damage", () => {
		const world = createTestWorld();
		spawnPlayer(world, { health: { current: 80 } });
		spawnWorldTime(world);
		const effects = makeEffects();

		// Set prevHealth to 100 so damage is detected (100 > 80)
		world.query(PlayerTag, RuneDiscovery).updateEach(([disc]) => {
			disc.prevHealth = 100;
		});

		// Run twice to exceed scan interval
		runeDiscoverySystem(world, 0.6, effects);
		runeDiscoverySystem(world, 0.6, effects);

		let discovered = new Set<number>();
		world.query(PlayerTag, RuneDiscovery).readEach(([disc]) => {
			discovered = disc.discovered;
		});
		expect(discovered.has(RuneId.Thurisaz)).toBe(true);
		expect(effects.sagaEntries.length).toBeGreaterThan(0);
	});

	it("discovers Hagalaz when creatures have been killed", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		spawnWorldTime(world);

		// Set creaturesKilled > 0
		world.query(PlayerTag, SagaLog).updateEach(([saga]) => {
			saga.creaturesKilled = 3;
		});

		const effects = makeEffects();
		runeDiscoverySystem(world, 0.6, effects);
		runeDiscoverySystem(world, 0.6, effects);

		let discovered = new Set<number>();
		world.query(PlayerTag, RuneDiscovery).readEach(([disc]) => {
			discovered = disc.discovered;
		});
		expect(discovered.has(RuneId.Hagalaz)).toBe(true);
	});

	it("does not re-discover already discovered runes", () => {
		const world = createTestWorld();
		spawnPlayer(world, { health: { current: 80 } });
		spawnWorldTime(world);

		// Pre-discover Thurisaz
		world.query(PlayerTag, RuneDiscovery).updateEach(([disc]) => {
			disc.discovered.add(RuneId.Thurisaz);
			disc.prevHealth = 100;
		});

		const effects = makeEffects();
		runeDiscoverySystem(world, 0.6, effects);
		runeDiscoverySystem(world, 0.6, effects);

		// No saga entry for already-discovered rune
		const thurisazEntries = effects.sagaEntries.filter((s) => s.includes("Thurisaz") || s.includes("thorn"));
		expect(thurisazEntries.length).toBe(0);
	});

	it("discovers Ansuz when Runväktare is nearby", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 30, z: 5 } });
		spawnWorldTime(world);
		// Spawn a nearby Runväktare
		spawnCreature(world, { species: Species.Runvaktare, position: { x: 6, y: 30, z: 5 } });

		const effects = makeEffects();
		runeDiscoverySystem(world, 0.6, effects);
		runeDiscoverySystem(world, 0.6, effects);

		let discovered = new Set<number>();
		world.query(PlayerTag, RuneDiscovery).readEach(([disc]) => {
			discovered = disc.discovered;
		});
		expect(discovered.has(RuneId.Ansuz)).toBe(true);
	});

	it("discovers Sowilo on sunrise", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		spawnWorldTime(world, { timeOfDay: 0.21 });

		// Set prevTimeOfDay to before dawn
		world.query(PlayerTag, RuneDiscovery).updateEach(([disc]) => {
			disc.prevTimeOfDay = 0.19;
		});

		const effects = makeEffects();
		runeDiscoverySystem(world, 0.6, effects);
		runeDiscoverySystem(world, 0.6, effects);

		let discovered = new Set<number>();
		world.query(PlayerTag, RuneDiscovery).readEach(([disc]) => {
			discovered = disc.discovered;
		});
		expect(discovered.has(RuneId.Sowilo)).toBe(true);
	});

	it("saga entry contains day number", () => {
		const world = createTestWorld();
		spawnPlayer(world, { health: { current: 80 } });
		spawnWorldTime(world, { dayCount: 5 });

		world.query(PlayerTag, RuneDiscovery).updateEach(([disc]) => {
			disc.prevHealth = 100;
		});

		const effects = makeEffects();
		runeDiscoverySystem(world, 0.6, effects);
		runeDiscoverySystem(world, 0.6, effects);

		expect(effects.sagaEntries.some((s) => s.includes("Day 5"))).toBe(true);
	});
});
