import { describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import {
	CreatureTag,
	CreatureType,
	PlayerTag,
	RuneFaces,
	Species,
} from "../traits/index.ts";
import {
	countRuneInscriptions,
	REQUIRED_INSCRIPTIONS,
	REQUIRED_STRUCTURES,
	resetTomteSpawnState,
	tomteSpawnSystem,
} from "./tomte-spawn.ts";

function countTomte(world: ReturnType<typeof createTestWorld>): number {
	let count = 0;
	world.query(CreatureTag, CreatureType).readEach(([ct]) => {
		if (ct.species === Species.Tomte) count++;
	});
	return count;
}

describe("tomteSpawnSystem", () => {
	it("does not spawn Tomte when no structures built", () => {
		resetTomteSpawnState();
		const world = createTestWorld();
		spawnPlayer(world, { inscription: { structuresBuilt: 0 } });

		tomteSpawnSystem(world);

		expect(countTomte(world)).toBe(0);
	});

	it("spawns Tomte after first structure is built", () => {
		resetTomteSpawnState();
		const world = createTestWorld();
		spawnPlayer(world, {
			inscription: { structuresBuilt: REQUIRED_STRUCTURES },
			position: { x: 10, y: 30, z: 10 },
		});

		tomteSpawnSystem(world);

		expect(countTomte(world)).toBe(1);
	});

	it("only spawns one Tomte (singleton)", () => {
		resetTomteSpawnState();
		const world = createTestWorld();
		spawnPlayer(world, {
			inscription: { structuresBuilt: 3 },
			position: { x: 10, y: 30, z: 10 },
		});

		tomteSpawnSystem(world);
		tomteSpawnSystem(world);
		tomteSpawnSystem(world);

		expect(countTomte(world)).toBe(1);
	});

	it("despawns Tomte after required rune inscriptions", () => {
		resetTomteSpawnState();
		const world = createTestWorld();
		spawnPlayer(world, {
			inscription: { structuresBuilt: 1 },
			position: { x: 10, y: 30, z: 10 },
		});

		// Spawn the Tomte
		tomteSpawnSystem(world);
		expect(countTomte(world)).toBe(1);

		// Simulate 3 rune inscriptions via RuneFaces
		world.query(PlayerTag, RuneFaces).updateEach(([rf]) => {
			rf.faces["0,5,0"] = [1, 0, 0, 0, 0, 0];
			rf.faces["1,5,0"] = [0, 2, 0, 0, 0, 0];
			rf.faces["2,5,0"] = [3, 0, 0, 0, 0, 0];
		});

		tomteSpawnSystem(world);

		expect(countTomte(world)).toBe(0);
	});

	it("does not respawn Tomte after despawn", () => {
		resetTomteSpawnState();
		const world = createTestWorld();
		spawnPlayer(world, {
			inscription: { structuresBuilt: 1 },
			position: { x: 10, y: 30, z: 10 },
		});

		// Spawn → inscribe → despawn
		tomteSpawnSystem(world);
		expect(countTomte(world)).toBe(1);

		world.query(PlayerTag, RuneFaces).updateEach(([rf]) => {
			rf.faces["0,5,0"] = [1, 0, 0, 0, 0, 0];
			rf.faces["1,5,0"] = [0, 2, 0, 0, 0, 0];
			rf.faces["2,5,0"] = [3, 0, 0, 0, 0, 0];
		});
		tomteSpawnSystem(world);
		expect(countTomte(world)).toBe(0);

		// Even with more structures, Tomte should not respawn
		tomteSpawnSystem(world);
		expect(countTomte(world)).toBe(0);
	});

	it("exports REQUIRED_STRUCTURES as 1", () => {
		expect(REQUIRED_STRUCTURES).toBe(1);
	});

	it("exports REQUIRED_INSCRIPTIONS as 3", () => {
		expect(REQUIRED_INSCRIPTIONS).toBe(3);
	});
});

describe("countRuneInscriptions", () => {
	it("returns 0 for empty faces", () => {
		expect(countRuneInscriptions({})).toBe(0);
	});

	it("counts non-zero rune ids across all faces", () => {
		const faces: Record<string, number[]> = {
			"0,0,0": [1, 0, 2, 0, 0, 0],
			"1,0,0": [0, 0, 0, 3, 0, 0],
		};
		expect(countRuneInscriptions(faces)).toBe(3);
	});
});
