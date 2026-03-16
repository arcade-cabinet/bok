import { afterEach, describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { Hotbar, PlayerTag } from "../traits/index.ts";
import { getActiveLightSources, lightSystem, resetLightState, SCAN_INTERVAL } from "./light.ts";

afterEach(() => {
	resetLightState();
});

describe("lightSystem", () => {
	// ─── Block Light Sources ───

	describe("block scanning", () => {
		it("detects torch blocks near player", () => {
			const world = createTestWorld();
			spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });

			// getVoxel: torch at (10, 10, 8)
			const getVoxel = (x: number, y: number, _z: number) => {
				if (x === 10 && y === 10) return BlockId.Torch;
				return 0;
			};

			// First call triggers scan (scanTimer starts at 0, SCAN_INTERVAL triggers)
			lightSystem(world, SCAN_INTERVAL, getVoxel);

			const sources = getActiveLightSources();
			expect(sources.length).toBeGreaterThanOrEqual(1);
			const torch = sources.find((s) => s.radius === 4 && Math.abs(s.x - 10.5) < 0.1);
			expect(torch).toBeDefined();
		});

		it("returns empty sources when no emissive blocks", () => {
			const world = createTestWorld();
			spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });

			lightSystem(world, SCAN_INTERVAL, () => 0);

			expect(getActiveLightSources()).toHaveLength(0);
		});

		it("scan is throttled", () => {
			const world = createTestWorld();
			spawnPlayer(world, { position: { x: 0, y: 0, z: 0 } });

			let callCount = 0;
			const getVoxel = (_x: number, _y: number, _z: number) => {
				callCount++;
				return 0;
			};

			// First call at SCAN_INTERVAL triggers scan
			lightSystem(world, SCAN_INTERVAL, getVoxel);
			const firstCount = callCount;
			expect(firstCount).toBeGreaterThan(0);

			// Second call with tiny dt should NOT re-scan blocks
			callCount = 0;
			lightSystem(world, 0.016, getVoxel);
			expect(callCount).toBe(0);
		});
	});

	// ─── Player Hotbar Light ───

	describe("player hotbar light", () => {
		it("adds light source when holding ember lantern", () => {
			const world = createTestWorld();
			spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

			// Set active slot to Ember Lantern (item 109)
			world.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: 109, type: "item" };
				hotbar.activeSlot = 0;
			});

			lightSystem(world, SCAN_INTERVAL, () => 0);

			const sources = getActiveLightSources();
			expect(sources.length).toBe(1);
			expect(sources[0].radius).toBe(12);
			expect(sources[0].x).toBeCloseTo(5, 0);
		});

		it("adds light source when holding lantern", () => {
			const world = createTestWorld();
			spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

			world.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: 108, type: "item" };
				hotbar.activeSlot = 0;
			});

			lightSystem(world, SCAN_INTERVAL, () => 0);

			const sources = getActiveLightSources();
			expect(sources.length).toBe(1);
			expect(sources[0].radius).toBe(8);
		});

		it("adds light source when holding torch block", () => {
			const world = createTestWorld();
			spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

			world.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: BlockId.Torch, type: "block" };
				hotbar.activeSlot = 0;
			});

			lightSystem(world, SCAN_INTERVAL, () => 0);

			const sources = getActiveLightSources();
			expect(sources.length).toBe(1);
			expect(sources[0].radius).toBe(4);
		});

		it("no hotbar light when holding non-light item", () => {
			const world = createTestWorld();
			spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

			world.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: 101, type: "item" }; // Wood Axe
				hotbar.activeSlot = 0;
			});

			lightSystem(world, SCAN_INTERVAL, () => 0);

			expect(getActiveLightSources()).toHaveLength(0);
		});

		it("player light follows player position", () => {
			const world = createTestWorld();
			spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

			world.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: 109, type: "item" };
				hotbar.activeSlot = 0;
			});

			lightSystem(world, SCAN_INTERVAL, () => 0);
			const sources = getActiveLightSources();
			expect(sources[0].x).toBeCloseTo(5, 0);
			expect(sources[0].z).toBeCloseTo(5, 0);
		});
	});

	// ─── Reset ───

	describe("resetLightState", () => {
		it("clears all sources", () => {
			const world = createTestWorld();
			spawnPlayer(world, { position: { x: 0, y: 0, z: 0 } });

			world.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: 109, type: "item" };
				hotbar.activeSlot = 0;
			});

			lightSystem(world, SCAN_INTERVAL, () => 0);
			expect(getActiveLightSources().length).toBe(1);

			resetLightState();
			expect(getActiveLightSources()).toHaveLength(0);
		});
	});
});
