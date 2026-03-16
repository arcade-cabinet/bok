import { describe, expect, it } from "vitest";
import { createTestWorld, spawnCreature, spawnPlayer } from "../../test-utils.ts";
import { Codex, PlayerTag, Species } from "../traits/index.ts";
import { codexSystem, collectLoreEntry, discoverRecipe } from "./codex.ts";

describe("codexSystem", () => {
	it("increases observation progress when creature is in view", () => {
		const world = createTestWorld();
		// Player looking along +Z (yaw=0), creature ahead at z=10
		spawnPlayer(world, { position: { x: 0, y: 0, z: 0 }, rotation: { yaw: 0 } });
		spawnCreature(world, { species: Species.Morker, position: { x: 0, y: 0, z: 10 } });

		codexSystem(world, 1.0);

		let progress = 0;
		world.query(PlayerTag, Codex).readEach(([codex]) => {
			progress = codex.creatureProgress[Species.Morker] ?? 0;
		});
		expect(progress).toBeGreaterThan(0);
	});

	it("does not increase progress when creature is behind player", () => {
		const world = createTestWorld();
		// Player looking along +Z, creature behind at z=-10
		spawnPlayer(world, { position: { x: 0, y: 0, z: 0 }, rotation: { yaw: 0 } });
		spawnCreature(world, { species: Species.Morker, position: { x: 0, y: 0, z: -10 } });

		codexSystem(world, 1.0);

		let progress = 0;
		world.query(PlayerTag, Codex).readEach(([codex]) => {
			progress = codex.creatureProgress[Species.Morker] ?? 0;
		});
		expect(progress).toBe(0);
	});

	it("does not increase progress when creature is out of range", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 0, y: 0, z: 0 }, rotation: { yaw: 0 } });
		spawnCreature(world, { species: Species.Morker, position: { x: 0, y: 0, z: 50 } });

		codexSystem(world, 1.0);

		let progress = 0;
		world.query(PlayerTag, Codex).readEach(([codex]) => {
			progress = codex.creatureProgress[Species.Morker] ?? 0;
		});
		expect(progress).toBe(0);
	});

	it("caps progress at 1.0", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 0, y: 0, z: 0 }, rotation: { yaw: 0 } });
		spawnCreature(world, { species: Species.Morker, position: { x: 0, y: 0, z: 10 } });

		// Run many frames (100 seconds)
		for (let i = 0; i < 100; i++) {
			codexSystem(world, 1.0);
		}

		let progress = 0;
		world.query(PlayerTag, Codex).readEach(([codex]) => {
			progress = codex.creatureProgress[Species.Morker] ?? 0;
		});
		expect(progress).toBe(1.0);
	});

	it("tracks multiple species independently", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 0, y: 0, z: 0 }, rotation: { yaw: 0 } });
		spawnCreature(world, { species: Species.Morker, position: { x: 0, y: 0, z: 10 } });
		spawnCreature(world, { species: Species.Lyktgubbe, position: { x: 2, y: 0, z: 10 } });

		codexSystem(world, 1.0);

		let morkerProgress = 0;
		let lyktProgress = 0;
		world.query(PlayerTag, Codex).readEach(([codex]) => {
			morkerProgress = codex.creatureProgress[Species.Morker] ?? 0;
			lyktProgress = codex.creatureProgress[Species.Lyktgubbe] ?? 0;
		});
		expect(morkerProgress).toBeGreaterThan(0);
		expect(lyktProgress).toBeGreaterThan(0);
	});

	it("does nothing when no player exists", () => {
		const world = createTestWorld();
		spawnCreature(world, { species: Species.Morker, position: { x: 0, y: 0, z: 10 } });

		// Should not throw
		codexSystem(world, 1.0);
	});
});

describe("collectLoreEntry", () => {
	it("adds lore entry to codex", () => {
		const world = createTestWorld();
		spawnPlayer(world);

		collectLoreEntry(world, "lore_rune_origin");

		let hasLore = false;
		world.query(PlayerTag, Codex).readEach(([codex]) => {
			hasLore = codex.loreEntries.has("lore_rune_origin");
		});
		expect(hasLore).toBe(true);
	});

	it("does not duplicate lore entries", () => {
		const world = createTestWorld();
		spawnPlayer(world);

		collectLoreEntry(world, "lore_rune_origin");
		collectLoreEntry(world, "lore_rune_origin");

		let size = 0;
		world.query(PlayerTag, Codex).readEach(([codex]) => {
			size = codex.loreEntries.size;
		});
		expect(size).toBe(1);
	});
});

describe("discoverRecipe", () => {
	it("adds recipe to codex", () => {
		const world = createTestWorld();
		spawnPlayer(world);

		discoverRecipe(world, 42);

		let hasRecipe = false;
		world.query(PlayerTag, Codex).readEach(([codex]) => {
			hasRecipe = codex.discoveredRecipes.has(42);
		});
		expect(hasRecipe).toBe(true);
	});
});
