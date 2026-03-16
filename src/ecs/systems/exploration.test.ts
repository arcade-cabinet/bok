import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { ExploredChunks, Position } from "../traits/index.ts";
import {
	explorationSystem,
	getDiscoveredLandmarks,
	registerLandmarkResolver,
	resetExplorationState,
} from "./exploration.ts";
import { packChunk } from "./map-data.ts";

// Reset module state before each test
beforeEach(() => {
	resetExplorationState();
	registerLandmarkResolver(null as never);
});

describe("explorationSystem", () => {
	it("adds current chunk to visited set", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, { position: { x: 24, z: 32 } });

		explorationSystem(world, 0.016);

		const explored = entity.get(ExploredChunks);
		expect(explored?.visited.has(packChunk(1, 2))).toBe(true);
	});

	it("does not duplicate on same chunk", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, { position: { x: 24, z: 32 } });

		explorationSystem(world, 0.016);
		explorationSystem(world, 0.016);

		const explored = entity.get(ExploredChunks);
		expect(explored?.visited.size).toBe(1);
	});

	it("adds new chunk when player moves", () => {
		const world = createTestWorld();
		const entity = spawnPlayer(world, { position: { x: 8, z: 8 } });

		explorationSystem(world, 0.016);

		// Move to a different chunk
		world.query(Position).updateEach(([pos]) => {
			pos.x = 24;
			pos.z = 24;
		});
		explorationSystem(world, 0.016);

		const explored = entity.get(ExploredChunks);
		expect(explored?.visited.size).toBe(2);
		expect(explored?.visited.has(packChunk(0, 0))).toBe(true);
		expect(explored?.visited.has(packChunk(1, 1))).toBe(true);
	});

	it("calls landmark resolver on new chunk", () => {
		const resolver = vi.fn().mockReturnValue("runsten");
		registerLandmarkResolver(resolver);

		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 24, z: 32 } });

		explorationSystem(world, 0.016);

		expect(resolver).toHaveBeenCalledWith(1, 2);
		expect(getDiscoveredLandmarks()).toHaveLength(1);
		expect(getDiscoveredLandmarks()[0]).toEqual({ cx: 1, cz: 2, type: "runsten" });
	});

	it("does not add landmark when resolver returns null", () => {
		registerLandmarkResolver(() => null);

		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 24, z: 32 } });

		explorationSystem(world, 0.016);

		expect(getDiscoveredLandmarks()).toHaveLength(0);
	});

	it("resetExplorationState clears landmarks", () => {
		const resolver = vi.fn().mockReturnValue("stenhog");
		registerLandmarkResolver(resolver);

		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, z: 8 } });
		explorationSystem(world, 0.016);

		expect(getDiscoveredLandmarks()).toHaveLength(1);

		resetExplorationState();
		expect(getDiscoveredLandmarks()).toHaveLength(0);
	});
});
